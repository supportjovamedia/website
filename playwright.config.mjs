import { defineConfig } from '@playwright/test';

const target = process.env.REGRESSION_URL;
const baseURL = target || 'http://127.0.0.1:4391';
const url = new URL(baseURL);
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
  throw new Error('REGRESSION_URL must be a plain HTTP(S) site origin, without credentials.');
}

export default defineConfig({
  testDir: './tests/regression',
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    ...(process.env.REGRESSION_BROWSER_CHANNEL ? { channel: process.env.REGRESSION_BROWSER_CHANNEL } : {}),
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: target ? undefined : {
    command: 'node scripts/serve-regression.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
