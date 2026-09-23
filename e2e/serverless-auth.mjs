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

export async function runServerlessTransportJourney(baseURL) {
  const context = await request.newContext({ baseURL });
  try {
    const [locationsResponse, routesResponse, tripsResponse] = await Promise.all([
      context.get('/api/transport/locations'),
      context.get('/api/transport/routes'),
      context.get('/api/transport/trips'),
    ]);
    assert.equal(locationsResponse.status(), 200);
    assert.equal(routesResponse.status(), 200);
    assert.equal(tripsResponse.status(), 200);
    assert.equal(locationsResponse.headers()['cache-control'], 'no-store');
    const locations = await locationsResponse.json();
    const routes = await routesResponse.json();
    const trips = await tripsResponse.json();
    assert.ok(locations.length >= 4, 'staging presentation locations must remain available');
    assert.ok(routes.length > 0, 'at least one configured route must be available');
    assert.ok(trips.length > 0, 'at least one trip must be available');

    const trip = trips[0];
    const date = trip.trip.departureTime.slice(0, 10);
    const filtered = await context.get('/api/transport/trips', {
      params: {
        date,
        originId: trip.route.originId,
        destinationId: trip.route.destinationId,
      },
    });
    assert.equal(filtered.status(), 200);
    assert.ok((await filtered.json()).some((item) => item.trip.id === trip.trip.id));
    const detail = await context.get(`/api/transport/trips/${trip.trip.id}`);
    assert.equal(detail.status(), 200);
    assert.equal((await detail.json()).id, trip.trip.id);
    assert.equal((await context.get('/api/transport/trips?date=not-a-date')).status(), 400);
    assert.equal((await context.get('/api/transport/trips/not-a-uuid')).status(), 400);
    assert.equal(
      (await context.get('/')).status(),
      200,
      'home server render uses direct Neon queries',
    );
    process.stdout.write(
      'PASS serverless transport: locations → routes → filtered trips → detail; legacy backend unavailable\n',
    );
  } finally {
    await context.dispose();
  }
}

export async function runServerlessSeatJourney(baseURL) {
  const context = await request.newContext({ baseURL });
  try {
    const trips = await (await context.get('/api/transport/trips')).json();
    const trip = trips.find((item) => item.trip.status === 'scheduled') ?? trips[0];
    assert.ok(trip, 'seat journey requires a fixture trip');
    const mapResponse = await context.get(`/api/seats/trip/${trip.trip.id}`);
    assert.equal(mapResponse.status(), 200);
    assert.equal(mapResponse.headers()['cache-control'], 'no-store');
    const map = await mapResponse.json();
    const seat = map.seats.find((item) => item.status === 'available');
    assert.ok(seat, 'seat journey requires an available seat');
    const holdInput = { tripId: trip.trip.id, seatNo: seat.seatNo };
    assert.equal((await context.post('/api/seats/hold', { data: holdInput })).status(), 401);
    assert.equal(
      (
        await context.post('/api/auth/login', {
          data: { email: 'yolcu@siirtkurtalan.demo', password: 'Demo123!' },
        })
      ).status(),
      200,
    );
    const first = await context.post('/api/seats/hold', { data: holdInput });
    assert.equal(first.status(), 200);
    const hold = await first.json();
    const retry = await context.post('/api/seats/hold', { data: holdInput });
    assert.equal(retry.status(), 200);
    assert.equal((await retry.json()).holdId, hold.holdId, 'same passenger retry is idempotent');
    const heldMap = await (await context.get(`/api/seats/trip/${trip.trip.id}`)).json();
    assert.equal(heldMap.seats.find((item) => item.seatNo === seat.seatNo).status, 'held');
    assert.equal((await context.delete(`/api/seats/hold/${randomUUID()}`)).status(), 404);
    assert.equal((await context.delete(`/api/seats/hold/${hold.holdId}`)).status(), 200);
    assert.equal(
      (await context.delete(`/api/seats/hold/${hold.holdId}`)).status(),
      200,
      'release retry is idempotent',
    );
    const releasedMap = await (await context.get(`/api/seats/trip/${trip.trip.id}`)).json();
    assert.equal(releasedMap.seats.find((item) => item.seatNo === seat.seatNo).status, 'available');
    process.stdout.write(
      'PASS serverless seats: inventory → auth hold → idempotent retry → release; legacy backend unavailable\n',
    );
  } finally {
    await context.dispose();
  }
}

