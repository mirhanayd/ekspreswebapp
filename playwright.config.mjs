import { defineConfig, devices } from '@playwright/test';

export const browserUse = {
  ...devices['Desktop Chrome'],
  channel: 'chromium',
  viewport: { width: 390, height: 844 },
};

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['line']] : [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    ...browserUse,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
});
