import { expect, test, type Page } from '@playwright/test';

const storageKey = '@shoseijutsu-roku/discovery-deck/v1/free';
const state = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
};
const swipe = async (page: Page, reverse: boolean) => {
  const card = page.getByTestId('home-recommendation-card');
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  const left = box.x + 40, right = box.x + box.width - 40;
  await page.mouse.move(reverse ? left : right, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(reverse ? right : left, box.y + 103, { steps: 14 });
  await page.mouse.up();
  await ready(page);
};

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

test('a fresh mobile deck cycles backwards, restores its position and reverses after shuffle/filter changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);
  const first = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
  const initial = await state(page);
  expect(initial.cursor).toBe(0);

  // A short reverse drag at the first card cancels without opening the card.
  const card = page.getByTestId('home-recommendation-card');
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 68, box.y + 102, { steps: 10 });
  const bottomX = () => page.locator('#home-deck-slot-4').evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m41);
  await expect.poll(bottomX).toBeLessThan(0);
  await page.waitForTimeout(120);
  await page.mouse.up();
  await expect.poll(bottomX).toBeCloseTo(15, 0);
  expect((await state(page)).cursor).toBe(0);

  await swipe(page, true);
  await expect.poll(async () => (await state(page)).cursor).toBe(4);
  const last = await card.getAttribute('aria-label');
  expect(last).not.toBe(first);
  expect((await state(page)).order).toEqual(initial.order);
  await page.screenshot({ path: test.info().outputPath('mobile-reverse-from-first.png') });
  await page.reload();
  await ready(page);
  await expect(card).toHaveAttribute('aria-label', last!);
  for (const cursor of [3, 2, 1, 0]) {
    await swipe(page, true);
    await expect.poll(async () => (await state(page)).cursor).toBe(cursor);
    expect((await state(page)).offset).toBeGreaterThanOrEqual(0);
  }
  await expect(card).toHaveAttribute('aria-label', first!);
  await swipe(page, false);
  await expect.poll(async () => (await state(page)).cursor).toBe(1);
  await swipe(page, true);
  await expect.poll(async () => (await state(page)).cursor).toBe(0);

  await page.getByTestId('home-discovery-refresh').click();
  await ready(page);
  const shuffled = await state(page);
  expect(shuffled.cursor).toBe(0);
  await swipe(page, true);
  await expect.poll(async () => (await state(page)).cursor).toBe(4);
  expect((await state(page)).order).toEqual(shuffled.order);

  await page.getByTestId('home-deck-filter').click();
  await page.getByTestId('home-deck-filter-life').click();
  await ready(page);
  await expect.poll(async () => (await state(page)).filter).toBe('life');
  await expect.poll(async () => (await state(page)).cursor).toBe(0);
  await swipe(page, true);
  await expect.poll(async () => (await state(page)).cursor).toBe(4);
  await expect(card.getByText('人生術', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('desktop buttons and keyboard wrap from the first card with reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);
  const first = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
  const previous = page.getByTestId('home-deck-previous');
  await expect(previous).toBeEnabled();
  await previous.click();
  await ready(page);
  await expect.poll(async () => (await state(page)).cursor).toBe(4);
  await page.getByTestId('home-deck-next').click();
  await ready(page);
  await expect.poll(async () => (await state(page)).cursor).toBe(0);
  await page.getByTestId('home-recommendation-deck').focus();
  for (const cursor of [4, 3, 2, 1, 0, 4]) {
    await page.keyboard.press('ArrowLeft');
    await ready(page);
    await expect.poll(async () => (await state(page)).cursor).toBe(cursor);
  }
  await page.keyboard.press('ArrowRight');
  await ready(page);
  await expect(page.getByTestId('home-recommendation-card')).toHaveAttribute('aria-label', first!);
});


