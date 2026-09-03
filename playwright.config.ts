import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
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
