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
