import { expect, test, type CDPSession } from '@playwright/test';

const pages = [
  ['/', 'home-scroll'],
  ['/my-os', 'my-page-scroll'],
  ['/card/master336-001', 'technique-detail-scroll'],
  ['/theory/kb_001', 'theory-detail-scroll'],
  ['/upgrade', 'upgrade-lp-scroll'],
] as const;

async function flickUp(session: CDPSession, x: number, y: number, stepLength: number, steps: number) {
  // Supply gesture timestamps so a slow browser worker does not turn a flick into a slow drag.
  const start = Date.now() / 1000 - 0.2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', timestamp: start, touchPoints: [{ x, y }] });
  for (let step = 1; step <= steps; step++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', timestamp: start + step * 0.016, touchPoints: [{ x, y: y - step * stepLength }] });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', timestamp: start + (steps + 1) * 0.016, touchPoints: [] });
}

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

test('下端で速く指を離すと、勢いが残って少し伸びてから戻る', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium specific');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/learn');
  await expect(page.getByTestId('learning-challenge-1')).toBeVisible();
  const scroll = page.getByTestId('learn-scroll');
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await scroll.evaluate(node => {
    const content = node.firstElementChild!;
    const original = content.animate;
    content.animate = function (frames, options) {
      if (Array.isArray(frames)) {
        this.setAttribute('data-elastic-release', JSON.stringify(frames.map(frame => frame.translate)));
      }
      return original.call(this, frames, options);
    };
  });
  const viewport = (await scroll.boundingBox())!;
  const x = viewport.x + 24;
  const y = viewport.y + viewport.height - 40;
  const session = await context.newCDPSession(page);
  await flickUp(session, x, y, 25, 4);
  const content = scroll.locator(':scope > div').first();
  await expect(content).toHaveAttribute('data-elastic-release', /translate|px/);
  const frames = JSON.parse((await content.getAttribute('data-elastic-release'))!) as string[];
  const offsets = frames.map(frame => Number.parseFloat(frame.split(' ')[1]));
  expect(offsets[0]).toBeLessThan(-25);
  expect(Math.min(...offsets)).toBeLessThan(offsets[0] - 3);
  await expect.poll(() => scroll.evaluate(node => node.firstElementChild!.getBoundingClientRect().bottom - node.getBoundingClientRect().bottom)).toBeCloseTo(0, 0);
});

test('下端の手前で指を離しても、慣性で末尾まで進んでから弾む', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium specific');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/learn');
  await expect(page.getByTestId('learning-challenge-1')).toBeVisible();
  const scroll = page.getByTestId('learn-scroll');
  await scroll.evaluate(node => {
    node.scrollTop = node.scrollHeight - node.clientHeight - 210;
    node.addEventListener('touchend', () => {
      node.setAttribute('data-distance-at-release', String(node.scrollHeight - node.clientHeight - node.scrollTop));
    }, { once: true });
    const content = node.firstElementChild!;
    const original = content.animate;
    content.animate = function (frames, options) {
      if (Array.isArray(frames)) {
        this.setAttribute('data-fling-peak', String(Math.min(...frames.map(frame => Number.parseFloat(frame.translate.split(' ')[1])))));
      }
      return original.call(this, frames, options);
    };
  });
  const viewport = (await scroll.boundingBox())!;
  const x = viewport.x + 24;
  const y = viewport.y + viewport.height - 40;
  const session = await context.newCDPSession(page);
  await flickUp(session, x, y, 33, 5);
  expect(Number(await scroll.getAttribute('data-distance-at-release'))).toBeGreaterThan(20);
  await expect.poll(() => scroll.evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop)).toBeLessThan(2);
  await expect.poll(async () => Number(await scroll.locator(':scope > div').first().getAttribute('data-fling-peak'))).toBeLessThan(-10);
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
