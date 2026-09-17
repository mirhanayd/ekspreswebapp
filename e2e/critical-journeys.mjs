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
const driver = {
  email: 'sofor@siirtkurtalan.demo',
  password: 'Sofor123!',
};

const urls = {
  passenger: (process.env.PASSENGER_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, ''),
  api: (process.env.API_URL || 'http://127.0.0.1:3001/api/v1').replace(/\/$/, ''),
  admin: (process.env.ADMIN_BASE_URL || 'http://127.0.0.1:3002').replace(/\/$/, ''),
  driver: (process.env.DRIVER_BASE_URL || 'http://127.0.0.1:3004').replace(/\/$/, ''),
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
    await page.goto(urls.passenger);
    const hero = page.getByRole('heading', { level: 1 });
    await visible(hero, 'passenger hero');
    assert.match((await hero.textContent()) || '', /Yolculuk/);
    await noPageOverflow(page);

    // The journey editor sits on the home screen: each field opens a picker
    // sheet, and the round magnifier runs the search.
    await page.getByRole('button', { name: /Nereden/ }).click();
    await page.getByRole('button', { name: /Siirt Terminali/ }).click();
    await page.getByRole('button', { name: /Nereye/ }).click();
    await page.getByRole('button', { name: /Diyarbakır Şehirlerarası Terminali/ }).click();
    await page.getByRole('button', { name: 'Sefer ara' }).click();

    await urlMatches(page, /\/search\?/);
    const trip = page.getByRole('link', { name: /Seferi seç/ }).first();
    await visible(trip, 'trip result');
    await noPageOverflow(page);
    await trip.click();
    await page.getByRole('link', { name: /Koltuk seç/ }).click();

    await urlMatches(page, /\/login\?returnTo=/);
    await page.getByLabel('E-posta', { exact: true }).fill(passenger.email);
    // Exact, because the reveal toggle is also labelled "Şifreyi göster".
    await page.getByLabel('Şifre', { exact: true }).fill(passenger.password);
    await page.getByRole('button', { name: 'Giriş Yap' }).click();
    await urlMatches(page, /\/trips\/[^/]+\/seats/);

    await page.getByRole('button', { name: 'Koltuk 7, available' }).click();
    await visible(page.getByText('Ayırma süresi'), 'hold countdown');
    await page.getByRole('button', { name: 'Devam et' }).click();
    await visible(page.getByRole('heading', { name: 'Biletinizi tamamlayın' }), 'checkout heading');
    await noPageOverflow(page);

    await page.getByLabel('Ad *', { exact: true }).fill('Sunum');
    await page.getByLabel('Soyad *', { exact: true }).fill('Yolcusu');
    await page.getByLabel('Telefon').fill('05550000000');
    await page.getByLabel('E-posta').fill('sunum.yolcusu@example.test');
    await page.getByRole('button', { name: /Demo Öde/ }).click();

    await urlMatches(page, /\/checkout\/success\?orderId=/);
    await visible(page.getByRole('heading', { name: 'Biletiniz hazır!' }), 'success heading');
    await page.getByRole('link', { name: /Bileti ve QR'ı aç/ }).click();
    await visible(page.getByRole('img', { name: /bilet QR kodu/ }), 'signed ticket QR');

    await page.goto(`${urls.passenger}/tickets`);
    await visible(page.getByText(/TKT-DEMO-AKTIF/), 'seeded active ticket');
    process.stdout.write('PASS passenger: search → seat → payment → ticket → QR\n');
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
    const denied = await context.request.post(`${urls.admin}/api/auth/login`, {
      data: passenger,
    });
    assert.equal(denied.status(), 403, 'passenger login to admin must be denied');
    await denied.dispose();

    await page.goto(`${urls.admin}/dashboard`);
    await urlMatches(page, /\/login/);
    await page.getByLabel('E-posta').fill(admin.email);
    await page.getByLabel('Şifre').fill(admin.password);
    await page.getByRole('button', { name: 'Yönetim paneline giriş' }).click();
    await urlMatches(page, /\/dashboard/);
    await visible(page.getByRole('heading', { name: 'Operasyon özeti' }), 'admin dashboard');
    await visible(page.getByText('1 canlı araç'), 'live fleet summary');
    await noPageOverflow(page);

    await page.goto(`${urls.admin}/tickets`);
    await visible(
      page.getByRole('heading', { name: 'Operasyonel bilet listesi' }),
      'admin ticket list',
    );
    await visible(page.getByText('TKT-DEMO-AKTIF'), 'seeded admin ticket');

    await page.goto(`${urls.admin}/operations/fleet`);
    await visible(page.getByRole('heading', { name: 'Aktif araçlar' }), 'admin live fleet');
    await visible(page.getByText('56 SKE 01'), 'admin fleet vehicle');
    await noPageOverflow(page);
    process.stdout.write('PASS admin: role denial → login → dashboard → tickets → fleet\n');
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

async function driverAndTrackingJourney(browser) {
  const driverContext = await browser.newContext({
    viewport: browserUse.viewport,
    geolocation: { longitude: 41.82, latitude: 37.925 },
    permissions: ['geolocation'],
  });
  const passengerContext = await browser.newContext({ viewport: browserUse.viewport });
  const driverPage = await driverContext.newPage();
  const passengerPage = await passengerContext.newPage();
  let receivedTrackingPosition = false;

  try {
    passengerPage.on('websocket', (socket) => {
      socket.on('framereceived', ({ payload }) => {
        if (typeof payload === 'string' && payload.includes('tracking:position')) {
          receivedTrackingPosition = true;
        }
      });
    });

    await driverPage.goto(`${urls.driver}/login`);
    const driverFields = driverPage.getByRole('textbox');
    await driverFields.nth(0).fill(driver.email);
    await driverFields.nth(1).fill(driver.password);
    await driverPage.getByRole('button', { name: 'Sürücü paneline gir' }).click();
    await urlMatches(
      driverPage,
      new RegExp(`${urls.driver.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`),
    );
    await visible(driverPage.getByRole('heading', { name: 'Sürücü' }), 'driver dashboard');
    await visible(driverPage.getByText('56 SKE 01'), 'assigned vehicle');
    await visible(driverPage.getByRole('heading', { name: 'Durulacak otogarlar' }), 'route stops');
    await visible(driverPage.getByText('Demo Yolcu').first(), 'driver manifest passenger');

    await driverPage.getByRole('button', { name: 'Yolcu alımı' }).click();
    await visible(driverPage.locator('.status-pill').getByText('Yolcu alımı'), 'boarding status');
    await driverPage.getByRole('button', { name: 'Yola çık' }).click();
    await visible(driverPage.locator('.status-pill').getByText('Yolda'), 'in-transit status');

    const passengerStatus = driverPage.getByRole('combobox', { name: 'Yolcu durumu' }).first();
    await passengerStatus.selectOption('boarded');
    await visible(
      driverPage.locator('article').filter({ hasText: 'Bindi' }).getByText('1', { exact: true }),
      'boarded passenger count',
    );
    await passengerStatus.selectOption('no_show');
    await visible(
      driverPage.locator('article').filter({ hasText: 'Gelmedi' }).getByText('1', { exact: true }),
      'no-show passenger count',
    );

    await driverPage.getByRole('button', { name: 'Konumu başlat' }).click();
    await visible(driverPage.getByText('Yolcular sizi canlı görüyor'), 'driver GPS sharing');
    await visible(driverPage.getByText(/Son gönderim/), 'first driver GPS publish');

    await passengerPage.goto(`${urls.passenger}/login`);
    await passengerPage.getByLabel('E-posta', { exact: true }).fill(passenger.email);
    await passengerPage.getByLabel('Şifre', { exact: true }).fill(passenger.password);
    await passengerPage.getByRole('button', { name: 'Giriş Yap' }).click();
    await urlMatches(
      passengerPage,
      new RegExp(`${urls.passenger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`),
    );
    await passengerPage.goto(`${urls.passenger}/tickets`);
    await passengerPage.getByRole('link', { name: /TKT-DEMO-AKTIF/ }).click();
    await passengerPage.getByRole('link', { name: 'Otobüsü canlı izle' }).click();
    await visible(passengerPage.getByText('Canlı takip aktif'), 'passenger live tracking');
    await visible(passengerPage.getByText('56 SKE 01'), 'passenger tracked vehicle');
    assert.equal(
      await passengerPage.locator('canvas').count(),
      1,
      'MapLibre should render one canvas',
    );

    await driverContext.setGeolocation({ longitude: 41.7, latitude: 37.926 });
    await driverPage.waitForTimeout(6_000);
    assert.equal(
      receivedTrackingPosition,
      true,
      'passenger must receive a tracking WebSocket frame',
    );
    await noPageOverflow(driverPage);
    await noPageOverflow(passengerPage);
    process.stdout.write(
      'PASS driver/tracking: assignment → stops → manifest → boarding → GPS → WebSocket\n',
    );
  } catch (error) {
    await mkdir('test-results', { recursive: true });
    await driverPage
      .screenshot({ path: 'test-results/driver-failure.png', fullPage: true })
      .catch(() => {});
    await passengerPage
      .screenshot({ path: 'test-results/tracking-failure.png', fullPage: true })
      .catch(() => {});
    throw error;
  } finally {
    await closeWithin(driverContext);
    await closeWithin(passengerContext);
  }
}

export async function runCriticalJourneys({ headed = false } = {}) {
  const status = await fetch(`${urls.api}/status`);
  assert.equal(status.status, 200, 'API status endpoint must be healthy');
  const browser = await chromium.launch({ channel: browserUse.channel, headless: !headed });
  try {
    await passengerJourney(browser);
    await adminJourney(browser);
    await driverAndTrackingJourney(browser);
  } finally {
    await closeWithin(browser);
  }
}
