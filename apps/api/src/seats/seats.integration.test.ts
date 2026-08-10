import { ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createDatabaseClient } from '@ekspres/database';
import { SeatsService } from './seats.service';

type Fixture = {
  tripId: string;
  tripSeatId: string;
  seatNo: string;
  routeId: string;
  originId: string;
  destinationId: string;
  busId: string;
};

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  const envFile = join(process.cwd(), '../../.env');
  const match = readFileSync(envFile, 'utf8').match(/^DATABASE_URL=(.+)$/m);
  if (match) process.env.DATABASE_URL = match[1].trim().replace(/^['"]|['"]$/g, '');
}

describe('SeatsService PostgreSQL integration', () => {
  let client: ReturnType<typeof createDatabaseClient>;
  let service: SeatsService;
  let fixture: Fixture | undefined;

  beforeAll(() => {
    loadDatabaseUrl();
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Integration tests require DATABASE_URL.');
    if (url.includes('production'))
      throw new Error('SAFETY GUARD: Suspicious production database URL detected.');

    client = createDatabaseClient({ url });
    service = new SeatsService(client.db as any);
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
      [
        originId,
        `Concurrency origin ${routeId}`,
        destinationId,
        `Concurrency destination ${routeId}`,
      ],
    );
    await client.pool.query(
      `INSERT INTO routes (id, name, origin_id, destination_id) VALUES ($1, $2, $3, $4)`,
      [routeId, `Concurrency route ${routeId}`, originId, destinationId],
    );
    await client.pool.query(
      `INSERT INTO buses (id, plate_number, seat_layout, total_seats) VALUES ($1, $2, $3::jsonb, 1)`,
      [busId, `TST-${busId.slice(0, 8)}`, JSON.stringify({ layout: 'test', items: [] })],
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

  async function activeHolds(tripSeatId: string) {
    const result = await client.pool.query(
      `SELECT id, user_id, status FROM seat_holds WHERE trip_seat_id = $1 AND status = 'active'`,
      [tripSeatId],
    );
    return result.rows;
  }

  it('allows exactly one of two simultaneous same-seat hold attempts', async () => {
    const seat = await createFixture();
    const userA = randomUUID();
    const userB = randomUUID();

    const [first, second] = await Promise.allSettled([
      service.createHold(seat.tripId, seat.seatNo, userA),
      service.createHold(seat.tripId, seat.seatNo, userB),
    ]);
    const success = [first, second].find((result) => result.status === 'fulfilled');
    const failure = [first, second].find((result) => result.status === 'rejected');

    expect([first, second].filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect([first, second].filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(failure?.status).toBe('rejected');
    if (failure?.status !== 'rejected') throw new Error('Expected one hold request to conflict');
    expect(failure.reason).toBeInstanceOf(ConflictException);
    expect(success?.status).toBe('fulfilled');
    if (success?.status !== 'fulfilled') throw new Error('Expected one hold request to succeed');

    const holds = await activeHolds(seat.tripSeatId);
    const seatState = await client.pool.query('SELECT status FROM trip_seats WHERE id = $1', [
      seat.tripSeatId,
    ]);
    expect(holds).toHaveLength(1);
    expect([userA, userB]).toContain(holds[0].user_id);
    expect(success.value.holdId).toBe(holds[0].id);
    expect(seatState.rows[0].status).toBe('held');
  });

  it('reclaims an expired hold and presents the seat as available before reclaim', async () => {
    const seat = await createFixture();
    const expiredOwner = randomUUID();
    const newOwner = randomUUID();
    await client.pool.query(
      `INSERT INTO seat_holds (trip_seat_id, user_id, status, expires_at)
       VALUES ($1, $2, 'active', now() - interval '1 minute')`,
      [seat.tripSeatId, expiredOwner],
    );
    await client.pool.query(`UPDATE trip_seats SET status = 'held' WHERE id = $1`, [
      seat.tripSeatId,
    ]);

    const map = await service.getSeatMap(seat.tripId);
    expect(map.seats[0].status).toBe('available');

    await service.createHold(seat.tripId, seat.seatNo, newOwner);
    const holds = await client.pool.query(
      `SELECT user_id, status FROM seat_holds WHERE trip_seat_id = $1 ORDER BY created_at`,
      [seat.tripSeatId],
    );
    expect(holds.rows.filter((hold) => hold.status === 'active')).toEqual([
      expect.objectContaining({ user_id: newOwner, status: 'active' }),
    ]);
    expect(
      holds.rows.some((hold) => hold.user_id === expiredOwner && hold.status === 'expired'),
    ).toBe(true);
  });

  it('does not allow an unexpired active hold to be stolen', async () => {
    const seat = await createFixture();
    const owner = randomUUID();
    const contender = randomUUID();
    await service.createHold(seat.tripId, seat.seatNo, owner);

    await expect(service.createHold(seat.tripId, seat.seatNo, contender)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(await activeHolds(seat.tripSeatId)).toEqual([
      expect.objectContaining({ user_id: owner, status: 'active' }),
    ]);
  });

  it('releases a hold so another user can acquire the seat', async () => {
    const seat = await createFixture();
    const firstOwner = randomUUID();
    const secondOwner = randomUUID();
    const firstHold = await service.createHold(seat.tripId, seat.seatNo, firstOwner);

    await expect(service.releaseHold(firstHold.holdId, firstOwner)).resolves.toEqual({
      released: true,
    });
    await expect(service.createHold(seat.tripId, seat.seatNo, secondOwner)).resolves.toEqual(
      expect.objectContaining({ seatNo: seat.seatNo }),
    );
  });

  it('rejects repeated release without corrupting seat state', async () => {
    const seat = await createFixture();
    const owner = randomUUID();
    const hold = await service.createHold(seat.tripId, seat.seatNo, owner);

    await service.releaseHold(hold.holdId, owner);
    await expect(service.releaseHold(hold.holdId, owner)).rejects.toBeInstanceOf(ConflictException);
    const seatState = await client.pool.query('SELECT status FROM trip_seats WHERE id = $1', [
      seat.tripSeatId,
    ]);
    expect(seatState.rows[0].status).toBe('available');
    expect(await activeHolds(seat.tripSeatId)).toHaveLength(0);
  });
});
