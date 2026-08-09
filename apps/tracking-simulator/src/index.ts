import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { schema } from '@ekspres/database';
import { eq, or } from 'drizzle-orm';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') }); // Load workspace .env

const TICK_RATE_MS = 2000;
const SPEED_MULTIPLIER = 10; // To make the demo move faster

async function main() {
  console.log('🚀 Starting Tracking Simulator...');

  // Connect to Postgres
  const dbUrl =
    process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ekspres_db';
  const pool = new Pool({ connectionString: dbUrl });
  const db = drizzle(pool, { schema });

  // Connect to Redis
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redis = new Redis(redisUrl);

  redis.on('connect', () => console.log('✅ Connected to Redis'));
  redis.on('error', (err) => console.error('❌ Redis error', err));

  // State to hold active trips and their progress
  const activeTrips: Record<
    string,
    {
      tripId: string;
      routeLines: [number, number][]; // [lng, lat]
      currentIdx: number;
      completed: boolean;
    }
  > = {};

  const syncActiveTrips = async () => {
    // console.log('Syncing active trips from database...');
    const trips = await db.query.trips.findMany({
      where: or(
        eq(schema.trips.status, 'in_transit'),
        eq(schema.trips.status, 'boarding'),
        eq(schema.trips.status, 'scheduled'),
      ),
      with: {
        route: {
          with: {
            origin: true,
            destination: true,
          },
        },
      },
    });

    for (const trip of trips) {
      if (!activeTrips[trip.id]) {
        // We need a path. We'll generate a simple interpolated line between origin and destination for the demo if actual route line isn't detailed
        const originGeo = trip.route.origin.coordinates as {
          type: string;
          coordinates: [number, number];
        };
        const destGeo = trip.route.destination.coordinates as {
          type: string;
          coordinates: [number, number];
        };

        const pathCoords: [number, number][] = [];
        const steps = 100;
        for (let i = 0; i <= steps; i++) {
          const lng =
            originGeo.coordinates[0] +
            (destGeo.coordinates[0] - originGeo.coordinates[0]) * (i / steps);
          const lat =
            originGeo.coordinates[1] +
            (destGeo.coordinates[1] - originGeo.coordinates[1]) * (i / steps);
          pathCoords.push([lng, lat]);
        }

        activeTrips[trip.id] = {
          tripId: trip.id,
          routeLines: pathCoords,
          currentIdx: 0,
          completed: false,
        };
        console.log(
          `➕ Added trip ${trip.id} to simulator (${trip.route.origin.name} -> ${trip.route.destination.name})`,
        );
      }
    }
  };

  // Initial sync
  await syncActiveTrips();

  // Simulation Loop
  setInterval(async () => {
    await syncActiveTrips();

    for (const tripId in activeTrips) {
      const state = activeTrips[tripId];
      if (state.completed) continue;

      const coord = state.routeLines[Math.floor(state.currentIdx)];

      // Publish to Redis
      const message = JSON.stringify({
        tripId,
        location: {
          lng: coord[0],
          lat: coord[1],
          heading: 0, // Placeholder
          speed: 80,
          timestamp: new Date().toISOString(),
        },
      });

      redis.publish('trip_locations', message);

      // Advance
      state.currentIdx += (1 * SPEED_MULTIPLIER) / 10; // tune speed
      if (state.currentIdx >= state.routeLines.length - 1) {
        state.currentIdx = state.routeLines.length - 1;
        state.completed = true;
        console.log(`🏁 Trip ${tripId} has reached destination.`);
      }
    }
  }, TICK_RATE_MS);
}

main().catch((err: Error) => {
  console.error('Fatal error in simulator:', err);
  process.exit(1);
});
