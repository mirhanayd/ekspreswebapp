import { ConflictException, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import { createDatabaseClient } from '@ekspres/database';
import { AdminController } from '../admin/admin.controller';
import { AdminService } from '../admin/admin.service';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { DRIZZLE } from '../database/database.module';
import { SeatsController } from '../seats/seats.controller';
import { SeatsService } from '../seats/seats.service';
import { TrackingLatestService } from '../tracking/tracking-latest.service';
import { TrackingPosition } from '../tracking/tracking.types';
import { CheckoutService } from './checkout.service';

type Fixture = {
  tripId: string;
  tripSeatId: string;
  seatNo: string;
  routeId: string;
  originId: string;
  destinationId: string;
  busId: string;
};

type TestUser = {
  id: string;
  email: string;
  accessToken: string;
};

const TEST_JWT_SECRET = 'admin-payment-integration-test-secret';

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const envFile = join(process.cwd(), '../../.env');
  const match = readFileSync(envFile, 'utf8').match(/^DATABASE_URL=(.+)$/m);
  if (match) process.env.DATABASE_URL = match[1].trim().replace(/^['"]|['"]$/g, '');
}

describe('Admin authorization and payment integrity integration', () => {
  let app: INestApplication;
  let client: ReturnType<typeof createDatabaseClient>;
  let seatsService: SeatsService;
  let checkoutService: CheckoutService;
  let fixture: Fixture | undefined;
  const userIds = new Set<string>();
  const trackingSnapshots = new Map<string, TrackingPosition>();

  beforeAll(async () => {
    loadDatabaseUrl();
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Integration tests require DATABASE_URL.');
    if (url.includes('production')) {
      throw new Error('SAFETY GUARD: Suspicious production database URL detected.');
    }

    client = createDatabaseClient({ url });
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1d' } }),
      ],
      controllers: [AuthController, AdminController, SeatsController],
      providers: [
        AuthService,
        AdminService,
        SeatsService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'JWT_SECRET' ? TEST_JWT_SECRET : undefined) },
        },
        { provide: DRIZZLE, useValue: client.db },
        {
          provide: TrackingLatestService,
          useValue: { get: async (tripId: string) => trackingSnapshots.get(tripId) || null },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    seatsService = moduleRef.get(SeatsService);
    checkoutService = new CheckoutService(client.db as never);
  });

  afterEach(async () => {
    trackingSnapshots.clear();
    if (fixture) {
      await client.pool.query('DELETE FROM tickets WHERE trip_id = $1', [fixture.tripId]);
      await client.pool.query(
        'DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE trip_id = $1)',
        [fixture.tripId],
      );
      await client.pool.query('DELETE FROM orders WHERE trip_id = $1', [fixture.tripId]);
      await client.pool.query('DELETE FROM seat_holds WHERE trip_seat_id = $1', [
        fixture.tripSeatId,
      ]);
      await client.pool.query('DELETE FROM trip_seats WHERE id = $1', [fixture.tripSeatId]);
      await client.pool.query('DELETE FROM trips WHERE id = $1', [fixture.tripId]);
      await client.pool.query('DELETE FROM buses WHERE id = $1', [fixture.busId]);
      await client.pool.query('DELETE FROM routes WHERE id = $1', [fixture.routeId]);
      await client.pool.query('DELETE FROM locations WHERE id IN ($1, $2)', [
        fixture.originId,
        fixture.destinationId,
      ]);
      fixture = undefined;
    }

    if (userIds.size > 0) {
      await client.pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[...userIds]]);
      userIds.clear();
    }
  });

  afterAll(async () => {
    if (app) await app.close();
    if (client) await client.close();
  });

  async function createFixture(): Promise<Fixture> {
    const originId = randomUUID();
    const destinationId = randomUUID();
    const routeId = randomUUID();
    const busId = randomUUID();
    const tripId = randomUUID();
    const tripSeatId = randomUUID();
    const seatNo = '1';

    await client.pool.query(
      `INSERT INTO locations (id, name, type) VALUES ($1, $2, 'terminal'), ($3, $4, 'terminal')`,
      [originId, `Payment origin ${routeId}`, destinationId, `Payment destination ${routeId}`],
    );
    await client.pool.query(
      `INSERT INTO routes (id, name, origin_id, destination_id) VALUES ($1, $2, $3, $4)`,
      [routeId, `Payment route ${routeId}`, originId, destinationId],
    );
    await client.pool.query(
      `INSERT INTO buses (id, plate_number, seat_layout, total_seats) VALUES ($1, $2, $3::jsonb, 1)`,
      [busId, `PAY-${busId.slice(0, 8)}`, JSON.stringify({ layout: 'test', items: [] })],
    );
    await client.pool.query(
      `INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, status, base_price)
       VALUES ($1, $2, $3, now() + interval '1 day', now() + interval '1 day 1 hour', 'scheduled', 100)`,
      [tripId, routeId, busId],
    );
    await client.pool.query(
      `INSERT INTO trip_seats (id, trip_id, seat_no, seat_type, price_minor, status, version)
       VALUES ($1, $2, $3, 'standard', 12345, 'available', 1)`,
      [tripSeatId, tripId, seatNo],
    );
    fixture = { tripId, tripSeatId, seatNo, routeId, originId, destinationId, busId };
    return fixture;
  }

  async function registerUser(label: string, role: 'admin' | 'passenger'): Promise<TestUser> {
    const email = `admin-payment-${label}-${randomUUID()}@example.test`;
    const password = 'TestPass123!';
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, firstName: 'Test', lastName: label })
      .expect(201);
    const result = await client.pool.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error('Registered integration user was not persisted.');
    userIds.add(id);

    if (role === 'admin') {
      await client.pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [id]);
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(201);
      return { id, email, accessToken: loginResponse.body.accessToken };
    }
    return { id, email, accessToken: registerResponse.body.accessToken };
  }

  async function createOrder(user: TestUser, seat: Fixture) {
    const hold = await seatsService.createHold(seat.tripId, seat.seatNo, user.id);
    const order = await checkoutService.createOrder(user.id, {
      tripId: seat.tripId,
      seatNo: seat.seatNo,
      holdId: hold.holdId,
      passengerFirstName: 'Test',
      passengerLastName: 'Passenger',
      passengerEmail: user.email,
      idempotencyKey: randomUUID(),
    });
    return { hold, order };
  }

  it('denies admin APIs to unauthenticated and passenger principals', async () => {
    const passenger = await registerUser('Passenger', 'passenger');
    const admin = await registerUser('Admin', 'admin');
    const unknownTripId = randomUUID();

    await request(app.getHttpServer()).get('/admin/metrics').expect(401);
    await request(app.getHttpServer())
      .get('/admin/metrics')
      .set('Authorization', `Bearer ${passenger.accessToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/metrics')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    for (const path of [
      '/admin/overview',
      '/admin/transport',
      '/admin/tickets',
      '/admin/fleet',
      '/admin/reports',
    ]) {
      await request(app.getHttpServer()).get(path).expect(401);
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${passenger.accessToken}`)
        .expect(403);
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);
    }

    await request(app.getHttpServer()).post(`/seats/trip/${unknownTripId}/generate`).expect(401);
    await request(app.getHttpServer())
      .post(`/seats/trip/${unknownTripId}/generate`)
      .set('Authorization', `Bearer ${passenger.accessToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`/seats/trip/${unknownTripId}/generate`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(404);
  });

  it('rejects payment after the order expires and persists the expired state', async () => {
    const seat = await createFixture();
    const user = await registerUser('ExpiredOrder', 'passenger');
    const { order } = await createOrder(user, seat);
    await client.pool.query(
      `UPDATE orders SET expires_at = now() - interval '1 minute' WHERE id = $1`,
      [order.id],
    );

    await expect(checkoutService.processPayment(order.id, user.id)).rejects.toThrow(
      new ConflictException('Order has expired'),
    );
    const state = await client.pool.query<{ status: string; payments: string; tickets: string }>(
      `SELECT o.status,
              (SELECT count(*) FROM payments WHERE order_id = o.id)::text AS payments,
              (SELECT count(*) FROM tickets WHERE order_id = o.id)::text AS tickets
       FROM orders o WHERE o.id = $1`,
      [order.id],
    );
    expect(state.rows[0]).toEqual({ status: 'expired', payments: '0', tickets: '0' });
  });

  it('rejects an expired hold and releases its stale seat state', async () => {
    const seat = await createFixture();
    const user = await registerUser('ExpiredHold', 'passenger');
    const { hold, order } = await createOrder(user, seat);
    await client.pool.query(
      `UPDATE seat_holds SET expires_at = now() - interval '1 minute' WHERE id = $1`,
      [hold.holdId],
    );

    await expect(checkoutService.processPayment(order.id, user.id)).rejects.toThrow(
      new ConflictException('Seat hold has expired or is no longer active'),
    );
    const state = await client.pool.query<{
      order_status: string;
      hold_status: string;
      seat_status: string;
      payments: string;
      tickets: string;
    }>(
      `SELECT o.status AS order_status, h.status AS hold_status, ts.status AS seat_status,
              (SELECT count(*) FROM payments WHERE order_id = o.id)::text AS payments,
              (SELECT count(*) FROM tickets WHERE order_id = o.id)::text AS tickets
       FROM orders o
       JOIN seat_holds h ON h.id = $2
       JOIN trip_seats ts ON ts.id = o.trip_seat_id
       WHERE o.id = $1`,
      [order.id, hold.holdId],
    );
    expect(state.rows[0]).toEqual({
      order_status: 'expired',
      hold_status: 'expired',
      seat_status: 'available',
      payments: '0',
      tickets: '0',
    });
  });

  it('serializes duplicate order and payment attempts to one financial result', async () => {
    const seat = await createFixture();
    const user = await registerUser('Concurrent', 'passenger');
    const hold = await seatsService.createHold(seat.tripId, seat.seatNo, user.id);
    const input = {
      tripId: seat.tripId,
      seatNo: seat.seatNo,
      holdId: hold.holdId,
      passengerFirstName: 'Test',
      passengerLastName: 'Passenger',
      passengerEmail: user.email,
    };
    const [firstOrder, secondOrder] = await Promise.all([
      checkoutService.createOrder(user.id, { ...input, idempotencyKey: randomUUID() }),
      checkoutService.createOrder(user.id, { ...input, idempotencyKey: randomUUID() }),
    ]);
    expect(firstOrder.id).toBe(secondOrder.id);
    expect(firstOrder.totalMinor).toBe(12345);

    const [firstPayment, secondPayment] = await Promise.all([
      checkoutService.processPayment(firstOrder.id, user.id),
      checkoutService.processPayment(firstOrder.id, user.id),
    ]);
    expect([firstPayment.alreadyPaid, secondPayment.alreadyPaid].sort()).toEqual([false, true]);
    expect(firstPayment.ticket?.id).toBe(secondPayment.ticket?.id);

    const state = await client.pool.query<{
      order_status: string;
      seat_status: string;
      hold_status: string;
      orders: string;
      payments: string;
      tickets: string;
    }>(
      `SELECT o.status AS order_status, ts.status AS seat_status, h.status AS hold_status,
              (SELECT count(*) FROM orders WHERE trip_seat_id = o.trip_seat_id)::text AS orders,
              (SELECT count(*) FROM payments WHERE order_id = o.id)::text AS payments,
              (SELECT count(*) FROM tickets WHERE order_id = o.id)::text AS tickets
       FROM orders o
       JOIN trip_seats ts ON ts.id = o.trip_seat_id
       JOIN seat_holds h ON h.id = $2
       WHERE o.id = $1`,
      [firstOrder.id, hold.holdId],
    );
    expect(state.rows[0]).toEqual({
      order_status: 'paid',
      seat_status: 'purchased',
      hold_status: 'consumed',
      orders: '1',
      payments: '1',
      tickets: '1',
    });
  });

  it('returns real transport, ticket, report, and live fleet operations to admins', async () => {
    const seat = await createFixture();
    const passenger = await registerUser('OperationsPassenger', 'passenger');
    const admin = await registerUser('OperationsAdmin', 'admin');
    const { order } = await createOrder(passenger, seat);
    const payment = await checkoutService.processPayment(order.id, passenger.id);
    const ticketId = payment.ticket?.id;
    expect(ticketId).toBeTruthy();

    await client.pool.query(`UPDATE trips SET status = 'in_transit' WHERE id = $1`, [seat.tripId]);
    trackingSnapshots.set(seat.tripId, {
      tripId: seat.tripId,
      busId: seat.busId,
      longitude: 41.94,
      latitude: 37.93,
      speedKph: 72,
      headingDeg: 110,
      recordedAt: new Date().toISOString(),
      sequence: 7,
      source: 'SIMULATOR',
    });

    const authorization = { Authorization: `Bearer ${admin.accessToken}` };
    const overview = await request(app.getHttpServer())
      .get('/admin/overview')
      .set(authorization)
      .expect(200);
    expect(overview.body).toEqual(
      expect.objectContaining({ activeTrips: expect.any(Number), liveVehicles: 1 }),
    );

    const transport = await request(app.getHttpServer())
      .get('/admin/transport')
      .set(authorization)
      .expect(200);
    expect(transport.body.trips).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: seat.tripId, soldSeats: 1, plateNumber: expect.any(String) }),
      ]),
    );

    const tickets = await request(app.getHttpServer())
      .get('/admin/tickets')
      .set(authorization)
      .expect(200);
    const ticket = tickets.body.find((item: { id: string }) => item.id === ticketId);
    expect(ticket).toEqual(
      expect.objectContaining({
        passengerEmail: passenger.email,
        seatNo: seat.seatNo,
        amountMinor: 12345,
      }),
    );
    expect(ticket).not.toHaveProperty('qrTokenHash');

    await request(app.getHttpServer())
      .get(`/admin/tickets/${ticketId}`)
      .set(authorization)
      .expect(200)
      .expect(({ body }) => expect(body.ticketNo).toBe(ticket.ticketNo));

    const fleet = await request(app.getHttpServer())
      .get('/admin/fleet')
      .set(authorization)
      .expect(200);
    expect(fleet.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tripId: seat.tripId,
          freshness: 'live',
          latest: expect.objectContaining({ sequence: 7 }),
        }),
      ]),
    );

    const reports = await request(app.getHttpServer())
      .get('/admin/reports')
      .set(authorization)
      .expect(200);
    expect(reports.body).toEqual(
      expect.objectContaining({
        dailySales: expect.any(Array),
        tripStatuses: expect.any(Array),
        ticketStatuses: expect.any(Array),
        occupancy: expect.objectContaining({ percent: expect.any(Number) }),
      }),
    );
  });
});
