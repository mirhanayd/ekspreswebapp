import { test, expect } from '@playwright/test';

test.setTimeout(120_000);

test('driver demo shares passenger, route and location state across navigation', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/driver');
  await page.locator('.splash').waitFor({ state: 'hidden' });
  await expect(page.getByText('12 / 16')).toBeVisible();
  await page.getByRole('link', { name: 'Durak ve yolcular' }).click();
  const passenger = page.getByRole('article', { name: 'Ahmet Yılmaz' });
  await passenger.getByRole('button', { name: 'Bindi', exact: true }).click();
  await expect(passenger.getByRole('button', { name: 'Bindi', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await passenger.getByRole('button', { name: 'Ara', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Gerçek telefon araması başlatılmaz');
  await page.getByRole('button', { name: 'Tamam', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Alt menü' });
  await nav.getByRole('link', { name: 'Ana sayfa', exact: true }).click();
  await expect(page.getByText('13 / 16')).toBeVisible();
  await nav.getByRole('link', { name: 'Yolcular', exact: true }).click();
  await page.getByLabel('Yolcu veya koltuk ara').fill('AHMET YILMAZ');
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Binmedi', exact: true }).click();
  await page.getByLabel('Yolcu veya koltuk ara').fill('eşleşmeyen');
  await expect(page.getByText('Yolcu bulunamadı')).toBeVisible();
  await page.getByRole('button', { name: 'Filtreleri temizle' }).click();
  await expect(page.getByRole('article')).toHaveCount(16);
  await nav.getByRole('link', { name: 'Sefer', exact: true }).click();
  await page.getByRole('link').filter({ hasText: 'Bayburt Otogar' }).click();
  await page.getByRole('button', { name: 'Durağı tamamla ve ilerle' }).click();
  await nav.getByRole('link', { name: 'Ana sayfa', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Sıradaki durak' })).toContainText(
    'Erzurum Otogar',
  );
  await nav.getByRole('link', { name: 'Konum', exact: true }).click();
  await page.getByRole('switch', { name: 'Konum paylaşımı' }).click();
  await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  await nav.getByRole('link', { name: 'Profil', exact: true }).click();
  await page.getByRole('button', { name: 'Demoyu başlangıca al' }).click();
  await page.getByRole('button', { name: 'Sıfırla', exact: true }).click();
  await nav.getByRole('link', { name: 'Ana sayfa', exact: true }).click();
  await expect(page.getByText('12 / 16')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Sıradaki durak' })).toContainText(
    'Bayburt Otogar',
  );
  expect(errors).toEqual([]);
});

test('driver screens fit mobile and desktop and passenger navigation is preserved', async ({
  page,
}) => {
  for (const width of [375, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/driver',
      '/driver/sefer',
      '/driver/durak/bayburt',
      '/driver/yolcular',
      '/driver/konum',
      '/driver/profil',
    ]) {
      await page.goto(path);
      await page.locator('.splash').waitFor({ state: 'hidden' });
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${path} at ${width}`,
      ).toBe(true);
    }
  }
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Ana menü' }).getByRole('link', { name: 'Sefer ara' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Yolculuk Nereye?' })).toBeVisible();
});

test('map has a usable offline fallback and final stop can complete the trip', async ({ page }) => {
  await page.route('https://basemaps.cartocdn.com/**', (route) => route.abort());
  await page.goto('/driver/konum');
  await page.locator('.splash').waitFor({ state: 'hidden' });
  await expect(page.getByText('Harita yüklenemedi; durak şeması gösteriliyor.')).toBeVisible();
  await page.goto('/driver/durak/erzurum');
  await page.getByRole('button', { name: 'Bu durağı sıradaki yap' }).click();
  await page.getByRole('button', { name: 'Seferi tamamla' }).click();
  await page
    .getByRole('navigation', { name: 'Alt menü' })
    .getByRole('link', { name: 'Ana sayfa', exact: true })
    .click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await expect(page.getByRole('heading', { name: 'Erzurum’a ulaştınız' })).toBeVisible();
});
