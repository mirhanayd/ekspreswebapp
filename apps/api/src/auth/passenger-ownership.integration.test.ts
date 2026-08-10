import { INestApplication } from '@nestjs/common';
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
import { CheckoutController } from '../checkout/checkout.controller';
import { CheckoutService } from '../checkout/checkout.service';
import { DRIZZLE } from '../database/database.module';
import { SeatsController } from '../seats/seats.controller';
import { SeatsService } from '../seats/seats.service';
import { TicketsController } from '../tickets/tickets.controller';
import { TicketsService } from '../tickets/tickets.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

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

const TEST_JWT_SECRET = 'passenger-ownership-integration-test-secret';

function loadTestEnvironment() {
  if (!process.env.DATABASE_URL) {
    const envFile = join(process.cwd(), '../../.env');
    const match = readFileSync(envFile, 'utf8').match(/^DATABASE_URL=(.+)$/m);
    if (match) process.env.DATABASE_URL = match[1].trim().replace(/^['"]|['"]$/g, '');
  }
}

describe('Passenger ownership HTTP integration', () => {
  let app: INestApplication;
  let client: ReturnType<typeof createDatabaseClient>;
  let fixture: Fixture | undefined;
  const userIds = new Set<string>();

  beforeAll(async () => {
    loadTestEnvironment();
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Integration tests require DATABASE_URL.');
    if (url.includes('production')) {
      throw new Error('SAFETY GUARD: Suspicious production database URL detected.');
    }

    client = createDatabaseClient({ url });
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '1d' },
        }),
      ],
      controllers: [AuthController, SeatsController, CheckoutController, TicketsController],
      providers: [
        AuthService,
        SeatsService,
        CheckoutService,
        TicketsService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'JWT_SECRET' ? TEST_JWT_SECRET : undefined) },
        },
        { provide: DRIZZLE, useValue: client.db },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
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
      [originId, `Ownership origin ${routeId}`, destinationId, `Ownership destination ${routeId}`],
    );
    await client.pool.query(
      `INSERT INTO routes (id, name, origin_id, destination_id) VALUES ($1, $2, $3, $4)`,
      [routeId, `Ownership route ${routeId}`, originId, destinationId],
    );
    await client.pool.query(
      `INSERT INTO buses (id, plate_number, seat_layout, total_seats) VALUES ($1, $2, $3::jsonb, 1)`,
      [busId, `OWN-${busId.slice(0, 8)}`, JSON.stringify({ layout: 'test', items: [] })],
    );
    await client.pool.query(
      `INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, status, base_price)
       VALUES ($1, $2, $3, now() + interval '1 day', now() + interval '1 day 1 hour', 'scheduled', 100)`,
      [tripId, routeId, busId],
    );
    await client.pool.query(
      `INSERT INTO trip_seats (id, trip_id, seat_no, seat_type, price_minor, status, version)
       VALUES ($1, $2, $3, 'standard', 10000, 'available', 1)`,
      [tripSeatId, tripId, seatNo],
    );

    fixture = { tripId, tripSeatId, seatNo, routeId, originId, destinationId, busId };
    return fixture;
  }

  async function registerUser(label: string): Promise<TestUser> {
    const email = `ownership-${label}-${randomUUID()}@example.test`;
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'TestPass123!', firstName: 'Test', lastName: label })
      .expect(201);
    const result = await client.pool.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error('Registered integration user was not persisted.');
    userIds.add(id);
    return { id, email, accessToken: response.body.accessToken };
  }

  it('rejects unauthenticated transactional requests', async () => {
    const id = randomUUID();
    const unauthorizedRequests = [
      () => request(app.getHttpServer()).post('/seats/hold').send({ tripId: id, seatNo: '1' }),
      () => request(app.getHttpServer()).delete(`/seats/hold/${id}`),
      () => request(app.getHttpServer()).post('/checkout/order').send({ holdId: id }),
      () => request(app.getHttpServer()).post(`/checkout/order/${id}/pay`),
      () => request(app.getHttpServer()).get(`/checkout/order/${id}`),
      () => request(app.getHttpServer()).get('/tickets'),
      () => request(app.getHttpServer()).get(`/tickets/${id}`),
      () => request(app.getHttpServer()).get(`/tickets/${id}/qr`),
    ];

    for (const makeRequest of unauthorizedRequests) {
      await makeRequest().expect(401);
    }
  });

  it('derives identity from JWT and denies every cross-user transaction', async () => {
    const seat = await createFixture();
    const userA = await registerUser('Alpha');
    const userB = await registerUser('Beta');
    const asUserA = { Authorization: `Bearer ${userA.accessToken}` };
    const asUserB = { Authorization: `Bearer ${userB.accessToken}` };

    const holdResponse = await request(app.getHttpServer())
      .post('/seats/hold')
      .set(asUserA)
      .send({ tripId: seat.tripId, seatNo: seat.seatNo, userId: userB.id })
      .expect(201);
    const holdId = holdResponse.body.holdId as string;

    const persistedHold = await client.pool.query<{ user_id: string }>(
      'SELECT user_id FROM seat_holds WHERE id = $1',
      [holdId],
    );
    expect(persistedHold.rows[0]?.user_id).toBe(userA.id);

    await request(app.getHttpServer())
      .delete(`/seats/hold/${holdId}`)
      .set(asUserB)
      .send({ userId: userA.id })
      .expect(404);

    const orderBody = {
      userId: userA.id,
      tripId: seat.tripId,
      seatNo: seat.seatNo,
      holdId,
      idempotencyKey: randomUUID(),
      passengerFirstName: 'Test',
      passengerLastName: 'Passenger',
      passengerEmail: userA.email,
    };
    await request(app.getHttpServer())
      .post('/checkout/order')
      .set(asUserB)
      .send(orderBody)
      .expect(404);

    const orderResponse = await request(app.getHttpServer())
      .post('/checkout/order')
      .set(asUserA)
      .send({ ...orderBody, userId: userB.id })
      .expect(201);
    const orderId = orderResponse.body.id as string;
    expect(orderResponse.body.userId).toBe(userA.id);

    await request(app.getHttpServer())
      .post('/checkout/order')
      .set(asUserB)
      .send(orderBody)
      .expect(409);

    await request(app.getHttpServer()).get(`/checkout/order/${orderId}`).set(asUserB).expect(404);
    await request(app.getHttpServer())
      .post(`/checkout/order/${orderId}/pay`)
      .set(asUserB)
      .send({ userId: userA.id })
      .expect(404);

    const paymentResponse = await request(app.getHttpServer())
      .post(`/checkout/order/${orderId}/pay`)
      .set(asUserA)
      .send({ userId: userB.id })
      .expect(201);
    const ticketId = paymentResponse.body.ticket.id as string;

    await request(app.getHttpServer()).get(`/tickets/${ticketId}`).set(asUserB).expect(403);
    await request(app.getHttpServer()).get(`/tickets/${ticketId}/qr`).set(asUserB).expect(403);
    const userBTickets = await request(app.getHttpServer())
      .get('/tickets')
      .set(asUserB)
      .expect(200);
    expect(userBTickets.body.active).toHaveLength(0);

    await request(app.getHttpServer()).get(`/checkout/order/${orderId}`).set(asUserA).expect(200);
    await request(app.getHttpServer()).get(`/tickets/${ticketId}`).set(asUserA).expect(200);
    await request(app.getHttpServer()).get(`/tickets/${ticketId}/qr`).set(asUserA).expect(200);
  });
});
