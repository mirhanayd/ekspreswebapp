import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { request } from '@playwright/test';

export async function runServerlessAuthJourney(baseURL) {
  const context = await request.newContext({ baseURL });
  const credentials = {
    email: `e2e-auth-${randomUUID()}@example.test`,
    password: 'Local-test-pass123!',
  };
  const cookieName = 'ekspres_access_token';
  try {
    assert.equal((await context.get('/api/auth/me')).status(), 401);
    assert.equal(
      (
        await context.post('/api/auth/login', {
          data: '{',
          headers: { 'Content-Type': 'application/json' },
        })
      ).status(),
      400,
    );
    const registration = await context.post('/api/auth/register', {
      data: { ...credentials, firstName: 'Local', lastName: 'Test', role: 'admin' },
    });
    assert.equal(registration.status(), 200, 'register must succeed without the legacy API');
    assert.deepEqual(await registration.json(), { authenticated: true });
    const session = await context.get('/api/auth/me');
    assert.equal(session.status(), 200);
    assert.equal(session.headers()['cache-control'], 'no-store');
    const profile = await session.json();
    assert.equal(profile.role, 'passenger');
    assert.equal('passwordHash' in profile, false);
    const compatibilitySession = await context.get('/api/passenger/auth/me');
    assert.equal(compatibilitySession.status(), 200);
    assert.equal((await compatibilitySession.json()).id, profile.id);
    const cookie = (await context.storageState()).cookies.find((item) => item.name === cookieName);
    assert.equal(cookie?.httpOnly, true);
    assert.equal(cookie?.sameSite, 'Lax');
    assert.equal(
      (
        await context.post('/api/auth/register', {
          data: { ...credentials, firstName: 'Local', lastName: 'Test' },
        })
      ).status(),
      409,
    );
    assert.equal((await context.post('/api/auth/logout')).status(), 200);
    assert.equal((await context.get('/api/auth/me')).status(), 401);
    assert.equal(
      (
        await context.post('/api/auth/login', { data: { ...credentials, password: 'wrong' } })
      ).status(),
      401,
    );
    assert.equal((await context.post('/api/auth/login', { data: credentials })).status(), 200);
    assert.equal((await context.get('/api/auth/me')).status(), 200);

    // Test a correctly signed but expired cookie, separately from signature tampering.
    const [header, encoded] = cookie.value.split('.');
    const claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    claims.exp = Math.floor(Date.now() / 1000) - 1;
    const input = `${header}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}`;
    const expired = `${input}.${createHmac('sha256', process.env.JWT_SECRET).update(input).digest('base64url')}`;
    for (const value of [expired, `${cookie.value}.extra`]) {
      const response = await context.get('/api/auth/me', {
        headers: { Cookie: `${cookieName}=${value}` },
      });
      assert.equal(response.status(), 401);
      assert.match(response.headers()['set-cookie'], /expires=Thu, 01 Jan 1970/i);
    }
    process.stdout.write(
      'PASS serverless auth: register → session → logout → login → expired/tampered denial; legacy backend unavailable\n',
    );
  } finally {
    await context.dispose();
  }
}

export async function runServerlessDriverRegression(baseURL) {
  const context = await request.newContext({ baseURL });
  try {
    assert.equal((await context.get('/api/driver/trips')).status(), 401);
    assert.equal(
      (
        await context.post('/api/auth/login', {
          data: { email: 'yolcu@siirtkurtalan.demo', password: 'Demo123!' },
        })
      ).status(),
      403,
    );
    assert.equal(
      (
        await context.post('/api/auth/login', {
          data: { email: 'sofor@siirtkurtalan.demo', password: 'Sofor123!' },
        })
      ).status(),
      200,
    );
    const response = await context.get('/api/driver/trips');
    assert.equal(response.status(), 200);
    const trips = await response.json();
    assert.ok(trips.length > 0, 'driver sees assigned trips');
    const trip = trips.find((item) => item.passengerSummary.total > 0);
    assert.ok(trip, 'fixture must include assigned passengers');
    const detailResponse = await context.get(`/api/driver/trips/${trip.id}`);
    assert.equal(detailResponse.status(), 200);
    const detail = await detailResponse.json();
    assert.ok(detail.route.stops.length > 0);
    assert.ok(detail.manifest.length > 0);
    const passenger = detail.manifest[0];
    for (const status of ['boarded', 'no_show', 'pending']) {
      const changed = await context.patch(
        `/api/driver/trips/${trip.id}/passengers/${passenger.ticketId}`,
        { data: { status } },
      );
      assert.equal(changed.status(), 200);
      const reread = await context.get(`/api/driver/trips/${trip.id}`);
      assert.equal(
        (await reread.json()).manifest.find((item) => item.ticketId === passenger.ticketId)
          .boardingStatus,
        status,
      );
    }
    for (const status of ['boarding', trip.status]) {
      assert.equal(
        (await context.patch(`/api/driver/trips/${trip.id}/status`, { data: { status } })).status(),
        200,
      );
    }
    const location = await context.post(`/api/driver/trips/${trip.id}/location`, {
      data: { longitude: 41.97, latitude: 37.93, speedKph: 20, headingDeg: 90 },
    });
    assert.equal(location.status(), 201);
    assert.equal((await location.json()).source, 'MOBILE_APP');
    assert.equal((await context.get(`/api/driver/trips/${randomUUID()}`)).status(), 403);
    assert.equal((await context.post('/api/auth/logout')).status(), 200);
    assert.equal((await context.get('/api/driver/trips')).status(), 401);
    process.stdout.write(
      'PASS driver regression: role denial → login → assigned trips/stops/manifest → boarding/status → GPS → logout; legacy backend unavailable\n',
    );
  } finally {
    await context.dispose();
  }
}
