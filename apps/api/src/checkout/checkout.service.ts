import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@ekspres/database';
import { eq, and, gt, sql } from 'drizzle-orm';
import { createHash, randomUUID } from 'crypto';

function generateOrderNo(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SKE-${y}${m}${d}-${rand}`;
}

function generateTicketNo(): string {
  const rand = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TKT-${rand}`;
}

const ORDER_EXPIRY_SECONDS = 300; // 5 minutes, matches hold TTL

@Injectable()
export class CheckoutService {
  constructor(@Inject(DRIZZLE) private db: NodePgDatabase<typeof schema>) {}

  /**
   * Create an order from a held seat.
   */
  async createOrder(
    userId: string,
    input: {
      tripId: string;
      seatNo: string;
      holdId: string;
      passengerFirstName: string;
      passengerLastName: string;
      passengerPhone?: string;
      passengerEmail?: string;
      idempotencyKey?: string;
    },
  ) {
    const result = await this.db.transaction(async (tx) => {
      if (input.idempotencyKey) {
        const existing = await tx.query.orders.findFirst({
          where: eq(schema.orders.idempotencyKey, input.idempotencyKey),
        });
        if (existing) {
          if (existing.userId !== userId) {
            throw new ConflictException('Idempotency key is already in use');
          }
          return { state: 'existing' as const, order: existing };
        }
      }

      const requestedHold = await tx.query.seatHolds.findFirst({
        where: and(eq(schema.seatHolds.id, input.holdId), eq(schema.seatHolds.userId, userId)),
      });
      if (!requestedHold) {
        throw new NotFoundException('Hold not found');
      }

      await tx.execute(
        sql`SELECT id FROM trip_seats WHERE id = ${requestedHold.tripSeatId} FOR UPDATE`,
      );
      const hold = await tx.query.seatHolds.findFirst({
        where: and(eq(schema.seatHolds.id, input.holdId), eq(schema.seatHolds.userId, userId)),
        with: { tripSeat: true },
      });
      if (!hold) {
        throw new NotFoundException('Hold not found');
      }
      if (hold.status !== 'active') {
        throw new ConflictException(`Hold is not active (status: ${hold.status})`);
      }

      const now = new Date();
      if (hold.expiresAt <= now) {
        await tx
          .update(schema.seatHolds)
          .set({ status: 'expired', releasedAt: now })
          .where(eq(schema.seatHolds.id, hold.id));
        await tx
          .update(schema.tripSeats)
          .set({ status: 'available' })
          .where(eq(schema.tripSeats.id, hold.tripSeat.id));
        return { state: 'expired-hold' as const };
      }

      const tripSeat = hold.tripSeat;
      if (tripSeat.tripId !== input.tripId || tripSeat.seatNo !== input.seatNo) {
        throw new BadRequestException('Hold does not match the requested seat');
      }

      const activeOrder = await tx.query.orders.findFirst({
        where: and(
          eq(schema.orders.userId, userId),
          eq(schema.orders.tripSeatId, tripSeat.id),
          eq(schema.orders.status, 'pending'),
          gt(schema.orders.expiresAt, now),
        ),
      });
      if (activeOrder) {
        return { state: 'existing' as const, order: activeOrder };
      }

      const expiresAt = new Date(now.getTime() + ORDER_EXPIRY_SECONDS * 1000);
      const [order] = await tx
        .insert(schema.orders)
        .values({
          orderNo: generateOrderNo(),
          userId,
          tripId: input.tripId,
          tripSeatId: tripSeat.id,
          status: 'pending',
          totalMinor: tripSeat.priceMinor,
          currency: 'TRY',
          idempotencyKey: input.idempotencyKey || randomUUID(),
          passengerFirstName: input.passengerFirstName,
          passengerLastName: input.passengerLastName,
          passengerPhone: input.passengerPhone,
          passengerEmail: input.passengerEmail,
          expiresAt,
        })
        .returning();
      return { state: 'created' as const, order };
    });

    if (result.state === 'expired-hold') {
      throw new ConflictException('Hold has expired. Please select a seat again.');
    }
    return result.order;
  }

