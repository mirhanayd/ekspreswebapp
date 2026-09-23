import { createHash, randomUUID } from 'node:crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import * as schema from '../schema/index.js';
import { serverDatabase } from './database.js';
import { ServerError } from './errors.js';

const ORDER_EXPIRY_SECONDS = 300;
type Database = ReturnType<typeof serverDatabase>;

export type CheckoutOrderInput = {
  tripId: string;
  seatNo: string;
  holdId: string;
  passengerFirstName: string;
  passengerLastName: string;
  passengerPhone?: string;
  passengerEmail?: string;
  idempotencyKey?: string;
};

function uuid(value: string, field: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ServerError(400, `${field} geçerli bir UUID olmalıdır.`);
  }
  return value;
}

function requiredText(value: unknown, field: string, maximum: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > maximum) {
    throw new ServerError(400, `${field} geçersizdir.`);
  }
  return value.trim();
}

function optionalText(value: unknown, field: string, maximum: number) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.trim().length > maximum) {
    throw new ServerError(400, `${field} geçersizdir.`);
  }
  return value.trim() || undefined;
}

export function validateCheckoutOrderInput(input: unknown): CheckoutOrderInput {
  if (!input || typeof input !== 'object') throw new ServerError(400, 'Geçersiz istek.');
  const value = input as Record<string, unknown>;
  const email = optionalText(value.passengerEmail, 'passengerEmail', 320);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ServerError(400, 'passengerEmail geçersizdir.');
  }
  return {
    tripId: uuid(requiredText(value.tripId, 'tripId', 36), 'tripId'),
    seatNo: requiredText(value.seatNo, 'seatNo', 16),
    holdId: uuid(requiredText(value.holdId, 'holdId', 36), 'holdId'),
    passengerFirstName: requiredText(value.passengerFirstName, 'passengerFirstName', 100),
    passengerLastName: requiredText(value.passengerLastName, 'passengerLastName', 100),
    passengerPhone: optionalText(value.passengerPhone, 'passengerPhone', 40),
    passengerEmail: email,
    idempotencyKey: optionalText(value.idempotencyKey, 'idempotencyKey', 200),
  };
}

function orderNumber() {
  const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
  return `SKE-${date}-${randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase()}`;
}

