import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'node:http';
import { Coordinate, headingBetween, pointAtProgress } from './route-progress.js';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const TICK_RATE_MS = 2000;
const PROGRESS_PER_TICK = 0.01;
const START_PROGRESS = Number(process.env.SIMULATOR_START_PERCENT || 18) / 100;
const configuredTrackingTtl = Number(process.env.TRACKING_LATEST_TTL_SECONDS || 120);
const TRACKING_LATEST_TTL_SECONDS =
  Number.isInteger(configuredTrackingTtl) && configuredTrackingTtl >= 30
    ? configuredTrackingTtl
    : 120;

type ActiveTripRow = {
  tripId: string;
  busId: string;
  geometry: string;
};

type ActiveTripState = ActiveTripRow & {
  coordinates: Coordinate[];
  progress: number;
  sequence: number;
};

async function main() {
  console.log('Tracking simulator starting...');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const activeTrips = new Map<string, ActiveTripState>();

  async function syncActiveTrip() {
    const result = await db.execute<ActiveTripRow>(sql`
      SELECT
        t.id AS "tripId",
        t.bus_id AS "busId",
        ST_AsGeoJSON(r.geometry)::text AS geometry
      FROM trips t
      INNER JOIN routes r ON r.id = t.route_id
      WHERE t.status = 'in_transit' AND r.geometry IS NOT NULL
    `);
    const currentIds = new Set(result.rows.map((trip) => trip.tripId));
    for (const tripId of activeTrips.keys()) {
      if (!currentIds.has(tripId)) activeTrips.delete(tripId);
    }
    for (const trip of result.rows) {
      if (activeTrips.has(trip.tripId)) continue;
      const geoJson = JSON.parse(trip.geometry) as { type: string; coordinates: Coordinate[] };
      if (geoJson.type !== 'LineString' || geoJson.coordinates.length < 2) continue;
      activeTrips.set(trip.tripId, {
        ...trip,
        coordinates: geoJson.coordinates,
        progress: START_PROGRESS,
        sequence: 0,
      });
      console.log(`Simulating in-transit trip ${trip.tripId} on its PostGIS route.`);
    }
  }

  await syncActiveTrip();
  const healthPort = Number(process.env.SIMULATOR_HEALTH_PORT || 0);
  const healthServer = healthPort
    ? createServer((request, response) => {
        if (request.url !== '/status') {
          response.writeHead(404).end();
          return;
        }
        response
          .writeHead(200, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ status: 'ok', activeTrips: activeTrips.size }));
      }).listen(healthPort, '127.0.0.1')
    : null;
  let ticking = false;
  const interval = setInterval(async () => {
    if (ticking) return;
    ticking = true;
    try {
      await syncActiveTrip();
      for (const state of activeTrips.values()) {
        const coordinate = pointAtProgress(state.coordinates, state.progress);
        const lookAhead = pointAtProgress(state.coordinates, Math.min(1, state.progress + 0.005));
        const position = {
          tripId: state.tripId,
          busId: state.busId,
          longitude: coordinate[0],
          latitude: coordinate[1],
          speedKph: state.progress >= 1 ? 0 : 72,
          headingDeg: headingBetween(coordinate, lookAhead),
          recordedAt: new Date().toISOString(),
          sequence: ++state.sequence,
          source: 'SIMULATOR' as const,
        };
        const message = JSON.stringify(position);
        await redis
          .multi()
          .set(`tracking:latest:${state.tripId}`, message, 'EX', TRACKING_LATEST_TTL_SECONDS)
          .publish('trip_locations', message)
          .exec();
        state.progress = state.progress >= 1 ? START_PROGRESS : state.progress + PROGRESS_PER_TICK;
      }
    } finally {
      ticking = false;
    }
  }, TICK_RATE_MS);

  async function shutdown() {
    clearInterval(interval);
    if (healthServer) {
      await new Promise<void>((resolve, reject) =>
        healthServer.close((error) => (error ? reject(error) : resolve())),
      );
    }
    await redis.quit();
    await pool.end();
  }
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error: Error) => {
  console.error('Tracking simulator failed:', error.message);
  process.exit(1);
});
