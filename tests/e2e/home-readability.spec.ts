import { expect, test, type Locator } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 404, json: {} }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
});

test('種類の選択状態と開閉状態が支援技術に伝わり、再読み込み後も一致する', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByTestId('home-deck-filter');
  await expect(trigger).toBeEnabled();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  const popup = page.getByTestId('home-deck-filter-popup');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(popup.getByRole('radio', { checked: true })).toHaveCount(1);
  await expect(page.getByTestId('home-deck-filter-all')).toBeChecked();
  await page.getByTestId('home-deck-filter-work').click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toHaveAccessibleName('デッキの種類：仕事術');
  await page.reload();
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await expect(page.getByTestId('home-deck-filter-work')).toBeChecked();
  await expect(page.getByTestId('home-deck-filter-all')).not.toBeChecked();
  await expect(popup.getByRole('radio', { checked: true })).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

const readable = async (label: Locator, canEllipsize = false) => {
  const metrics = await label.evaluate(element => ({
    font: parseFloat(getComputedStyle(element).fontSize),
    content: element.scrollHeight,
    height: element.clientHeight,
    contentWidth: element.scrollWidth,
    width: element.clientWidth,
  }));
  expect(metrics.font).toBeGreaterThanOrEqual(12);
  expect(metrics.content).toBeLessThanOrEqual(metrics.height + 1);
  if (!canEllipsize) expect(metrics.contentWidth).toBeLessThanOrEqual(metrics.width + 1);
};

for (const [width, height] of [[320, 568], [390, 844], [768, 1000], [1440, 1000]]) {
  test(`文字を縮小せず、ホームのラベル・バナー・操作を表示できる (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const title of ['人物像', '人気ランキング', '処世術を作る', '特集', '五大原則']) {
      const shortcut = page.getByTestId('home-shortcuts').getByRole(title === '五大原則' ? 'button' : 'link', { name: title, exact: true });
      await readable(shortcut.getByText(title, { exact: true }));
      const box = (await shortcut.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    for (const id of ['home-premium-heading', 'home-premium-tagline', 'home-premium-price']) await readable(page.getByTestId(id));
    const banner = (await page.getByTestId('home-premium-banner').boundingBox())!;
    const action = (await page.getByTestId('home-premium-action-row').boundingBox())!;
    expect(action.x + action.width).toBeLessThanOrEqual(banner.x + banner.width);
    expect(action.y + action.height).toBeLessThan(banner.y + banner.height);
    await page.screenshot({ path: `release-evidence/home-readability/home-${width}.png` });
    await page.getByTestId('home-deck-next').scrollIntoViewIfNeeded();
    await readable(page.getByTestId('home-deck-context'), true);
    await readable(page.getByTestId('home-deck-position'));
    await expect(page.getByTestId('home-deck-previous')).toBeInViewport();
    await expect(page.getByTestId('home-deck-next')).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `release-evidence/home-readability/deck-${width}.png` });
    await page.getByTestId('home-deck-filter').click();
    await readable(page.getByTestId('home-deck-filter-work').getByText('5枚すべて仕事術に', { exact: true }));
    await page.screenshot({ path: `release-evidence/home-readability/filter-${width}.png` });
  });
}
