import * as dotenv from 'dotenv';
import { join } from 'path';
import { Pool } from 'pg';
import {
  insertDemoActiveTicket,
  insertDemoTransport,
  insertDeterministicDemoUsers,
} from './demo-fixture.js';
import { DEMO_IDS } from './demo-constants.js';

dotenv.config({ path: join(process.cwd(), '../../.env') });

function assertLocalDemoDatabase(connectionString: string) {
  const url = new URL(connectionString);
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  const databaseName = url.pathname.replace(/^\//, '').toLowerCase();
  if (!localHosts.has(url.hostname) || databaseName.includes('prod')) {
    throw new Error(
      'SAFETY GUARD: demo reset is allowed only for a local non-production database.',
    );
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  assertLocalDemoDatabase(connectionString);

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      TRUNCATE TABLE
        passenger_boarding, trip_drivers, tickets, payments, orders, seat_holds, trip_seats, trips,
        buses, route_stops, routes, locations, users
      RESTART IDENTITY CASCADE
    `);
    await insertDeterministicDemoUsers(client);
    await insertDemoTransport(client, DEMO_IDS.driver);
    await insertDemoActiveTicket(client, DEMO_IDS.passenger);
    await client.query('COMMIT');
    console.log(
      'Demo reset complete: passenger, admin, driver, trips, seats, ticket and assignments ready.',
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
