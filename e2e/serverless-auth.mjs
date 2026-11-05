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
    let trip;
    let detail;
    for (const candidate of trips) {
      if (candidate.passengerSummary.total === 0) continue;
      const detailResponse = await context.get(`/api/driver/trips/${candidate.id}`);
      assert.equal(detailResponse.status(), 200);
      const candidateDetail = await detailResponse.json();
      if (candidateDetail.manifest.some((item) => item.ticketNo === 'TKT-DEMO-AKTIF')) {
        trip = candidate;
        detail = candidateDetail;
        break;
      }
    }
    assert.ok(trip && detail, 'fixture must assign the active tracking ticket to this driver');
    assert.ok(detail.route.stops.length > 0);
    assert.ok(detail.manifest.length > 0);
    const passenger = detail.manifest[0];
    for (const status of ['boarded', 'alighted', 'no_show', 'pending']) {
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

    // The 14:00 run: a stop lists who gets off and on, and seat 17 changes hands at Kurtalan.
    const details = await Promise.all(
      trips.map(async (item) => (await context.get(`/api/driver/trips/${item.id}`)).json()),
    );
    const afternoon = details.find((item) =>
      item.manifest.some((passenger) => passenger.ticketNo === 'TKT-DEMO-DURAK-01'),
    );
    assert.ok(afternoon, 'fixture must assign the 14:00 stop scenario to this driver');
    assert.equal(afternoon.bus.totalSeats, 41);
    const kurtalan = afternoon.route.stops[1];
    const stopResponse = await context.get(
      `/api/driver/trips/${afternoon.id}/stops/${kurtalan.locationId}`,
    );
    assert.equal(stopResponse.status(), 200);
    const stop = await stopResponse.json();
    assert.deepEqual(
      stop.alighting.map((item) => item.seatNo),
      ['17', '32'],
    );
    assert.deepEqual(
      stop.boarding.map((item) => item.seatNo),
      ['17', '29', '32', '37'],
    );
    assert.notEqual(stop.alighting[0].ticketId, stop.boarding[0].ticketId);
    assert.deepEqual(
      stop.stops.map((item) => [item.alightingCount, item.boardingCount]),
      [
        [0, 7],
        [2, 4],
        [4, 3],
        [8, 0],
      ],
    );
    assert.equal(
      (await context.get(`/api/driver/trips/${afternoon.id}/stops/${randomUUID()}`)).status(),
      404,
    );
    assert.equal(
      (
        await context.get(`/api/driver/trips/${randomUUID()}/stops/${kurtalan.locationId}`)
      ).status(),
      403,
    );

    assert.equal((await context.post('/api/auth/logout')).status(), 200);
    assert.equal((await context.get('/api/driver/trips')).status(), 401);
    process.stdout.write(
      'PASS driver regression: role denial → login → assigned trips/stops/manifest → boarding/status → GPS → logout; legacy backend unavailable\n',
    );
  } finally {
    await context.dispose();
  }
}

const EARTH_RADIUS_M = 6_371_008.8;

function metersBetween(a, b) {
  const rad = (value) => (value * Math.PI) / 180;
  const x = rad(b[0] - a[0]) * Math.cos(rad((a[1] + b[1]) / 2));
  const y = rad(b[1] - a[1]);
  return Math.sqrt(x * x + y * y) * EARTH_RADIUS_M;
}

/** The point `km` of road before the end of the route, plus the bearing of that stretch. */
function pointBeforeRouteEnd(line, km) {
  let left = km * 1000;
  for (let index = line.length - 1; index > 0; index -= 1) {
    const segment = metersBetween(line[index - 1], line[index]);
    if (left <= segment) {
      const t = 1 - left / segment;
      const [x1, y1] = line[index - 1];
      const [x2, y2] = line[index];
      return {
        longitude: x1 + (x2 - x1) * t,
        latitude: y1 + (y2 - y1) * t,
        headingDeg: (Math.round((Math.atan2(x2 - x1, y2 - y1) * 180) / Math.PI) + 360) % 360,
      };
    }
    left -= segment;
  }
  throw new Error(`Route is shorter than ${km} km`);
}

/**
 * Alighting notifications, end to end: GPS fixes go through the driver app's real ingestion path,
 * the server decides from the stored route and the ticket's alighting stop, and the passenger app
 * hands out each alert exactly once. VAPID is not configured here, so delivery is the in-app
 * banner path; the push transport itself is covered by the package unit tests.
 */
