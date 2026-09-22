import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createDatabaseClient } from '../src/client.js';
import { createSeatService } from '../src/server/seat-service.js';

type Fixture = {
  tripId: string;
  tripSeatId: string;
  seatNo: string;
  routeId: string;
  originId: string;
  destinationId: string;
  busId: string;
};

describe('serverless seat holds against PostgreSQL', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let service: ReturnType<typeof createSeatService>;
  let fixture: Fixture | undefined;

  beforeAll(() => {
    const url = process.env.DATABASE_URL;
    if (!url || !['localhost', '127.0.0.1', 'postgres'].includes(new URL(url).hostname)) {
      throw new Error('Seat integration tests require an isolated local/CI PostgreSQL database.');
    }
    client = createDatabaseClient({ url });
    service = createSeatService(() => client.db);
  });

  afterEach(async () => {
    if (!fixture) return;
    await client.pool.query('DELETE FROM seat_holds WHERE trip_seat_id = $1', [fixture.tripSeatId]);
    await client.pool.query('DELETE FROM trip_seats WHERE id = $1', [fixture.tripSeatId]);
    await client.pool.query('DELETE FROM trips WHERE id = $1', [fixture.tripId]);
    await client.pool.query('DELETE FROM buses WHERE id = $1', [fixture.busId]);
    await client.pool.query('DELETE FROM routes WHERE id = $1', [fixture.routeId]);
    await client.pool.query('DELETE FROM locations WHERE id IN ($1, $2)', [
      fixture.originId,
      fixture.destinationId,
    ]);
    fixture = undefined;
  });

  afterAll(async () => {
    if (client) await client.close();
  });

  async function createFixture(status = 'available') {
    fixture = {
      originId: randomUUID(),
      destinationId: randomUUID(),
      routeId: randomUUID(),
      busId: randomUUID(),
      tripId: randomUUID(),
      tripSeatId: randomUUID(),
      seatNo: '7',
    };
    await client.pool.query(
      `INSERT INTO locations (id, name, type) VALUES ($1, $2, 'terminal'), ($3, $4, 'terminal')`,
      [
        fixture.originId,
        `Seat origin ${fixture.routeId}`,
        fixture.destinationId,
        `Seat destination ${fixture.routeId}`,
      ],
    );
    await client.pool.query(
      `INSERT INTO routes (id, name, origin_id, destination_id) VALUES ($1, $2, $3, $4)`,
      [fixture.routeId, `Seat route ${fixture.routeId}`, fixture.originId, fixture.destinationId],
    );
    await client.pool.query(
      `INSERT INTO buses (id, plate_number, seat_layout, total_seats) VALUES ($1, $2, $3::jsonb, 1)`,
      [
        fixture.busId,
        `TST-${fixture.busId.slice(0, 8)}`,
        JSON.stringify({ layout: '2+1', items: [] }),
      ],
    );
    await client.pool.query(
      `INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, status, base_price)
       VALUES ($1, $2, $3, now() + interval '1 day', now() + interval '1 day 1 hour', 'scheduled', 100)`,
      [fixture.tripId, fixture.routeId, fixture.busId],
    );
    await client.pool.query(
      `INSERT INTO trip_seats (id, trip_id, seat_no, seat_type, price_minor, status, version)
       VALUES ($1, $2, $3, 'standard', 10000, $4, 1)`,
      [fixture.tripSeatId, fixture.tripId, fixture.seatNo, status],
    );
    return fixture;
  }

  async function activeHolds(tripSeatId: string) {
    return (
      await client.pool.query(
        `SELECT id, user_id, status FROM seat_holds WHERE trip_seat_id = $1 AND status = 'active'`,
        [tripSeatId],
      )
    ).rows;
  }

  it('allows exactly one of two passengers to acquire the same seat concurrently', async () => {
    const seat = await createFixture();
    const users = [randomUUID(), randomUUID()];
    const results = await Promise.allSettled(
      users.map((userId) =>
        service.createHold({ tripId: seat.tripId, seatNo: seat.seatNo }, userId),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(
      (results.find((result) => result.status === 'rejected') as PromiseRejectedResult).reason,
    ).toMatchObject({ status: 409 });
    expect(await activeHolds(seat.tripSeatId)).toHaveLength(1);
  });

  it('returns one durable hold for simultaneous idempotent retries by the same passenger', async () => {
    const seat = await createFixture();
    const userId = randomUUID();
    const [first, second] = await Promise.all([
      service.createHold({ tripId: seat.tripId, seatNo: seat.seatNo }, userId),
      service.createHold({ tripId: seat.tripId, seatNo: seat.seatNo }, userId),
    ]);
    expect(first.holdId).toBe(second.holdId);
    expect(await activeHolds(seat.tripSeatId)).toHaveLength(1);
  });

  it('reclaims an expired hold and exposes the seat as available', async () => {
    const seat = await createFixture('held');
    const expiredOwner = randomUUID();
    await client.pool.query(
      `INSERT INTO seat_holds (trip_seat_id, user_id, status, expires_at)
       VALUES ($1, $2, 'active', now() - interval '1 minute')`,
      [seat.tripSeatId, expiredOwner],
    );
    const map = await service.getSeatMap(seat.tripId);
    expect(map.seats[0].status).toBe('available');
    await expect(
      service.createHold({ tripId: seat.tripId, seatNo: seat.seatNo }, randomUUID()),
    ).resolves.toMatchObject({ seatNo: seat.seatNo });
    const expired = await client.pool.query('SELECT status FROM seat_holds WHERE user_id = $1', [
      expiredOwner,
    ]);
    expect(expired.rows[0].status).toBe('expired');
  });

  it.each(['purchased', 'blocked'])('never holds a %s seat', async (status) => {
    const seat = await createFixture(status);
    await expect(
      service.createHold({ tripId: seat.tripId, seatNo: seat.seatNo }, randomUUID()),
    ).rejects.toMatchObject({ status: 409 });
    expect(await activeHolds(seat.tripSeatId)).toEqual([]);
  });

  it('releases only for the owner and makes repeated owner release idempotent', async () => {
    const seat = await createFixture();
    const owner = randomUUID();
    const hold = await service.createHold({ tripId: seat.tripId, seatNo: seat.seatNo }, owner);
    await expect(service.releaseHold(hold.holdId, randomUUID())).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.releaseHold(hold.holdId, owner)).resolves.toEqual({ released: true });
    await expect(service.releaseHold(hold.holdId, owner)).resolves.toEqual({ released: true });
    const state = await client.pool.query('SELECT status FROM trip_seats WHERE id = $1', [
      seat.tripSeatId,
    ]);
    expect(state.rows[0].status).toBe('available');
  });
});
