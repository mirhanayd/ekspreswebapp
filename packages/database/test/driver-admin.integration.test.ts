import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { createDatabaseClient } from '../src/client.js';
import {
  buses,
  routes,
  trips,
  locations,
  users,
  tripDrivers,
  driverAdminAudit,
} from '../src/schema/index.js';
import { createDriverAdminService } from '../src/server/driver-admin-service.js';
import { createAuthService } from '../src/server/auth-service.js';
import { signAccessToken } from '../src/server/auth.js';

describe('driver administration against isolated PostgreSQL', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let service: ReturnType<typeof createDriverAdminService>;
  const adminId = randomUUID();
  const locationIds = [randomUUID(), randomUUID()];
  const routeId = randomUUID();
  const busIds = [randomUUID(), randomUUID()];
  const tripIds = [randomUUID(), randomUUID(), randomUUID()];
  const driverIds: string[] = [];

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url || !['localhost', '127.0.0.1', 'postgres'].includes(new URL(url).hostname)) {
      throw new Error('Driver admin integration requires an isolated local/CI database.');
    }
    client = createDatabaseClient({ url });
    service = createDriverAdminService(() => client.db);
    vi.stubEnv('JWT_SECRET', 'integration-test-only-signing-key');
    await client.db.insert(users).values({
      id: adminId,
      email: `admin-${adminId}@example.test`,
      firstName: 'Test',
      lastName: 'Admin',
      passwordHash: 'unused',
      role: 'admin',
    });
    await client.db
      .insert(locations)
      .values(
        locationIds.map((id, index) => ({ id, name: `Test ${index} ${id}`, type: 'terminal' })),
      );
    await client.db.insert(routes).values({
      id: routeId,
      name: `Test ${routeId}`,
      originId: locationIds[0]!,
      destinationId: locationIds[1]!,
    });
    await client.db.insert(buses).values(
      busIds.map((id) => ({
        id,
        plateNumber: `TEST-${id}`,
        seatLayout: { layout: 'test' },
        totalSeats: 1,
      })),
    );
    const start = new Date(Date.now() + 86400000);
    const end = new Date(start.getTime() + 7200000);
    await client.db.insert(trips).values(
      tripIds.map((id, index) => ({
        id,
        routeId,
        busId: busIds[index === 2 ? 1 : 0]!,
        departureTime: new Date(start.getTime() + (index === 1 ? 14400000 : 0)),
        arrivalTime: new Date(end.getTime() + (index === 1 ? 14400000 : 0)),
        basePrice: 1,
      })),
    );
  });

  afterAll(async () => {
    if (client) {
      try {
        await client.db.delete(driverAdminAudit).where(eq(driverAdminAudit.adminId, adminId));
        await client.db.delete(tripDrivers).where(inArray(tripDrivers.tripId, tripIds));
        await client.db.delete(trips).where(inArray(trips.id, tripIds));
        await client.db.delete(buses).where(inArray(buses.id, busIds));
        await client.db.delete(routes).where(eq(routes.id, routeId));
        await client.db.delete(locations).where(inArray(locations.id, locationIds));
        await client.db.delete(users).where(inArray(users.id, [adminId, ...driverIds]));
      } finally {
        await client.close();
      }
    }
    vi.unstubAllEnvs();
  });

  it('provisions unique driver accounts, revokes deactivated sessions and records actions', async () => {
    const input = (name: string) => ({
      firstName: name,
      lastName: 'Driver',
      email: `${name.toLowerCase()}-${randomUUID()}@example.test`,
      password: 'temporary-strong-password',
    });
    const firstInput = input('First');
    const first = await service.createDriver(adminId, firstInput);
    driverIds.push(first.id);
    const second = await service.createDriver(adminId, input('Second'));
    driverIds.push(second.id);
    expect(first).not.toHaveProperty('passwordHash');
    await expect(service.createDriver(adminId, firstInput)).rejects.toMatchObject({ status: 409 });
    const auth = createAuthService(() => client.db);
    const principal = await auth.login(
      { email: firstInput.email, password: firstInput.password },
      'driver',
    );
    const token = signAccessToken(principal);
    await service.setDriverActive(adminId, first.id, false);
    await expect(auth.session(token)).rejects.toMatchObject({ status: 401 });
    await expect(
      auth.login({ email: firstInput.email, password: firstInput.password }, 'driver'),
    ).rejects.toMatchObject({ status: 403 });
    await service.setDriverActive(adminId, first.id, true);
    await expect(auth.session(token)).rejects.toMatchObject({ status: 401 });
    await service.setDriverActive(adminId, first.id, true);
    const reactivatedToken = signAccessToken(
      await auth.login({ email: firstInput.email, password: firstInput.password }, 'driver'),
    );
    expect((await auth.session(reactivatedToken)).id).toBe(first.id);
    await service.resetDriverPassword(adminId, first.id, 'another-strong-password');
    await expect(auth.session(reactivatedToken)).rejects.toMatchObject({ status: 401 });
    await expect(
      auth.login({ email: firstInput.email, password: firstInput.password }, 'driver'),
    ).rejects.toMatchObject({ status: 401 });
    expect(
      (await auth.login({ email: firstInput.email, password: 'another-strong-password' }, 'driver'))
        .id,
    ).toBe(first.id);
  });

  it('assigns, replaces, immediately revokes old assignment and rejects overlaps', async () => {
    const [first, second] = driverIds;
    await expect(service.getAssignment(randomUUID())).rejects.toMatchObject({ status: 404 });
    expect(await service.getAssignment(tripIds[0]!)).toMatchObject({ driverId: null });
    expect(await service.assign(adminId, tripIds[0]!, first!)).toMatchObject({ unchanged: false });
    expect(await service.assign(adminId, tripIds[0]!, first!)).toMatchObject({ unchanged: true });
    const firstTrip = await client.db.query.trips.findFirst({ where: eq(trips.id, tripIds[0]!) });
    await client.db
      .update(trips)
      .set({ departureTime: firstTrip!.departureTime, arrivalTime: firstTrip!.arrivalTime })
      .where(eq(trips.id, tripIds[1]!));
    await expect(service.assign(adminId, tripIds[1]!, second!)).rejects.toMatchObject({
      status: 409,
    });
    await client.db
      .update(trips)
      .set({
        departureTime: new Date(firstTrip!.departureTime.getTime() + 14400000),
        arrivalTime: new Date(firstTrip!.arrivalTime.getTime() + 14400000),
      })
      .where(eq(trips.id, tripIds[1]!));
    await expect(service.assign(adminId, tripIds[2]!, first!)).rejects.toMatchObject({
      status: 409,
    });
    await service.assign(adminId, tripIds[0]!, second!);
    expect((await service.getAssignment(tripIds[0]!)).driverId).toBe(second);
    expect(
      await client.db.select().from(tripDrivers).where(eq(tripDrivers.driverId, first!)),
    ).toHaveLength(0);
    expect(await service.unassign(adminId, tripIds[0]!)).toMatchObject({ unchanged: false });
    expect(await service.unassign(adminId, tripIds[0]!)).toMatchObject({ unchanged: true });
  });
});
