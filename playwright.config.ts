import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173/syoseijutsu-roku-mobile',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'pnpm serve:e2e',
    port: 4173,
    reuseExistingServer: true,
  },
});
