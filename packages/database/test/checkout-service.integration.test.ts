import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../src/client.js';
import { createCheckoutService } from '../src/server/checkout-service.js';
import { createSeatService } from '../src/server/seat-service.js';
import { createTicketService } from '../src/server/ticket-service.js';
import { createAdminService } from '../src/server/admin-service.js';

type Fixture = {
  userId: string;
  otherUserId: string;
  originId: string;
  destinationId: string;
  routeId: string;
  busId: string;
  tripId: string;
  tripSeatId: string;
  seatNo: string;
};

describe('serverless checkout against PostgreSQL', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let checkout: ReturnType<typeof createCheckoutService>;
  let seats: ReturnType<typeof createSeatService>;
  let tickets: ReturnType<typeof createTicketService>;
  let admin: ReturnType<typeof createAdminService>;
  let fixture: Fixture | undefined;

  beforeAll(() => {
    const url = process.env.DATABASE_URL;
    if (!url || !['localhost', '127.0.0.1', 'postgres'].includes(new URL(url).hostname)) {
      throw new Error(
        'Checkout integration tests require an isolated local/CI PostgreSQL database.',
      );
    }
    client = createDatabaseClient({ url });
    checkout = createCheckoutService(() => client.db);
    seats = createSeatService(() => client.db);
    tickets = createTicketService(() => client.db);
    admin = createAdminService(() => client.db);
  });

  afterEach(async () => {
    if (!fixture) return;
    await client.pool.query('DELETE FROM tickets WHERE trip_seat_id = $1', [fixture.tripSeatId]);
    await client.pool.query(
      'DELETE FROM payments WHERE order_id IN (SELECT id FROM orders WHERE trip_seat_id = $1)',
      [fixture.tripSeatId],
    );
    await client.pool.query('DELETE FROM orders WHERE trip_seat_id = $1', [fixture.tripSeatId]);
    await client.pool.query('DELETE FROM seat_holds WHERE trip_seat_id = $1', [fixture.tripSeatId]);
    await client.pool.query('DELETE FROM trip_seats WHERE id = $1', [fixture.tripSeatId]);
    await client.pool.query('DELETE FROM trips WHERE id = $1', [fixture.tripId]);
    await client.pool.query('DELETE FROM buses WHERE id = $1', [fixture.busId]);
    await client.pool.query('DELETE FROM routes WHERE id = $1', [fixture.routeId]);
    await client.pool.query('DELETE FROM locations WHERE id IN ($1, $2)', [
      fixture.originId,
      fixture.destinationId,
    ]);
    await client.pool.query('DELETE FROM users WHERE id IN ($1, $2)', [
      fixture.userId,
      fixture.otherUserId,
    ]);
    fixture = undefined;
  });

  afterAll(async () => {
    if (client) await client.close();
  });

  async function createFixture() {
    fixture = {
      userId: randomUUID(),
      otherUserId: randomUUID(),
      originId: randomUUID(),
      destinationId: randomUUID(),
      routeId: randomUUID(),
      busId: randomUUID(),
      tripId: randomUUID(),
      tripSeatId: randomUUID(),
      seatNo: '7',
    };
    const marker = randomUUID();
    await client.pool.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, 'test-only', 'Checkout', 'Owner', 'passenger'),
              ($3, $4, 'test-only', 'Other', 'Passenger', 'passenger')`,
      [
        fixture.userId,
        `checkout-${marker}@example.test`,
        fixture.otherUserId,
        `other-${marker}@example.test`,
      ],
    );
    await client.pool.query(
      `INSERT INTO locations (id, name, type) VALUES ($1, $2, 'terminal'), ($3, $4, 'terminal')`,
      [fixture.originId, `Origin ${marker}`, fixture.destinationId, `Destination ${marker}`],
    );
    await client.pool.query(
      `INSERT INTO routes (id, name, origin_id, destination_id) VALUES ($1, $2, $3, $4)`,
      [fixture.routeId, `Checkout route ${marker}`, fixture.originId, fixture.destinationId],
    );
    await client.pool.query(
      `INSERT INTO buses (id, plate_number, seat_layout, total_seats) VALUES ($1, $2, $3::jsonb, 1)`,
      [fixture.busId, `CHK-${marker.slice(0, 8)}`, JSON.stringify({ layout: '2+1', items: [] })],
    );
    await client.pool.query(
      `INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, status, base_price)
       VALUES ($1, $2, $3, now() + interval '1 day', now() + interval '1 day 1 hour', 'scheduled', 1)`,
      [fixture.tripId, fixture.routeId, fixture.busId],
    );
    await client.pool.query(
      `INSERT INTO trip_seats (id, trip_id, seat_no, seat_type, price_minor, status, version)
       VALUES ($1, $2, $3, 'standard', 12345, 'available', 1)`,
      [fixture.tripSeatId, fixture.tripId, fixture.seatNo],
    );
    return fixture;
  }

  async function heldOrderInput(item: Fixture, idempotencyKey = randomUUID()) {
    const hold = await seats.createHold({ tripId: item.tripId, seatNo: item.seatNo }, item.userId);
    return {
      tripId: item.tripId,
      seatNo: item.seatNo,
      holdId: hold.holdId,
      passengerFirstName: 'Checkout',
      passengerLastName: 'Owner',
      idempotencyKey,
      totalMinor: 1,
    };
  }

  it('uses the locked seat price and serializes simultaneous idempotent retries', async () => {
    const item = await createFixture();
    const input = await heldOrderInput(item, randomUUID());
    const [first, retry] = await Promise.all([
      checkout.createOrder(input, item.userId),
      checkout.createOrder(input, item.userId),
    ]);
    expect(first.id).toBe(retry.id);
    expect(first.totalMinor).toBe(12345);
    expect(
      (
        await client.pool.query(
          'SELECT count(*)::int AS count FROM orders WHERE trip_seat_id = $1',
          [item.tripSeatId],
        )
      ).rows[0].count,
    ).toBe(1);
  });

  it('returns one pending order when the same hold is retried with different keys', async () => {
    const item = await createFixture();
    const input = await heldOrderInput(item);
    const [first, retry] = await Promise.all([
      checkout.createOrder(input, item.userId),
      checkout.createOrder({ ...input, idempotencyKey: randomUUID() }, item.userId),
    ]);
    expect(first.id).toBe(retry.id);
  });

  it('derives identity from the principal and refuses another passenger hold', async () => {
    const item = await createFixture();
    const input = await heldOrderInput(item);
    await expect(checkout.createOrder(input, item.otherUserId)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('atomically creates one payment and ticket under concurrent payment retries', async () => {
    const item = await createFixture();
    const order = await checkout.createOrder(await heldOrderInput(item), item.userId);
    const results = await Promise.all([
      checkout.processPayment(order.id, item.userId),
      checkout.processPayment(order.id, item.userId),
    ]);
    expect(results.map((result) => result.alreadyPaid).sort()).toEqual([false, true]);
    expect(results[0].ticket.id).toBe(results[1].ticket.id);
    const counts = await client.pool.query(
      `SELECT
         (SELECT count(*)::int FROM payments WHERE order_id = $1) AS payments,
         (SELECT count(*)::int FROM tickets WHERE order_id = $1) AS tickets`,
      [order.id],
    );
    expect(counts.rows[0]).toEqual({ payments: 1, tickets: 1 });
    await expect(checkout.getOrder(order.id, item.otherUserId)).rejects.toMatchObject({
      status: 404,
    });
    const detail = await checkout.getOrder(order.id, item.userId);
    expect(detail.status).toBe('paid');
    expect(detail.tripSeat.status).toBe('purchased');
    expect(detail.ticket?.id).toBe(results[0].ticket.id);
    const wallet = await tickets.getMyTickets(item.userId);
    expect(wallet.active.map((ticket) => ticket.id)).toContain(results[0].ticket.id);
    expect(wallet.active[0]).not.toHaveProperty('qrTokenHash');
    await expect(
      tickets.getTicketDetail(results[0].ticket.id, item.otherUserId),
    ).rejects.toMatchObject({ status: 403 });
    const ticket = await tickets.getTicketDetail(results[0].ticket.id, item.userId);
    expect(ticket).not.toHaveProperty('qrTokenHash');
    const qr = await tickets.getTicketQr(results[0].ticket.id, item.userId);
    expect(qr.payload.split('.')).toHaveLength(3);
    expect(qr.payload).not.toContain(results[0].ticket.qrTokenHash);
    const adminTickets = await admin.getTickets();
    expect(adminTickets.map((value: { id: string }) => value.id)).toContain(results[0].ticket.id);
    expect(await admin.getTicket(results[0].ticket.id)).toMatchObject({
      id: results[0].ticket.id,
      amountMinor: 12345,
    });
    await expect(admin.getTicket(randomUUID())).rejects.toMatchObject({ status: 404 });
    expect((await admin.getTransport()).trips.map((trip: { id: string }) => trip.id)).toContain(
      item.tripId,
    );
    expect((await admin.getOverview()).paidOrders).toBeGreaterThan(0);
    expect((await admin.getReports()).occupancy.sold).toBeGreaterThan(0);
    expect(await admin.getFleet()).toEqual([]);
    await client.pool.query("UPDATE tickets SET status = 'cancelled' WHERE id = $1", [
      results[0].ticket.id,
    ]);
    await expect(tickets.getTicketQr(results[0].ticket.id, item.userId)).rejects.toMatchObject({
      status: 409,
    });
  });
});