function ticketNumber() {
  return `TKT-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

export function createCheckoutService(database: () => Database = serverDatabase) {
  return {
    async createOrder(rawInput: unknown, userId: string) {
      const input = validateCheckoutOrderInput(rawInput);
      uuid(userId, 'userId');
      const idempotencyKey = input.idempotencyKey ?? randomUUID();

      const result = await database().transaction(async (tx) => {
        // A global unique index is the final guard; this transaction lock also makes
        // simultaneous retries deterministic before either insert becomes visible.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${idempotencyKey}, 0))`);
        const existingByKey = await tx.query.orders.findFirst({
          where: eq(schema.orders.idempotencyKey, idempotencyKey),
        });
        if (existingByKey) {
          if (existingByKey.userId !== userId) {
            throw new ServerError(409, 'Idempotency anahtarı zaten kullanılıyor.');
          }
          return { state: 'existing' as const, order: existingByKey };
        }

        const requestedHold = await tx.query.seatHolds.findFirst({
          where: and(eq(schema.seatHolds.id, input.holdId), eq(schema.seatHolds.userId, userId)),
        });
        if (!requestedHold) throw new ServerError(404, 'Koltuk ayırma kaydı bulunamadı.');

        await tx.execute(
          sql`SELECT id FROM trip_seats WHERE id = ${requestedHold.tripSeatId} FOR UPDATE`,
        );
        const hold = await tx.query.seatHolds.findFirst({
          where: and(eq(schema.seatHolds.id, input.holdId), eq(schema.seatHolds.userId, userId)),
          with: { tripSeat: true },
        });
        if (!hold) throw new ServerError(404, 'Koltuk ayırma kaydı bulunamadı.');
        if (hold.status !== 'active') {
          throw new ServerError(409, `Koltuk ayırma kaydı aktif değil (${hold.status}).`);
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
            .where(
              and(eq(schema.tripSeats.id, hold.tripSeat.id), eq(schema.tripSeats.status, 'held')),
            );
          return { state: 'expired-hold' as const };
        }

        const seat = hold.tripSeat;
        if (seat.tripId !== input.tripId || seat.seatNo !== input.seatNo) {
          throw new ServerError(400, 'Koltuk ayırma kaydı istenen koltukla eşleşmiyor.');
        }
        if (seat.status !== 'held') {
          throw new ServerError(409, `Koltuk satın almaya uygun değil (${seat.status}).`);
        }

        const activeOrder = await tx.query.orders.findFirst({
          where: and(
            eq(schema.orders.userId, userId),
            eq(schema.orders.tripSeatId, seat.id),
            eq(schema.orders.status, 'pending'),
            gt(schema.orders.expiresAt, now),
          ),
        });
        if (activeOrder) return { state: 'existing' as const, order: activeOrder };

        const [order] = await tx
          .insert(schema.orders)
          .values({
            orderNo: orderNumber(),
            userId,
            tripId: input.tripId,
            tripSeatId: seat.id,
            status: 'pending',
            totalMinor: seat.priceMinor,
            currency: 'TRY',
            idempotencyKey,
            passengerFirstName: input.passengerFirstName,
            passengerLastName: input.passengerLastName,
            passengerPhone: input.passengerPhone,
            passengerEmail: input.passengerEmail,
            expiresAt: new Date(now.getTime() + ORDER_EXPIRY_SECONDS * 1000),
          })
          .returning();
        return { state: 'created' as const, order };
      });

      if (result.state === 'expired-hold') {
        throw new ServerError(409, 'Koltuk ayırma süresi doldu. Lütfen tekrar koltuk seçin.');
      }
      return result.order;
    },

    async processPayment(orderId: string, userId: string) {
      uuid(orderId, 'orderId');
      uuid(userId, 'userId');
      const result = await database().transaction(async (tx) => {
        const locked = await tx.execute<{ id: string }>(sql`
          SELECT id FROM orders WHERE id = ${orderId} AND user_id = ${userId} FOR UPDATE
        `);
        if (!locked.rows[0]) throw new ServerError(404, 'Sipariş bulunamadı.');

        const order = await tx.query.orders.findFirst({
          where: and(eq(schema.orders.id, orderId), eq(schema.orders.userId, userId)),
        });
        if (!order) throw new ServerError(404, 'Sipariş bulunamadı.');

        const existingPayment = await tx.query.payments.findFirst({
          where: eq(schema.payments.orderId, orderId),
        });
        if (existingPayment?.status === 'success') {
          const ticket = await tx.query.tickets.findFirst({
            where: eq(schema.tickets.orderId, orderId),
          });
          if (!ticket) throw new ServerError(500, 'Ödenmiş siparişin bileti bulunamadı.');
          return { state: 'already-paid' as const, payment: existingPayment, ticket };
        }
        if (order.status !== 'pending') {
          throw new ServerError(409, `Sipariş ödemeye uygun değil (${order.status}).`);
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
            paidAt: now,
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
            ticketNo: ticketNumber(),
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

      if (result.state === 'expired-order') throw new ServerError(409, 'Siparişin süresi doldu.');
      if (result.state === 'expired-hold') {
        throw new ServerError(409, 'Koltuk ayırma süresi doldu veya artık aktif değil.');
      }
      return {
        payment: result.payment,
        ticket: result.ticket,
        alreadyPaid: result.state === 'already-paid',
      };
    },

    async getOrder(orderId: string, userId: string) {
      uuid(orderId, 'orderId');
      uuid(userId, 'userId');
      const order = await database().query.orders.findFirst({
        where: and(eq(schema.orders.id, orderId), eq(schema.orders.userId, userId)),
        with: {
          trip: { with: { route: { with: { origin: true, destination: true } }, bus: true } },
          tripSeat: true,
          payments: true,
          ticket: true,
        },
      });
      if (!order) throw new ServerError(404, 'Sipariş bulunamadı.');
      return order;
    },
  };
}

export const checkoutService = createCheckoutService();
