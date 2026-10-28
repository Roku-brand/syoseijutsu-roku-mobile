import { expect, test, type Page } from '@playwright/test';

// Full-resolution screenshots and round trips can be slow on Windows/WebKit;
// individual UI assertions still keep Playwright's normal five-second limit.
test.describe.configure({ timeout: 60_000 });

const storageKey = '@shoseijutsu-roku/discovery-deck/v1/free';
const label = (page: Page) => page.getByTestId('home-recommendation-card').getAttribute('aria-label');
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
};
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

for (const width of [375, 390, 430, 768, 1440]) {
  test(`ホームの重なり・文字・ナビと実コンテンツ (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 1000 ? 1080 : 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await ready(page);
    await expect(page.getByTestId('home-continue-section')).toHaveCount(0);
    await expect(page.getByTestId('home-premium-banner')).toBeVisible();
    await expect(page.getByTestId('home-deck-layer')).toHaveCount(4);
    await expect(page.getByTestId('home-shortcuts').getByRole('link')).toHaveCount(4);
    await expect(page.getByTestId('home-brand-indicators').getByRole('tab')).toHaveCount(4);
    const card = await page.getByTestId('home-recommendation-card').boundingBox();
    expect(card!.width).toBeLessThanOrEqual(356);
    expect(card!.width).toBeGreaterThan(290);
    if (width >= 1000) {
      const previous = (await page.getByTestId('home-deck-previous').boundingBox())!;
      const next = (await page.getByTestId('home-deck-next').boundingBox())!;
      expect(previous.x + previous.width).toBeLessThan(card!.x);
      expect(next.x).toBeGreaterThan(card!.x + card!.width);
      expect(Math.abs(previous.y + previous.height / 2 - (card!.y + card!.height / 2))).toBeLessThan(35);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `release-evidence/home-discovery/home-${width}.png`, fullPage: true });
    await page.getByTestId('home-deck-next').click();
    await ready(page);
    await page.screenshot({ path: `release-evidence/home-discovery/theory-${width}.png`, fullPage: true });
    await page.getByTestId('home-discovery-refresh').click();
    await ready(page);
    await page.screenshot({ path: `release-evidence/home-discovery/shuffled-${width}.png`, fullPage: true });
  });
}

test('保存・前後移動・詳細往復・再読み込みで順序と位置を保持する', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);
  const initial = await label(page);
  await page.getByTestId('home-deck-save').click();
  await expect(page.getByTestId('home-deck-save')).toHaveAttribute('aria-pressed', 'true');
  expect(await label(page)).toBe(initial);
  await page.getByTestId('home-deck-next').click();
  await ready(page);
  const next = await label(page);
  expect(next).not.toBe(initial);
  await page.getByTestId('home-deck-previous').click();
  await ready(page);
  expect(await label(page)).toBe(initial);
  await expect(page.getByTestId('home-deck-save')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('home-deck-next').click();
  await ready(page);
  await page.waitForTimeout(360);
  await page.getByTestId('home-recommendation-card').click();
  await expect(page).toHaveURL(/\/(card|theory)\//);
  await page.goBack();
  await ready(page);
  expect(await label(page)).toBe(next);
  await expect(page.getByTestId('home-deck-position')).toContainText('02');
  await page.reload();
  await ready(page);
  expect(await label(page)).toBe(next);
  await page.goto('/history');
  await page.getByRole('tab', { name: '理論', exact: true }).click();
  await expect(page.getByText(next!.replace(/を読む$/, ''), { exact: true }).first()).toBeVisible();
  await page.goto('/library');
  await expect(page.getByText(initial!.replace(/を読む$/, ''), { exact: true }).first()).toBeVisible();
  await page.goto('/');
  await ready(page);
  expect(await label(page)).toBe(next);
  await page.getByTestId('home-discovery-refresh').click();
  await ready(page);
  const shuffled = await label(page);
  expect(shuffled).not.toBe(initial);
  expect(shuffled).not.toBe(next);
  await page.reload();
  await ready(page);
  expect(await label(page)).toBe(shuffled);
});

test('ドラッグ追従・閾値未満のスプリング・前後スワイプ・シャッフルの実描画', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);
  const original = await label(page);
  const card = page.getByTestId('home-recommendation-card');
  const box = (await card.boundingBox())!;
  const front = page.getByTestId('home-deck-front');
  const matrix = () => front.evaluate(node => { const m = new DOMMatrix(getComputedStyle(node).transform); return { x: m.m41, angle: Math.atan2(m.m12, m.m11) * 180 / Math.PI }; });
  await page.mouse.move(box.x + box.width * 0.7, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.7 - 38, box.y + 103, { steps: 10 });
  expect((await matrix()).x).toBeLessThan(-20);
  expect(Math.abs((await matrix()).angle)).toBeGreaterThan(0.3);
  await page.waitForTimeout(100);
  await page.mouse.up();
  await expect.poll(async () => Math.abs((await matrix()).x)).toBeLessThan(1);
  expect(await label(page)).toBe(original);
  await page.mouse.move(box.x + box.width * 0.8, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 35, box.y + 105, { steps: 14 });
  await page.screenshot({ path: 'release-evidence/home-discovery/drag-390.png' });
  await page.mouse.up();
  await ready(page);
  await expect.poll(() => label(page)).not.toBe(original);
  await page.mouse.move(box.x + 35, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + 103, { steps: 14 });
  await page.mouse.up();
  await ready(page);
  expect(await label(page)).toBe(original);
  await page.evaluate(() => {
    const frames: { x: number; angle: number; opacity: number }[] = [];
    (window as any).__frames = frames;
    const sample = () => {
      const root = document.querySelector('[data-testid="home-deck-front"]')!;
      const m = new DOMMatrix(getComputedStyle(root).transform);
      frames.push({ x: m.m41, angle: m.m12, opacity: Number(getComputedStyle(root.firstElementChild!).opacity) });
      if (!(window as any).__stop) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByTestId('home-discovery-refresh').click();
  await expect(page.getByTestId('home-discovery-refresh')).toBeDisabled();
  await page.getByTestId('home-discovery-refresh').dispatchEvent('click');
  await ready(page);
  const frames = await page.evaluate(() => { (window as any).__stop = true; return (window as any).__frames; });
  expect(frames.some((frame: any) => Math.abs(frame.x) > 10 && Math.abs(frame.angle) > 0.01)).toBe(true);
  expect(frames.some((frame: any) => frame.opacity < 0.4)).toBe(true);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).round, storageKey)).toBe(1);
});

test('キーボード・動きの設定変更・高速操作・5枚の循環', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);
  await page.getByTestId('home-discovery-refresh').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await page.getByTestId('home-deck-next').focus();
  await page.keyboard.press('ArrowRight');
  await ready(page);
  await expect(page.getByTestId('home-deck-position')).toContainText('02');
  await page.keyboard.press('ArrowLeft');
  await ready(page);
  await expect(page.getByTestId('home-deck-position')).toContainText('01');
  const seen = new Set<string | null>();
  const first = await label(page);
  for (let index = 0; index < 5; index++) {
    const current = await label(page);
    expect(seen.has(current)).toBe(false);
    seen.add(current);
    await page.getByTestId('home-recommendation-deck').focus();
    await page.keyboard.press('ArrowRight');
    await ready(page);
  }
  await expect(page.getByTestId('home-deck-position')).toContainText('01');
  expect(await label(page)).toBe(first);
  await page.keyboard.press('ArrowLeft');
  await ready(page);
  await expect(page.getByTestId('home-deck-position')).toContainText('05');
  await page.reload();
  await ready(page);
  await expect(page.getByTestId('home-deck-position')).toContainText('05');
});

test('日本時間の日替わりと訪問中の状態固定、破損キャッシュ復旧', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-28T14:59:30Z') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);
  const before = await label(page);
  const oldDay = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).day, storageKey);
  await page.clock.fastForward(70_000);
  expect(await label(page)).toBe(before);
  await page.reload();
  await ready(page);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).day, storageKey)).toBe(oldDay + 1);
  expect(await label(page)).not.toBe(before);
  await page.evaluate(key => localStorage.setItem(key, '{broken'), storageKey);
  await page.reload();
  await ready(page);
});

test('編集バナーは既存の特集・人物像・関連実践・学習ケースへ遷移する', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const destinations = [/\/features/, /\/(subcategory\/|personas)/, /\/(card\/|discover)/, /\/learn\//];
  for (let index = 1; index <= 4; index++) {
    await page.goto('/');
    await ready(page);
    await page.getByRole('tab', { name: `${index}枚目を表示`, exact: true }).click();
    await page.getByTestId(`home-brand-slide-${index}`).click({ position: { x: 20, y: 25 } });
    await expect(page).toHaveURL(destinations[index - 1]);
  }
});

test('スマホの実タッチは横スワイプと縦スクロールを分離する', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium specific');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await ready(page);
  const initial = await label(page);
  const cdp = await page.context().newCDPSession(page);
  const box = (await page.getByTestId('home-recommendation-card').boundingBox())!;
  const y = box.y + 100;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 310, y }] });
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 310 - step * 21, y: y + 3 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await ready(page);
  await expect.poll(() => label(page)).not.toBe(initial);
  const next = await label(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 710 }] });
  for (let step = 1; step <= 10; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 710 - step * 20 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await page.getByTestId('home-recommendation-card').boundingBox())!.y).toBeLessThan(box.y - 40);
  expect(await label(page)).toBe(next);
  await page.getByTestId('home-deck-next').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('home-deck-next')).toBeInViewport();
  await page.screenshot({ path: 'release-evidence/home-discovery/scrolled-390.png' });
});

test('既存の端末内データ消去でデッキ履歴も消去する', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);
  await page.getByTestId('home-discovery-refresh').click();
  await ready(page);
  await page.getByTestId('home-deck-next').click();
  await ready(page);
  await page.goto('/settings');
  page.once('dialog', dialog => dialog.accept());
  await page.getByText('端末内データをすべて消去', { exact: true }).click();
  await page.goto('/');
  await ready(page);
  await expect.poll(() => page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!);
    return { round: state.round, cursor: state.cursor, seen: state.seen.length };
  }, storageKey)).toEqual({ round: 0, cursor: 0, seen: 1 });
  await expect(page.getByTestId('home-deck-save')).toHaveAttribute('aria-pressed', 'false');
});

test('CMSの公開特集は既存の特集データからバナーへ反映される', async ({ page }) => {
  test.skip(!process.env.EXPO_PUBLIC_SUPABASE_URL, 'CMS connector is not configured in this build');
  await page.route('**/rest/v1/feature_articles*', route => route.fulfill({ json: [{
    id: 'home-editorial-fixture', slug: 'home-editorial-fixture', title: '知恵のつながりを見つける', lead: '公開特集の編集内容',
    body: 'CMS integration test fixture', status: 'published', is_featured: true, show_in_list: true, display_order: 1,
    image_path: 'bundled:feature-forest', image_alt: '森', category_id: null, editorial_character_id: null,
    related_feature_ids: [], source_references: [], related_technique_ids: [], related_theory_ids: [], updated_at: '2026-10-28T00:00:00Z',
  }] }));
  await page.goto('/');
  await ready(page);
  await page.getByRole('tab', { name: '1枚目を表示', exact: true }).click();
  await expect(page.getByTestId('home-brand-slide-1')).toContainText('知恵のつながりを見つける');
  await expect(page.getByTestId('home-brand-slide-1')).toContainText('公開特集の編集内容');
});

test('無料版の従来バナーから完全版LPへ進める', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  const banner = page.getByTestId('home-premium-banner');
  await expect(banner).toContainText('知識を、もっと広く。もっと深く。');
  await expect(page.getByTestId('home-premium-price')).toContainText('30日間・320円');
  await banner.click();
  await expect(page).toHaveURL(/\/upgrade\?source=home_banner/);
});

test('スワイプを軽量描画し、移動中はシャッフルの見た目と推薦順を変えない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);
  await expect(page.getByTestId('home-deck-paper')).toHaveCount(3);
  await expect(page.getByTestId('home-deck-stage').locator('img')).toHaveCount(2);
  await page.evaluate(() => {
    (window as any).__shuffleOpacity = [];
    (window as any).__recordOpacity = true;
    const sample = () => {
      (window as any).__shuffleOpacity.push(Number(getComputedStyle(document.querySelector('[data-testid="home-discovery-refresh"]')!).opacity));
      if ((window as any).__recordOpacity) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  const original = await label(page);
  const box = (await page.getByTestId('home-recommendation-card').boundingBox())!;
  await page.mouse.move(box.x + box.width * .8, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 104, { steps: 12 });
  await page.mouse.up();
  // Browser-owned animations should exist during release, with no per-frame
  // Animated JS updates. This contract applies in Chromium and WebKit.
  expect(await page.evaluate(() => document.getAnimations().filter(animation => (animation.effect as KeyframeEffect)?.target?.getAttribute('data-testid')?.startsWith('home-deck-')).length)).toBeGreaterThan(0);
  await page.getByTestId('home-discovery-refresh').dispatchEvent('click');
  await ready(page);
  await expect.poll(() => label(page)).not.toBe(original);
  const opacities = await page.evaluate(() => { (window as any).__recordOpacity = false; return (window as any).__shuffleOpacity as number[]; });
  expect(opacities.length).toBeGreaterThan(3);
  expect(opacities.every(value => value === 1)).toBe(true);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).round, storageKey)).toBe(0);
});

test('旧キューを5枚へ移行し、シャッフルで5枚すべてを交換する', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.order = Array.from({ length: 30 }, (_, index) => state.order[index % state.order.length]);
    state.cursor = 17;
    localStorage.setItem(key, JSON.stringify(state));
  }, storageKey);
  await page.reload();
  await ready(page);
  await expect(page.getByTestId('home-deck-position')).toContainText('01');
  const readOrder = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).order as string[], storageKey);
  let old = await readOrder();
  expect(old).toHaveLength(5);
  expect(new Set(old).size).toBe(5);
  for (let round = 1; round <= 6; round++) {
    await page.getByTestId('home-discovery-refresh').click();
    await ready(page);
    const next = await readOrder();
    expect(next).toHaveLength(5);
    expect(new Set(next).size).toBe(5);
    expect(next.filter(id => old.includes(id))).toEqual([]);
    old = next;
  }
  await page.reload();
  await ready(page);
  expect(await readOrder()).toEqual(old);
});
