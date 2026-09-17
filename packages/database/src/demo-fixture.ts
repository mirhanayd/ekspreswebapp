import * as bcrypt from 'bcryptjs';
import type { PoolClient } from 'pg';
import { DEMO_CREDENTIALS, DEMO_IDS, demoUuid } from './demo-constants.js';

export const DEMO_TRIP_IDS = [
  DEMO_IDS.morningTrip,
  DEMO_IDS.afternoonTrip,
  DEMO_IDS.followingTrip,
  DEMO_IDS.liveTrip,
] as const;

const locations = [
  { id: DEMO_IDS.siirt, name: 'Siirt Terminali', longitude: 41.9419, latitude: 37.9274 },
  { id: DEMO_IDS.kurtalan, name: 'Kurtalan Otogarı', longitude: 41.7058, latitude: 37.9261 },
  { id: DEMO_IDS.batman, name: 'Batman Otogarı', longitude: 41.1322, latitude: 37.8812 },
  {
    id: DEMO_IDS.diyarbakir,
    name: 'Diyarbakır Şehirlerarası Terminali',
    longitude: 40.2189,
    latitude: 37.9144,
  },
];

const routeStops = [
  { locationId: DEMO_IDS.siirt, order: 1, minutes: 0 },
  { locationId: DEMO_IDS.kurtalan, order: 2, minutes: 30 },
  { locationId: DEMO_IDS.batman, order: 3, minutes: 90 },
  { locationId: DEMO_IDS.diyarbakir, order: 4, minutes: 180 },
];

