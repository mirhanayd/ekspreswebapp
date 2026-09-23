import { createHmac, randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import * as schema from '../schema/index.js';
import { serverDatabase } from './database.js';
import { ServerError } from './errors.js';

const TRACKING_TOKEN_TTL_MS = 5 * 60 * 1000;
const TRACKABLE_TRIP_STATUSES = new Set(['boarding', 'in_transit']);
type Database = ReturnType<typeof serverDatabase>;

export type TrackingPosition = {
  tripId: string;
  busId: string;
  longitude: number;
  latitude: number;
  speedKph: number;
  headingDeg: number;
  recordedAt: string;
  sequence: number;
  source: string;
};

export type ManagedRealtimeTokenRequest = {
  keyName: string;
  ttl: number;
  capability: string;
  clientId: string;
  timestamp: number;
  nonce: string;
  mac: string;
};

function uuid(value: string, field: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ServerError(400, `${field} geçerli bir UUID olmalıdır.`);
  }
  return value;
}

export function managedTrackingChannel(tripId: string) {
  return `trip:${uuid(tripId, 'tripId')}:location`;
}

export async function publishManagedTrackingPosition(
  position: TrackingPosition,
  options: { apiKey?: string; fetcher?: typeof fetch } = {},
) {
  const apiKey = options.apiKey ?? process.env.ABLY_API_KEY;
  if (!apiKey) return false;
  const authorization = Buffer.from(apiKey).toString('base64');
  try {
    const response = await (options.fetcher ?? fetch)(
      `https://main.realtime.ably.net/channels/${encodeURIComponent(
        managedTrackingChannel(position.tripId),
      )}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authorization}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'location', data: position }),
        signal: AbortSignal.timeout(2000),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
}

export function createManagedRealtimeTokenRequest(
  apiKey: string,
  input: { userId: string; tripId: string; now?: number; nonce?: string },
): ManagedRealtimeTokenRequest {
  const separator = apiKey.indexOf(':');
  const keyName = apiKey.slice(0, separator);
  const keySecret = apiKey.slice(separator + 1);
  if (separator < 1 || !keySecret) {
    throw new ServerError(500, 'Canlı takip sağlayıcısı yapılandırması geçersiz.');
  }
  const timestamp = input.now ?? Date.now();
  const nonce = input.nonce ?? randomUUID();
  const clientId = `passenger:${uuid(input.userId, 'userId')}`;
  const capability = JSON.stringify({
    [managedTrackingChannel(input.tripId)]: ['subscribe'],
  });
  const signText = `${keyName}\n${TRACKING_TOKEN_TTL_MS}\n${capability}\n${clientId}\n${timestamp}\n${nonce}\n`;
  return {
    keyName,
    ttl: TRACKING_TOKEN_TTL_MS,
    capability,
    clientId,
    timestamp,
    nonce,
    mac: createHmac('sha256', keySecret).update(signText).digest('base64'),
  };
}

export function createTrackingService(database: () => Database = serverDatabase) {
  async function entitledTicket(ticketId: string, userId: string) {
    uuid(ticketId, 'ticketId');
    uuid(userId, 'userId');
    const ticket = await database().query.tickets.findFirst({
      where: and(eq(schema.tickets.id, ticketId), eq(schema.tickets.userId, userId)),
      with: {
        trip: {
          with: {
            bus: true,
            route: {
              with: {
                origin: true,
                destination: true,
                stops: { with: { location: true } },
              },
            },
          },
        },
      },
    });
    if (!ticket) throw new ServerError(404, 'Bilet bulunamadı.');
    if (ticket.status !== 'active') throw new ServerError(409, 'Bilet aktif değil.');
    if (!TRACKABLE_TRIP_STATUSES.has(ticket.trip.status)) {
      throw new ServerError(409, 'Canlı takip bu sefer için aktif değil.');
    }
    return ticket;
  }

  return {
    async getBootstrap(ticketId: string, userId: string) {
      const ticket = await entitledTicket(ticketId, userId);
      const geometryResult = await database().execute<{ geometry: string | null }>(sql`
        SELECT ST_AsGeoJSON(geometry)::text AS geometry
        FROM routes
        WHERE id = ${ticket.trip.routeId}
      `);
      const geometry = geometryResult.rows[0]?.geometry;
      if (!geometry) throw new ServerError(409, 'Takip rota geometrisi bulunamadı.');

      const latestResult = await database().execute<{
        trip_id: string;
        bus_id: string;
        longitude: number;
        latitude: number;
        speed_kph: number;
        heading_deg: number;
        recorded_at: Date;
        sequence: number;
        source: string;
      }>(sql`
        SELECT trip_id, bus_id,
               ST_X(position)::float8 AS longitude,
               ST_Y(position)::float8 AS latitude,
               speed_kph, heading_deg, recorded_at, sequence, source
        FROM tracking_positions
        WHERE trip_id = ${ticket.tripId}
        ORDER BY recorded_at DESC
        LIMIT 1
      `);
      const latest = latestResult.rows[0];
      const latestPosition: TrackingPosition | null = latest
        ? {
            tripId: latest.trip_id,
            busId: latest.bus_id,
            longitude: Number(latest.longitude),
            latitude: Number(latest.latitude),
            speedKph: Number(latest.speed_kph),
            headingDeg: Number(latest.heading_deg),
            recordedAt: new Date(latest.recorded_at).toISOString(),
            sequence: latest.sequence,
            source: latest.source,
          }
        : null;

      return {
        ticketId: ticket.id,
        trip: {
          id: ticket.trip.id,
          departureTime: ticket.trip.departureTime.toISOString(),
          arrivalTime: ticket.trip.arrivalTime.toISOString(),
          status: ticket.trip.status,
          bus: {
            plateNumber: ticket.trip.bus.plateNumber,
            model: ticket.trip.bus.model,
          },
          route: {
            origin: { name: ticket.trip.route.origin.name },
            destination: { name: ticket.trip.route.destination.name },
            stops: ticket.trip.route.stops.map((stop) => ({
              id: stop.id,
              stopOrder: stop.stopOrder,
              estimatedMinutesFromStart: stop.estimatedMinutesFromStart,
              location: {
                name: stop.location.name,
                coordinates: stop.location.coordinates,
              },
            })),
          },
        },
        routeGeometry: JSON.parse(geometry) as {
          type: 'LineString';
          coordinates: Array<[number, number]>;
        },
        latestPosition,
        realtime: {
          channel: managedTrackingChannel(ticket.tripId),
          authUrl: `/api/tracking/tickets/${ticket.id}/token`,
        },
      };
    },

    async createRealtimeToken(ticketId: string, userId: string, apiKey = process.env.ABLY_API_KEY) {
      const ticket = await entitledTicket(ticketId, userId);
      if (!apiKey) throw new ServerError(503, 'Canlı takip sağlayıcısı yapılandırılmamış.');
      return createManagedRealtimeTokenRequest(apiKey, { userId, tripId: ticket.tripId });
    },
  };
}

export const trackingService = createTrackingService();
