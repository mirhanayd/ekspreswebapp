import * as bcrypt from 'bcryptjs';
import { and, eq, ne, sql } from 'drizzle-orm';
import * as schema from '../schema/index.js';
import { serverDatabase } from './database.js';
import { ServerError } from './errors.js';

type Database = ReturnType<typeof serverDatabase>;

function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ServerError(400, 'Geçersiz kimlik.');
  }
  return value;
}

function driverInput(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ServerError(400, 'Sürücü bilgileri geçersiz.');
  const item = value as Record<string, unknown>;
  const email = typeof item.email === 'string' ? item.email.trim().toLowerCase() : '';
  const firstName = typeof item.firstName === 'string' ? item.firstName.trim() : '';
  const lastName = typeof item.lastName === 'string' ? item.lastName.trim() : '';
  const password = item.password;
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    firstName.length < 2 ||
    firstName.length > 100 ||
    lastName.length < 2 ||
    lastName.length > 100 ||
    typeof password !== 'string' ||
    password.length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    throw new ServerError(400, 'Geçerli ad, e-posta ve en az 12 karakterli şifre gerekli.');
  }
  return { email, firstName, lastName, password };
}

function newPassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new ServerError(400, 'Yeni şifre 12-72 bayt uzunluğunda olmalı.');
  }
  return value;
}

