import { expect, test, type Page } from '@playwright/test';

const state = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('@shoseijutsu-roku/discovery-deck/v1/free')!));
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
};

test('short symmetric drags wrap and shuffle does not move the page, even during a turn', async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);
  const card = page.getByTestId('home-recommendation-card');
  const drag = async (direction: number) => {
    const box = (await card.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + direction * box.width * .2, box.y + 104, { steps: 8 });
    await page.waitForTimeout(120);
    await page.mouse.up();
  };
  const initial = (await state(page)).cursor;
  await drag(-1);
  await ready(page);
  await expect.poll(async () => (await state(page)).cursor).toBe((initial + 1) % 6);
  await drag(1);
  await ready(page);
  await expect.poll(async () => (await state(page)).cursor).toBe(initial);

  const scroll = page.getByTestId('home-scroll');
  await scroll.evaluate(node => { node.scrollTop = 75; });
  const measure = () => scroll.evaluate(node => ({ top: node.scrollTop, section: node.querySelector('[data-testid="home-recommendations-section"]')!.getBoundingClientRect().top }));
  const before = await measure();
  await page.getByTestId('home-discovery-refresh').evaluate((button: HTMLElement) => { button.click(); button.click(); button.click(); });
  await expect.poll(async () => (await state(page)).round, { timeout: 6000 }).toBeGreaterThanOrEqual(2);
  await ready(page);
  expect(Math.abs((await measure()).top - before.top)).toBeLessThan(1);
  expect(Math.abs((await measure()).section - before.section)).toBeLessThan(1);
  await drag(-1);
  await page.getByTestId('home-discovery-refresh').evaluate((button: HTMLElement) => button.click());
  await ready(page);
  expect(Math.abs((await measure()).top - before.top)).toBeLessThan(1);
  expect(Math.abs((await measure()).section - before.section)).toBeLessThan(1);
});

test('touch gestures lock horizontal movement while vertical movement scrolls', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium-specific');
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await ready(page);
  const scroll = page.getByTestId('home-scroll');
  await scroll.evaluate(node => { node.scrollTop = 100; });
  const box = (await page.getByTestId('home-recommendation-card').boundingBox())!;
  const session = await page.context().newCDPSession(page);
  const gesture = async (dx: number, dy: number) => {
    const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + 150);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 10; i++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 10, y: y + dy * i / 10 }] });
      await page.waitForTimeout(20);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const initial = await scroll.evaluate(node => node.scrollTop);
  const cursor = (await state(page)).cursor;
  await gesture(-90, -25);
  await ready(page);
  await expect.poll(async () => (await state(page)).cursor).toBe((cursor + 1) % 6);
  expect(Math.abs(await scroll.evaluate(node => node.scrollTop) - initial)).toBeLessThan(5);
  await gesture(5, -100);
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(initial + 30);
});
