import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 404, json: {} }));
});
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
};
const metrics = (page: Page) => page.getByTestId('home-scroll').evaluate(scroll => {
  const section = scroll.querySelector('[data-testid="home-recommendations-section"]')!;
  const box = scroll.getBoundingClientRect();
  return { y: scroll.scrollTop, target: section.getBoundingClientRect().top - box.top + scroll.scrollTop, height: scroll.clientHeight, maximum: scroll.scrollHeight - scroll.clientHeight };
});
const moveTo = (page: Page, y: number) => page.getByTestId('home-scroll').evaluate((scroll, y) => { scroll.scrollTop = y; }, y);
const aligned = async (page: Page) => {
  await expect.poll(async () => { const m = await metrics(page); return Math.abs(m.y - m.target); }).toBeLessThan(3);
};

for (const width of [375, 390, 430]) {
  test(`スマホは最下段のデッキへ自然に揃い、上へのスクロールを妨げない (${width}px)`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await ready(page);
    await expect.poll(async () => (await metrics(page)).y).toBe(0);
    const m = await metrics(page);
    expect(Math.abs(m.maximum - m.target)).toBeLessThan(3);
    // A distant scroll position is not pulled into the deck.
    await moveTo(page, Math.max(0, m.target - 240));
    await page.waitForTimeout(500);
    expect(Math.abs((await metrics(page)).y - Math.max(0, m.target - 240))).toBeLessThan(2);
    await page.mouse.move(width / 2, 360);
    // Playwright cannot synthesize a wheel in mobile WebKit.
    if (browserName === 'webkit') await moveTo(page, m.target - 110);
    else await page.mouse.wheel(0, 130);
    await aligned(page);
    const card = (await page.getByTestId('home-recommendation-card').boundingBox())!;
    const next = (await page.getByTestId('home-deck-next').boundingBox())!;
    const nav = (await page.getByTestId('persistent-bottom-navigation').boundingBox())!;
    expect(card.y).toBeGreaterThan(0);
    expect(card.y + card.height).toBeLessThan(next.y);
    expect(next.y + next.height).toBeLessThan(nav.y);
    expect(nav.y - next.y - next.height).toBeLessThan(55);
    await page.screenshot({ path: `release-evidence/home-scroll/deck-${width}.png` });
    if (browserName === 'webkit') await moveTo(page, m.target - 90);
    else await page.mouse.wheel(0, -90);
    await page.waitForTimeout(650);
    expect(Math.abs((await metrics(page)).y - (m.target - 90))).toBeLessThan(2);
    await moveTo(page, 0);
    await expect(page.getByTestId('home-brand-viewport')).toBeInViewport();
  });
}

test('処世術・理論の詳細から同じカードと見やすい位置へ戻り、上部の導線は元の位置に戻る', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page);
  for (const kind of ['interpersonal', 'theory']) {
    await moveTo(page, (await metrics(page)).target);
    await page.getByTestId('home-deck-filter').click();
    await page.getByTestId(`home-deck-filter-${kind}`).click();
    await ready(page);
    await page.getByTestId('home-deck-next').click();
    await ready(page);
    const title = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
    await page.waitForTimeout(360);
    await page.getByTestId('home-recommendation-card').click();
    await expect(page).toHaveURL(kind === 'theory' ? /\/theory\// : /\/card\//);
    if (kind === 'theory') await page.getByRole('button', { name: '前の画面へ戻る' }).click();
    else await page.goBack();
    await ready(page);
    await aligned(page);
    await expect(page.getByTestId('home-recommendation-card')).toHaveAttribute('aria-label', title!);
    await expect(page.getByTestId('home-deck-position')).toContainText('02');
  }
  await moveTo(page, 0);
  await page.getByTestId('home-shortcut-personas').click();
  await expect(page).toHaveURL(/\/personas/);
  await page.goBack();
  await ready(page);
  await page.waitForTimeout(400);
  expect((await metrics(page)).y).toBeLessThan(3);
});

test('短い画面でも操作部までスクロールでき、画面高が変わってもデッキを見失わない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto('/');
  await ready(page);
  await moveTo(page, (await metrics(page)).target - 70);
  await aligned(page);
  await moveTo(page, (await metrics(page)).maximum);
  await page.waitForTimeout(600);
  const m = await metrics(page);
  expect(Math.abs(m.y - m.maximum)).toBeLessThan(3);
  await expect(page.getByTestId('home-deck-next')).toBeInViewport();
  await page.getByTestId('home-deck-next').click();
  await ready(page);
  await moveTo(page, m.target);
  await aligned(page);
  await page.setViewportSize({ width: 390, height: 932 });
  await aligned(page);
  await expect.poll(async () => { const resized = await metrics(page); return Math.abs(resized.maximum - resized.target); }).toBeLessThan(3);
  await aligned(page);
  await expect(page.getByTestId('home-deck-next')).toBeInViewport();
});

test('指を置いている間は位置を動かさず、離してからデッキを揃える', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input requires Chromium');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await ready(page);
  const target = (await metrics(page)).target;
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 50, y: 350 }] });
  await moveTo(page, target - 110);
  await page.waitForTimeout(500);
  expect(Math.abs((await metrics(page)).y - (target - 110))).toBeLessThan(2);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await aligned(page);
  await touch.detach();
});

for (const width of [768, 1440]) {
  test(`タブレット・PCの自由なスクロールと既存レイアウトを維持 (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await ready(page);
    const m = await metrics(page);
    const position = Math.min(m.target - 80, m.maximum);
    await moveTo(page, position);
    await page.waitForTimeout(650);
    expect(Math.abs((await metrics(page)).y - position)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `release-evidence/home-scroll/home-${width}.png` });
  });
}
