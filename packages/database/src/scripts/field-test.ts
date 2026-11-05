import * as dotenv from 'dotenv';
import { createHash } from 'crypto';
import { join } from 'path';
import { Pool, PoolClient } from 'pg';
import { DEMO_CREDENTIALS } from '../demo-constants.js';
import { STAGING_IDS, stagingUuid } from '../staging-fixture-ids.js';
import { COACH_SEAT_COUNT } from '../seat-layout.js';

dotenv.config({ path: join(process.cwd(), '../../.env') });

/**
 * One-off field test on staging: the live Siirt → Trabzon coach whose passenger alights at
 * Trabzon bus terminal, so the 5 km / 1 km alighting alerts can be checked on a real road.
 *
 *   field-test seed   creates the trip (idempotent) and parks the staging Siirt live trip
 *   field-test clean  removes everything it created and restores the Siirt live trip
 */

const STAGING_CONFIRMATION = 'ekspres-staging';
const PREFIX = 'field-test:trabzon';
const id = (key: string) => stagingUuid(`${PREFIX}:${key}`);

/** The real Siirt → Trabzon coach (Kurtalan 13:13 … Trabzon 03:43); minutes from the 12:43 start. */
const stopPlan = [
  { key: 'siirt', name: 'Siirt Otogarı', lng: 41.9155, lat: 37.9222, minutes: 0 },
  { key: 'kurtalan', name: 'Kurtalan Otogarı', lng: 41.702, lat: 37.9288, minutes: 30 },
  { key: 'besiri', name: 'Beşiri', lng: 41.2911, lat: 37.9187, minutes: 60 },
  { key: 'batman', name: 'Batman Otogarı', lng: 41.1109, lat: 37.9067, minutes: 88 },
  { key: 'bismil', name: 'Bismil Otogarı', lng: 40.6859, lat: 37.844, minutes: 136 },
  { key: 'diyarbakir', name: 'Diyarbakır Otogarı', lng: 40.1349, lat: 37.9199, minutes: 209 },
  { key: 'bingol', name: 'Bingöl Otogarı', lng: 40.5077, lat: 38.8825, minutes: 360 },
  { key: 'karliova', name: 'Karlıova', lng: 41.0116, lat: 39.2971, minutes: 450 },
  { key: 'erzurum', name: 'Erzurum Otogarı', lng: 41.2203, lat: 39.9611, minutes: 540 },
  { key: 'askale', name: 'Aşkale', lng: 40.6795, lat: 39.9199, minutes: 585 },
  { key: 'bayburt', name: 'Bayburt Otogarı', lng: 40.2065, lat: 40.2626, minutes: 659 },
  { key: 'gumushane', name: 'Gümüşhane Otogarı', lng: 39.4711, lat: 40.4614, minutes: 720 },
  { key: 'torul', name: 'Torul Otogarı', lng: 39.2945, lat: 40.5567, minutes: 750 },
  { key: 'macka', name: 'Maçka', lng: 39.6133, lat: 40.8112, minutes: 780 },
  { key: 'trabzon', name: 'Trabzon Otogarı', lng: 39.7504, lat: 40.9906, minutes: 900 },
];

const IDS = {
  siirt: id('location:siirt'),
  trabzon: id('location:trabzon'),
  route: id('route'),
  trip: id('trip'),
  order: id('order'),
  payment: id('payment'),
  ticket: id('ticket'),
  boarding: id('boarding'),
};

const SEAT_NO = '25';

const locationId = (key: string) => id(`location:${key}`);

/**
 * Alerts fire on the remaining distance along this line, so the stretch into Trabzon follows
 * the road: Torul → Zigana tunnel → Maçka → Esiroğlu → Değirmendere valley → terminal.
 */
const routeLine: Array<[number, number]> = stopPlan.flatMap((stop): Array<[number, number]> => {
  if (stop.key === 'macka')
    return [
      [39.3934, 40.6498],
      [stop.lng, stop.lat],
    ];
  if (stop.key === 'trabzon')
    return [
      [39.6749, 40.8839],
      [39.7187, 40.9481],
      [stop.lng, stop.lat],
    ];
  return [[stop.lng, stop.lat]];
});

/** Today at 12:43 in Istanbul, whatever time zone the script runs in. */
function departureToday() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return new Date(Date.UTC(part('year'), part('month') - 1, part('day'), 12 - 3, 43));
}

