import { expect, test, type Page } from '@playwright/test';

const welcomeKey = '@shoseijutsu-roku/installation-welcome/v1';
const purchaseKey = '@shoseijutsu-roku/purchase-guide/v1';
test.use({ storageState: { cookies: [], origins: [] } });

async function returningInstallation(page: Page) {
  await page.addInitScript((key) => localStorage.setItem(key, 'done'), welcomeKey);
}

async function account(page: Page, active = false, restored = true, stamp = '2026-10-10T01:00:00Z') {
  const user = { id: '00000000-0000-4000-8000-000000000010', aud: 'authenticated', role: 'authenticated', email: 'guide-qa@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: 4102444800 })).toString('base64url')}.test`;
  const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname.split('.')[0];
  await page.addInitScript(({ key, user, token }) => localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user })), { key: `sb-${project}-auth-token`, user, token });
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: user }));
  await page.route('**/rest/v1/**', (route) => route.request().url().includes('/profiles') ? route.fulfill({ json: { role: 'user', display_name: 'ご案内テスト' } }) : route.fulfill({ status: 400, json: { message: 'Use bundled catalogue' } }));
  let purchaseStamp = stamp;
  const access = () => ({ access: active ? 'active' : 'free', accessType: 'thirty_day', purchasedAt: purchaseStamp, accessStartedAt: purchaseStamp, accessExpiresAt: '2030-11-09T01:00:00Z' });
  await page.route('**/functions/v1/**', (route) => {
    const url = route.request().url();
    if (url.includes('/restore-purchase')) {
      active = restored;
      return route.fulfill({ json: { restored, access: { access_status: restored ? 'active' : 'processing', access_type: 'thirty_day', access_expires_at: '2030-11-09T01:00:00Z' } } });
    }
    if (url.includes('/access')) return route.fulfill({ json: access() });
    return route.fulfill({ json: { items: [] } });
  });
  return { renew: () => { purchaseStamp = '2026-11-10T01:00:00Z'; } };
}

async function next(page: Page) { await page.getByTestId('guide-primary').click(); }

