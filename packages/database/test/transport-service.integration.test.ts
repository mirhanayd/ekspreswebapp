import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { createDatabaseClient } from '../src/client.js';
import * as schema from '../src/schema/index.js';
import { createTransportService } from '../src/server/transport-service.js';

describe('serverless transport queries against PostgreSQL', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let service: ReturnType<typeof createTransportService>;
  const originId = randomUUID();
  const destinationId = randomUUID();
  const routeId = randomUUID();
  const busId = randomUUID();
  const tripId = randomUUID();
  const otherTripId = randomUUID();

  beforeAll(async () => {
    const url = process.env.DATABASE_URL;
    if (!url || !['localhost', '127.0.0.1', 'postgres'].includes(new URL(url).hostname)) {
      throw new Error(
        'Transport integration tests require an isolated local/CI PostgreSQL database.',
      );
    }
    client = createDatabaseClient({ url });
    service = createTransportService(() => client.db);
    await client.db.insert(schema.locations).values([
      { id: originId, name: 'Integration Origin', type: 'terminal' },
      { id: destinationId, name: 'Integration Destination', type: 'terminal' },
    ]);
    await client.db.insert(schema.routes).values({
      id: routeId,
      name: 'Integration Route',
      originId,
      destinationId,
    });
    await client.db.insert(schema.routeStops).values([
      {
        routeId,
        locationId: destinationId,
        stopOrder: 2,
        estimatedMinutesFromStart: 90,
      },
      { routeId, locationId: originId, stopOrder: 1, estimatedMinutesFromStart: 0 },
    ]);
    await client.db.insert(schema.buses).values({
      id: busId,
      plateNumber: `T${busId.slice(0, 7)}`,
      model: 'Integration Coach',
      seatLayout: { layout: '2+1' },
      totalSeats: 30,
    });
    await client.db.insert(schema.trips).values([
      {
        id: tripId,
        routeId,
        busId,
        departureTime: new Date('2035-01-15T09:00:00.000Z'),
        arrivalTime: new Date('2035-01-15T10:30:00.000Z'),
        basePrice: 500,
      },
      {
        id: otherTripId,
        routeId,
        busId,
        departureTime: new Date('2035-01-16T09:00:00.000Z'),
        arrivalTime: new Date('2035-01-16T10:30:00.000Z'),
        basePrice: 600,
      },
    ]);
  });

  afterAll(async () => {
    if (!client) return;
    try {
      await client.db.delete(schema.trips).where(inArray(schema.trips.id, [tripId, otherTripId]));
      await client.db.delete(schema.routeStops).where(eq(schema.routeStops.routeId, routeId));
      await client.db.delete(schema.buses).where(eq(schema.buses.id, busId));
      await client.db.delete(schema.routes).where(eq(schema.routes.id, routeId));
      await client.db
        .delete(schema.locations)
        .where(inArray(schema.locations.id, [originId, destinationId]));
    } finally {
      await client.close();
    }
  });

  it('filters trips in SQL by UTC date and route endpoints', async () => {
    const results = await service.getTrips({
      date: '2035-01-15',
      originId,
      destinationId,
    });
    expect(results).toHaveLength(1);
    expect(results[0].trip.id).toBe(tripId);
    expect(results[0].trip.departureTime).toBe('2035-01-15T09:00:00.000Z');
    expect(await service.getTrips({ date: '2035-01-14', originId, destinationId })).toEqual([]);
  });

  it('returns the established trip-detail JSON contract with ordered stops', async () => {
    const trip = await service.getTripDetails(tripId);
    expect(trip.bus.plateNumber).toBe(`T${busId.slice(0, 7)}`);
    expect(trip.route.origin.id).toBe(originId);
    expect(trip.route.destination.id).toBe(destinationId);
    expect(trip.route.stops.map((stop) => stop.stopOrder)).toEqual([1, 2]);
    expect(trip.createdAt).toEqual(expect.any(String));
  });

  it('returns public locations/routes and rejects an unknown trip', async () => {
    const [locations, routes] = await Promise.all([service.getLocations(), service.getRoutes()]);
    expect(locations.some((location) => location.id === originId)).toBe(true);
    expect(routes.some((route) => route.id === routeId)).toBe(true);
    await expect(service.getTripDetails(randomUUID())).rejects.toMatchObject({ status: 404 });
  });
});
