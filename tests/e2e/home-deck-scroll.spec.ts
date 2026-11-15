import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
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
    await page.getByTestId('home-deck-previous').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('home-deck-previous')).toBeInViewport();
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
  await page.getByTestId('home-deck-next').click();
  await ready(page);
  const title = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
  await page.waitForTimeout(360);
  await page.getByTestId('home-recommendation-card').click();
  await expect(page).toHaveURL(/\/card\//);
  await page.goBack();
  await ready(page);
  await expect(page.getByTestId('home-recommendation-card')).toHaveAttribute('aria-label', title!);
  await expect(page.getByTestId('home-deck-filter')).toContainText('対人術');
  await expect(page.getByTestId('home-deck-position')).toContainText('02');
});

test('短い画面でもページ送り・シャッフル・下部コンテンツへ到達できる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto('/');
  await ready(page);
  for (const id of ['home-deck-next', 'home-discovery-refresh', 'home-shortcut-personas', 'home-premium-banner']) {
    await page.getByTestId(id).scrollIntoViewIfNeeded();
    await expect(page.getByTestId(id)).toBeInViewport();
  }
  await page.setViewportSize({ width: 390, height: 932 });
  await page.getByTestId('home-deck-next').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('home-deck-next')).toBeInViewport();
});
