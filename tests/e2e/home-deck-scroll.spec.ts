import { turnDeck, expectDeckCursor } from './deck-helpers';
import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card').filter({ visible: true })).toBeVisible();
  await expect(page.getByTestId('home-recommendation-deck').filter({ visible: true })).toHaveAttribute('aria-busy', 'false');
};
const position = (page: Page) => page.getByTestId('home-scroll').evaluate(scroll => scroll.scrollTop);

for (const width of [375, 390, 430]) {
  test(`スマホはおすすめを先頭にし、ショートカットと完全版へ自然にスクロールできる (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await ready(page);
    const recommendation = (await page.getByTestId('home-recommendations-section').boundingBox())!;
    const shortcuts = (await page.getByTestId('home-shortcuts').boundingBox())!;
    const premium = (await page.getByTestId('home-premium-banner').boundingBox())!;
    expect(recommendation.y).toBeLessThan(shortcuts.y);
    expect(shortcuts.y).toBeLessThan(premium.y);
    await page.getByTestId('home-scroll').evaluate(scroll => { scroll.scrollTop = 120; });
    await page.waitForTimeout(450);
    expect(await position(page)).toBeGreaterThan(90);
    expect(await position(page)).toBeLessThan(160);
    await page.getByTestId('home-premium-banner').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('home-premium-banner')).toBeInViewport();
    await page.getByTestId('home-recommendation-card').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('home-recommendation-card')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('戻った後もおすすめの同じカードとデッキ選択を維持する', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);
  await page.getByTestId('home-deck-filter').click();
  await page.getByTestId('home-deck-filter-interpersonal').click();
  await ready(page);
  await turnDeck(page);
  await ready(page);
  const title = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
  await page.waitForTimeout(360);
  await page.getByTestId('home-recommendation-card').click();
  await expect(page).toHaveURL(/\/card\//);
  await page.goBack();
  await ready(page);
  await expect(page.getByTestId('home-recommendation-card')).toHaveAttribute('aria-label', title!);
  await expect(page.getByTestId('home-deck-filter')).toContainText('対人術');
  await expectDeckCursor(page, 1);
});

test('ホームタブは途中から先頭に戻し、先頭で押すと一度振動してシャッフルする', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: () => {
        sessionStorage.setItem('home-haptic-count', String(Number(sessionStorage.getItem('home-haptic-count')) + 1));
        return true;
      },
    });
  });
  const haptics = () => page.evaluate(() => Number(sessionStorage.getItem('home-haptic-count')));
  const deck = () => page.evaluate(() => JSON.parse(localStorage.getItem('@shoseijutsu-roku/discovery-deck/v1/free')!));
  await page.goto('/');
  await ready(page);
  const nav = page.getByTestId('persistent-bottom-navigation');
  const home = nav.getByRole('link', { name: 'ホーム', exact: true });
  const before = await deck();
  await page.getByTestId('home-scroll').evaluate(node => { node.scrollTop = 125; });
  await expect.poll(() => position(page)).toBeGreaterThan(100);
  await home.click();
  await expect.poll(() => position(page)).toBe(0);
  expect((await deck()).round).toBe(before.round);
  expect(await haptics()).toBe(0);

  await home.click();
  await expect.poll(async () => (await deck()).round).toBe(before.round + 1);
  expect((await deck()).order).not.toEqual(before.order);
  expect(await haptics()).toBe(1);
  await expect(page).toHaveURL(/\/$/);

  await nav.getByRole('link', { name: '探す', exact: true }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await home.click();
  await ready(page);
  expect((await deck()).round).toBe(before.round + 1);
  expect(await haptics()).toBe(1);

  await home.click();
  await expect.poll(async () => (await deck()).round).toBe(before.round + 2);
  expect(await haptics()).toBe(2);
  await page.getByTestId('home-discovery-refresh').filter({ visible: true }).click();
  await expect.poll(async () => (await deck()).round).toBe(before.round + 3);
  expect(await haptics()).toBe(3);
});

test('ボタン・ホームタブ・デッキ選択のシャッフルで同じ引き下げ更新が動く', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);

  const scroll = page.getByTestId('home-scroll');
  const indicator = page.getByTestId('home-pull-indicator');
  const offsets = () => scroll.evaluate(node => {
    const viewportTop = node.getBoundingClientRect().top;
    return ['home-recommendations-section', 'home-shortcuts'].map(id =>
      node.querySelector(`[data-testid="${id}"]`)!.getBoundingClientRect().top - viewportTop);
  });
  const checkRefresh = async (trigger: () => Promise<void>) => {
    const before = await offsets();
    await trigger();
    await expect(indicator).toHaveCSS('opacity', '1');
    await expect.poll(async () => (await offsets()).map((value, i) => Math.round(value - before[i])),
      { intervals: [30, 50, 70], timeout: 1000 }).toEqual([51, 51]);
    await ready(page);
    await expect(indicator).toHaveCSS('opacity', '0');
    await expect.poll(async () => Math.round((await offsets())[0] - before[0])).toBe(0);
    expect(await position(page)).toBe(0);
  };
  await checkRefresh(() => page.getByTestId('home-discovery-refresh').click());
  await checkRefresh(() => page.getByTestId('persistent-bottom-navigation').getByRole('link', { name: 'ホーム', exact: true }).click());
  await page.getByTestId('home-deck-filter').click();
  await checkRefresh(() => page.getByTestId('home-deck-filter-work').click());
  await expect(page.getByTestId('home-deck-filter')).toHaveText('仕事術');
});

test('短い画面でもページ送り・シャッフル・下部コンテンツへ到達できる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto('/');
  await ready(page);
  for (const id of ['home-recommendation-card', 'home-discovery-refresh', 'home-shortcut-personas', 'home-premium-banner']) {
    await page.getByTestId(id).scrollIntoViewIfNeeded();
    await expect(page.getByTestId(id)).toBeInViewport();
  }
  await page.setViewportSize({ width: 390, height: 932 });
  await page.getByTestId('home-recommendation-card').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('home-recommendation-card')).toBeInViewport();
});