  /**
   * Process demo payment for an order.
   * In production this would integrate with a real payment provider.
   */
  async processPayment(orderId: string, userId: string) {
    const result = await this.db.transaction(async (tx) => {
      const lockedOrder = await tx.execute<{ id: string }>(sql`
        SELECT id
        FROM orders
        WHERE id = ${orderId} AND user_id = ${userId}
        FOR UPDATE
      `);
      if (!lockedOrder.rows[0]) {
        throw new NotFoundException('Order not found');
      }

      const order = await tx.query.orders.findFirst({
        where: and(eq(schema.orders.id, orderId), eq(schema.orders.userId, userId)),
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const existingPayment = await tx.query.payments.findFirst({
        where: eq(schema.payments.orderId, orderId),
      });
      if (existingPayment?.status === 'success') {
        const existingTicket = await tx.query.tickets.findFirst({
          where: eq(schema.tickets.orderId, orderId),
        });
        return { state: 'paid' as const, payment: existingPayment, ticket: existingTicket };
      }

      if (order.status !== 'pending') {
        throw new ConflictException(`Order is not pending (status: ${order.status})`);
      }

      const now = new Date();
      if (order.expiresAt <= now) {
        await tx
          .update(schema.orders)
          .set({ status: 'expired' })
          .where(eq(schema.orders.id, orderId));
        return { state: 'expired-order' as const };
      }

      await tx.execute(sql`SELECT id FROM trip_seats WHERE id = ${order.tripSeatId} FOR UPDATE`);
      const activeHold = await tx.query.seatHolds.findFirst({
        where: and(
          eq(schema.seatHolds.tripSeatId, order.tripSeatId),
          eq(schema.seatHolds.userId, userId),
          eq(schema.seatHolds.status, 'active'),
        ),
      });

      if (!activeHold || activeHold.expiresAt <= now) {
        if (activeHold) {
          await tx
            .update(schema.seatHolds)
            .set({ status: 'expired', releasedAt: now })
            .where(eq(schema.seatHolds.id, activeHold.id));
        }

        const competingHold = await tx.query.seatHolds.findFirst({
          where: and(
            eq(schema.seatHolds.tripSeatId, order.tripSeatId),
            eq(schema.seatHolds.status, 'active'),
            gt(schema.seatHolds.expiresAt, now),
          ),
        });
        if (!competingHold) {
          await tx
            .update(schema.tripSeats)
            .set({ status: 'available' })
            .where(
              and(eq(schema.tripSeats.id, order.tripSeatId), eq(schema.tripSeats.status, 'held')),
            );
        }
        await tx
          .update(schema.orders)
          .set({ status: 'expired' })
          .where(eq(schema.orders.id, orderId));
        return { state: 'expired-hold' as const };
      }

      const [payment] = await tx
        .insert(schema.payments)
        .values({
          orderId,
          provider: 'demo',
          providerPaymentId: `demo_${randomUUID()}`,
          status: 'success',
          amountMinor: order.totalMinor,
          currency: order.currency,
          paidAt: new Date(),
        })
        .returning();

      await tx.update(schema.orders).set({ status: 'paid' }).where(eq(schema.orders.id, orderId));

      await tx
        .update(schema.tripSeats)
        .set({ status: 'purchased' })
        .where(eq(schema.tripSeats.id, order.tripSeatId));

      await tx
        .update(schema.seatHolds)
        .set({ status: 'consumed' })
        .where(eq(schema.seatHolds.id, activeHold.id));

      const qrTokenHash = createHash('sha256').update(randomUUID()).digest('hex');
      const [ticket] = await tx
        .insert(schema.tickets)
        .values({
          ticketNo: generateTicketNo(),
          userId: order.userId,
          tripId: order.tripId,
          tripSeatId: order.tripSeatId,
          orderId,
          status: 'active',
          qrTokenHash,
        })
        .returning();

      return { state: 'paid-now' as const, payment, ticket };
    });

    if (result.state === 'expired-order') {
      throw new ConflictException('Order has expired');
    }
    if (result.state === 'expired-hold') {
      throw new ConflictException('Seat hold has expired or is no longer active');
    }

    return {
      payment: result.payment,
      ticket: result.ticket,
      alreadyPaid: result.state === 'paid',
    };
  }

  /**
   * Get order details with related data.
   */
  async getOrder(orderId: string, userId: string) {
    const order = await this.db.query.orders.findFirst({
      where: and(eq(schema.orders.id, orderId), eq(schema.orders.userId, userId)),
      with: {
        trip: {
          with: {
            route: {
              with: {
                origin: true,
                destination: true,
              },
            },
            bus: true,
          },
        },
        tripSeat: true,
        payments: true,
        ticket: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }
}
