import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

async function ready(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByTestId('book-header')).toBeVisible();
  await expect(page.locator('#roku-launch')).toBeHidden();
}

for (const width of [320, 390]) {
  test(`mobile search and complete edition copy fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await ready(page);
    await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
    await expect(page.getByTestId('home-premium-banner')).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`home-${width}.png`) });
    await page.getByTestId('book-header').getByRole('button', { name: '検索', exact: true }).click();
    const popup = page.getByTestId('header-search-popup');
    const input = popup.getByRole('textbox');
    await expect(input).toBeFocused();
    expect(await input.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    await expect(popup.getByRole('tab')).toHaveCount(3);
    expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(/maximum-scale|user-scalable=no/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`search-${width}.png`) });
  });
}

test('all memo creation entry points wait for a tap and have one close action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await ready(page);
  await page.getByTestId('home-create-technique').click();
  const input = page.getByRole('textbox', { name: 'マイ処世術', exact: true });
  await expect(input).toBeVisible();
  await expect(input).not.toBeFocused();
  await expect(page.getByRole('button', { name: /閉じる/ })).toHaveCount(1);
  await input.tap();
  await expect(input).toBeFocused();
  await input.fill('一歩ずつ確かめる');
  await page.getByRole('textbox', { name: 'フォルダー名', exact: true }).fill('日々の気づき');
  await page.getByRole('button', { name: 'マイ処世術を追加', exact: true }).click();
  await expect(page.getByRole('button', { name: 'マイ処世術：日々の気づき', exact: true })).toContainText('1件');
  await ready(page, '/my-os');
  await page.getByRole('button', { name: 'マイ処世術：日々の気づき', exact: true }).click();
  await page.getByRole('button', { name: 'このフォルダーに新規作成', exact: true }).click();
  await expect(input).toBeVisible();
  await expect(input).not.toBeFocused();
  await input.tap();
  await expect(input).toBeFocused();
});

test('reel advances after ten seconds, resets on manual use, wraps and pauses away from home', async ({ page }) => {
  await ready(page);
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  const dot = (index: number) => page.getByRole('tab', { name: `${index}枚目を表示`, exact: true });
  await dot(1).click();
  await page.clock.runFor(9_999);
  await expect(dot(1)).toHaveAttribute('aria-selected', 'true');
  await page.clock.runFor(1);
  await expect(dot(2)).toHaveAttribute('aria-selected', 'true');
  await page.clock.runFor(2_000);
  await dot(4).click();
  await page.clock.runFor(15_999);
  await expect(dot(4)).toHaveAttribute('aria-selected', 'true');
  await page.clock.runFor(1);
  await expect(dot(1)).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('persistent-bottom-navigation').getByRole('link', { name: /^学ぶ/ }).click();
  await page.clock.runFor(15_000);
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('shoseijutsu-roku:home-reel:home-editorial-v4')!).index)).toBe(0);
});

test('reduced motion keeps the reel still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await page.clock.install();
  await page.getByRole('tab', { name: '1枚目を表示', exact: true }).click();
  await page.clock.runFor(10_000);
  await expect(page.getByRole('tab', { name: '1枚目を表示', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('viewport remains stable during touch and pinch, then follows settled keyboard height', async ({ page }) => {
  await page.addInitScript(() => {
    const state = { height: innerHeight, scale: 1 };
    Object.assign(window, { viewportTest: state });
    Object.defineProperty(visualViewport, 'height', { get: () => state.height });
    Object.defineProperty(visualViewport, 'scale', { get: () => state.scale });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, '/theories');
  const root = page.locator('#root');
  await expect(root).toHaveCSS('height', '844px');
  await page.evaluate(() => {
    document.dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: document.body })] }));
    (window as unknown as { viewportTest: { height: number } }).viewportTest.height = 500;
    visualViewport!.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(200);
  await expect(root).toHaveCSS('height', '844px');
  await page.evaluate(() => document.dispatchEvent(new TouchEvent('touchend', { touches: [] })));
  await expect(root).toHaveCSS('height', '500px');
  await page.evaluate(() => {
    Object.assign((window as unknown as { viewportTest: object }).viewportTest, { height: 300, scale: 2 });
    visualViewport!.dispatchEvent(new Event('resize'));
  });
  await page.waitForTimeout(200);
  await expect(root).toHaveCSS('height', '500px');
  await page.evaluate(() => {
    Object.assign((window as unknown as { viewportTest: object }).viewportTest, { height: 900, scale: 1 });
    visualViewport!.dispatchEvent(new Event('resize'));
  });
  await expect(root).toHaveCSS('height', '844px');
});

test('first tab change after startup produces exactly one normal transition', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Object.assign(window, { tabMotions: [] });
    Element.prototype.animate = function (frames, options) {
      if (this.getAttribute('data-testid') === 'route-transition-content') {
        (window as unknown as { tabMotions: unknown[] }).tabMotions.push(frames);
      }
      return original.call(this, frames, options);
    };
  });
  await ready(page);
  await page.getByTestId('persistent-bottom-navigation').getByRole('link', { name: /^探す/ }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await page.waitForTimeout(400);
  const motions = await page.evaluate(() => (window as unknown as { tabMotions: { transform: string }[][] }).tabMotions);
  expect(motions).toHaveLength(1);
  expect(motions[0][0].transform).toBe('translateX(14px)');
});

test('touch scrolling returns upward on multiple screens including over horizontal content', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const seed = JSON.parse(readFileSync('content/features/manifest.json', 'utf8')).find((row: { slug: string }) => row.slug === 'five-guidelines');
  const source = readFileSync('content/features/five-guidelines.md', 'utf8').replace(/\r\n/g, '\n');
  const article = { ...seed, lead: source.slice(0, source.indexOf('\n\n')), body: source.slice(source.indexOf('\n\n') + 2), related_technique_ids: [], related_theory_ids: [], related_feature_ids: [], source_references: [], status: 'published' };
  await page.route('**/rest/v1/**', route => route.request().url().includes('/feature_articles')
    ? route.fulfill({ json: [article] }) : route.fulfill({ status: 503, json: {} }));
  const cdp = await context.newCDPSession(page);
  const swipe = async (from: number, to: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: from }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: from + (to - from) * step / 10 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
  };
  for (const path of ['/', '/theories', '/features/five-guidelines']) {
    await ready(page, path);
    if (path.startsWith('/features/')) await expect(page.getByTestId('feature-body')).toBeVisible();
    const scrollTop = () => page.evaluate(() => Math.max(...Array.from(document.querySelectorAll('*')).filter(el => el.clientHeight > 300 && el.scrollHeight > el.clientHeight && ['auto', 'scroll'].includes(getComputedStyle(el).overflowY)).map(el => el.scrollTop)));
    await swipe(650, 200);
    const down = await scrollTop();
    expect(down).toBeGreaterThan(30);
    await swipe(220, 700);
    await expect.poll(scrollTop).toBeLessThan(down);
  }
});