function assertStagingDatabase(connectionString: string) {
  if (process.env.STAGING_SEED_CONFIRM !== STAGING_CONFIRMATION) {
    throw new Error(
      `SAFETY GUARD: set STAGING_SEED_CONFIRM=${STAGING_CONFIRMATION} to write staging fixtures.`,
    );
  }
  const url = new URL(connectionString);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, '')).toLowerCase();
  const hostname = url.hostname.toLowerCase();
  const localHosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (
    databaseName !== 'ekspres_staging' ||
    (!localHosts.has(hostname) && !hostname.endsWith('.neon.tech'))
  ) {
    throw new Error('SAFETY GUARD: field test requires ekspres_staging on localhost or Neon.');
  }
}

async function demoUsers(client: PoolClient) {
  const result = await client.query<{ id: string; email: string; role: string }>(
    `SELECT id, email, role FROM users WHERE email = ANY($1::text[])`,
    [[DEMO_CREDENTIALS.driver.email, DEMO_CREDENTIALS.passenger.email]],
  );
  const driver = result.rows.find((user) => user.email === DEMO_CREDENTIALS.driver.email);
  const passenger = result.rows.find((user) => user.email === DEMO_CREDENTIALS.passenger.email);
  if (!driver || driver.role !== 'driver') throw new Error('Staging demo driver is missing.');
  if (!passenger || passenger.role !== 'passenger')
    throw new Error('Staging demo passenger is missing.');
  return { driverId: driver.id, passengerId: passenger.id };
}

async function seed(client: PoolClient) {
  const { driverId, passengerId } = await demoUsers(client);

  for (const stop of stopPlan) {
    await client.query(
      `INSERT INTO locations (id, name, type, coordinates)
       VALUES ($1, $2, 'terminal', ST_SetSRID(ST_MakePoint($3, $4), 4326))
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, coordinates = EXCLUDED.coordinates`,
      [locationId(stop.key), stop.name, stop.lng, stop.lat],
    );
  }

  const lineString = `LINESTRING(${routeLine.map(([lng, lat]) => `${lng} ${lat}`).join(', ')})`;
  await client.query(
    `INSERT INTO routes (id, name, origin_id, destination_id, geometry)
     VALUES ($1, 'Siirt - Trabzon Saha Testi', $2, $3, ST_GeomFromText($4, 4326))
     ON CONFLICT (id) DO UPDATE SET geometry = EXCLUDED.geometry, name = EXCLUDED.name`,
    [IDS.route, IDS.siirt, IDS.trabzon, lineString],
  );

  for (const [index, stop] of stopPlan.entries()) {
    await client.query(
      `INSERT INTO route_stops (id, route_id, location_id, stop_order, estimated_minutes_from_start)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         stop_order = EXCLUDED.stop_order,
         estimated_minutes_from_start = EXCLUDED.estimated_minutes_from_start`,
      [id(`route-stop:${stop.key}`), IDS.route, locationId(stop.key), index + 1, stop.minutes],
    );
  }

  const departure = departureToday();
  await client.query(
    `INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, status, base_price)
     VALUES ($1, $2, $3, $4, $5, 'in_transit', 450)
     ON CONFLICT (id) DO UPDATE SET
       departure_time = EXCLUDED.departure_time,
       arrival_time = EXCLUDED.arrival_time,
       status = 'in_transit'`,
    [
      IDS.trip,
      IDS.route,
      STAGING_IDS.bus,
      departure,
      new Date(departure.getTime() + 900 * 60 * 1000),
    ],
  );

  await client.query(
    `INSERT INTO trip_drivers (id, trip_id, driver_id, assigned_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (trip_id) DO UPDATE SET driver_id = EXCLUDED.driver_id, assigned_at = now()`,
    [id('trip-driver'), IDS.trip, driverId],
  );

  for (let seatNo = 1; seatNo <= COACH_SEAT_COUNT; seatNo++) {
    await client.query(
      `INSERT INTO trip_seats (id, trip_id, seat_no, seat_type, price_minor, status, version)
       VALUES ($1, $2, $3, 'standard', 45000, $4, 1)
       ON CONFLICT (trip_id, seat_no) DO UPDATE SET status = EXCLUDED.status`,
      [
        id(`trip-seat:${seatNo}`),
        IDS.trip,
        String(seatNo),
        String(seatNo) === SEAT_NO ? 'purchased' : 'available',
      ],
    );
  }

  const tripSeatId = id(`trip-seat:${SEAT_NO}`);
  await client.query(
    `INSERT INTO orders
       (id, order_no, user_id, trip_id, trip_seat_id, boarding_location_id, alighting_location_id,
        status, total_minor, currency, idempotency_key, passenger_first_name, passenger_last_name,
        passenger_phone, passenger_email, expires_at)
     VALUES ($1, 'SKE-SAHA-001', $2, $3, $4, $5, $6, 'paid', 45000, 'TRY', $7, 'Demo', 'Yolcu',
             '0555 000 56 56', $8, now() + interval '1 day')
     ON CONFLICT (id) DO UPDATE SET status = 'paid', expires_at = EXCLUDED.expires_at`,
    [
      IDS.order,
      passengerId,
      IDS.trip,
      tripSeatId,
      IDS.siirt,
      IDS.trabzon,
      id('idempotency'),
      DEMO_CREDENTIALS.passenger.email,
    ],
  );

  await client.query(
    `INSERT INTO payments
       (id, order_id, provider, provider_payment_id, status, amount_minor, currency, paid_at)
     VALUES ($1, $2, 'demo', 'field_test_trabzon', 'success', 45000, 'TRY', now())
     ON CONFLICT (order_id) DO NOTHING`,
    [IDS.payment, IDS.order],
  );

  await client.query(
    `INSERT INTO tickets (id, ticket_no, user_id, trip_id, trip_seat_id, order_id, status, qr_token_hash)
     VALUES ($1, 'TKT-SAHA-001', $2, $3, $4, $5, 'active', $6)
     ON CONFLICT (id) DO UPDATE SET status = 'active'`,
    [
      IDS.ticket,
      passengerId,
      IDS.trip,
      tripSeatId,
      IDS.order,
      createHash('sha256').update(PREFIX).digest('hex'),
    ],
  );

  await client.query(
    `INSERT INTO passenger_boarding (id, ticket_id, status, boarded_at)
     VALUES ($1, $2, 'boarded', now())
     ON CONFLICT (ticket_id) DO UPDATE SET status = 'boarded'`,
    [IDS.boarding, IDS.ticket],
  );

  // Alerts already sent in an earlier run would block a fresh test.
  await client.query(`DELETE FROM alighting_notification_dispatches WHERE ticket_id = $1`, [
    IDS.ticket,
  ]);

  // The driver app opens the first live trip, so the Siirt demo trip steps aside meanwhile.
  await client.query(
    `UPDATE trips SET status = 'scheduled' WHERE id = $1 AND status = 'in_transit'`,
    [STAGING_IDS.liveTrip],
  );

  console.log(
    `Field test ready: trip ${IDS.trip}, seat ${SEAT_NO}, passenger alights at Trabzon terminal.`,
  );
}

