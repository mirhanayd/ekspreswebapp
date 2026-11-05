import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { browserUse } from '../playwright.config.mjs';

const passenger = {
  email: 'yolcu@siirtkurtalan.demo',
  password: 'Demo123!',
};
const admin = {
  email: 'admin@siirtkurtalan.demo',
  password: 'Admin123!',
};

async function visible(locator, label, timeout = 15_000) {
  await locator.waitFor({ state: 'visible', timeout });
  assert.equal(await locator.isVisible(), true, `${label} should be visible`);
}

async function urlMatches(page, pattern, timeout = 15_000) {
  await page.waitForURL(pattern, { timeout });
  assert.match(page.url(), pattern);
}

async function noPageOverflow(page) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
    true,
    `page should not overflow at ${page.url()}`,
  );
}

async function closeWithin(resource, timeout = 5_000) {
  await Promise.race([
    resource.close(),
    new Promise((resolve) => setTimeout(resolve, timeout)),
  ]).catch(() => undefined);
}

async function passengerJourney(browser) {
  const context = await browser.newContext({ viewport: browserUse.viewport });
  const page = await context.newPage();
  try {
    await page.goto('http://127.0.0.1:3000');
    const hero = page.getByRole('heading', { level: 1 });
    await visible(hero, 'passenger hero');
    assert.match((await hero.textContent()) || '', /Nereye/);
    await noPageOverflow(page);

    // The search card sits over the dark header: each stop opens a picker sheet, the arrows swap them.
    await page.getByRole('button', { name: /Kalkış durağı/ }).click();
    await page
      .getByRole('dialog', { name: 'Kalkış durağı seç' })
      .getByRole('button', { name: 'Siirt Terminali' })
      .click();
    await page.getByRole('button', { name: /Varış durağı/ }).click();
    await page
      .getByRole('dialog', { name: 'Varış durağı seç' })
      .getByRole('button', { name: 'Diyarbakır Şehirlerarası Terminali' })
      .click();
    await page.getByRole('button', { name: 'Kalkış ve varışı yer değiştir' }).click();
    await visible(
      page.getByRole('button', { name: /Kalkış durağı: Diyarbakır/ }),
      'swapped origin',
    );
    // The label flips mid-animation and the button ignores taps until the swap has settled.
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: 'Kalkış ve varışı yer değiştir' }).click();
    await visible(page.getByRole('button', { name: /Kalkış durağı: Siirt/ }), 'swapped back');
    await page.getByRole('button', { name: 'Sefer ara' }).click();

    await urlMatches(page, /\/search\?/);
    const trip = page.getByRole('link', { name: /seferi/ }).first();
    await visible(trip, 'trip result');
    await noPageOverflow(page);
    await trip.click();

    // The seat map is behind sign-in, which returns here afterwards.
    await urlMatches(page, /\/login\?returnTo=/);
    await page.getByLabel('E-posta', { exact: true }).fill(passenger.email);
    // Exact, because the reveal toggle is also labelled "Şifreyi göster".
    await page.getByLabel('Şifre', { exact: true }).fill(passenger.password);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await urlMatches(page, /\/trips\/[^/]+\/seats/);

    const seven = page.getByRole('button', { name: /^Koltuk 7, .*boş$/ });
    await visible(seven, '41-seat map');
    assert.equal(await page.getByRole('button', { name: /^Koltuk \d+,/ }).count(), 41);
    await seven.click();
    await visible(page.getByText('Ayırma süresi'), 'hold countdown');
    await visible(page.getByText('Koltuk 7', { exact: true }), 'selected seat label');
    await page.getByRole('button', { name: 'Devam et' }).click();

    // Payment slides up as a sheet; "İniş bildirimleri" is switchable here too.
    const payment = page.getByRole('dialog', { name: 'Yolcu ve ödeme' });
    await visible(payment, 'payment sheet');
    const alerts = payment.getByRole('switch', { name: /İniş bildirimleri/ });
    assert.equal(await alerts.getAttribute('aria-checked'), 'true');
    await alerts.click();
    assert.equal(await alerts.getAttribute('aria-checked'), 'false');
    await alerts.click();
    assert.equal(await alerts.getAttribute('aria-checked'), 'true');
    await payment.getByRole('button', { name: /öde$/ }).click();

    await urlMatches(page, /\/tickets\/[^/]+\?yeni=1/);
    await visible(page.getByRole('img', { name: 'Bilet QR kodu' }), 'signed ticket QR');
    await visible(page.getByText('Binişte okut'), 'boarding hint');
    await noPageOverflow(page);

    // Notification settings open from the ticket and persist.
    await page.getByRole('button', { name: /İniş bildirimleri/ }).click();
    const sheet = page.getByRole('dialog', { name: 'İniş bildirimleri' });
    await visible(sheet, 'notification settings');
    const oneKm = sheet.getByRole('switch', { name: /1 km kala/ });
    assert.equal(await oneKm.getAttribute('aria-checked'), 'true');
    await oneKm.click();
    await page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/notifications/preferences') &&
        response.request().method() === 'PUT',
    );
    await page.reload();
    await page.getByRole('button', { name: /İniş bildirimleri/ }).click();
    assert.equal(
      await page
        .getByRole('dialog', { name: 'İniş bildirimleri' })
        .getByRole('switch', { name: /1 km kala/ })
        .getAttribute('aria-checked'),
      'false',
    );
    await page
      .getByRole('dialog', { name: 'İniş bildirimleri' })
      .getByRole('switch', { name: /1 km kala/ })
      .click();
    await page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/notifications/preferences') &&
        response.request().method() === 'PUT',
    );
    await page
      .getByRole('dialog', { name: 'İniş bildirimleri' })
      .getByRole('button', { name: 'Tamam' })
      .click();

    await page.goto('http://127.0.0.1:3000/tickets');
    await visible(page.getByRole('heading', { name: 'Biletlerim' }), 'wallet heading');
    await page.locator('a', { hasText: 'YOLDA' }).click();
    await urlMatches(page, /\/tickets\/[^/]+$/);
    await page.getByRole('link', { name: 'Canlı izle' }).click();
    await visible(page.getByText('56 SKE 01').first(), 'live vehicle plate');
    await visible(page.locator('canvas'), 'MapLibre canvas');
    assert.equal(await page.locator('canvas').count(), 1, 'MapLibre should render one canvas');
    await visible(page.getByText('İniş durağın', { exact: true }), 'alighting stop panel');
    await visible(page.getByRole('button', { name: /İniş hatırlatıcı/ }), 'reminder row');
    await visible(page.getByRole('button', { name: 'İniş bildirimleri' }), 'tracking bell');
    // The worker is served as a static file; without it the map only paints its background.
    const worker = await context.request.get(
      'http://127.0.0.1:3000/maplibre/maplibre-gl-worker.mjs',
    );
    assert.equal(worker.status(), 200, 'maplibre worker must be reachable');
    await noPageOverflow(page);
    process.stdout.write(
      'PASS passenger: search → 41-seat map → payment sheet → ticket QR → notification settings → tracking\n',
    );
  } catch (error) {
    await mkdir('test-results', { recursive: true });
    await page
      .screenshot({ path: 'test-results/passenger-failure.png', fullPage: true })
      .catch(() => {});
    throw error;
  } finally {
    await closeWithin(context);
  }
}