export async function runAlightingNotificationJourney(passengerURL, driverURL) {
  const passenger = await request.newContext({ baseURL: passengerURL });
  const driver = await request.newContext({ baseURL: driverURL });
  try {
    assert.equal((await passenger.get('/api/notifications/alighting')).status(), 401);
    assert.equal(
      (
        await passenger.post('/api/auth/login', {
          data: { email: 'yolcu@siirtkurtalan.demo', password: 'Demo123!' },
        })
      ).status(),
      200,
    );

    // Settings persist per passenger and reject anything that is not a boolean switch.
    assert.deepEqual(await (await passenger.get('/api/notifications/preferences')).json(), {
      km5: true,
      km1: true,
      sound: true,
    });
    assert.equal(
      (await passenger.put('/api/notifications/preferences', { data: { km1: 'yes' } })).status(),
      400,
    );
    const changed = await passenger.put('/api/notifications/preferences', {
      data: { sound: false },
    });
    assert.deepEqual(await changed.json(), { km5: true, km1: true, sound: false });
    await passenger.put('/api/notifications/preferences', { data: { sound: true } });

    const vapid = await passenger.get('/api/push/vapid-key');
    assert.equal(vapid.status(), 503, 'VAPID is server-only config and absent in e2e');
    assert.equal(
      (await passenger.post('/api/push/subscription', { data: { endpoint: 'http://x' } })).status(),
      400,
    );

    const wallet = await (await passenger.get('/api/tickets')).json();
    const ticket = wallet.active.find((item) => item.ticketNo === 'TKT-DEMO-AKTIF');
    assert.ok(ticket, 'notification journey requires the active seeded ticket');
    const bootstrap = await (
      await passenger.get(`/api/tracking/tickets/${ticket.id}/bootstrap`)
    ).json();
    assert.ok(bootstrap.alighting?.name, 'bootstrap carries the ticket alighting stop');
    assert.equal(bootstrap.seatNo, ticket.tripSeat.seatNo);
    const line = bootstrap.routeGeometry.coordinates;

    assert.equal(
      (
        await driver.post('/api/auth/login', {
          data: { email: 'sofor@siirtkurtalan.demo', password: 'Sofor123!' },
        })
      ).status(),
      200,
    );
    let clock = Date.now() + 3_600_000;
    const fix = async (km) => {
      clock += 60_000;
      const point = pointBeforeRouteEnd(line, km);
      const response = await driver.post(`/api/driver/trips/${ticket.tripId}/location`, {
        data: { ...point, speedKph: 60, recordedAt: new Date(clock).toISOString() },
      });
      assert.equal(response.status(), 201, `GPS fix at ${km} km was accepted`);
    };
    const pending = async () =>
      (await (await passenger.get('/api/notifications/alighting')).json()).banners;
    const acknowledge = (banners) =>
      passenger.post('/api/notifications/alighting/ack', {
        data: { ids: banners.map((banner) => banner.id) },
      });

    await fix(8);
    await fix(6.5);
    assert.deepEqual(await pending(), [], 'nothing is sent above 5 km');

    await fix(4.8);
    const five = await pending();
    assert.equal(five.length, 1, 'the 5 km alert fires the first time the bus is under 5 km');
    assert.equal(five[0].threshold, 5);
    assert.match(five[0].title, /5 km kaldı$/);
    assert.match(five[0].body, /^Yaklaşık \d+ dakika sonra ineceksin\.$/);
    assert.equal(five[0].ticketId, ticket.id);
    assert.equal((await acknowledge(five)).status(), 200);

    await fix(4.2);
    await fix(3.1);
    await fix(5.5); // a bus drifting back out and in again must not repeat it
    await fix(4.9);
    assert.deepEqual(await pending(), [], 'the 5 km alert is sent once per ticket');

    await fix(0.9);
    const one = await pending();
    assert.equal(one.length, 1, 'the 1 km alert fires once');
    assert.equal(one[0].threshold, 1);
    assert.equal(one[0].title, '1 km kaldı, inişe hazırlan');
    assert.equal(one[0].body, `Koltuk ${ticket.tripSeat.seatNo}’te eşyanı unutma.`);
    await acknowledge(one);

    await fix(0.5);
    await fix(0.2);
    assert.deepEqual(await pending(), [], 'no further alerts after both thresholds');

    // Another passenger can neither read nor acknowledge this ticket's alerts.
    const outsider = await request.newContext({ baseURL: passengerURL });
    try {
      await outsider.post('/api/auth/register', {
        data: {
          email: `e2e-alert-${randomUUID()}@example.test`,
          password: 'Local-test-pass123!',
          firstName: 'Alert',
          lastName: 'Outsider',
        },
      });
      assert.deepEqual(await (await outsider.get('/api/notifications/alighting')).json(), {
        banners: [],
      });
    } finally {
      await outsider.dispose();
    }

    process.stdout.write(
      'PASS alighting notifications: GPS ingestion → 5 km → 1 km, each exactly once → settings → scoped to the ticket owner\n',
    );
  } finally {
    await Promise.all([passenger.dispose(), driver.dispose()]);
  }
}

