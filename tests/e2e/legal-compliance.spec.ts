import { expect, test, type Page } from '@playwright/test';

async function deletionAccount(page: Page, succeeds: boolean) {
  const user = { id: '00000000-0000-4000-8000-000000000034', aud: 'authenticated', role: 'authenticated', email: 'legal-test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: 4102444800 })).toString('base64url');
  const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname.split('.')[0];
  await page.addInitScript(({ key, value }) => {
    if (sessionStorage.getItem('delete-fixture')) return;
    sessionStorage.setItem('delete-fixture', 'ready');
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem('@shoseijutsu-roku/state/v1', JSON.stringify({ personalPrinciple: '削除確認用の記録' }));
  }, { key: `sb-${project}-auth-token`, value: session });
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/**', route => route.fulfill({ json: { role: 'user', display_name: '検証用', avatar_url: null } }));
  let attempts = 0;
  await page.route('**/functions/v1/**', route => {
    if (!route.request().url().includes('/delete-account')) return route.fulfill({ json: { access: 'none', items: [] } });
    attempts++;
    expect(route.request().postDataJSON()).toEqual({ password: 'test-password', confirmation: 'DELETE' });
    return succeeds ? route.fulfill({ json: { deleted: true } }) : route.fulfill({ status: 403, json: { error: 'Invalid password' } });
  });
  await page.goto('/settings/delete-account');
  await page.getByRole('textbox', { name: '確認用パスワード' }).fill('test-password');
  return () => attempts;
}

test('規約は両決済手段・未成年者の権利・提供義務を説明し、旧版も閲覧できる', async ({ page }) => {
  await page.goto('/legal/terms');
  await expect(page.getByText(/バージョン3\.4/).first()).toBeVisible();
  await expect(page.getByText(/WebはStripe Checkout、iOSアプリ内はApple/)).toBeVisible();
  await expect(page.getByText(/未成年者取消しその他法令上の権利/)).toBeVisible();
  await expect(page.getByText(/有効期間内の契約どおりの提供・不具合への対応義務/)).toBeVisible();
  await page.getByRole('button', { name: '利用規約の履歴を見る' }).click();
  await expect(page).toHaveURL(/\/legal\/terms-history/);
  await expect(page.getByText(/v3\.3/)).toBeVisible();
  await expect(page.getByText(/v3\.2/)).toBeVisible();
});
test('プライバシーは画像・任意のイベント送信・国外取扱い・削除の実態を説明する', async ({ page }) => {
  await page.goto('/legal/privacy');
  await expect(page.getByText(/画像は非公開の保存先で管理/)).toBeVisible();
  await expect(page.getByText(/匿名情報とは扱いません/)).toBeVisible();
  await expect(page.getByText(/初期状態はオフ/)).toBeVisible();
  await expect(page.getByText(/国内リージョンだけを理由に国外での取扱いがないとは扱いません/)).toBeVisible();
  await expect(page.getByText(/ログアウトだけでは個人用の端末内データは消去されません/)).toBeVisible();
});
test('登録への同意は任意集計とは別で、同意するまで登録を送信しない', async ({ page }) => {
  await page.goto('/auth?mode=signup');
  await page.getByRole('textbox', { name: 'メールアドレス' }).fill('legal-test@example.invalid');
  await page.getByRole('textbox', { name: 'パスワード', exact: true }).fill('test-password');
  const submit = page.getByRole('button', { name: 'アカウントを作成', exact: true });
  await expect(submit).toBeDisabled();
  await page.getByRole('checkbox', { name: '利用規約とプライバシーポリシーを確認して同意する' }).click();
  await expect(submit).toBeEnabled();
  await expect(page.getByText(/利用状況の送信は別の任意設定/)).toBeVisible();
});
test('利用状況の送信は初期オフで、任意に切り替えた設定が再起動後も反映する', async ({ page }) => {
  let events = 0;
  await page.route('**/rest/v1/rpc/record_consented_content_event', route => { events++; return route.fulfill({ json: null }); });
  await page.goto('/card/master336-001');
  await expect(page.getByText('清潔感を意識する').first()).toBeVisible();
  await page.goto('/settings');
  const toggle = page.getByRole('switch', { name: '利用状況の送信' });
  await expect(toggle).not.toBeChecked();
  expect(events).toBe(0);
  await toggle.check();
  await expect(toggle).toBeChecked();
  await page.reload();
  await expect(toggle).toBeChecked();
  await page.goto('/card/master336-001');
  await expect.poll(() => events).toBe(1);
  await page.goto('/settings');
  await toggle.uncheck();
  await page.goto('/card/master336-001');
  await expect(page.getByText('清潔感を意識する').first()).toBeVisible();
  expect(events).toBe(1);
});
test('購入直前の確認に数量・期間・返金例外・訂正導線がある', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/upgrade');
  await page.getByTestId('upgrade-purchase-cta').click();
  const conditions = page.getByTestId('checkout-return-conditions');
  await expect(conditions).toContainText('完全版1件・320円（税込）');
  await expect(conditions).toContainText('重複決済・未提供・契約不適合・法令上の権利');
  await page.getByRole('button', { name: '戻る', exact: true }).click();
  await expect(page.getByText('購入内容の確認', { exact: true })).toHaveCount(0);
});

test('端末内データ消去は取消しでは保持し、確認後に実データを消去する', async ({ page }) => {
  const key = '@shoseijutsu-roku/state/v1';
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ personalPrinciple: '消去検証用の座右の銘', savedIds: ['master336-001'] })), key);
  await page.goto('/settings');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), key)).toContain('消去検証用');
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: /端末内データをすべて消去/ }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: /端末内データをすべて消去/ }).click();
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), key)).not.toContain('消去検証用');
});

test('アカウント削除の最終確認を取り消すとサーバーへ送信しない', async ({ page }) => {
  const attempts = await deletionAccount(page, true);
  await page.getByRole('button', { name: 'アカウントを完全に削除', exact: true }).click();
  await expect(page.getByText('残りの完全版利用期間も失われます。この操作は取り消せません。')).toBeVisible();
  await page.getByRole('button', { name: 'キャンセル', exact: true }).click();
  expect(attempts()).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('@shoseijutsu-roku/state/v1'))).toContain('削除確認用');
});
test('削除が拒否されたときは端末の個人データを保持する', async ({ page }) => {
  const attempts = await deletionAccount(page, false);
  await page.getByRole('button', { name: 'アカウントを完全に削除', exact: true }).click();
  await page.getByRole('button', { name: '完全に削除', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('削除できませんでした');
  expect(attempts()).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('@shoseijutsu-roku/state/v1'))).toContain('削除確認用');
});
test('確認済み削除が成功した後はログアウトして端末データも消去する', async ({ page }) => {
  const attempts = await deletionAccount(page, true);
  await page.getByRole('button', { name: 'アカウントを完全に削除', exact: true }).click();
  await page.getByRole('button', { name: '完全に削除', exact: true }).click();
  // The welcome route may immediately forward to the home screen.
  await expect(page).toHaveURL(/\/(?:welcome)?$/);
  expect(attempts()).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('@shoseijutsu-roku/state/v1'))).not.toContain('削除確認用');
  const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname.split('.')[0];
  expect(await page.evaluate(key => localStorage.getItem(key), `sb-${project}-auth-token`)).toBeNull();
});