function dateAt(dayOffset: number, hour: number, minute = 0) {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  value.setDate(value.getDate() + dayOffset);
  value.setHours(hour, minute, 0, 0);
  return value;
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

export async function insertDeterministicDemoUsers(client: PoolClient) {
  const passengerHash = await bcrypt.hash(DEMO_CREDENTIALS.passenger.password, 10);
  const adminHash = await bcrypt.hash(DEMO_CREDENTIALS.admin.password, 10);
  const driverHash = await bcrypt.hash(DEMO_CREDENTIALS.driver.password, 10);
  await client.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, 'Demo', 'Yolcu', 'passenger'),
            ($4, $5, $6, 'Demo', 'Yönetici', 'admin'),
            ($7, $8, $9, 'Mehmet', 'Kaya', 'driver')`,
    [
      DEMO_IDS.passenger,
      DEMO_CREDENTIALS.passenger.email,
      passengerHash,
      DEMO_IDS.admin,
      DEMO_CREDENTIALS.admin.email,
      adminHash,
      DEMO_IDS.driver,
      DEMO_CREDENTIALS.driver.email,
      driverHash,
    ],
  );
}

export async function insertDemoTransport(client: PoolClient, driverId: string) {
  for (const location of locations) {
    await client.query(
      `INSERT INTO locations (id, name, type, coordinates)
       VALUES ($1, $2, 'terminal', ST_SetSRID(ST_MakePoint($3, $4), 4326))
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         type = EXCLUDED.type,
         coordinates = EXCLUDED.coordinates`,
      [location.id, location.name, location.longitude, location.latitude],
    );
  }

  const lineString = `LINESTRING(${locations
    .map((location) => `${location.longitude} ${location.latitude}`)
    .join(', ')})`;
  await client.query(
    `INSERT INTO routes (id, name, origin_id, destination_id, geometry)
     VALUES ($1, 'Siirt - Diyarbakır Ekspres', $2, $3, ST_GeomFromText($4, 4326))
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       origin_id = EXCLUDED.origin_id,
       destination_id = EXCLUDED.destination_id,
       geometry = EXCLUDED.geometry`,
    [DEMO_IDS.route, DEMO_IDS.siirt, DEMO_IDS.diyarbakir, lineString],
  );
  for (const stop of routeStops) {
    await client.query(
      `INSERT INTO route_stops (id, route_id, location_id, stop_order, estimated_minutes_from_start)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         route_id = EXCLUDED.route_id,
         location_id = EXCLUDED.location_id,
         stop_order = EXCLUDED.stop_order,
         estimated_minutes_from_start = EXCLUDED.estimated_minutes_from_start`,
      [
        demoUuid(`route-stop:${stop.order}`),
        DEMO_IDS.route,
        stop.locationId,
        stop.order,
        stop.minutes,
      ],
    );
  }

  const seatLayout = createSeatLayout();
  await client.query(
    `INSERT INTO buses (id, plate_number, model, seat_layout, total_seats)
     VALUES ($1, '56 SKE 01', 'Mercedes-Benz Travego 15 SHD', $2::jsonb, 39)
     ON CONFLICT (id) DO UPDATE SET
       plate_number = EXCLUDED.plate_number,
       model = EXCLUDED.model,
       seat_layout = EXCLUDED.seat_layout,
       total_seats = EXCLUDED.total_seats`,
    [DEMO_IDS.bus, JSON.stringify(seatLayout)],
  );

  const now = new Date();
  const trips = [
    {
      id: DEMO_IDS.morningTrip,
      departure: dateAt(1, 9),
      arrival: dateAt(1, 12),
      status: 'scheduled',
    },
    {
      id: DEMO_IDS.afternoonTrip,
      departure: dateAt(1, 14),
      arrival: dateAt(1, 17),
      status: 'scheduled',
    },
    {
      id: DEMO_IDS.followingTrip,
      departure: dateAt(2, 9),
      arrival: dateAt(2, 12),
      status: 'scheduled',
    },
    {
      id: DEMO_IDS.liveTrip,
      departure: new Date(now.getTime() - 30 * 60 * 1000),
      arrival: new Date(now.getTime() + 150 * 60 * 1000),
      status: 'in_transit',
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
      [trip.id, DEMO_IDS.route, DEMO_IDS.bus, trip.departure, trip.arrival, trip.status],
    );
    await client.query(
      `INSERT INTO trip_drivers (id, trip_id, driver_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (trip_id) DO UPDATE SET driver_id = EXCLUDED.driver_id, assigned_at = now()`,
      [demoUuid(`trip-driver:${trip.id}`), trip.id, driverId],
    );

    for (let seatNo = 1; seatNo <= 39; seatNo++) {
      const purchased = trip.id === DEMO_IDS.liveTrip && seatNo === 1;
      await client.query(
        `INSERT INTO trip_seats (id, trip_id, seat_no, seat_type, price_minor, status, version)
         VALUES ($1, $2, $3, 'standard', 45000, $4, 1)
         ON CONFLICT (trip_id, seat_no) DO UPDATE SET
           seat_type = EXCLUDED.seat_type,
           price_minor = EXCLUDED.price_minor,
           status = EXCLUDED.status,
           version = EXCLUDED.version`,
        [
          demoUuid(`trip-seat:${trip.id}:${seatNo}`),
          trip.id,
          String(seatNo),
          purchased ? 'purchased' : 'available',
        ],
      );
    }
  }
}

export async function insertDemoActiveTicket(client: PoolClient, passengerId: string) {
  const tripSeatId = demoUuid(`trip-seat:${DEMO_IDS.liveTrip}:1`);
  const consumedHoldId = demoUuid('hold:active-ticket');
  await client.query(
    `INSERT INTO seat_holds (id, trip_seat_id, user_id, status, expires_at, released_at)
     VALUES ($1, $2, $3, 'consumed', now() - interval '5 minutes', now() - interval '5 minutes')`,
    [consumedHoldId, tripSeatId, passengerId],
  );
  await client.query(
    `INSERT INTO orders
       (id, order_no, user_id, trip_id, trip_seat_id, boarding_location_id, alighting_location_id,
        status, total_minor, currency, idempotency_key, passenger_first_name, passenger_last_name,
        passenger_phone, passenger_email, expires_at)
     VALUES ($1, 'SKE-DEMO-AKTIF', $2, $3, $4, $5, $6, 'paid', 45000, 'TRY', $7,
             'Demo', 'Yolcu', '0555 000 56 56', $8, now() + interval '1 day')`,
    [
      DEMO_IDS.activeOrder,
      passengerId,
      DEMO_IDS.liveTrip,
      tripSeatId,
      DEMO_IDS.siirt,
      DEMO_IDS.diyarbakir,
      demoUuid('idempotency:active-ticket'),
      DEMO_CREDENTIALS.passenger.email,
    ],
  );
  await client.query(
    `INSERT INTO payments
       (id, order_id, provider, provider_payment_id, status, amount_minor, currency, paid_at)
     VALUES ($1, $2, 'demo', 'demo_seed_active_ticket', 'success', 45000, 'TRY', now())`,
    [DEMO_IDS.activePayment, DEMO_IDS.activeOrder],
  );
  await client.query(
    `INSERT INTO tickets
       (id, ticket_no, user_id, trip_id, trip_seat_id, order_id, status, qr_token_hash)
     VALUES ($1, 'TKT-DEMO-AKTIF', $2, $3, $4, $5, 'active', $6)`,
    [
      DEMO_IDS.activeTicket,
      passengerId,
      DEMO_IDS.liveTrip,
      tripSeatId,
      DEMO_IDS.activeOrder,
      DEMO_IDS.activeQrTokenHash,
    ],
  );
  await client.query(
    `INSERT INTO passenger_boarding (id, ticket_id, status)
     VALUES ($1, $2, 'pending')`,
    [demoUuid('boarding:active-ticket'), DEMO_IDS.activeTicket],
  );
}