async function adminJourney(browser) {
  const context = await browser.newContext({ viewport: browserUse.viewport });
  const page = await context.newPage();
  try {
    const denied = await context.request.post('http://127.0.0.1:3002/api/auth/login', {
      data: passenger,
    });
    assert.equal(denied.status(), 403, 'passenger login to admin must be denied');
    await denied.dispose();

    await page.goto('http://127.0.0.1:3002/dashboard');
    await urlMatches(page, /:3002\/login/);
    await page.getByLabel('E-posta').fill(admin.email);
    await page.getByLabel('Şifre').fill(admin.password);
    await page.getByRole('button', { name: 'Yönetim paneline giriş' }).click();
    await urlMatches(page, /:3002\/dashboard/);
    await visible(page.getByRole('heading', { name: 'Operasyon özeti' }), 'admin dashboard');
    await visible(page.getByText('0 canlı araç'), 'durable fleet summary before GPS ingestion');
    await noPageOverflow(page);

    await page.goto('http://127.0.0.1:3002/tickets');
    await visible(
      page.getByRole('heading', { name: 'Operasyonel bilet listesi' }),
      'admin ticket list',
    );
    await visible(page.getByText('TKT-DEMO-AKTIF'), 'seeded admin ticket');

    await page.goto('http://127.0.0.1:3002/operations/fleet');
    await visible(page.getByRole('heading', { name: 'Aktif araçlar' }), 'admin live fleet');
    await visible(
      page.getByRole('region', { name: 'Araç listesi' }).getByText('56 SKE 01'),
      'admin fleet vehicle',
    );
    await noPageOverflow(page);
    process.stdout.write(
      'PASS serverless admin: role denial → login → dashboard → tickets → fleet; legacy backend unavailable\n',
    );
  } catch (error) {
    await mkdir('test-results', { recursive: true });
    await page
      .screenshot({ path: 'test-results/admin-failure.png', fullPage: true })
      .catch(() => {});
    throw error;
  } finally {
    await closeWithin(context);
  }
}

/**
 * Driver app on the real API, at phone width: stop plan, passenger card with undo, list quick
 * action and the road view. Runs last because it changes the seeded ticket's boarding state.
 */
