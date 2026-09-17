import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { Pool, type PoolClient } from 'pg';
import { DEMO_CREDENTIALS, DEMO_IDS } from '../demo-constants.js';
import { DEMO_TRIP_IDS, insertDemoActiveTicket, insertDemoTransport } from '../demo-fixture.js';
import { assertSafeStagingDatabase } from './staging-seed-safety.js';

dotenv.config({ path: join(process.cwd(), '../../.env') });

type FixtureRole = 'passenger' | 'admin' | 'driver';

async function upsertFixtureUser(
  client: PoolClient,
  fixture: {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: FixtureRole;
  },
) {
  const passwordHash = await bcrypt.hash(fixture.password, 10);
  const result = await client.query<{ id: string }>(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       role = EXCLUDED.role,
       updated_at = now()
     RETURNING id`,
    [fixture.id, fixture.email, passwordHash, fixture.firstName, fixture.lastName, fixture.role],
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error(`Could not resolve staging fixture account ${fixture.email}.`);
  return id;
}

async function clearFixtureTransactions(client: PoolClient) {
  const tripIds = [...DEMO_TRIP_IDS];
  await client.query(
    `DELETE FROM passenger_boarding
     WHERE ticket_id IN (SELECT id FROM tickets WHERE trip_id = ANY($1::uuid[]))`,
    [tripIds],
  );
  await client.query('DELETE FROM tracking_positions WHERE trip_id = ANY($1::uuid[])', [tripIds]);
  await client.query(
    `DELETE FROM payments
     WHERE order_id IN (SELECT id FROM orders WHERE trip_id = ANY($1::uuid[]))`,
    [tripIds],
  );
  await client.query('DELETE FROM tickets WHERE trip_id = ANY($1::uuid[])', [tripIds]);
  await client.query('DELETE FROM orders WHERE trip_id = ANY($1::uuid[])', [tripIds]);
  await client.query(
    `DELETE FROM seat_holds
     WHERE trip_seat_id IN (SELECT id FROM trip_seats WHERE trip_id = ANY($1::uuid[]))`,
    [tripIds],
  );
  await client.query('DELETE FROM trip_drivers WHERE trip_id = ANY($1::uuid[])', [tripIds]);
  await client.query('DELETE FROM trip_seats WHERE trip_id = ANY($1::uuid[])', [tripIds]);
  await client.query('DELETE FROM trips WHERE id = ANY($1::uuid[])', [tripIds]);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  assertSafeStagingDatabase(connectionString, process.env.STAGING_SEED_CONFIRM);

  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('ekspres-staging-seed-v1'))");

    const passengerId = await upsertFixtureUser(client, {
      id: DEMO_IDS.passenger,
      ...DEMO_CREDENTIALS.passenger,
      firstName: 'Demo',
      lastName: 'Yolcu',
      role: 'passenger',
    });
    await upsertFixtureUser(client, {
      id: DEMO_IDS.admin,
      ...DEMO_CREDENTIALS.admin,
      firstName: 'Demo',
      lastName: 'Yönetici',
      role: 'admin',
    });
    const driverId = await upsertFixtureUser(client, {
      id: DEMO_IDS.driver,
      ...DEMO_CREDENTIALS.driver,
      firstName: 'Mehmet',
      lastName: 'Kaya',
      role: 'driver',
    });

    await clearFixtureTransactions(client);
    await insertDemoTransport(client, driverId);
    await insertDemoActiveTicket(client, passengerId);
    await client.query('COMMIT');
    console.log(
      'Staging fixture ready: accounts preserved, 4 terminals, route, bus, 4 trips, 156 seats, assignments and active ticket.',
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
