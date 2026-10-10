import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // Existing regression suites exercise returning users. The guide suite
    // overrides this with an empty installation to test first launch itself.
    storageState: { cookies: [], origins: [{ origin: `http://127.0.0.1:${port}`, localStorage: [{ name: '@shoseijutsu-roku/installation-welcome/v1', value: 'done' }] }] },
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
    ...devices['Pixel 5'],
  },
  webServer: {
    command: 'pnpm serve:e2e',
    env: { PORT: String(port) },
    port,
    reuseExistingServer: true,
  },
});
