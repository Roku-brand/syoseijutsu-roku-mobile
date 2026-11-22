import { defineConfig, devices } from '@playwright/test';

const syncFixture = process.env.PLAYWRIGHT_PERSONAL_SYNC_FIXTURE === '1';
const browserChannel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);

export default defineConfig({
  testDir: './tests/e2e',
  timeout: syncFixture ? 90_000 : 30_000,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    // Existing regression suites exercise returning users. The guide suite
    // overrides this with an empty installation to test first launch itself.
    storageState: { cookies: [], origins: [{ origin: `http://127.0.0.1:${port}`, localStorage: [{ name: '@shoseijutsu-roku/installation-welcome/v1', value: 'done' }] }] },
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
    ...devices['Pixel 5'],
    ...(browserChannel ? { channel: browserChannel } : {}),
  },
  webServer: {
    command: syncFixture ? 'node node_modules/expo/bin/cli start --web --offline --port ' + port : 'node ./scripts/serve-dist.mjs',
    env: syncFixture ? {
      CI: '1',
      EXPO_NO_TELEMETRY: '1',
      EXPO_PUBLIC_SUPABASE_URL: 'https://roku-sync-test.invalid',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_test',
    } : { PORT: String(port) },
    timeout: syncFixture ? 120_000 : 60_000,
    port,
    reuseExistingServer: !syncFixture,
  },
});
