import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@ekspres/database';
import { eq, and, gt, inArray, lte, sql } from 'drizzle-orm';

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

    const activeHolds =
      seats.length === 0
        ? []
        : await this.db.query.seatHolds.findMany({
            where: and(
              inArray(
                schema.seatHolds.tripSeatId,
                seats.map((seat) => seat.id),
              ),
              eq(schema.seatHolds.status, 'active'),
              gt(schema.seatHolds.expiresAt, new Date()),
            ),
          });
    const activelyHeldSeatIds = new Set(activeHolds.map((hold) => hold.tripSeatId));

    const processedSeats = seats.map((seat) => {
      return {
        id: seat.id,
        seatNo: seat.seatNo,
        seatType: seat.seatType,
        priceMinor: seat.priceMinor,
        status:
          seat.status === 'held' && !activelyHeldSeatIds.has(seat.id) ? 'available' : seat.status,
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

  /** Create a hold using a PostgreSQL row lock as the concurrency authority. */
  async createHold(tripId: string, seatNo: string, userId: string) {
    const result = await this.db.transaction(async (tx) => {
      const lockedSeatResult = await tx.execute<{
        id: string;
        status: string;
        version: number;
      }>(sql`
        SELECT id, status, version
        FROM trip_seats
        WHERE trip_id = ${tripId} AND seat_no = ${seatNo}
        FOR UPDATE
      `);
      const currentSeat = lockedSeatResult.rows[0];

      if (!currentSeat) {
        throw new NotFoundException('Seat not found for this trip');
      }

      const now = new Date();
      await tx
        .update(schema.seatHolds)
        .set({ status: 'expired', releasedAt: now })
        .where(
          and(
            eq(schema.seatHolds.tripSeatId, currentSeat.id),
            eq(schema.seatHolds.status, 'active'),
            lte(schema.seatHolds.expiresAt, now),
          ),
        );

      const activeHold = await tx.query.seatHolds.findFirst({
        where: and(
          eq(schema.seatHolds.tripSeatId, currentSeat.id),
          eq(schema.seatHolds.status, 'active'),
        ),
      });

      if (activeHold || !['available', 'held'].includes(currentSeat.status)) {
        throw new ConflictException(`Seat ${seatNo} is not available`);
      }

      const expiresAt = new Date(now.getTime() + HOLD_TTL_SECONDS * 1000);
      await tx
        .update(schema.tripSeats)
        .set({ status: 'held', version: currentSeat.version + 1 })
        .where(eq(schema.tripSeats.id, currentSeat.id));

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
    await this.db.transaction(async (tx) => {
      const requestedHold = await tx.query.seatHolds.findFirst({
        where: and(eq(schema.seatHolds.id, holdId), eq(schema.seatHolds.userId, userId)),
      });

      if (!requestedHold) {
        throw new NotFoundException('Hold not found');
      }

      await tx.execute(
        sql`SELECT id FROM trip_seats WHERE id = ${requestedHold.tripSeatId} FOR UPDATE`,
      );

      const hold = await tx.query.seatHolds.findFirst({
        where: and(eq(schema.seatHolds.id, holdId), eq(schema.seatHolds.userId, userId)),
      });

      if (!hold) {
        throw new NotFoundException('Hold not found');
      }

      if (hold.status !== 'active') {
        throw new ConflictException(`Hold is not active (status: ${hold.status})`);
      }

      await tx
        .update(schema.seatHolds)
        .set({ status: 'released', releasedAt: new Date() })
        .where(eq(schema.seatHolds.id, holdId));

      await tx
        .update(schema.tripSeats)
        .set({ status: 'available' })
        .where(eq(schema.tripSeats.id, hold.tripSeatId));
    });

    return { released: true };
  }
}