export async function runDriverAdministrationJourney(adminURL, driverURL) {
  const admin = await request.newContext({
    baseURL: adminURL,
    extraHTTPHeaders: { Origin: adminURL },
  });
  const first = await request.newContext({ baseURL: driverURL });
  const second = await request.newContext({ baseURL: driverURL });
  try {
    assert.equal((await admin.get('/api/admin/drivers')).status(), 401);
    assert.equal(
      (
        await admin.post('/api/auth/login', {
          data: { email: 'admin@siirtkurtalan.demo', password: 'Admin123!' },
        })
      ).status(),
      200,
    );
    const transport = await (await admin.get('/api/admin/transport')).json();
    const trip = transport.trips.find((item) => item.status === 'scheduled');
    assert.ok(trip, 'a scheduled fixture trip is required');
    const originalDriverId = trip.driverId;
    const create = async (name) => {
      const email = `${name}-${randomUUID()}@example.test`;
      const response = await admin.post('/api/admin/drivers', {
        data: { firstName: name, lastName: 'Test', email },
      });
      assert.equal(response.status(), 201);
      const created = await response.json();
      return { email, password: created.temporaryPassword, ...created };
    };
    const driverA = await create('First');
    const driverB = await create('Second');
    assert.equal((await admin.get('/api/admin/drivers')).status(), 200);
    const assignmentURL = `/api/admin/trips/${trip.id}/driver`;
    assert.equal((await admin.get(assignmentURL)).status(), 200);
    assert.equal(
      (await admin.put(assignmentURL, { data: { driverId: driverA.id } })).status(),
      200,
    );
    assert.equal(
      (await admin.put(assignmentURL, { data: { driverId: driverA.id } })).status(),
      200,
      'duplicate assignment is idempotent',
    );
    assert.equal((await first.post('/api/auth/login', { data: driverA })).status(), 200);
    assert.equal((await first.get(`/api/driver/trips/${trip.id}`)).status(), 200);
    const driverCookie = (await first.storageState()).cookies.find(
      (item) => item.name === 'ekspres_driver_access_token',
    );
    assert.ok(driverCookie);
    assert.equal(
      (
        await first.get(`${adminURL}/api/admin/drivers`, {
          headers: { Cookie: `ekspres_admin_access_token=${driverCookie.value}` },
        })
      ).status(),
      403,
      'driver cannot call admin API with a valid signed token',
    );
    assert.equal(
      (await admin.put(assignmentURL, { data: { driverId: driverB.id } })).status(),
      200,
    );
    assert.equal((await first.get(`/api/driver/trips/${trip.id}`)).status(), 403);
    assert.equal((await second.post('/api/auth/login', { data: driverB })).status(), 200);
    assert.equal((await second.get(`/api/driver/trips/${trip.id}`)).status(), 200);
    assert.equal((await admin.delete(assignmentURL)).status(), 200);
    assert.equal((await second.get(`/api/driver/trips/${trip.id}`)).status(), 403);
    assert.equal((await admin.delete(assignmentURL)).status(), 200);
    assert.equal(
      (
        await admin.patch(`/api/admin/drivers/${driverA.id}`, {
          data: { isActive: false },
        })
      ).status(),
      200,
    );
    assert.equal((await first.get('/api/driver/trips')).status(), 401);
    if (originalDriverId) {
      assert.equal(
        (await admin.put(assignmentURL, { data: { driverId: originalDriverId } })).status(),
        200,
      );
    }
    process.stdout.write(
      'PASS driver admin: provision → assign → driver read → replace/revoke → unassign → deactivate; legacy backend unavailable\n',
    );
  } finally {
    await Promise.all([admin.dispose(), first.dispose(), second.dispose()]);
  }
}
