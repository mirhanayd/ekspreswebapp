import * as dotenv from 'dotenv';
import { createHash } from 'crypto';
import { join } from 'path';
import { Pool, PoolClient } from 'pg';
import { DEMO_CREDENTIALS } from '../demo-constants.js';
import { STAGING_IDS, stagingUuid } from '../staging-fixture-ids.js';

dotenv.config({ path: join(process.cwd(), '../../.env') });

const STAGING_CONFIRMATION = 'ekspres-staging';

const locations = [
  { id: STAGING_IDS.siirt, name: 'Siirt Terminali', longitude: 41.9419, latitude: 37.9274 },
  { id: STAGING_IDS.kurtalan, name: 'Kurtalan Otogarı', longitude: 41.7058, latitude: 37.9261 },
  { id: STAGING_IDS.batman, name: 'Batman Otogarı', longitude: 41.1322, latitude: 37.8812 },
  {
    id: STAGING_IDS.diyarbakir,
    name: 'Diyarbakır Şehirlerarası Terminali',
    longitude: 40.2189,
    latitude: 37.9144,
  },
];

const stops = [
  { locationId: STAGING_IDS.siirt, order: 1, minutes: 0 },
  { locationId: STAGING_IDS.kurtalan, order: 2, minutes: 30 },
  { locationId: STAGING_IDS.batman, order: 3, minutes: 90 },
  { locationId: STAGING_IDS.diyarbakir, order: 4, minutes: 180 },
];

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
    throw new Error('SAFETY GUARD: staging seed requires ekspres_staging on localhost or Neon.');
  }
}

function dateAt(dayOffset: number, hour: number, minute = 0) {
  // Türkiye stays at UTC+03:00. Derive the calendar day in Istanbul even when
  // the seed runs in a UTC container or a developer's different time zone.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const midnightUtc = Date.UTC(part('year'), part('month') - 1, part('day') + dayOffset);
  return new Date(midnightUtc + (hour - 3) * 60 * 60 * 1000 + minute * 60 * 1000);
}

async function assertFixtureOwnership(client: PoolClient, driverId: string, passengerId: string) {
  const tripIds = [
    STAGING_IDS.liveTrip,
    STAGING_IDS.morningTrip,
    STAGING_IDS.afternoonTrip,
    STAGING_IDS.followingTrip,
  ];
  const orderIds = [
    STAGING_IDS.activeOrder,
    stagingUuid('order:staging-kurtalan-passenger'),
    stagingUuid('order:staging-batman-passenger'),
  ];
  const ticketIds = [
    STAGING_IDS.activeTicket,
    stagingUuid('ticket:staging-kurtalan-passenger'),
    stagingUuid('ticket:staging-batman-passenger'),
  ];
  const seatIds = tripIds.flatMap((tripId) =>
    Array.from({ length: 39 }, (_, index) => stagingUuid(`trip-seat:${tripId}:${index + 1}`)),
  );
  const result = await client.query<{
    foreign_orders: string;
    foreign_tickets: string;
    foreign_assignments: string;
    foreign_seats: string;
    moved_orders: string;
    moved_tickets: string;
    moved_trips: string;
    reassigned_orders: string;
    reassigned_tickets: string;
  }>(
    `SELECT
       (SELECT count(*) FROM orders WHERE trip_id = ANY($1::uuid[]) AND NOT (id = ANY($2::uuid[])))::text AS foreign_orders,
       (SELECT count(*) FROM tickets WHERE trip_id = ANY($1::uuid[]) AND NOT (id = ANY($3::uuid[])))::text AS foreign_tickets,
       (SELECT count(*) FROM trip_drivers WHERE trip_id = ANY($1::uuid[]) AND driver_id <> $4)::text AS foreign_assignments,
       (SELECT count(*) FROM trip_seats WHERE trip_id = ANY($1::uuid[]) AND NOT (id = ANY($5::uuid[])))::text AS foreign_seats,
       (SELECT count(*) FROM orders WHERE id = ANY($2::uuid[]) AND trip_id <> $6)::text AS moved_orders,
       (SELECT count(*) FROM tickets WHERE id = ANY($3::uuid[]) AND trip_id <> $6)::text AS moved_tickets,
       (SELECT count(*) FROM trips WHERE id = ANY($1::uuid[]) AND (route_id <> $7 OR bus_id <> $8))::text AS moved_trips,
       (SELECT count(*) FROM orders WHERE id = ANY($2::uuid[]) AND user_id <> $9)::text AS reassigned_orders,
       (SELECT count(*) FROM tickets WHERE id = ANY($3::uuid[]) AND user_id <> $9)::text AS reassigned_tickets`,
    [
      tripIds,
      orderIds,
      ticketIds,
      driverId,
      seatIds,
      STAGING_IDS.liveTrip,
      STAGING_IDS.route,
      STAGING_IDS.bus,
      passengerId,
    ],
  );
  const row = result.rows[0];
  if (!row || Object.values(row).some((count) => Number(count) !== 0)) {
    throw new Error('SAFETY GUARD: staging fixture ownership changed; no records were updated.');
  }
}

