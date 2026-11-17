import { turnDeck, expectDeckCursor } from './deck-helpers';
import { expect, test } from '@playwright/test';

const preference = '@shoseijutsu-roku/home-background/v1';
const deckKey = '@shoseijutsu-roku/discovery-deck/v1/free';
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

test('background changes persist while the current hand, saved state and other screens stay intact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await turnDeck(page);
  await expectDeckCursor(page, 1);
  const old = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), deckKey);
  const card = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
  const saved = await page.getByTestId('home-deck-save').getAttribute('aria-pressed');
  await page.getByTestId('settings-header-action').click();
  await page.getByRole('button', { name: /背景テーマ/ }).click();
  await expect(page).toHaveURL(/\/settings\/background$/);
  await expect(page.getByRole('radio')).toHaveCount(4);
  for (const id of ['plum', 'seigaiha', 'wisteria', 'moon-maple']) {
    await page.getByTestId(`background-theme-${id}`).click();
    await expect(page.getByTestId(`background-theme-${id}`)).toHaveAttribute('aria-checked', 'true');
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), preference)).toBe(id);
  }
  await page.getByTestId('background-theme-wisteria').click();
  await page.reload();
  await expect(page.getByTestId('background-theme-wisteria')).toHaveAttribute('aria-checked', 'true');
  await page.goto('/');
  await expect(page.getByTestId('home-theme-background')).toHaveAttribute('aria-label', '藤の余韻');
  await expect(page.getByTestId('book-header-safe-area')).toHaveCSS('background-color', 'rgb(247, 240, 228)');
  await expect(page.getByTestId('home-header-landscape')).toHaveCount(1);
  await expect(page.getByTestId('home-recommendation-card')).toHaveAttribute('aria-label', card!);
  await expect(page.getByTestId('home-deck-save')).toHaveAttribute('aria-pressed', saved!);
  const current = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), deckKey);
  expect(current.order).toEqual(old.order);
  expect(current.round).toBe(old.round);
  expect(current.cursor).toBe(old.cursor);
  await page.goto('/theories');
  await expect(page.getByTestId('book-header')).toHaveCSS('background-color', 'rgb(255, 253, 248)');
  await expect(page.locator('#roku-status-bar-background')).toHaveCSS('background-color', 'rgb(255, 253, 248)');
});

test('home header keeps its paper landscape and a downward pull does not expose a gap', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  const scroll = page.getByTestId('home-scroll');
  await expect(scroll).toHaveCSS('overscroll-behavior-y', 'none');
  const header = page.getByTestId('book-header');
  await expect(page.getByTestId('book-header-safe-area')).toHaveCSS('background-color', 'rgb(247, 240, 228)');
  await expect(header.getByText('処世術禄', { exact: true })).toHaveCSS('color', 'rgb(23, 23, 18)');
  await expect(page.locator('#roku-status-bar-background')).toHaveCSS('background-color', 'rgb(247, 240, 228)');
  const session = await context.newCDPSession(page);
  const y = (await header.boundingBox())!.height + 35;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 70, y }] });
  for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 70, y: y + i * 15 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await scroll.evaluate(node => node.scrollTop)).toBe(0);
  const top = (await page.getByTestId('home-recommendations-section').boundingBox())!.y;
  const box = (await header.boundingBox())!;
  expect(top).toBeCloseTo(box.y + box.height, 0);
});

test('an invalid saved background falls back to moon and maple', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, 'removed-theme'), preference);
  await page.goto('/');
  await expect(page.getByTestId('home-theme-background')).toHaveAttribute('aria-label', '月夜と紅葉');
});

test('standard iPhone keeps the reading card large and scrolls to an unobscured editorial shelf', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  const editorial = (await page.getByTestId('home-editorial-section').boundingBox())!;
  const navigation = (await page.getByTestId('persistent-bottom-navigation').boundingBox())!;
  expect((await page.getByTestId('home-deck-front').boundingBox())!.height).toBeGreaterThanOrEqual(306);
  const banner = (await page.getByTestId('home-premium-banner').boundingBox())!;
  expect(editorial.y).toBeGreaterThan(banner.y + banner.height);
  await page.getByTestId('home-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(page.getByRole('heading', { name: '編集部の特集', exact: true })).toBeInViewport();
  const rail = (await page.getByTestId('home-editorial-rail').boundingBox())!;
  expect(rail.y + rail.height).toBeLessThanOrEqual(navigation.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

