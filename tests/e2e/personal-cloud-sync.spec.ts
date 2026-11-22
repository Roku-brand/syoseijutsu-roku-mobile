import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const endpoint = 'https://roku-sync-test.invalid';
const uid = '11111111-1111-4111-8111-111111111111';
const guestKey = '@shoseijutsu-roku/state/v1';
const accountKey = '@shoseijutsu-roku/state/v2/user/' + uid;
const sessionKey = 'sb-roku-sync-test-auth-token';
const memo = (id: string, text: string) => ({ id, text, folderId: null, createdAt: '2026-11-22T00:00:00Z' });
const user = { id: uid, aud: 'authenticated', email: 'sync-test@example.test', app_metadata: {},
  user_metadata: { terms_version: '3.5', privacy_version: '2.2', terms_accepted_at: '2026-11-22T00:00:00Z' } };
const payload = Buffer.from(JSON.stringify({ sub: uid, role: 'authenticated', exp: 4102444800 })).toString('base64url');
const session = { access_token: 'eyJhbGciOiJIUzI1NiJ9.' + payload + '.test', refresh_token: 'fixture-refresh', token_type: 'bearer', user };

async function openMemoComposer(page: Page, text: string, folder: string) {
  await page.goto('/my-techniques?compose=1');
  await page.getByRole('textbox', { name: 'マイ処世術', exact: true }).fill(text);
  await page.getByRole('button', { name: '新しいフォルダーを作る', exact: true }).click();
  await page.getByRole('textbox', { name: 'フォルダー名' }).fill(folder);
  return page.getByRole('button', { name: 'マイ処世術を追加', exact: true });
}

test('ゲスト記録は確認後だけ同期し、別端末で復元して端末とクラウドを別々に削除できる', async ({ page, browser, baseURL }) => {
  test.skip(process.env.PLAYWRIGHT_PERSONAL_SYNC_FIXTURE !== '1', 'Run against the local server configured with the sync fixture URL.');
  const items = new Map<string, { key: string; revision: number; value: unknown }>();
  const sequences = new Map<string, number>();
  let epoch = 1, revision = 0, offline = false, requests = 0, acknowledgements = 0;
  const secondary = await browser.newContext({ baseURL, serviceWorkers: 'block' });
  const fixture = async (context: BrowserContext, guest = false) => {
    await context.addInitScript(({ key, guestKey, guest, session }) => {
      localStorage.setItem('@shoseijutsu-roku/installation-welcome/v1', 'done');
      if (!sessionStorage.getItem('auth-fixture-set')) {
        if (!guest) localStorage.setItem(key, JSON.stringify({ ...session, expires_at: Math.floor(Date.now() / 1000) + 3600 }));
        if (guest) localStorage.setItem(guestKey, JSON.stringify({ personalMemos: [
          { id: 'guest-entry', text: 'ログイン前の個人記録', folderId: null, createdAt: '2026-11-22T00:00:00Z' },
        ] }));
        sessionStorage.setItem('auth-fixture-set', 'yes');
      }
    }, { key: sessionKey, guestKey, guest, session });
    await context.route(endpoint + '/**', async route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, PUT, OPTIONS' };
      const reply = (json: unknown, status = 200) => route.fulfill({ headers, status, json });
      if (request.method() === 'OPTIONS') return route.fulfill({ headers, status: 204 });
      if (path === '/auth/v1/user') return reply(user);
      if (path === '/auth/v1/token') return reply({ ...session, token_type: 'bearer', expires_in: 3600 });
      if (path === '/auth/v1/logout') return route.fulfill({ headers, status: 204 });
      if (path.endsWith('/accept_personal_sync_notice')) {
        expect(request.postDataJSON()).toEqual({ p_user: uid, p_terms: '3.5', p_privacy: '2.2' });
        acknowledgements++;
        return reply(true);
      }
      if (path.endsWith('/sync_personal_records')) {
        requests++;
        if (offline) return reply({ message: 'Offline fixture' }, 503);
        const body = request.postDataJSON();
        expect(request.headers().authorization).toBe('Bearer ' + session.access_token);
        expect(body.p_user).toBe(uid);
        if (body.p_epoch !== epoch) return reply({ epoch, cursor: 0, ack: 0, reset: true, more: items.size > 0, items: [] });
        const ack = sequences.get(body.p_device) ?? 0;
        if (body.p_changes.length && body.p_sequence > ack) {
          for (const change of body.p_changes) if ((items.get(change.key)?.revision ?? 0) === change.base) {
            items.set(change.key, { key: change.key, revision: ++revision, value: change.deleted ? null : change.value });
          }
          sequences.set(body.p_device, body.p_sequence);
        }
        return reply({ epoch, cursor: revision, ack: body.p_changes.length ? sequences.get(body.p_device) : 0,
          reset: false, more: false, items: [...items.values()].filter(item => item.revision > body.p_cursor).sort((a, b) => a.revision - b.revision) });
      }
      if (path.endsWith('/clear_personal_records')) {
        if (request.postDataJSON().p_epoch === epoch) { epoch++; revision = 0; items.clear(); sequences.clear(); }
        return reply(epoch);
      }
      if (path.endsWith('/personal_record_recovery')) return reply([]);
      return reply([]);
    });
  };

  try {
    await fixture(page.context(), true);
    await fixture(secondary);
    await page.goto('/settings/data');
    await expect(page.getByText('この端末に自動保存しています。', { exact: false })).toBeVisible();
    expect(requests).toBe(0);
    await page.evaluate(({ key, session, accountKey, localMemo }) => {
      localStorage.setItem(key, JSON.stringify({ ...session, expires_at: Math.floor(Date.now() / 1000) + 3600 }));
      localStorage.setItem(accountKey, JSON.stringify({ personalMemos: [localMemo] }));
    }, { key: sessionKey, session: { ...session, user: { ...user, user_metadata: { ...user.user_metadata, privacy_version: '2.1', terms_version: '3.4' } } },
      accountKey, localMemo: memo('account-entry', '従来のアカウント記録') });
    await page.reload();
    const consent = page.getByRole('button', { name: '確認して同期を始める' });
    await expect(consent).toBeVisible();
    expect(requests).toBe(0);
    await consent.click();
    await expect.poll(() => acknowledgements).toBe(1);
    await expect(page.getByRole('button', { name: '記録を引き継ぐ' })).toBeVisible();
    const cloudHas = (text: string) => [...items.values()].some(item => (item.value as { text?: string } | null)?.text === text);
    await expect.poll(() => cloudHas('従来のアカウント記録')).toBe(true);
    expect(cloudHas('ログイン前の個人記録')).toBe(false);
    await page.getByRole('button', { name: '記録を引き継ぐ' }).click();
    await expect.poll(() => cloudHas('ログイン前の個人記録')).toBe(true);

    const other = await secondary.newPage();
    await other.goto('/settings/data');
    await expect(other.getByText(/マイ処世術 2件/)).toBeVisible();
    offline = true;
    await (await openMemoComposer(other, '通信が戻る前に作成', '同期テスト')).click();
    await other.reload();
    await expect(other.getByText(/同期テスト/).first()).toBeVisible();
    expect(cloudHas('通信が戻る前に作成')).toBe(false);
    offline = false;
    await other.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(() => cloudHas('通信が戻る前に作成')).toBe(true);

    const sharedTab = await page.context().newPage();
    offline = true;
    const first = await openMemoComposer(page, '最初のタブで編集', 'タブA');
    const second = await openMemoComposer(sharedTab, '別のタブで編集', 'タブB');
    await first.click();
    await second.click();
    await expect.poll(async () => page.evaluate(key => {
      const journal = JSON.parse(localStorage.getItem(key + '/sync-v1') ?? '{}');
      return JSON.stringify([journal.pending, journal.flight]);
    }, accountKey)).toContain('最初のタブで編集');
    await expect.poll(async () => sharedTab.evaluate(key => {
      const journal = JSON.parse(localStorage.getItem(key + '/sync-v1') ?? '{}');
      return JSON.stringify([journal.pending, journal.flight]);
    }, accountKey)).toContain('別のタブで編集');
    offline = false;
    await sharedTab.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect.poll(() => cloudHas('最初のタブで編集') && cloudHas('別のタブで編集')).toBe(true);
    await sharedTab.close();

    await other.goto('/settings/data');
    await other.getByRole('button', { name: 'この端末の個人記録を消去' }).click();
    await other.getByRole('button', { name: '消去を確定する', exact: true }).click();
    await expect(other.getByText('この端末に自動保存しています。', { exact: false })).toBeVisible();
    expect(await other.evaluate(key => localStorage.getItem(key + '/sync-v1'), accountKey)).toBeNull();
    expect(cloudHas('通信が戻る前に作成')).toBe(true);

    await page.goto('/settings/data');
    await page.getByRole('button', { name: 'クラウド上の個人記録を削除' }).click();
    await page.getByRole('button', { name: 'クラウドの削除を確定する' }).click();
    await expect(page.getByText('クラウド上の個人記録と復旧履歴を削除しました。')).toBeVisible();
    expect(items.size).toBe(0);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).personalMemos.length, guestKey)).toBe(1);
  } finally {
    await secondary.close();
  }
});


