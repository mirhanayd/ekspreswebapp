import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { createDatabaseClient } from '../src/client.js';
import {
  buses,
  locations,
  orders,
  passengerBoarding,
  routes,
  routeStops,
  tickets,
  tripDrivers,
  trips,
  tripSeats,
  users,
} from '../src/schema/index.js';

describe('seat legs and the driver stop view against isolated PostgreSQL', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let driverBackend: typeof import('../src/server/driver-backend.js');
  const userId = randomUUID();
  const driverId = randomUUID();
  const outsiderId = randomUUID();
  const tripId = randomUUID();
  const routeId = randomUUID();
  const busId = randomUUID();
  const seatId = randomUUID();
  const stopIds = [randomUUID(), randomUUID(), randomUUID()];
  const orderIds: string[] = [];

  async function sell(from: number, to: number, status = 'active') {
    const orderId = randomUUID();
    orderIds.push(orderId);
    await client.db.insert(orders).values({
      id: orderId,
      orderNo: `TEST-${orderId}`,
      userId,
      tripId,
      tripSeatId: seatId,
      boardingLocationId: stopIds[from - 1],
      alightingLocationId: stopIds[to - 1],
      status: 'paid',
      totalMinor: 45000,
      passengerFirstName: 'Test',
      passengerLastName: `Yolcu ${from}-${to}`,
      passengerPhone: '0555 000 00 00',
      expiresAt: new Date(Date.now() + 60_000),
    });
    const [ticket] = await client.db
      .insert(tickets)
      .values({
        ticketNo: `TEST-${orderId}`,
        userId,
        tripId,
        tripSeatId: seatId,
        orderId,
        legFrom: from,
        legTo: to,
        status,
      })
      .returning();
    return ticket;
  }

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url || !['localhost', '127.0.0.1', 'postgres'].includes(new URL(url).hostname)) {
      throw new Error('Driver stop integration requires an isolated local/CI database.');
    }
    client = createDatabaseClient({ url });
    driverBackend = await import('../src/server/driver-backend.js');
    vi.stubEnv('JWT_SECRET', 'integration-test-only-signing-key');

    await client.db.insert(users).values(
      [
        [userId, 'passenger'],
        [driverId, 'driver'],
        [outsiderId, 'driver'],
      ].map(([id, role]) => ({
        id: id as string,
        email: `user-${id}@example.test`,
        firstName: 'Test',
        lastName: 'Kullanıcı',
        passwordHash: 'unused',
        role: role as 'passenger' | 'driver',
      })),
    );
    await client.db
      .insert(locations)
      .values(
        stopIds.map((id, index) => ({ id, name: `Durak ${index + 1} ${id}`, type: 'terminal' })),
      );
    await client.db.insert(routes).values({
      id: routeId,
      name: `Test ${routeId}`,
      originId: stopIds[0],
      destinationId: stopIds[2],
    });
    await client.db.insert(routeStops).values(
      stopIds.map((locationId, index) => ({
        routeId,
        locationId,
        stopOrder: index + 1,
        estimatedMinutesFromStart: index * 30,
      })),
    );
    await client.db.insert(buses).values({
      id: busId,
      plateNumber: `TEST-${busId}`,
      seatLayout: { layout: 'test' },
      totalSeats: 1,
    });
    await client.db.insert(trips).values({
      id: tripId,
      routeId,
      busId,
      departureTime: new Date('2031-01-01T14:00:00Z'),
      arrivalTime: new Date('2031-01-01T15:00:00Z'),
      status: 'scheduled',
      basePrice: 450,
    });
    await client.db.insert(tripSeats).values({
      id: seatId,
      tripId,
      seatNo: '25',
      priceMinor: 45000,
      status: 'purchased',
    });
    await client.db.insert(tripDrivers).values({ tripId, driverId });
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await client.db.delete(tickets).where(eq(tickets.tripId, tripId));
    await client.db.delete(orders).where(eq(orders.tripId, tripId));
    await client.db.delete(tripSeats).where(eq(tripSeats.tripId, tripId));
    await client.db.delete(tripDrivers).where(eq(tripDrivers.tripId, tripId));
    await client.db.delete(trips).where(eq(trips.id, tripId));
    await client.db.delete(buses).where(eq(buses.id, busId));
    await client.db.delete(routeStops).where(eq(routeStops.routeId, routeId));
    await client.db.delete(routes).where(eq(routes.id, routeId));
    await client.db.delete(locations).where(inArray(locations.id, stopIds));
    await client.db.delete(users).where(inArray(users.id, [userId, driverId, outsiderId]));
    await client.close();
  });

  it('lets a seat change hands at a stop but refuses overlapping legs', async () => {
    await sell(1, 2);
    await sell(2, 3);
    await expect(sell(1, 3)).rejects.toThrow();
    await expect(sell(2, 3)).rejects.toThrow();
  });

  it('frees a leg again when its ticket is cancelled', async () => {
    const seatTickets = await client.db.query.tickets.findMany({
      where: eq(tickets.tripSeatId, seatId),
    });
    const last = seatTickets.find((ticket) => ticket.legFrom === 2);
    await client.db
      .update(tickets)
      .set({ status: 'cancelled' })
      .where(eq(tickets.id, last?.id as string));
    await expect(sell(2, 3)).resolves.toBeDefined();
  });

  it('keeps a whole-route ticket exclusive, as checkout sells them', async () => {
    const orderId = randomUUID();
    await client.db.insert(orders).values({
      id: orderId,
      orderNo: `TEST-${orderId}`,
      userId,
      tripId,
      tripSeatId: seatId,
      status: 'paid',
      totalMinor: 45000,
      passengerFirstName: 'Tam',
      passengerLastName: 'Yol',
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(
      client.db.insert(tickets).values({
        ticketNo: `TEST-${orderId}`,
        userId,
        tripId,
        tripSeatId: seatId,
        orderId,
      }),
    ).rejects.toThrow();
    await client.db.delete(orders).where(eq(orders.id, orderId));
  });

  it('serves a stop to the assigned driver and nobody else', async () => {
    const view = await driverBackend.getDriverStop(driverId, tripId, stopIds[1]);
    expect(view.alighting.map((item) => item.seatNo)).toEqual(['25']);
    expect(view.boarding.map((item) => item.seatNo)).toEqual(['25']);
    expect(view.alighting[0].ticketId).not.toBe(view.boarding[0].ticketId);
    expect(view.stops.map((item) => [item.alightingCount, item.boardingCount])).toEqual([
      [0, 1],
      [1, 1],
      [1, 0],
    ]);
    await expect(driverBackend.getDriverStop(outsiderId, tripId, stopIds[1])).rejects.toMatchObject(
      {
        status: 403,
      },
    );
    await expect(driverBackend.getDriverStop(driverId, tripId, randomUUID())).rejects.toMatchObject(
      {
        status: 404,
      },
    );
  });

  it('stores alighted and keeps the boarding time', async () => {
    const { alighting } = await driverBackend.getDriverStop(driverId, tripId, stopIds[1]);
    const { ticketId } = alighting[0];
    await driverBackend.updateDriverPassengerStatus(driverId, tripId, ticketId, 'boarded');
    const boarded = await driverBackend.updateDriverPassengerStatus(
      driverId,
      tripId,
      ticketId,
      'alighted',
    );
    expect(boarded.status).toBe('alighted');
    expect(boarded.boardedAt).toBeInstanceOf(Date);
    await expect(
      driverBackend.updateDriverPassengerStatus(outsiderId, tripId, ticketId, 'alighted'),
    ).rejects.toMatchObject({ status: 403 });
    await client.db.delete(passengerBoarding).where(eq(passengerBoarding.ticketId, ticketId));
  });
});
