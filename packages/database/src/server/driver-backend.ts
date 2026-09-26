import { authService } from './auth-service.js';
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { serverDatabase as db } from './database.js';
import * as schema from '../schema/index.js';
import { publishManagedTrackingPosition } from './tracking-service.js';

export { ServerError as DriverBackendError } from './errors.js';
import { ServerError as DriverBackendError } from './errors.js';

export type DriverPrincipal = {
  id: string;
  email: string;
  role: string;
};

export async function authenticateDriver(
  email: string,
  password: string,
): Promise<DriverPrincipal> {
  return authService.login({ email: email.trim().toLowerCase(), password }, 'driver');
}

async function getTripDetails(tripId: string) {
  const trip = await db().query.trips.findFirst({
    where: eq(schema.trips.id, tripId),
    with: {
      bus: true,
      route: {
        with: {
          origin: true,
          destination: true,
          stops: {
            with: { location: true },
            orderBy: (stops, { asc }) => [asc(stops.stopOrder)],
          },
        },
      },
    },
  });

  if (!trip) throw new DriverBackendError(404, 'Sefer bulunamadı.');
  return trip;
}

async function assertAssignment(driverId: string, tripId: string) {
  const [assignment] = await db()
    .select({
      tripId: schema.tripDrivers.tripId,
      busId: schema.trips.busId,
    })
    .from(schema.tripDrivers)
    .innerJoin(schema.trips, eq(schema.tripDrivers.tripId, schema.trips.id))
    .where(and(eq(schema.tripDrivers.driverId, driverId), eq(schema.tripDrivers.tripId, tripId)))
    .limit(1);

  if (!assignment) {
    throw new DriverBackendError(403, 'Bu sefer bu sürücüye atanmış değil.');
  }

  return assignment;
}

async function getManifest(tripId: string) {
  const rows = await db()
    .select({
      ticketId: schema.tickets.id,
      ticketNo: schema.tickets.ticketNo,
      seatNo: schema.tripSeats.seatNo,
      firstName: schema.orders.passengerFirstName,
      lastName: schema.orders.passengerLastName,
      phone: schema.orders.passengerPhone,
      email: schema.orders.passengerEmail,
      boardingLocationId: schema.orders.boardingLocationId,
      alightingLocationId: schema.orders.alightingLocationId,
      boardingStatus: schema.passengerBoarding.status,
    })
    .from(schema.tickets)
    .innerJoin(schema.orders, eq(schema.tickets.orderId, schema.orders.id))
    .innerJoin(schema.tripSeats, eq(schema.tickets.tripSeatId, schema.tripSeats.id))
    .leftJoin(schema.passengerBoarding, eq(schema.passengerBoarding.ticketId, schema.tickets.id))
    .where(
      and(eq(schema.tickets.tripId, tripId), inArray(schema.tickets.status, ['active', 'used'])),
    );

  return rows.map((row) => ({ ...row, boardingStatus: row.boardingStatus || 'pending' }));
}

export async function listDriverTrips(driverId: string) {
  const assignments = await db()
    .select({ tripId: schema.tripDrivers.tripId })
    .from(schema.tripDrivers)
    .where(eq(schema.tripDrivers.driverId, driverId));

  return Promise.all(
    assignments.map(async ({ tripId }) => {
      const trip = await getTripDetails(tripId);
      const manifest = await getManifest(tripId);
      return {
        ...trip,
        passengerSummary: {
          total: manifest.length,
          boarded: manifest.filter((passenger) => passenger.boardingStatus === 'boarded').length,
          noShow: manifest.filter((passenger) => passenger.boardingStatus === 'no_show').length,
        },
      };
    }),
  );
}

export async function getDriverTrip(driverId: string, tripId: string) {
  await assertAssignment(driverId, tripId);
  const trip = await getTripDetails(tripId);
  const manifest = await getManifest(tripId);
  const stops = trip.route.stops.map((stop) => ({
    ...stop,
    passengers: manifest.filter(
      (passenger) => (passenger.boardingLocationId || trip.route.originId) === stop.locationId,
    ),
  }));

  return { ...trip, route: { ...trip.route, stops }, manifest };
}

export async function updateDriverTripStatus(
  driverId: string,
  tripId: string,
  status: 'scheduled' | 'boarding' | 'in_transit' | 'completed',
) {
  await assertAssignment(driverId, tripId);
  const [trip] = await db()
    .update(schema.trips)
    .set({ status })
    .where(eq(schema.trips.id, tripId))
    .returning();

  if (!trip) throw new DriverBackendError(404, 'Sefer bulunamadı.');
  return trip;
}

export async function updateDriverPassengerStatus(
  driverId: string,
  tripId: string,
  ticketId: string,
  status: 'pending' | 'boarded' | 'no_show',
) {
  await assertAssignment(driverId, tripId);
  const ticket = await db().query.tickets.findFirst({
    where: and(
      eq(schema.tickets.id, ticketId),
      eq(schema.tickets.tripId, tripId),
      ne(schema.tickets.status, 'cancelled'),
    ),
  });

  if (!ticket) throw new DriverBackendError(404, 'Yolcu bileti bulunamadı.');

  const [boarding] = await db()
    .insert(schema.passengerBoarding)
    .values({
      ticketId,
      status,
      updatedBy: driverId,
      boardedAt: status === 'boarded' ? new Date() : null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.passengerBoarding.ticketId,
      set: {
        status,
        updatedBy: driverId,
        boardedAt: status === 'boarded' ? new Date() : null,
        updatedAt: new Date(),
      },
    })
    .returning();

  return boarding;
}

type DriverLocationInput = {
  longitude: number;
  latitude: number;
  speedKph: number;
  headingDeg: number;
  recordedAt?: string;
};

export async function recordDriverLocation(
  driverId: string,
  tripId: string,
  input: DriverLocationInput,
) {
  const assignment = await assertAssignment(driverId, tripId);
  const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();
  const sequence = Math.floor(recordedAt.getTime() / 1000);

  const position = {
    tripId,
    busId: assignment.busId,
    longitude: input.longitude,
    latitude: input.latitude,
    speedKph: input.speedKph,
    headingDeg: input.headingDeg,
    recordedAt: recordedAt.toISOString(),
    sequence,
    source: 'MOBILE_APP' as const,
  };

  const [latest] = await db()
    .select({ recordedAt: schema.trackingPositions.recordedAt })
    .from(schema.trackingPositions)
    .where(eq(schema.trackingPositions.tripId, tripId))
    .orderBy(desc(schema.trackingPositions.recordedAt))
    .limit(1);

  const historyIntervalSeconds = Number(process.env.TRACKING_HISTORY_INTERVAL_SECONDS || 30);
  const shouldPersist =
    !latest ||
    recordedAt.getTime() - new Date(latest.recordedAt).getTime() >= historyIntervalSeconds * 1000;

  if (shouldPersist) {
    await db()
      .insert(schema.trackingPositions)
      .values({
        tripId,
        busId: assignment.busId,
        position: {
          type: 'Point',
          coordinates: [input.longitude, input.latitude],
        },
        speedKph: input.speedKph,
        headingDeg: input.headingDeg,
        recordedAt,
        sequence,
        source: position.source,
      })
      .onConflictDoNothing();
  }

  await publishManagedTrackingPosition(position);
  return position;
}