export function createDriverAdminService(database: () => Database = serverDatabase) {
  return {
    async listDrivers() {
      return database()
        .select({
          id: schema.users.id,
          email: schema.users.email,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          isActive: schema.users.isActive,
        })
        .from(schema.users)
        .where(eq(schema.users.role, 'driver'))
        .orderBy(schema.users.lastName);
    },

    async createDriver(adminId: string, input: unknown) {
      const value = driverInput(input);
      const passwordHash = await bcrypt.hash(value.password, 12);
      return database().transaction(async (tx) => {
        const [user] = await tx
          .insert(schema.users)
          .values({
            email: value.email,
            firstName: value.firstName,
            lastName: value.lastName,
            passwordHash,
            role: 'driver',
            isActive: true,
          })
          .onConflictDoNothing({ target: schema.users.email })
          .returning({
            id: schema.users.id,
            email: schema.users.email,
            firstName: schema.users.firstName,
            lastName: schema.users.lastName,
            isActive: schema.users.isActive,
          });
        if (!user) throw new ServerError(409, 'Bu e-posta zaten kullanımda.');
        await tx
          .insert(schema.driverAdminAudit)
          .values({ adminId, driverId: user.id, action: 'provision' });
        return user;
      });
    },

    async setDriverActive(adminId: string, driverId: string, isActive: boolean) {
      if (typeof isActive !== 'boolean') throw new ServerError(400, 'Hesap durumu geçersiz.');
      return database().transaction(async (tx) => {
        const [current] = await tx
          .select({ id: schema.users.id, isActive: schema.users.isActive })
          .from(schema.users)
          .where(and(eq(schema.users.id, uuid(driverId)), eq(schema.users.role, 'driver')))
          .for('update');
        if (!current) throw new ServerError(404, 'Sürücü bulunamadı.');
        if (current.isActive === isActive) return current;
        const [user] = await tx
          .update(schema.users)
          .set({
            isActive,
            updatedAt: new Date(),
            sessionVersion: sql`${schema.users.sessionVersion} + 1`,
          })
          .where(eq(schema.users.id, current.id))
          .returning({ id: schema.users.id, isActive: schema.users.isActive });
        await tx
          .insert(schema.driverAdminAudit)
          .values({ adminId, driverId: user.id, action: isActive ? 'activate' : 'deactivate' });
        return user;
      });
    },

    async resetDriverPassword(adminId: string, driverId: string, password: unknown) {
      const passwordHash = await bcrypt.hash(newPassword(password), 12);
      return database().transaction(async (tx) => {
        const [user] = await tx
          .update(schema.users)
          .set({
            passwordHash,
            updatedAt: new Date(),
            sessionVersion: sql`${schema.users.sessionVersion} + 1`,
          })
          .where(and(eq(schema.users.id, uuid(driverId)), eq(schema.users.role, 'driver')))
          .returning({ id: schema.users.id });
        if (!user) throw new ServerError(404, 'Sürücü bulunamadı.');
        await tx
          .insert(schema.driverAdminAudit)
          .values({ adminId, driverId: user.id, action: 'reset_password' });
        return { updated: true };
      });
    },

    async getAssignment(tripId: string) {
      const [trip] = await database()
        .select({ id: schema.trips.id })
        .from(schema.trips)
        .where(eq(schema.trips.id, uuid(tripId)))
        .limit(1);
      if (!trip) throw new ServerError(404, 'Sefer bulunamadı.');
      const [assignment] = await database()
        .select({
          driverId: schema.tripDrivers.driverId,
          assignedAt: schema.tripDrivers.assignedAt,
        })
        .from(schema.tripDrivers)
        .where(eq(schema.tripDrivers.tripId, trip.id))
        .limit(1);
      return assignment ?? { driverId: null, assignedAt: null };
    },

    async assign(adminId: string, tripId: string, driverId: string) {
      uuid(tripId);
      uuid(driverId);
      return database().transaction(async (tx) => {
        const [trip] = await tx
          .select()
          .from(schema.trips)
          .where(eq(schema.trips.id, tripId))
          .for('update');
        if (!trip) throw new ServerError(404, 'Sefer bulunamadı.');
        if (trip.status === 'completed' || trip.status === 'cancelled')
          throw new ServerError(409, 'Tamamlanmış veya iptal sefer değiştirilemez.');
        // Stable lock order serializes concurrent assignments for the same bus or driver.
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${`bus:${trip.busId}`}, 0))`,
        );
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${`driver:${driverId}`}, 0))`,
        );
        const [driver] = await tx
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(
            and(
              eq(schema.users.id, driverId),
              eq(schema.users.role, 'driver'),
              eq(schema.users.isActive, true),
            ),
          )
          .limit(1);
        if (!driver) throw new ServerError(404, 'Aktif sürücü bulunamadı.');

        const overlap = and(
          ne(schema.trips.id, tripId),
          sql`${schema.trips.status} NOT IN ('completed', 'cancelled')`,
          sql`${schema.trips.departureTime} < ${trip.arrivalTime}`,
          sql`${schema.trips.arrivalTime} > ${trip.departureTime}`,
        );
        const [busConflict] = await tx
          .select({ id: schema.trips.id })
          .from(schema.trips)
          .where(and(overlap, eq(schema.trips.busId, trip.busId)))
          .limit(1);
        if (busConflict) throw new ServerError(409, 'Araç aynı saatlerde başka bir seferde.');
        const [driverConflict] = await tx
          .select({ id: schema.trips.id })
          .from(schema.tripDrivers)
          .innerJoin(schema.trips, eq(schema.tripDrivers.tripId, schema.trips.id))
          .where(and(overlap, eq(schema.tripDrivers.driverId, driverId)))
          .limit(1);
        if (driverConflict) throw new ServerError(409, 'Sürücü aynı saatlerde başka bir seferde.');

        const [previous] = await tx
          .select({ driverId: schema.tripDrivers.driverId })
          .from(schema.tripDrivers)
          .where(eq(schema.tripDrivers.tripId, tripId))
          .limit(1);
        if (previous?.driverId === driverId) return { driverId, unchanged: true };
        await tx
          .insert(schema.tripDrivers)
          .values({ tripId, driverId })
          .onConflictDoUpdate({
            target: schema.tripDrivers.tripId,
            set: { driverId, assignedAt: new Date() },
          });
        await tx.insert(schema.driverAdminAudit).values({
          adminId,
          tripId,
          driverId,
          previousDriverId: previous?.driverId,
          action: previous ? 'replace' : 'assign',
        });
        return { driverId, unchanged: false };
      });
    },

    async unassign(adminId: string, tripId: string) {
      return database().transaction(async (tx) => {
        const [trip] = await tx
          .select({ id: schema.trips.id, status: schema.trips.status })
          .from(schema.trips)
          .where(eq(schema.trips.id, uuid(tripId)))
          .for('update');
        if (!trip) throw new ServerError(404, 'Sefer bulunamadı.');
        if (trip.status === 'completed' || trip.status === 'cancelled')
          throw new ServerError(409, 'Tamamlanmış veya iptal sefer değiştirilemez.');
        const [previous] = await tx
          .delete(schema.tripDrivers)
          .where(eq(schema.tripDrivers.tripId, tripId))
          .returning({ driverId: schema.tripDrivers.driverId });
        if (!previous) return { driverId: null, unchanged: true };
        await tx.insert(schema.driverAdminAudit).values({
          adminId,
          tripId,
          previousDriverId: previous.driverId,
          action: 'unassign',
        });
        return { driverId: null, unchanged: false };
      });
    },
  };
}

export const driverAdminService = createDriverAdminService();
