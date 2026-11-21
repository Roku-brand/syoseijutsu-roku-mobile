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

const headings = [
  '人生をうまく生きる 方法を全ての人へ。',
  '人物像から入り、 処世術を学び、 理論まで理解する。',
  '気に入った知恵も、 自分で見つけた答えも。',
];
const widths = [[320, 568], [375, 667], [390, 844], [430, 932], [1440, 900]] as const;

for (const [width, height] of widths) {
  test('初回の全画面案内を3ページで読める ' + width + 'px', async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page).toHaveURL(/\/installation-guide$/);
    const guide = page.getByTestId('installation-guide');
    await expect(guide).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
    for (let index = 0; index < 3; index++) {
      await expect(page.getByTestId('guide-counter')).toHaveText((index + 1) + ' / 3');
      await expect(page.getByTestId('guide-title')).toHaveText(headings[index]);
      await expect(page.getByTestId('guide-skip')).toHaveCount(index < 2 ? 1 : 0);
      await expect(page.getByTestId('guide-primary')).toBeInViewport();
      expect(await guide.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      const art = page.getByTestId('guide-artwork');
      await expect(art).toBeVisible();
      if (index === 0) {
        await expect(art).toContainText('単純接触効果');
        await expect(art).toContainText('名残惜しいくらいで去る');
        await expect(art).toContainText('印象がいい人');
      } else if (index === 1) {
        await expect(art).toContainText('短い接点を繰り返す');
        await expect(art).toContainText('ピーク・エンドの法則');
      } else {
        await expect(art).toContainText('マイ処世術');
        await expect(art.getByTestId('save-diamond')).toBeVisible();
      }
      await page.screenshot({ path: test.info().outputPath('welcome-' + width + '-' + (index + 1) + '.png'), scale: 'css' });
      await next(page);
    }
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), welcomeKey)).toBe('done');
    await page.reload();
    await expect(page.getByTestId('home-scroll')).toBeVisible();
    await expect(guide).toHaveCount(0);
  });
}

test('スキップを保存し設定から読み直せる', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('guide-skip').click();
  await expect(page).toHaveURL(/\/$/);
  await page.reload();
  await expect(page.getByTestId('home-scroll')).toBeVisible();
  await page.goto('/settings');
  await page.getByRole('button', { name: /はじめての方へ/ }).click();
  await expect(page.getByTestId('guide-counter')).toHaveText('1 / 3');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('guide-counter')).toHaveText('2 / 3');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('guide-counter')).toHaveText('1 / 3');
});

test('横向きでも図までスクロールでき開始ボタンに届く', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await next(page);
  const art = page.getByTestId('guide-artwork');
  await art.getByText('ピーク・エンドの法則', { exact: true }).scrollIntoViewIfNeeded();
  await expect(art.getByText('ピーク・エンドの法則', { exact: true })).toBeInViewport();
  await expect(page.getByTestId('guide-primary')).toBeInViewport();
  await next(page);
  await next(page);
  await expect(page.getByTestId('home-scroll')).toBeVisible();
});

test('法務・認証・記事の直接リンクと、案内の直リンクを扱える', async ({ page }) => {
  for (const path of ['/legal/privacy', '/auth?mode=signin', '/card/master336-001']) {
    await page.goto(path);
    await expect(page.getByTestId('book-header')).toBeVisible();
    await expect(page.getByTestId('installation-guide')).toHaveCount(0);
  }
  await returningInstallation(page);
  await page.goto('/installation-guide');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('home-scroll')).toBeVisible();
});

for (const [width, height] of [[320, 568], [390, 844], [1440, 900]] as const) {
  test('確認済み購入では完全版の1ページだけを表示する ' + width + 'px', async ({ page }) => {
    await account(page);
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?checkout=success&session_id=cs_test_guides');
    const guide = page.getByTestId('installation-guide');
    await expect(guide).toBeVisible();
    await expect(page.getByTestId('guide-counter')).toHaveCount(0);
    await expect(page.getByTestId('guide-skip')).toHaveCount(0);
    await expect(guide).toContainText('処世術禄完全版へようこそ');
    await expect(guide).toContainText('ご購入いただきありがとうございます！');
    await expect(page.getByTestId('guide-title')).toHaveText('論理性 × 網羅性 × 体系性');
    await expect(page.getByTestId('guide-primary')).toBeInViewport();
    await page.screenshot({ path: test.info().outputPath('complete-' + width + '.png'), scale: 'css' });
    await next(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('home-scroll')).toBeVisible();
    await expect(page.getByTestId('home-premium-banner')).toHaveCount(0);
    await page.reload();
    await expect(guide).toHaveCount(0);
    await page.goto('/settings');
    await page.getByRole('button', { name: /完全版の使い方/ }).click();
    await expect(guide).toContainText('処世術禄完全版へようこそ');
  });
}

test('通常ログインと購入復元だけでは完全版の案内を表示しない', async ({ page }) => {
  await returningInstallation(page);
  await account(page, false, true);
  await page.goto('/upgrade');
  await page.getByTestId('upgrade-restore').click();
  await expect(page.getByText('有効な完全版アクセスを復元しました。')).toBeVisible();
  await page.goto('/');
  await expect(page.getByTestId('home-scroll')).toBeVisible();
  await expect(page.getByTestId('installation-guide')).toHaveCount(0);
});

test('未確認・キャンセルの購入では完了案内を表示しない', async ({ page }) => {
  await account(page, false, false);
  await page.goto('/?checkout=success&session_id=cs_test_pending');
  await expect(page.getByText('決済の反映を待っています。しばらくしてから「購入を復元」を押してください。')).toBeVisible();
  await expect(page.getByTestId('installation-guide')).toHaveCount(0);
  await page.goto('/?checkout=cancelled');
  await expect(page.getByText('購入はキャンセルされました。完全版の利用権は付与されていません。')).toBeVisible();
  await expect(page.getByTestId('installation-guide')).toHaveCount(0);
});

test('同じ購入の完了URLは再表示せず更新購入では再び案内する', async ({ page }) => {
  const state = await account(page);
  await page.goto('/?checkout=success&session_id=cs_test_once');
  await expect(page.getByTestId('installation-guide')).toBeVisible();
  await next(page);
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), purchaseKey)).toContain('2026-10-10');
  await page.goto('/?checkout=success&session_id=cs_test_once');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('installation-guide')).toHaveCount(0);
  state.renew();
  await page.goto('/?checkout=success&session_id=cs_test_new');
  await expect(page.getByTestId('installation-guide')).toBeVisible();
  await next(page);
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), purchaseKey)).toContain('2026-11-10');
});
