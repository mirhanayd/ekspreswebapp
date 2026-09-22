import { and, eq, gte, lt, type SQL } from 'drizzle-orm';
import * as schema from '../schema/index.js';
import { serverDatabase } from './database.js';
import { ServerError } from './errors.js';

type Database = ReturnType<typeof serverDatabase>;

export type TripSearch = {
  date?: string;
  originId?: string;
  destinationId?: string;
};

function optionalUuid(value: string | undefined, field: string) {
  if (!value) return undefined;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ServerError(400, `${field} geçerli bir UUID olmalıdır.`);
  }
  return value;
}

function dateRange(value: string | undefined) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ServerError(400, 'date YYYY-MM-DD biçiminde olmalıdır.');
  }
  const start = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== value) {
    throw new ServerError(400, 'date geçerli bir tarih olmalıdır.');
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export function validateTripSearch(input: TripSearch): TripSearch {
  const range = dateRange(input.date);
  return {
    date: range ? input.date : undefined,
    originId: optionalUuid(input.originId, 'originId'),
    destinationId: optionalUuid(input.destinationId, 'destinationId'),
  };
}

export function createTransportService(database: () => Database = serverDatabase) {
  return {
    getLocations() {
      return database().query.locations.findMany({
        orderBy: (locations, { asc }) => [asc(locations.name)],
      });
    },

    getRoutes() {
      return database().query.routes.findMany({ orderBy: (routes, { asc }) => [asc(routes.name)] });
    },

    async getTrips(input: TripSearch = {}) {
      const query = validateTripSearch(input);
      const range = dateRange(query.date);
      const conditions: SQL[] = [];
      if (query.originId) conditions.push(eq(schema.routes.originId, query.originId));
      if (query.destinationId)
        conditions.push(eq(schema.routes.destinationId, query.destinationId));
      if (range) {
        conditions.push(gte(schema.trips.departureTime, range.start));
        conditions.push(lt(schema.trips.departureTime, range.end));
      }

      return database()
        .select({ trip: schema.trips, route: schema.routes, bus: schema.buses })
        .from(schema.trips)
        .innerJoin(schema.routes, eq(schema.trips.routeId, schema.routes.id))
        .innerJoin(schema.buses, eq(schema.trips.busId, schema.buses.id))
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(schema.trips.departureTime);
    },

    async getTripDetails(tripId: string) {
      optionalUuid(tripId, 'tripId');
      const trip = await database().query.trips.findFirst({
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
      if (!trip) throw new ServerError(404, 'Sefer bulunamadı.');
      return trip;
    },
  };
}

export const transportService = createTransportService();
