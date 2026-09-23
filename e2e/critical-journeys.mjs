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

    await page.goto('http://127.0.0.1:3000/tickets');
    await page.getByRole('link', { name: /TKT-DEMO-AKTIF/ }).click();
    await page.getByRole('link', { name: 'Otobüsü canlı izle' }).click();
    await visible(page.getByText('56 SKE 01'), 'live vehicle plate');
    await visible(page.locator('canvas'), 'MapLibre canvas');
    assert.equal(await page.locator('canvas').count(), 1, 'MapLibre should render one canvas');
    await noPageOverflow(page);
    process.stdout.write('PASS passenger: search → seat → payment → QR → tracking bootstrap\n');
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
    await visible(page.getByText('56 SKE 01'), 'admin fleet vehicle');
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

export async function runCriticalJourneys({ headed = false } = {}) {
  const browser = await chromium.launch({ channel: browserUse.channel, headless: !headed });
  try {
    await passengerJourney(browser);
    await adminJourney(browser);
  } finally {
    await closeWithin(browser);
  }
}
