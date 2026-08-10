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
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

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
    // Check idempotency
    if (input.idempotencyKey) {
      const existing = await this.db.query.orders.findFirst({
        where: eq(schema.orders.idempotencyKey, input.idempotencyKey),
      });
      if (existing) {
        if (existing.userId !== userId) {
          throw new ConflictException('Idempotency key is already in use');
        }
        return existing;
      }
    }

    // Verify hold exists and belongs to the user
    const hold = await this.db.query.seatHolds.findFirst({
      where: and(eq(schema.seatHolds.id, input.holdId), eq(schema.seatHolds.userId, userId)),
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

    if (new Date() > hold.expiresAt) {
      throw new ConflictException('Hold has expired. Please select a seat again.');
    }

    // Verify trip seat matches
    const tripSeat = hold.tripSeat;
    if (tripSeat.tripId !== input.tripId || tripSeat.seatNo !== input.seatNo) {
      throw new BadRequestException('Hold does not match the requested seat');
    }

    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_SECONDS * 1000);

    const [order] = await this.db
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

    return order;
  }

  /**
   * Process demo payment for an order.
   * In production this would integrate with a real payment provider.
   */
  async processPayment(orderId: string, userId: string) {
    const order = await this.db.query.orders.findFirst({
      where: and(eq(schema.orders.id, orderId), eq(schema.orders.userId, userId)),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'pending') {
      throw new ConflictException(`Order is not pending (status: ${order.status})`);
    }

    // Check if payment already exists (idempotency)
    const existingPayment = await this.db.query.payments.findFirst({
      where: eq(schema.payments.orderId, orderId),
    });

    if (existingPayment && existingPayment.status === 'success') {
      // Already paid, return the existing ticket
      const existingTicket = await this.db.query.tickets.findFirst({
        where: eq(schema.tickets.orderId, orderId),
      });
      return { payment: existingPayment, ticket: existingTicket, alreadyPaid: true };
    }

    // Demo payment: always succeeds after a simulated delay
    const demoPaymentId = `demo_${randomUUID()}`;

    const result = await this.db.transaction(async (tx) => {
      // Create payment record
      const [payment] = await tx
        .insert(schema.payments)
        .values({
          orderId,
          provider: 'demo',
          providerPaymentId: demoPaymentId,
          status: 'success',
          amountMinor: order.totalMinor,
          currency: order.currency,
          paidAt: new Date(),
        })
        .returning();

      // Update order status
      await tx.update(schema.orders).set({ status: 'paid' }).where(eq(schema.orders.id, orderId));

      // Update seat status to purchased
      await tx
        .update(schema.tripSeats)
        .set({ status: 'purchased' })
        .where(eq(schema.tripSeats.id, order.tripSeatId));

      // Consume the hold
      await tx
        .update(schema.seatHolds)
        .set({ status: 'consumed' })
        .where(eq(schema.seatHolds.tripSeatId, order.tripSeatId));

      // Create ticket
      const qrToken = randomUUID();
      const [ticket] = await tx
        .insert(schema.tickets)
        .values({
          ticketNo: generateTicketNo(),
          userId: order.userId,
          tripId: order.tripId,
          tripSeatId: order.tripSeatId,
          orderId,
          status: 'active',
          qrTokenHash: qrToken, // In production: hash this
        })
        .returning();

      return { payment, ticket };
    });

    return { ...result, alreadyPaid: false };
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
