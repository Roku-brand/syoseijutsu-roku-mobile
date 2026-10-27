import { expect, test, type Page } from '@playwright/test';

async function mockAccount(page: Page, active: boolean, restored = true) {
  const user = { id: '00000000-0000-4000-8000-000000000002', aud: 'authenticated', role: 'authenticated', email: 'mobile-test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: 4102444800 })).toString('base64url');
  const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  const projectRef = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://psfexomjhivqieehcrzx.supabase.co').hostname.split('.')[0];
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: `sb-${projectRef}-auth-token`, value: session });
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/**', route => route.fulfill({ json: route.request().url().includes('/profiles') ? { role: 'user', display_name: 'テスト利用者' } : [] }));
  const access = { access: active ? 'active' : 'free', accessType: 'thirty_day', accessExpiresAt: new Date(Date.now() + 10 * 86400000).toISOString() };
  let restoreCalls = 0;
  await page.route('**/functions/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/restore-purchase')) {
      restoreCalls++;
      active = restored;
      return route.fulfill({ json: { restored, access: { access_status: restored ? 'active' : 'processing', access_type: 'thirty_day', access_expires_at: access.accessExpiresAt } } });
    }
    if (url.includes('/access')) return route.fulfill({ json: { ...access, access: active ? 'active' : 'free' } });
    return route.fulfill({ json: { items: [] } });
  });
  return () => restoreCalls;
}

test('mobile editorial banners and deck controls fit narrow screens',async({page})=>{
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});await page.goto('/');
 await expect(page.getByTestId('home-recommendation-card')).toBeVisible();await expect(page.getByRole('tab',{name:/枚目を表示/})).toHaveCount(4);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});

test('create shortcut can close, go back, reopen and save on a small screen', async ({ page }) => {
  const create = page.locator('[data-testid="home-create-technique"]:visible');
  const carousel = page.locator('[data-testid="home-brand-carousel"]:visible');
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto('/');
  await create.click();
  await expect(page.getByRole('textbox', { name: 'マイ処世術', exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/compose=1/);
  await page.getByRole('button', { name: '作成を閉じる', exact: true }).click();
  await page.getByRole('link', { name: /^ホーム。/ }).click();
  await expect(carousel).toBeVisible();
  await create.click();
  await page.getByRole('textbox', { name: 'マイ処世術', exact: true }).fill('一呼吸おいてから返事する');
  await page.getByRole('textbox', { name: 'フォルダー名', exact: true }).fill('日々の気づき');
  await page.getByRole('button', { name: 'マイ処世術を追加', exact: true }).click();
  await expect(page.getByRole('button', { name: 'マイ処世術：日々の気づき', exact: true })).toContainText('1件');
  await page.getByRole('button', { name: 'マイ処世術：日々の気づき', exact: true }).click();
  await expect(page.getByRole('button', { name: '一呼吸おいてから返事するを編集', exact: true })).toBeVisible();
  await page.getByRole('link', { name: /^ホーム。/ }).click();
  await expect(carousel).toBeVisible();
});

test('paid membership displays remaining access beside its badge', async ({ page }) => {
  await mockAccount(page, true);
  await page.goto('/my-os');
  await expect(page.getByTestId('account-membership-card')).toContainText('完全版を利用中・残り10日');
});

test('verified checkout return navigates home and clears the checkout query', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const calls = await mockAccount(page, false);
  await page.goto('/?checkout=success&session_id=cs_test_mobile');
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('persistent-bottom-navigation')).toBeVisible();
  expect(calls()).toBe(1);
  expect(errors).toEqual([]);
});

test('unverified checkout stays on the purchase screen for restoration', async ({ page }) => {
  const calls = await mockAccount(page, false, false);
  await page.goto('/?checkout=success&session_id=cs_test_pending');
  await expect(page.getByText('決済の反映を待っています。しばらくしてから「購入を復元」を押してください。')).toBeVisible();
  await expect(page).toHaveURL(/checkout=success/);
  await expect(page.getByTestId('home-brand-carousel')).toHaveCount(0);
  expect(calls()).toBe(1);
});
