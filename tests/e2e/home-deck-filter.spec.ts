import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });
const storageKey = '@shoseijutsu-roku/discovery-deck/v1/free';
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
};
const read = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

for (const width of [375, 1440]) {
  test(`種類選択で5枚の構成を変更し、同じ種類で全交換する (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await ready(page);
    const trigger = page.getByTestId('home-deck-filter');
    const shuffle = page.getByTestId('home-discovery-refresh');
    const a = (await trigger.boundingBox())!;
    const b = (await shuffle.boundingBox())!;
    expect(Math.abs(a.y - b.y)).toBeLessThan(2);
    expect(a.height).toBeGreaterThanOrEqual(44);
    expect(a.x + a.width).toBeLessThanOrEqual(b.x);
    for (const [key, name] of [['interpersonal', '対人術'], ['work', '仕事術'], ['life', '人生術'], ['theory', '理論'], ['all', 'すべて']]) {
      await trigger.click();
      await expect(page.getByTestId('home-deck-filter-popup').getByRole('radio')).toHaveCount(5);
      await page.getByTestId(`home-deck-filter-${key}`).click();
      await ready(page);
      await expect(trigger).toHaveText(new RegExp(name));
      await expect.poll(async () => (await read(page)).filter).toBe(key);
      const original = (await read(page)).order as string[];
      expect(original).toHaveLength(5);
      expect(new Set(original).size).toBe(5);
      const kinds = new Set<string>();
      for (let card = 0; card < 5; card++) {
        const active = page.getByTestId('home-recommendation-card');
        if (key !== 'all') await expect(active.getByText(name, { exact: true })).toBeVisible();
        kinds.add((await active.innerText()).includes('THEORY') ? 'theory' : 'technique');
        await page.getByTestId('home-deck-next').click();
        await ready(page);
      }
      if (key === 'all') expect(kinds.size).toBe(2);
      await shuffle.click();
      await ready(page);
      await expect.poll(async () => (await read(page)).order).not.toEqual(original);
      const exchanged = (await read(page)).order as string[];
      expect(exchanged.filter(id => original.includes(id))).toEqual([]);
      await page.reload();
      await ready(page);
      await expect(trigger).toContainText(name);
      expect((await read(page)).order).toEqual(exchanged);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await trigger.click();
    await page.screenshot({ path: `release-evidence/home-filter/popup-${width}.png` });
  });
}

test('選択は詳細往復と日本時間の日替わりで維持し、ポップアップをキーボードで扱える', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T14:59:30Z') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);
  const trigger = page.getByTestId('home-deck-filter');
  await trigger.click();
  await page.getByTestId('home-deck-filter-all').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('home-deck-filter-interpersonal')).toBeFocused();
  await page.keyboard.press('Enter');
  await ready(page);
  await expect(trigger).toContainText('対人術');
  const original = await read(page);
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('home-deck-filter-popup')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect((await read(page)).round).toBe(original.round);
  await page.getByTestId('home-deck-next').click();
  await ready(page);
  const title = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
  await page.waitForTimeout(360);
  await page.getByTestId('home-recommendation-card').click();
  await expect(page).toHaveURL(/\/card\//);
  await page.goBack();
  await ready(page);
  await expect(trigger).toContainText('対人術');
  await expect(page.getByTestId('home-recommendation-card')).toHaveAttribute('aria-label', title!);
  await page.clock.setSystemTime(new Date('2026-10-28T15:01:00Z'));
  expect((await read(page)).day).toBe(original.day);
  await page.reload();
  await ready(page);
  await expect(trigger).toContainText('対人術');
  expect((await read(page)).day).not.toBe(original.day);
  await expect(page.getByTestId('home-recommendation-card').getByText('対人術', { exact: true })).toBeVisible();
});

test('順送りはカードを左へ引き出して最下段へ差し込み、次の周回でも同じ順番を保つ', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);
  const first = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
  const box = (await page.getByTestId('home-recommendation-card').boundingBox())!;
  await page.evaluate(() => {
    const front = document.getElementById('home-deck-slot-0')!;
    const observer = new MutationObserver(() => {
      if (front.style.zIndex !== '0') return;
      observer.disconnect();
      const effect = document.getAnimations().find(animation => (animation.effect as KeyframeEffect)?.target === front)?.effect as KeyframeEffect;
      (window as any).__tuckPath = effect.getKeyframes().map(key => ({ x: new DOMMatrix(key.transform as string).m41, y: new DOMMatrix(key.transform as string).m42 }));
      for (const animation of document.getAnimations()) {
        if (!(animation.effect as KeyframeEffect)?.target?.id?.startsWith('home-deck-slot-')) continue;
        animation.pause();
        animation.currentTime = Number(animation.effect!.getTiming().duration) * .5;
      }
      (window as any).__tuckPaused = true;
    });
    observer.observe(front, { attributes: true, attributeFilter: ['style'] });
  });
  await page.mouse.move(box.x + box.width - 30, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 103, { steps: 14 });
  await page.mouse.up();
  await page.waitForFunction(() => (window as any).__tuckPaused);
  const path = await page.evaluate(() => (window as any).__tuckPath as { x: number; y: number }[]);
  expect(path[0].x).toBeLessThan(-box.width);
  expect(path.at(-1)!.x).toBeCloseTo(15, 1);
  expect(path.at(-1)!.y).toBe(36);
  await expect(page.locator('#home-deck-slot-0')).toHaveCSS('z-index', '0');
  await expect(page.getByTestId('home-discovery-refresh')).toHaveCSS('opacity', '1');
  await expect(page.getByTestId('home-deck-filter')).toBeDisabled();
  await page.screenshot({ path: 'release-evidence/home-filter/tuck-under.png' });
  await page.evaluate(() => { for (const animation of document.getAnimations()) animation.play(); });
  await ready(page);
  await expect(page.getByTestId('home-recommendation-card')).not.toHaveAttribute('aria-label', first!);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (let i = 0; i < 4; i++) { await page.getByTestId('home-deck-next').click(); await ready(page); }
  await expect(page.getByTestId('home-recommendation-card')).toHaveAttribute('aria-label', first!);
  await expect(page.getByTestId('home-deck-stage').locator('img')).toHaveCount(2);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByTestId('home-deck-filter').click();
  await page.getByTestId('home-deck-filter-work').click();
  await expect(page.getByTestId('home-discovery-refresh')).toBeDisabled();
  await ready(page);
  await expect(page.getByTestId('home-deck-filter')).toContainText('仕事術');
  await expect(page.getByTestId('home-recommendation-card').getByText('仕事術', { exact: true })).toBeVisible();
  await page.getByTestId('home-deck-next').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'release-evidence/home-filter/selected-work-390.png' });
});

test('CMS追加カードは遅れて読み込まれても順序と位置を復元し、一時的な通信失敗で消さない', async ({ page }) => {
  test.skip(!process.env.EXPO_PUBLIC_SUPABASE_URL, 'CMS connector is not configured in this build');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let offline = false;
  const rows = Array.from({ length: 12 }, (_, index) => ({
    id: `cms-deck-restore-${index}`, title: `CMSから追加された知識 ${index}`, essence: '公開後に追加されたカードの復元を検証する。', explanation: 'テスト用の公開コンテンツ。',
    category: 'interpersonal', persona_id: null, status: 'published', access_tier: 'free', display_order: index,
  }));
  await page.route('**/rest/v1/**', async route => {
    if (offline) { await route.fulfill({ status: 503, json: {} }); return; }
    const table = new URL(route.request().url()).pathname.split('/').at(-1);
    if (table === 'public_techniques') {
      await new Promise(resolve => { setTimeout(resolve, 700); });
      await route.fulfill({ json: rows });
    } else await route.fulfill({ json: table === 'content_revision' ? { revision: 'cms-restore-v1' } : [] });
  });
  const order = rows.slice(0, 5).map(row => `technique:${row.id}`);
  await page.addInitScript(({ key, order }) => {
    if (localStorage.getItem(key)) return;
    const day = Math.floor((Date.now() + 9 * 60 * 60 * 1000) / 86400000);
    localStorage.setItem(key, JSON.stringify({ day, round: 7, order, cursor: 2, offset: 5, seen: order, filter: 'interpersonal' }));
  }, { key: storageKey, order });
  await page.goto('/');
  await ready(page);
  // Match the app's actual day key rather than relying on a host timezone.
  const state = await read(page);
  expect(state.order).toEqual(order);
  expect(state.round).toBe(7);
  await expect(page.getByTestId('home-deck-position')).toContainText('03');
  await expect(page.getByTestId('home-recommendation-card')).toHaveAttribute('aria-label', `${rows[2].title}を読む`);
  for (let i = 0; i < 2; i++) {
    await page.reload(); await ready(page);
    expect((await read(page)).order).toEqual(order);
    expect((await read(page)).offset).toBe(5);
  }
  offline = true;
  await page.reload();
  await expect(page.getByText('知識を読み込めませんでした')).toBeVisible({ timeout: 15000 });
  expect((await read(page)).order).toEqual(order);
  expect((await read(page)).cursor).toBe(2);
  offline = false;
  await page.getByRole('button', { name: 'もう一度読み込む →' }).click();
  await ready(page);
  expect((await read(page)).order).toEqual(order);
  await expect(page.getByTestId('home-deck-position')).toContainText('03');
});

test('完全版の追加データを待つ間も、読める初期デッキはすぐ操作できる', async ({ page }) => {
  test.skip(!process.env.EXPO_PUBLIC_SUPABASE_URL, 'Account connector is not configured in this build');
  const user = { id: '00000000-0000-4000-8000-000000000002', aud: 'authenticated', role: 'authenticated', email: 'deck-test@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const token = Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: 4102444800 })).toString('base64url');
  const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${token}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: `sb-${project}-auth-token`, session });
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  await page.route('**/functions/v1/**', route => route.fulfill({ json: route.request().url().includes('/access') ? { access: 'active', accessType: 'thirty_day', accessExpiresAt: new Date(Date.now() + 10 * 86400000).toISOString() } : { items: [] } }));
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/functions/v1/paid-content**', async route => {
    await held;
    await route.fulfill({ json: { items: [] } }).catch(() => {});
  });
  try {
    await page.goto('/my-os');
    await expect(page.getByTestId('account-membership-card')).toContainText('完全版を利用中');
    await page.getByRole('link', { name: /^ホーム。/ }).click();
    await ready(page);
    await expect(page.getByTestId('home-premium-banner')).toHaveCount(0);
    await expect(page.getByTestId('home-deck-filter')).toBeEnabled();
    const first = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByTestId('home-deck-next').click();
    await ready(page);
    await expect(page.getByTestId('home-recommendation-card')).not.toHaveAttribute('aria-label', first!);
  } finally { release(); }
});