async function clean(client: PoolClient) {
  await client.query(`DELETE FROM alighting_notification_dispatches WHERE trip_id = $1`, [
    IDS.trip,
  ]);
  await client.query(`DELETE FROM passenger_boarding WHERE ticket_id = $1`, [IDS.ticket]);
  await client.query(`DELETE FROM tickets WHERE id = $1`, [IDS.ticket]);
  await client.query(`DELETE FROM payments WHERE order_id = $1`, [IDS.order]);
  await client.query(`DELETE FROM orders WHERE id = $1`, [IDS.order]);
  await client.query(`DELETE FROM trip_seats WHERE trip_id = $1`, [IDS.trip]);
  await client.query(`DELETE FROM trip_drivers WHERE trip_id = $1`, [IDS.trip]);
  await client.query(`DELETE FROM trips WHERE id = $1`, [IDS.trip]);
  await client.query(`DELETE FROM route_stops WHERE route_id = $1`, [IDS.route]);
  await client.query(`DELETE FROM routes WHERE id = $1`, [IDS.route]);
  await client.query(`DELETE FROM locations WHERE id = ANY($1::uuid[])`, [
    stopPlan.map((stop) => locationId(stop.key)),
  ]);
  await client.query(
    `UPDATE trips SET status = 'in_transit' WHERE id = $1 AND status = 'scheduled'`,
    [STAGING_IDS.liveTrip],
  );
  console.log('Field test removed; the staging Siirt live trip is live again.');
}

async function main() {
  const mode = process.argv[2];
  if (mode !== 'seed' && mode !== 'clean') throw new Error('Usage: field-test seed|clean');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');
  assertStagingDatabase(connectionString);

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const db = await client.query<{ name: string }>('SELECT current_database() AS name');
    if (db.rows[0]?.name !== 'ekspres_staging')
      throw new Error('SAFETY GUARD: connected to a different database.');
    if (mode === 'seed') await seed(client);
    else await clean(client);
    await client.query('COMMIT');
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