function createSeatLayout() {
  const items: Array<{
    type: 'driver' | 'seat' | 'aisle';
    row: number;
    column: number;
    seatNo?: string;
  }> = [{ type: 'driver', row: 1, column: 1 }];

  for (let row = 2; row <= 14; row++) {
    const firstSeat = (row - 2) * 3 + 1;
    items.push(
      { type: 'seat', seatNo: String(firstSeat), row, column: 1 },
      { type: 'seat', seatNo: String(firstSeat + 1), row, column: 2 },
      { type: 'aisle', row, column: 3 },
      { type: 'seat', seatNo: String(firstSeat + 2), row, column: 4 },
    );
  }

  return { layout: '2+1', rows: 14, columns: 4, items };
}

async function findDemoUsers(client: PoolClient) {
  const result = await client.query<{ id: string; email: string; role: string }>(
    `SELECT id, email, role
       FROM users
      WHERE email = ANY($1::text[])`,
    [[DEMO_CREDENTIALS.driver.email, DEMO_CREDENTIALS.passenger.email]],
  );

  const driver = result.rows.find((user) => user.email === DEMO_CREDENTIALS.driver.email);
  const passenger = result.rows.find((user) => user.email === DEMO_CREDENTIALS.passenger.email);

  if (!driver || driver.role !== 'driver') {
    throw new Error(`Staging driver ${DEMO_CREDENTIALS.driver.email} is missing or not a driver.`);
  }
  if (!passenger || passenger.role !== 'passenger') {
    throw new Error(
      `Staging passenger ${DEMO_CREDENTIALS.passenger.email} is missing or not a passenger.`,
    );
  }

  return { driverId: driver.id, passengerId: passenger.id };
}

