import { expect, test } from '@playwright/test';

const pages = [
  ['/', 'home-scroll'],
  ['/my-os', 'my-page-scroll'],
  ['/card/master336-001', 'technique-detail-scroll'],
  ['/theory/kb_001', 'theory-detail-scroll'],
  ['/upgrade', 'upgrade-lp-scroll'],
] as const;

for (const [path, id] of pages) test(`画面下は引っ張ったときだけ伸びて戻る ${path}`, async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium specific');
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(path);

  const scroll = page.getByTestId(id).filter({ visible: true }).first();
  await expect(scroll).toBeVisible();
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
  const viewport = (await scroll.boundingBox())!;
  const end = await scroll.evaluate(node => ({
    position: node.scrollTop,
    contentBottom: node.firstElementChild!.getBoundingClientRect().bottom,
  }));
  const session = await context.newCDPSession(page);
  const x = viewport.x + viewport.width / 2;
  const visibleBottom = path === '/upgrade' ? (await page.getByTestId('upgrade-fixed-purchase').boundingBox())!.y : viewport.y + viewport.height;
  const y = visibleBottom - 35;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 18 }] });
  }
  await expect.poll(() => scroll.evaluate(node => node.firstElementChild!.getBoundingClientRect().bottom)).toBeLessThan(end.contentBottom - 85);
  expect(await scroll.boundingBox()).toEqual(viewport);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => scroll.evaluate(node => node.firstElementChild!.getBoundingClientRect().bottom)).toBeCloseTo(end.contentBottom, 0);
  expect(await scroll.evaluate(node => node.scrollTop)).toBeCloseTo(end.position, 0);
});

test('末尾の手前から指を動かし続けると、そのまま下端が伸びる', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium specific');
  await page.goto('/');
  await expect(page.getByTestId('home-deck-cover')).toBeVisible();
  const scroll = page.getByTestId('home-scroll');
  const viewport = (await scroll.boundingBox())!;
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight - node.clientHeight - 65; });
  const x = viewport.x + 24;
  const y = viewport.y + viewport.height - 35;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 12; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 18 }] });
  }
  await expect.poll(() => scroll.evaluate(node => node.firstElementChild!.getBoundingClientRect().bottom - node.getBoundingClientRect().bottom)).toBeLessThan(-40);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => scroll.evaluate(node => node.firstElementChild!.getBoundingClientRect().bottom - node.getBoundingClientRect().bottom)).toBeCloseTo(0, 0);
});

test('ホームのカード上から指を上へ動かすとページをスクロールできる', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium specific');
  await page.goto('/');
  const card = page.getByTestId('home-recommendation-card');
  await expect(card).toBeVisible();
  const cover = await card.getAttribute('aria-label');
  const box = (await card.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height * 0.72;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - step * 14 }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.getByTestId('home-scroll').evaluate(node => node.scrollTop)).toBeGreaterThan(45);
  await expect(card).toHaveAttribute('aria-label', cover!);
});
