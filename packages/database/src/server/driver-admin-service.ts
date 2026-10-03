import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { and, eq, ne, sql } from 'drizzle-orm';
import * as schema from '../schema/index.js';
import { serverDatabase } from './database.js';
import { ServerError } from './errors.js';

type Database = ReturnType<typeof serverDatabase>;
const nextTokenBoundary = () => new Date((Math.floor(Date.now() / 1000) + 1) * 1000);

function uuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ServerError(422, 'Geçersiz kimlik.');
  }
  return value;
}

function driverInput(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ServerError(422, 'Sürücü bilgileri geçersiz.');
  const item = value as Record<string, unknown>;
  const email = typeof item.email === 'string' ? item.email.trim().toLowerCase() : '';
  const firstName = typeof item.firstName === 'string' ? item.firstName.trim() : '';
  const lastName = typeof item.lastName === 'string' ? item.lastName.trim() : '';
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    firstName.length < 2 ||
    firstName.length > 100 ||
    lastName.length < 2 ||
    lastName.length > 100 ||
    false
  ) {
    throw new ServerError(422, 'Geçerli ad, e-posta ve soyad gerekli.');
  }
  return { email, firstName, lastName };
}

function newPassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 12 || Buffer.byteLength(value, 'utf8') > 72) {
    throw new ServerError(422, 'Yeni şifre 12-72 bayt uzunluğunda olmalı.');
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

    async createDriverAccount(adminId: string, input: unknown) {
      const value = driverInput(input);
      const temporaryPassword = randomBytes(18).toString('base64url');
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
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
            mustChangePassword: true,
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
        await tx.insert(schema.adminAuditLog).values({
          actorId: adminId,
          action: 'create',
          entity: 'driver',
          entityId: user.id,
          after: { role: 'driver', isActive: 'true' },
        });
        return { ...user, temporaryPassword };
      });
    },

    async createDriver(adminId: string, input: unknown) {
      return this.createDriverAccount(adminId, input);
    },

    async setDriverActive(adminId: string, driverId: string, isActive: boolean) {
      if (typeof isActive !== 'boolean') throw new ServerError(422, 'Hesap durumu geçersiz.');
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
            sessionsValidAfter: isActive ? null : nextTokenBoundary(),
            updatedAt: new Date(),
            sessionVersion: sql`${schema.users.sessionVersion} + 1`,
          })
          .where(eq(schema.users.id, current.id))
          .returning({ id: schema.users.id, isActive: schema.users.isActive });
        await tx.insert(schema.adminAuditLog).values({
          actorId: adminId,
          action: isActive ? 'activate' : 'deactivate',
          entity: 'driver',
          entityId: user.id,
          before: { isActive: String(current.isActive) },
          after: { isActive: String(isActive) },
        });
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
            mustChangePassword: true,
            sessionsValidAfter: nextTokenBoundary(),
            sessionVersion: sql`${schema.users.sessionVersion} + 1`,
          })
          .where(and(eq(schema.users.id, uuid(driverId)), eq(schema.users.role, 'driver')))
          .returning({ id: schema.users.id });
        if (!user) throw new ServerError(404, 'Sürücü bulunamadı.');
        await tx.insert(schema.adminAuditLog).values({
          actorId: adminId,
          action: 'reset_password',
          entity: 'driver',
          entityId: user.id,
          after: { mustChangePassword: 'true' },
        });
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

    async getTripDriver(tripId: string) {
      return this.getAssignment(tripId);
    },

    async assign(
      adminId: string,
      tripId: string,
      driverId: string,
      override = false,
      reason?: string,
    ) {
      uuid(tripId);
      uuid(driverId);
      if (override && !reason?.trim()) throw new ServerError(422, 'Gerekçe gerekli.');
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
        if (busConflict && !override)
          throw new ServerError(409, 'Araç aynı saatlerde başka bir seferde.', 'TRIP_OVERLAP', {
            conflictTripId: busConflict.id,
            kind: 'vehicle',
          });
        const [driverConflict] = await tx
          .select({ id: schema.trips.id })
          .from(schema.tripDrivers)
          .innerJoin(schema.trips, eq(schema.tripDrivers.tripId, schema.trips.id))
          .where(and(overlap, eq(schema.tripDrivers.driverId, driverId)))
          .limit(1);
        if (driverConflict && !override)
          throw new ServerError(409, 'Sürücü aynı saatlerde başka bir seferde.', 'TRIP_OVERLAP', {
            conflictTripId: driverConflict.id,
            kind: 'driver',
          });

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
        await tx.insert(schema.adminAuditLog).values({
          actorId: adminId,
          action: previous ? 'replace' : 'assign',
          entity: 'trip_driver',
          entityId: tripId,
          before: { driverId: previous?.driverId ?? null },
          after: { driverId },
          reason: override ? reason!.trim() : null,
        });
        return { driverId, unchanged: false };
      });
    },

    async assignTripDriver(
      adminId: string,
      tripId: string,
      driverId: string,
      override = false,
      reason?: string,
    ) {
      return this.assign(adminId, tripId, driverId, override, reason);
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
        await tx.insert(schema.adminAuditLog).values({
          actorId: adminId,
          action: 'unassign',
          entity: 'trip_driver',
          entityId: tripId,
          before: { driverId: previous.driverId },
          after: { driverId: null },
        });
        return { driverId: null, unchanged: false };
      });
    },

    async unassignTripDriver(adminId: string, tripId: string) {
      return this.unassign(adminId, tripId);
    },
  };
}

export const driverAdminService = createDriverAdminService();
