import { and, eq, gt, inArray, sql } from 'drizzle-orm';
import * as schema from '../schema/index.js';
import { serverDatabase } from './database.js';
import { ServerError } from './errors.js';

const HOLD_TTL_SECONDS = 300;
type Database = ReturnType<typeof serverDatabase>;

function uuid(value: string, field: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ServerError(400, `${field} geçerli bir UUID olmalıdır.`);
  }
  return value;
}

export function validateSeatHoldInput(input: unknown) {
  if (!input || typeof input !== 'object') throw new ServerError(400, 'Geçersiz istek.');
  const value = input as Record<string, unknown>;
  if (typeof value.tripId !== 'string') throw new ServerError(400, 'tripId zorunludur.');
  if (typeof value.seatNo !== 'string' || !value.seatNo.trim() || value.seatNo.length > 16) {
    throw new ServerError(400, 'seatNo geçersizdir.');
  }
  return { tripId: uuid(value.tripId, 'tripId'), seatNo: value.seatNo.trim() };
}

function holdResponse(hold: { id: string; expiresAt: Date }, seatNo: string) {
  return {
    holdId: hold.id,
    seatNo,
    expiresAt: hold.expiresAt.toISOString(),
    ttlSeconds: HOLD_TTL_SECONDS,
  };
}

export function createSeatService(database: () => Database = serverDatabase) {
  return {
    async getSeatMap(tripId: string) {
      uuid(tripId, 'tripId');
      return database().transaction(async (tx) => {
        const trip = await tx.query.trips.findFirst({
          where: eq(schema.trips.id, tripId),
          with: { bus: true },
        });
        if (!trip) throw new ServerError(404, 'Sefer bulunamadı.');

        const now = new Date();
        await tx.execute(sql`
          WITH expired AS (
            UPDATE seat_holds AS hold
            SET status = 'expired', released_at = ${now}
            FROM trip_seats AS seat
            WHERE hold.trip_seat_id = seat.id
              AND seat.trip_id = ${tripId}
              AND hold.status = 'active'
              AND hold.expires_at <= ${now}
            RETURNING hold.trip_seat_id
          )
          UPDATE trip_seats AS seat
          SET status = 'available', version = seat.version + 1
          WHERE seat.trip_id = ${tripId}
            AND seat.status = 'held'
            AND seat.id IN (SELECT trip_seat_id FROM expired)
            AND NOT EXISTS (
              SELECT 1 FROM seat_holds AS active
              WHERE active.trip_seat_id = seat.id
                AND active.status = 'active'
                AND active.expires_at > ${now}
            )
        `);

        const seats = await tx.query.tripSeats.findMany({
          where: eq(schema.tripSeats.tripId, tripId),
          orderBy: (seat, { asc }) => [asc(seat.seatNo)],
        });
        return JSON.parse(
          JSON.stringify({ tripId, bus: trip.bus, seatLayout: trip.bus.seatLayout, seats }),
        );
      });
    },

    async createHold(input: unknown, userId: string) {
      const { tripId, seatNo } = validateSeatHoldInput(input);
      uuid(userId, 'userId');
      return database().transaction(async (tx) => {
        const locked = await tx.execute<{ id: string; status: string; version: number }>(sql`
          SELECT id, status, version
          FROM trip_seats
          WHERE trip_id = ${tripId} AND seat_no = ${seatNo}
          FOR UPDATE
        `);
        const seat = locked.rows[0];
        if (!seat) throw new ServerError(404, 'Bu sefer için koltuk bulunamadı.');

        const now = new Date();
        await tx
          .update(schema.seatHolds)
          .set({ status: 'expired', releasedAt: now })
          .where(
            and(
              eq(schema.seatHolds.tripSeatId, seat.id),
              eq(schema.seatHolds.status, 'active'),
              sql`${schema.seatHolds.expiresAt} <= ${now}`,
            ),
          );

        const active = await tx.query.seatHolds.findFirst({
          where: and(
            eq(schema.seatHolds.tripSeatId, seat.id),
            eq(schema.seatHolds.status, 'active'),
            gt(schema.seatHolds.expiresAt, now),
          ),
        });
        if (active?.userId === userId) return holdResponse(active, seatNo);
        if (active || !['available', 'held'].includes(seat.status)) {
          throw new ServerError(409, `Koltuk ${seatNo} uygun değil.`);
        }

        const expiresAt = new Date(now.getTime() + HOLD_TTL_SECONDS * 1000);
        const [hold] = await tx
          .insert(schema.seatHolds)
          .values({ tripSeatId: seat.id, userId, status: 'active', expiresAt })
          .returning();
        await tx
          .update(schema.tripSeats)
          .set({ status: 'held', version: seat.version + 1 })
          .where(eq(schema.tripSeats.id, seat.id));
        return holdResponse(hold, seatNo);
      });
    },

    async releaseHold(holdId: string, userId: string) {
      uuid(holdId, 'holdId');
      uuid(userId, 'userId');
      return database().transaction(async (tx) => {
        const requested = await tx.query.seatHolds.findFirst({
          where: and(eq(schema.seatHolds.id, holdId), eq(schema.seatHolds.userId, userId)),
        });
        if (!requested) throw new ServerError(404, 'Koltuk ayırma kaydı bulunamadı.');

        await tx.execute(
          sql`SELECT id FROM trip_seats WHERE id = ${requested.tripSeatId} FOR UPDATE`,
        );
        const hold = await tx.query.seatHolds.findFirst({
          where: and(eq(schema.seatHolds.id, holdId), eq(schema.seatHolds.userId, userId)),
        });
        if (!hold) throw new ServerError(404, 'Koltuk ayırma kaydı bulunamadı.');
        if (['released', 'expired'].includes(hold.status)) return { released: true };
        if (hold.status !== 'active') {
          throw new ServerError(409, `Koltuk ayırma kaydı serbest bırakılamaz (${hold.status}).`);
        }

        const now = new Date();
        await tx
          .update(schema.seatHolds)
          .set({ status: hold.expiresAt <= now ? 'expired' : 'released', releasedAt: now })
          .where(eq(schema.seatHolds.id, hold.id));
        const competing = await tx.query.seatHolds.findFirst({
          where: and(
            eq(schema.seatHolds.tripSeatId, hold.tripSeatId),
            eq(schema.seatHolds.status, 'active'),
            gt(schema.seatHolds.expiresAt, now),
          ),
        });
        if (!competing) {
          await tx
            .update(schema.tripSeats)
            .set({ status: 'available' })
            .where(
              and(
                eq(schema.tripSeats.id, hold.tripSeatId),
                inArray(schema.tripSeats.status, ['available', 'held']),
              ),
            );
        }
        return { released: true };
      });
    },
  };
}

export const seatService = createSeatService();