for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
  test(`初回の4ページと操作が画面内に収まる ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByTestId('guide-dialog')).toBeVisible();
    for (let index = 1; index <= 4; index++) {
      await expect(page.getByTestId('guide-counter')).toHaveText(`${index} / 4`);
      await expect(page.getByTestId('guide-later')).toBeVisible();
      await expect(page.getByTestId('guide-login')).toBeVisible();
      await expect(page.getByTestId('guide-dialog')).not.toContainText('\\n');
      const dialog = await page.getByTestId('guide-dialog').boundingBox();
      const action = await page.getByTestId('guide-primary').boundingBox();
      expect(dialog).not.toBeNull(); expect(action).not.toBeNull();
      expect(dialog!.x).toBeGreaterThanOrEqual(0);
      expect(dialog!.y).toBeGreaterThanOrEqual(0);
      expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(viewport.width);
      expect(action!.y + action!.height).toBeLessThanOrEqual(viewport.height);
      const primaryCopy = page.getByTestId('guide-primary').getByText(index === 4 ? '無料ではじめる' : '次へ', { exact: true });
      const line = await primaryCopy.evaluate((element) => ({ height: element.getBoundingClientRect().height, lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight) }));
      expect(line.height).toBeLessThanOrEqual(line.lineHeight + 1);
      if (index === 1 || index === 4) await page.screenshot({ path: test.info().outputPath(`welcome-${viewport.width}-${index}.png`) });
      if (index < 4) await next(page);
    }
    await expect(page.getByTestId('guide-upgrade')).toBeVisible();
    await expect(page.getByTestId('guide-primary')).toHaveText('無料ではじめる→');
    await next(page);
    await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), welcomeKey)).toBe('done');
    await page.reload();
    await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
    await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('あとで閉じた案内は自動再表示せず設定から読み直せる', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('guide-counter')).toHaveText('1 / 4');
  await page.getByTestId('guide-later').click();
  await expect(page.getByText('この案内は設定からいつでも見られます')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
  await page.goto('/settings');
  await page.getByRole('button', { name: /はじめての方へ/ }).click();
  await expect(page.getByTestId('guide-counter')).toHaveText('1 / 4');
});

test('再インストール相当の端末記録消去後はログイン済み購入者にも初回を表示する', async ({ page }) => {
  await account(page, true);
  await page.goto('/');
  await page.getByTestId('guide-later').click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), welcomeKey)).toBe('done');
  await page.evaluate((key) => localStorage.removeItem(key), welcomeKey);
  await page.reload();
  await expect(page.getByTestId('guide-counter')).toHaveText('1 / 4');
  await expect(page.getByText('ようこそ、処世術禄へ')).toBeVisible();
  await expect(page.getByTestId('guide-login')).toHaveCount(0);
  await next(page); await next(page); await next(page);
  await expect(page.getByTestId('guide-primary')).toContainText('アプリをはじめる');
  await expect(page.getByTestId('guide-upgrade')).toHaveCount(0);
});

test('初回のログインと完全版紹介は正しい入口に進む', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('guide-login').click();
  await expect(page).toHaveURL(/auth\?mode=signin/);
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
  await page.goto('/settings');
  await page.getByRole('button', { name: /はじめての方へ/ }).click();
  await next(page); await next(page); await next(page);
  await page.getByTestId('guide-upgrade').click();
  await expect(page).toHaveURL(/upgrade\?source=welcome_guide/);
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
});

test('キーボードで進む・戻る・閉じることができる', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('guide-counter')).toHaveText('1 / 4');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('guide-counter')).toHaveText('2 / 4');
  await page.getByTestId('guide-back').click();
  await expect(page.getByTestId('guide-counter')).toHaveText('1 / 4');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('guide-counter')).toHaveText('1 / 4');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
});

test('法務・認証への直接アクセスを初回案内が遮らない', async ({ page }) => {
  for (const path of ['/legal/privacy', '/auth?mode=signin', '/card/master336-001']) {
    await page.goto(path);
    await expect(page.getByTestId('book-header')).toBeVisible();
    await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
  }
  await page.goto('/');
  await expect(page.getByTestId('guide-dialog')).toBeVisible();
});

test('決済確認後に期限つき完全版案内を表示し2枚目から全人物像へ進む', async ({ page }) => {
  await account(page);
  await page.goto('/?checkout=success&session_id=cs_test_guides');
  await expect(page.getByTestId('guide-counter')).toHaveText('1 / 4');
  await expect(page.getByText('完全版へようこそ', { exact: true })).toBeVisible();
  await expect(page.getByTestId('guide-entitlement')).toContainText('2030年11月9日');
  await expect(page.getByTestId('guide-entitlement')).toContainText('自動更新はありません');
  await page.screenshot({ path: test.info().outputPath('complete-390-1.png') });
  await next(page);
  await expect(page.getByText('すべての人物像を開放')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('complete-390-2.png') });
  await page.getByTestId('guide-personas-now').click();
  await expect(page).toHaveURL(/personas$/);
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
});

test('購入後の全4ページと最終人物像ボタン・設定での再閲覧', async ({ page }) => {
  await returningInstallation(page);
  await account(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?checkout=success&session_id=cs_test_full');
  await expect(page.getByText('完全版へようこそ', { exact: true })).toBeVisible();
  await next(page); await next(page);
  await expect(page.getByText('すべての処世術と理論へ')).toBeVisible();
  await next(page);
  await expect(page.getByText('すべての学習ケースへ')).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('complete-1440-4.png') });
  await page.getByTestId('guide-primary').click();
  await expect(page).toHaveURL(/personas$/);
  await page.goto('/settings');
  await page.getByRole('button', { name: /完全版の使い方/ }).click();
  await expect(page.getByTestId('guide-counter')).toHaveText('1 / 4');
});

test('通常の購入済みログインと復元では購入案内を表示しない', async ({ page }) => {
  await returningInstallation(page);
  await account(page, true);
  await page.goto('/');
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
  await page.goto('/upgrade');
  // Expired/free restoration is tested separately below; active access is quiet.
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
});

test('購入復元だけでは購入案内を表示しない', async ({ page }) => {
  await returningInstallation(page);
  await account(page, false, true);
  await page.goto('/upgrade');
  await page.getByTestId('upgrade-restore').click();
  await expect(page.getByText('有効な完全版アクセスを復元しました。')).toBeVisible();
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
});

test('未確認・キャンセルの購入では完了案内を表示しない', async ({ page }) => {
  await account(page, false, false);
  await page.goto('/?checkout=success&session_id=cs_test_pending');
  await expect(page.getByText('決済の反映を待っています。しばらくしてから「購入を復元」を押してください。')).toBeVisible();
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
  await page.goto('/?checkout=cancelled');
  await expect(page.getByText('購入はキャンセルされました。完全版の利用権は付与されていません。')).toBeVisible();
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
});

test('同じ購入完了URLは再表示せず新しい購入では再び案内する', async ({ page }) => {
  const state = await account(page);
  await page.goto('/?checkout=success&session_id=cs_test_once');
  await expect(page.getByText('完全版へようこそ', { exact: true })).toBeVisible();
  await page.getByTestId('guide-later').click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), purchaseKey)).toContain('2026-10-10');
  await page.goto('/?checkout=success&session_id=cs_test_once');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('guide-dialog')).toHaveCount(0);
  state.renew();
  await page.goto('/?checkout=success&session_id=cs_test_new');
  await expect(page.getByText('完全版へようこそ', { exact: true })).toBeVisible();
});