async function upsertTransport(client: PoolClient, driverId: string) {
  for (const location of locations) {
    await client.query(
      `INSERT INTO locations (id, name, type, coordinates)
       VALUES ($1, $2, 'terminal', ST_SetSRID(ST_MakePoint($3, $4), 4326))
       ON CONFLICT (id) DO NOTHING`,
      [location.id, location.name, location.longitude, location.latitude],
    );
  }

  const lineString = `LINESTRING(${locations
    .map((location) => `${location.longitude} ${location.latitude}`)
    .join(', ')})`;
  await client.query(
    `INSERT INTO routes (id, name, origin_id, destination_id, geometry)
     VALUES ($1, 'Siirt - Diyarbakır Sürücü Test Seferi', $2, $3, ST_GeomFromText($4, 4326))
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       origin_id = EXCLUDED.origin_id,
       destination_id = EXCLUDED.destination_id,
       geometry = EXCLUDED.geometry`,
    [STAGING_IDS.route, STAGING_IDS.siirt, STAGING_IDS.diyarbakir, lineString],
  );

  for (const stop of stops) {
    await client.query(
      `INSERT INTO route_stops (id, route_id, location_id, stop_order, estimated_minutes_from_start)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         route_id = EXCLUDED.route_id,
         location_id = EXCLUDED.location_id,
         stop_order = EXCLUDED.stop_order,
         estimated_minutes_from_start = EXCLUDED.estimated_minutes_from_start`,
      [
        stagingUuid(`route-stop:${stop.order}`),
        STAGING_IDS.route,
        stop.locationId,
        stop.order,
        stop.minutes,
      ],
    );
  }

  await client.query(
    `INSERT INTO buses (id, plate_number, model, seat_layout, total_seats)
     VALUES ($1, '56 SKE STG', 'Mercedes-Benz Travego 15 SHD', $2::jsonb, 39)
     ON CONFLICT (id) DO UPDATE SET
       plate_number = EXCLUDED.plate_number,
       model = EXCLUDED.model,
       seat_layout = EXCLUDED.seat_layout,
       total_seats = EXCLUDED.total_seats`,
    [STAGING_IDS.bus, JSON.stringify(createSeatLayout())],
  );

  const now = new Date();
  const trips = [
    {
      id: STAGING_IDS.liveTrip,
      departure: new Date(now.getTime() - 20 * 60 * 1000),
      arrival: new Date(now.getTime() + 160 * 60 * 1000),
      status: 'in_transit',
    },
    {
      id: STAGING_IDS.morningTrip,
      departure: dateAt(1, 9),
      arrival: dateAt(1, 12),
      status: 'scheduled',
    },
    {
      id: STAGING_IDS.afternoonTrip,
      departure: dateAt(1, 14),
      arrival: dateAt(1, 17),
      status: 'scheduled',
    },
    {
      id: STAGING_IDS.followingTrip,
      departure: dateAt(2, 9),
      arrival: dateAt(2, 12),
      status: 'scheduled',
    },
  ];

  for (const trip of trips) {
    await client.query(
      `INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, status, base_price)
       VALUES ($1, $2, $3, $4, $5, $6, 450)
       ON CONFLICT (id) DO UPDATE SET
         route_id = EXCLUDED.route_id,
         bus_id = EXCLUDED.bus_id,
         departure_time = EXCLUDED.departure_time,
         arrival_time = EXCLUDED.arrival_time,
         status = EXCLUDED.status,
         base_price = EXCLUDED.base_price`,
      [trip.id, STAGING_IDS.route, STAGING_IDS.bus, trip.departure, trip.arrival, trip.status],
    );

    await client.query(
      `INSERT INTO trip_drivers (id, trip_id, driver_id, assigned_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (trip_id) DO UPDATE SET
         driver_id = EXCLUDED.driver_id,
         assigned_at = now()`,
      [stagingUuid(`trip-driver:${trip.id}`), trip.id, driverId],
    );

    for (let seatNo = 1; seatNo <= 39; seatNo++) {
      const purchased = trip.id === STAGING_IDS.liveTrip && seatNo <= 3;
      await client.query(
        `INSERT INTO trip_seats (id, trip_id, seat_no, seat_type, price_minor, status, version)
         VALUES ($1, $2, $3, 'standard', 45000, $4, 1)
         ON CONFLICT (trip_id, seat_no) DO UPDATE SET
           price_minor = EXCLUDED.price_minor,
           status = EXCLUDED.status`,
        [
          stagingUuid(`trip-seat:${trip.id}:${seatNo}`),
          trip.id,
          String(seatNo),
          purchased ? 'purchased' : 'available',
        ],
      );
    }
  }
}