export async function runServerlessCheckoutJourney(baseURL) {
  const context = await request.newContext({ baseURL });
  try {
    const trips = await (await context.get('/api/transport/trips')).json();
    const trip = trips.find((item) => item.trip.status === 'scheduled') ?? trips[0];
    assert.ok(trip, 'checkout journey requires a fixture trip');
    const map = await (await context.get(`/api/seats/trip/${trip.trip.id}`)).json();
    const seat = map.seats.find((item) => item.status === 'available');
    assert.ok(seat, 'checkout journey requires an available seat');
    const unauthorized = await context.post('/api/checkout/order', { data: {} });
    assert.equal(unauthorized.status(), 401);
    assert.equal(
      (
        await context.post('/api/auth/login', {
          data: { email: 'yolcu@siirtkurtalan.demo', password: 'Demo123!' },
        })
      ).status(),
      200,
    );
    const holdResponse = await context.post('/api/seats/hold', {
      data: { tripId: trip.trip.id, seatNo: seat.seatNo },
    });
    assert.equal(holdResponse.status(), 200);
    const hold = await holdResponse.json();
    const input = {
      tripId: trip.trip.id,
      seatNo: seat.seatNo,
      holdId: hold.holdId,
      passengerFirstName: 'E2E',
      passengerLastName: 'Checkout',
      idempotencyKey: randomUUID(),
      totalMinor: 1,
    };
    const created = await context.post('/api/checkout/order', { data: input });
    assert.equal(created.status(), 200);
    const order = await created.json();
    assert.equal(order.totalMinor, seat.priceMinor, 'server price must override submitted totals');
    const retry = await context.post('/api/checkout/order', { data: input });
    assert.equal(retry.status(), 200);
    assert.equal((await retry.json()).id, order.id);
    const [firstPayment, paymentRetry] = await Promise.all([
      context.post(`/api/checkout/order/${order.id}/pay`),
      context.post(`/api/checkout/order/${order.id}/pay`),
    ]);
    assert.equal(firstPayment.status(), 200);
    assert.equal(paymentRetry.status(), 200);
    const payments = [await firstPayment.json(), await paymentRetry.json()];
    assert.deepEqual(payments.map((item) => item.alreadyPaid).sort(), [false, true]);
    assert.equal(payments[0].ticket.id, payments[1].ticket.id);
    const detailResponse = await context.get(`/api/checkout/order/${order.id}`);
    assert.equal(detailResponse.status(), 200);
    const detail = await detailResponse.json();
    assert.equal(detail.status, 'paid');
    assert.equal(detail.tripSeat.status, 'purchased');
    assert.equal(detail.payments.length, 1);
    assert.equal(detail.ticket.id, payments[0].ticket.id);
    const walletResponse = await context.get('/api/tickets');
    assert.equal(walletResponse.status(), 200);
    const wallet = await walletResponse.json();
    const walletTicket = [...wallet.active, ...wallet.past, ...wallet.cancelled].find(
      (item) => item.id === detail.ticket.id,
    );
    assert.ok(walletTicket, 'new ticket must appear in the passenger wallet');
    assert.equal('qrTokenHash' in walletTicket, false);
    const ticketResponse = await context.get(`/api/tickets/${detail.ticket.id}`);
    assert.equal(ticketResponse.status(), 200);
    assert.equal('qrTokenHash' in (await ticketResponse.json()), false);
    const qrResponse = await context.get(`/api/tickets/${detail.ticket.id}/qr`);
    assert.equal(qrResponse.status(), 200);
    const qr = await qrResponse.json();
    const claims = JSON.parse(Buffer.from(qr.payload.split('.')[1], 'base64url').toString('utf8'));
    assert.equal(claims.purpose, 'ticket-qr');
    assert.equal(claims.sub, detail.ticket.id);
    assert.equal(claims.tripId, trip.trip.id);
    process.stdout.write(
      'PASS serverless checkout/tickets: hold → idempotent order → concurrent payment → wallet/detail/QR; legacy backend unavailable\n',
    );
  } finally {
    await context.dispose();
  }
}

export async function runServerlessTrackingJourney(baseURL) {
  const context = await request.newContext({ baseURL });
  const outsider = await request.newContext({ baseURL });
  try {
    const walletUnauthorized = await context.get('/api/tickets');
    assert.equal(walletUnauthorized.status(), 401);
    assert.equal(
      (
        await context.post('/api/auth/login', {
          data: { email: 'yolcu@siirtkurtalan.demo', password: 'Demo123!' },
        })
      ).status(),
      200,
    );
    const wallet = await (await context.get('/api/tickets')).json();
    const ticket = wallet.active.find((item) => item.ticketNo === 'TKT-DEMO-AKTIF');
    assert.ok(ticket, 'tracking journey requires the active seeded ticket');

    const bootstrapResponse = await context.get(`/api/tracking/tickets/${ticket.id}/bootstrap`);
    assert.equal(bootstrapResponse.status(), 200);
    const bootstrap = await bootstrapResponse.json();
    assert.equal(bootstrap.ticketId, ticket.id);
    assert.equal(bootstrap.routeGeometry.type, 'LineString');
    assert.equal(bootstrap.realtime.channel, `trip:${ticket.tripId}:location`);
    assert.equal(bootstrap.latestPosition.tripId, ticket.tripId);
    assert.equal(bootstrap.latestPosition.longitude, 41.97);
    assert.equal(bootstrap.latestPosition.latitude, 37.93);

    const tokenResponse = await context.post(`/api/tracking/tickets/${ticket.id}/token`);
    assert.equal(tokenResponse.status(), 200);
    const token = await tokenResponse.json();
    assert.equal(token.clientId.startsWith('passenger:'), true);
    assert.equal(token.ttl, 300_000);
    assert.deepEqual(JSON.parse(token.capability), {
      [`trip:${ticket.tripId}:location`]: ['subscribe'],
    });
    assert.equal('apiKey' in token, false);

    const outsiderCredentials = {
      email: `e2e-tracking-${randomUUID()}@example.test`,
      password: 'Local-test-pass123!',
      firstName: 'Tracking',
      lastName: 'Outsider',
    };
    assert.equal(
      (await outsider.post('/api/auth/register', { data: outsiderCredentials })).status(),
      200,
    );
    assert.equal(
      (await outsider.get(`/api/tracking/tickets/${ticket.id}/bootstrap`)).status(),
      404,
    );
    assert.equal((await outsider.post(`/api/tracking/tickets/${ticket.id}/token`)).status(), 404);
    process.stdout.write(
      'PASS serverless tracking: entitlement → PostGIS latest snapshot → scoped managed token; legacy backend unavailable\n',
    );
  } finally {
    await Promise.all([context.dispose(), outsider.dispose()]);
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