export async function runDriverUiJourney(baseURL) {
  const browser = await chromium.launch({ channel: browserUse.channel, headless: true });
  const context = await browser.newContext({ viewport: browserUse.viewport });
  const page = await context.newPage();
  const manifestStatus = async (ticketNo) => {
    const trips = await (await context.request.get(`${baseURL}/api/driver/trips`)).json();
    for (const trip of trips) {
      const detail = await (
        await context.request.get(`${baseURL}/api/driver/trips/${trip.id}`)
      ).json();
      const passenger = detail.manifest.find((item) => item.ticketNo === ticketNo);
      if (passenger) return { tripId: trip.id, ...passenger };
    }
    throw new Error(`${ticketNo} is not on any assigned trip`);
  };
  try {
    await page.goto(`${baseURL}/login`);
    await page.getByLabel('E-posta').fill('sofor@siirtkurtalan.demo');
    await page.getByLabel('Şifre').fill('Sofor123!');
    await page.getByRole('button', { name: 'Şoför paneline gir' }).click();
    await page.waitForURL(`${baseURL}/`);
    await visible(page.getByRole('heading', { name: /İyi günler/ }), 'today greeting');
    await noPageOverflow(page);

    // The seeded passenger rides to the last stop; the alert journey left the bus right before it.
    const ticket = await manifestStatus('TKT-DEMO-AKTIF');
    assert.equal(
      (
        await context.request.patch(
          `${baseURL}/api/driver/trips/${ticket.tripId}/passengers/${ticket.ticketId}`,
          { data: { status: 'boarded' } },
        )
      ).status(),
      200,
    );
    await page.reload();
    await page.getByRole('button', { name: 'Sefere dön' }).click();

    const seats = page.locator('button.seat');
    await visible(seats.first(), 'seat plan');
    assert.equal(await seats.count(), 41, 'the plan draws all 41 seats');
    // Measured after the row-by-row reveal, which scales the seats while it runs.
    await page.waitForTimeout(1600);
    const small = await page.$$eval(
      '.stop button, .stop a',
      (controls) =>
        controls
          .filter((control) => control.checkVisibility({ checkVisibilityCSS: true }))
          .map((control) => control.getBoundingClientRect())
          .filter((box) => box.width < 44 || box.height < 44).length,
    );
    assert.equal(small, 0, 'every stop control is at least 44 px');
    await noPageOverflow(page);

    const seat = page.getByRole('button', { name: new RegExp(`^Koltuk ${ticket.seatNo}: `) });
    await seat.click();
    const card = page.getByRole('region', { name: 'Yolcu bilgisi' });
    await visible(card, 'passenger card');
    await card.getByRole('button', { name: 'İndi', exact: true }).click();
    const undo = page.getByRole('button', { name: 'Geri al' });
    await visible(undo, 'undo toast');
    await expectStatus(manifestStatus, 'alighted');
    await undo.click();
    await expectStatus(manifestStatus, 'boarded');

    await page.getByRole('button', { name: 'Yolcu listesi' }).click();
    await page
      .getByRole('button', { name: /indi olarak işaretle$/ })
      .first()
      .click();
    await expectStatus(manifestStatus, 'alighted');
    await noPageOverflow(page);

    await page.getByRole('button', { name: 'Otobüs planı' }).click();
    await page.getByRole('button', { name: 'Haritaya dön' }).click();
    await visible(page.locator('.bubble[data-state="next"]'), 'next stop bubble');
    await visible(page.getByRole('button', { name: /vardım$/ }), 'arrival button');
    assert.equal(await page.locator('canvas').count(), 1, 'MapLibre should render one canvas');
    const worker = await context.request.get(`${baseURL}/maplibre/maplibre-gl-worker.mjs`);
    assert.equal(worker.status(), 200, 'maplibre worker must be reachable');
    await noPageOverflow(page);
    process.stdout.write(
      'PASS driver UI: today → 41-seat plan → passenger card → undo → list → road view at 390 px\n',
    );
  } catch (error) {
    await mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/driver-failure.png' }).catch(() => {});
    throw error;
  } finally {
    await closeWithin(context);
    await closeWithin(browser);
  }
}

async function expectStatus(read, expected) {
  const deadline = Date.now() + 5_000;
  let actual;
  while (Date.now() < deadline) {
    actual = (await read('TKT-DEMO-AKTIF')).boardingStatus;
    if (actual === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  assert.equal(actual, expected);
}

export async function runCriticalJourneys({ headed = false } = {}) {
  const browser = await chromium.launch({ channel: browserUse.channel, headless: !headed });
  try {
    await passengerJourney(browser);
    await adminJourney(browser);
  } finally {
    await closeWithin(browser);
  }
}