async function upsertPassengerScenario(client: PoolClient, passengerId: string) {
  const passengers = [
    {
      key: 'active-ticket',
      orderId: STAGING_IDS.activeOrder,
      paymentId: STAGING_IDS.activePayment,
      ticketId: STAGING_IDS.activeTicket,
      seatNo: '1',
      orderNo: 'SKE-DRV-001',
      ticketNo: 'TKT-DRV-001',
      firstName: 'Demo',
      lastName: 'Yolcu',
      phone: '0555 000 56 56',
      email: DEMO_CREDENTIALS.passenger.email,
      boardingLocationId: STAGING_IDS.siirt,
      boardingStatus: 'pending',
    },
    {
      key: 'kurtalan-passenger',
      orderId: stagingUuid('order:staging-kurtalan-passenger'),
      paymentId: stagingUuid('payment:staging-kurtalan-passenger'),
      ticketId: stagingUuid('ticket:staging-kurtalan-passenger'),
      seatNo: '2',
      orderNo: 'SKE-DRV-002',
      ticketNo: 'TKT-DRV-002',
      firstName: 'Ayşe',
      lastName: 'Demir',
      phone: '0532 410 56 56',
      email: 'ayse.demir@example.com',
      boardingLocationId: STAGING_IDS.kurtalan,
      boardingStatus: 'boarded',
    },
    {
      key: 'batman-passenger',
      orderId: stagingUuid('order:staging-batman-passenger'),
      paymentId: stagingUuid('payment:staging-batman-passenger'),
      ticketId: stagingUuid('ticket:staging-batman-passenger'),
      seatNo: '3',
      orderNo: 'SKE-DRV-003',
      ticketNo: 'TKT-DRV-003',
      firstName: 'Serhat',
      lastName: 'Yıldız',
      phone: '0542 720 56 56',
      email: 'serhat.yildiz@example.com',
      boardingLocationId: STAGING_IDS.batman,
      boardingStatus: 'no_show',
    },
  ];

  for (const passenger of passengers) {
    const tripSeatId = stagingUuid(`trip-seat:${STAGING_IDS.liveTrip}:${passenger.seatNo}`);
    const idempotencyKey = stagingUuid(`idempotency:staging:${passenger.key}`);
    const qrTokenHash = createHash('sha256')
      .update(`siirt-kurtalan-staging:${passenger.key}`)
      .digest('hex');

    await client.query(
      `INSERT INTO orders
         (id, order_no, user_id, trip_id, trip_seat_id, boarding_location_id, alighting_location_id,
          status, total_minor, currency, idempotency_key, passenger_first_name, passenger_last_name,
          passenger_phone, passenger_email, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'paid', 45000, 'TRY', $8, $9, $10, $11, $12,
               now() + interval '1 day')
       ON CONFLICT (id) DO UPDATE SET
         trip_id = EXCLUDED.trip_id,
         trip_seat_id = EXCLUDED.trip_seat_id,
         boarding_location_id = EXCLUDED.boarding_location_id,
         alighting_location_id = EXCLUDED.alighting_location_id,
         status = 'paid',
         passenger_first_name = EXCLUDED.passenger_first_name,
         passenger_last_name = EXCLUDED.passenger_last_name,
         passenger_phone = EXCLUDED.passenger_phone,
         passenger_email = EXCLUDED.passenger_email,
         expires_at = EXCLUDED.expires_at`,
      [
        passenger.orderId,
        passenger.orderNo,
        passengerId,
        STAGING_IDS.liveTrip,
        tripSeatId,
        passenger.boardingLocationId,
        STAGING_IDS.diyarbakir,
        idempotencyKey,
        passenger.firstName,
        passenger.lastName,
        passenger.phone,
        passenger.email,
      ],
    );

    await client.query(
      `INSERT INTO payments
         (id, order_id, provider, provider_payment_id, status, amount_minor, currency, paid_at)
       VALUES ($1, $2, 'demo', $3, 'success', 45000, 'TRY', now())
       ON CONFLICT (order_id) DO UPDATE SET
         status = 'success',
         amount_minor = 45000,
         paid_at = COALESCE(payments.paid_at, now())`,
      [passenger.paymentId, passenger.orderId, `driver_ready_${passenger.key}`],
    );

    await client.query(
      `INSERT INTO tickets
         (id, ticket_no, user_id, trip_id, trip_seat_id, order_id, status, qr_token_hash)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
       ON CONFLICT (id) DO UPDATE SET
         trip_id = EXCLUDED.trip_id,
         trip_seat_id = EXCLUDED.trip_seat_id,
         order_id = EXCLUDED.order_id,
         status = 'active',
         qr_token_hash = EXCLUDED.qr_token_hash`,
      [
        passenger.ticketId,
        passenger.ticketNo,
        passengerId,
        STAGING_IDS.liveTrip,
        tripSeatId,
        passenger.orderId,
        qrTokenHash,
      ],
    );

    await client.query(
      `INSERT INTO passenger_boarding (id, ticket_id, status, boarded_at)
       VALUES ($1, $2, $3, CASE WHEN $3 = 'boarded' THEN now() END)
       ON CONFLICT (ticket_id) DO NOTHING`,
      [
        stagingUuid(`boarding:staging:${passenger.key}`),
        passenger.ticketId,
        passenger.boardingStatus,
      ],
    );
  }
}

async function main() {
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
    const { driverId, passengerId } = await findDemoUsers(client);
    await assertFixtureOwnership(client, driverId, passengerId);
    await upsertTransport(client, driverId);
    await upsertPassengerScenario(client, passengerId);
    await client.query('COMMIT');
    console.log(
      'Staging seed complete: existing users preserved; route, trips, seats, driver assignment and manifest are ready.',
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