test('同期の案内をまだ確認していないアカウントも旧クラウド記録を削除できる', async ({ page }) => {
  test.skip(process.env.PLAYWRIGHT_PERSONAL_SYNC_FIXTURE !== '1', 'Run against the local server configured with the sync fixture URL.');
  const legacyUser = { ...user, user_metadata: {} };
  const legacySession = { ...session, user: legacyUser, expires_at: 4102444800 };
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem('@shoseijutsu-roku/installation-welcome/v1', 'done');
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: sessionKey, value: legacySession });
  let activeRequests = 0;
  let removed = false;
  await page.route(endpoint + '/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
    if (request.method() === 'OPTIONS') return route.fulfill({ headers, status: 204 });
    if (path.endsWith('/personal_record_sync_epoch')) return route.fulfill({ headers, json: 1 });
    if (path.endsWith('/clear_personal_records')) {
      expect(request.postDataJSON()).toEqual({ p_epoch: 1, p_user: uid });
      removed = true;
      return route.fulfill({ headers, json: 2 });
    }
    if (path.endsWith('/sync_personal_records') || path.endsWith('/accept_personal_sync_notice')) activeRequests++;
    return route.fulfill({ headers, json: path === '/auth/v1/user' ? legacyUser : [] });
  });
  await page.goto('/settings/data');
  const notice = page.getByRole('button', { name: '確認して同期を始める' });
  await expect(notice).toBeVisible();
  await page.getByRole('button', { name: 'クラウド上の個人記録を削除' }).click();
  await page.getByRole('button', { name: 'クラウドの削除を確定する' }).click();
  await expect(page.getByText('クラウド上の個人記録と復旧履歴を削除しました。')).toBeVisible();
  await expect(notice).toBeVisible();
  expect(removed).toBe(true);
  expect(activeRequests).toBe(0);
});
