import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@ekspres/database';
import { eq, and } from 'drizzle-orm';

const HOLD_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class SeatsService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  /**
   * Get all seats for a trip with their current status.
   */
  async getSeatMap(tripId: string) {
    // Verify trip exists
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: {
        bus: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const seats = await this.db.query.tripSeats.findMany({
      where: eq(schema.tripSeats.tripId, tripId),
    });

    // Check for expired holds and mark them available
    const now = new Date();
    const processedSeats = seats.map((seat) => {
      // If a seat is held but we don't have active hold info here,
      // the status is computed from the DB. We trust the DB status.
      return {
        id: seat.id,
        seatNo: seat.seatNo,
        seatType: seat.seatType,
        priceMinor: seat.priceMinor,
        status: seat.status,
      };
    });

    return {
      tripId,
      bus: trip.bus,
      seatLayout: trip.bus.seatLayout,
      seats: processedSeats,
    };
  }

  /**
   * Generate seat inventory for a trip based on its bus seat layout.
   * This is called when a trip is created or when seats need to be initialized.
   */
  async generateSeatsForTrip(tripId: string) {
    const trip = await this.db.query.trips.findFirst({
      where: eq(schema.trips.id, tripId),
      with: { bus: true },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const layout = trip.bus.seatLayout as any;
    const basePriceMinor = Math.round(trip.basePrice * 100);

    // Generate seats based on layout
    const seatItems = (layout?.items || []).filter((item: any) => item.type === 'seat');

    if (seatItems.length === 0) {
      // Fallback: generate sequential seats based on totalSeats
      const totalSeats = trip.bus.totalSeats;
      const seatRows = [];
      for (let i = 1; i <= totalSeats; i++) {
        seatRows.push({
          tripId,
          seatNo: String(i),
          seatType: 'standard',
          priceMinor: basePriceMinor,
          status: 'available',
          version: 1,
        });
      }
      await this.db.insert(schema.tripSeats).values(seatRows);
      return { generated: totalSeats };
    }

    const seatRows = seatItems.map((item: any) => ({
      tripId,
      seatNo: item.seatNo,
      seatType: item.seatType || 'standard',
      priceMinor: basePriceMinor,
      status: 'available',
      version: 1,
    }));

    await this.db.insert(schema.tripSeats).values(seatRows);
    return { generated: seatRows.length };
  }

  /**
   * Create a hold on a seat. Uses DB-level locking for concurrency safety.
   */
  async createHold(tripId: string, seatNo: string, userId: string) {
    // Find the trip seat
    const tripSeat = await this.db.query.tripSeats.findFirst({
      where: and(eq(schema.tripSeats.tripId, tripId), eq(schema.tripSeats.seatNo, seatNo)),
    });

    if (!tripSeat) {
      throw new NotFoundException('Seat not found for this trip');
    }

    if (tripSeat.status !== 'available') {
      throw new ConflictException(`Seat ${seatNo} is not available (status: ${tripSeat.status})`);
    }

    const expiresAt = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);

    // Update seat status and create hold in a transaction
    const result = await this.db.transaction(async (tx) => {
      // Re-check status inside transaction for concurrency safety
      const currentSeat = await tx.query.tripSeats.findFirst({
        where: and(eq(schema.tripSeats.tripId, tripId), eq(schema.tripSeats.seatNo, seatNo)),
      });

      if (!currentSeat || currentSeat.status !== 'available') {
        throw new ConflictException(`Seat ${seatNo} was taken by another user`);
      }

      // Update seat status to held
      await tx
        .update(schema.tripSeats)
        .set({ status: 'held', version: currentSeat.version + 1 })
        .where(eq(schema.tripSeats.id, currentSeat.id));

      // Create hold record
      const [hold] = await tx
        .insert(schema.seatHolds)
        .values({
          tripSeatId: currentSeat.id,
          userId,
          status: 'active',
          expiresAt,
        })
        .returning();

      return hold;
    });

    return {
      holdId: result.id,
      seatNo,
      expiresAt: result.expiresAt,
      ttlSeconds: HOLD_TTL_SECONDS,
    };
  }

  /**
   * Release a hold on a seat.
   */
  async releaseHold(holdId: string, userId: string) {
    const hold = await this.db.query.seatHolds.findFirst({
      where: and(eq(schema.seatHolds.id, holdId), eq(schema.seatHolds.userId, userId)),
      with: {
        tripSeat: true,
      },
    });

    if (!hold) {
      throw new NotFoundException('Hold not found');
    }

    if (hold.status !== 'active') {
      throw new ConflictException(`Hold is not active (status: ${hold.status})`);
    }

    await this.db.transaction(async (tx) => {
      // Release the hold
      await tx
        .update(schema.seatHolds)
        .set({ status: 'released', releasedAt: new Date() })
        .where(eq(schema.seatHolds.id, holdId));

      // Set seat back to available
      await tx
        .update(schema.tripSeats)
        .set({ status: 'available' })
        .where(eq(schema.tripSeats.id, hold.tripSeatId));
    });

    return { released: true };
  }
}
