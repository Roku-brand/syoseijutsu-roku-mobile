import { expect, test, type Page } from '@playwright/test';

const details = [
  { from: '/card/master336-001', to: '/card/master336-002', title: 'technique-detail-title' },
  { from: '/theory/kb_001', to: '/theory/kb_002', title: 'theory-title' },
];

async function drag(page: Page, testId: string, dx: number, dy = 0) {
  const box = (await page.getByTestId(testId).boundingBox())!;
  const x = box.x + box.width * (dx < 0 ? 0.76 : 0.24);
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 9 });
}

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.setViewportSize({ width: 390, height: 844 });
});

for (const { from, to, title } of details) {
  test(`${title} は紙の下に移動先を表示し、短いドラッグでは元に戻る`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(from);
    await expect(page.locator('#roku-launch')).toBeHidden();
    const sheet = page.getByTestId('detail-page-sheet');
    const underlay = page.getByTestId('detail-page-underlay');
    const offset = () => sheet.evaluate(node => {
      const transform = getComputedStyle(node).transform;
      return transform === 'none' ? 0 : new DOMMatrix(transform).m41;
    });
    const heading = page.getByTestId(title);
    await expect(heading).toBeVisible();
    const originalHeading = await heading.innerText();
    const originalX = (await heading.boundingBox())!.x;

    await drag(page, title, -42);
    await expect.poll(offset).toBeLessThan(-28);
    await expect(page.getByTestId('detail-page-curl')).toBeVisible();
    await page.mouse.up();
    await expect(underlay).toHaveCount(0);
    await expect(page).toHaveURL(from);

    await drag(page, title, -158);
    await expect.poll(offset).toBeLessThan(-110);
    await expect.poll(async () => (await heading.boundingBox())!.x).toBeCloseTo(originalX, 0);
    const nextHeading = await underlay.getByRole('heading', { level: 1, includeHidden: true }).innerText();
    expect(nextHeading).not.toBe(originalHeading);
    await expect(page).toHaveURL(from);
    await page.mouse.up();
    await expect(page).toHaveURL(to);
    await expect(heading).toHaveText(nextHeading);
    await expect(underlay).toHaveCount(0);

    await drag(page, title, 158);
    await expect.poll(offset).toBeGreaterThan(110);
    await expect(underlay.getByRole('heading', { level: 1, includeHidden: true })).toHaveText(originalHeading);
    await page.mouse.up();
    await expect(page).toHaveURL(from);
    await expect(underlay).toHaveCount(0);
  });
}

test('動きを減らす設定でも横スワイプで移動できる', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/card/master336-001');
  await expect(page.locator('#roku-launch')).toBeHidden();
  await expect(page.getByTestId('technique-detail-title')).toBeVisible();
  await drag(page, 'technique-detail-title', -148);
  await expect(page.getByTestId('detail-page-curl')).toHaveCount(0);
  await expect(page.getByTestId('detail-page-sheet')).toHaveCSS('transform', 'none');
  await page.mouse.up();
  await expect(page).toHaveURL('/card/master336-002');
});

test('詳細画面の左端からのスワイプでは戻らない', async ({ page, browserName }) => {
  const cancelledTouch = async (x: number) => {
    await page.evaluate(() => document.addEventListener('touchstart', event => {
      document.body.dataset.cancelledTouch = String(event.defaultPrevented);
    }, { once: true, capture: true }));
    await page.touchscreen.tap(x, 160);
    return page.locator('body').getAttribute('data-cancelled-touch');
  };
  await page.goto('/');
  await expect(page.locator('#roku-launch')).toBeHidden();
  expect(await cancelledTouch(4)).toBe('false');
  await page.goto('/card/master336-001');
  await expect(page.locator('#roku-launch')).toBeHidden();
  expect(await cancelledTouch(4)).toBe('true');
  expect(await cancelledTouch(64)).toBe('false');
  if (await page.evaluate(() => CSS.supports('overscroll-behavior-x', 'none'))) {
    await expect(page.locator('html')).toHaveCSS('overscroll-behavior-x', 'none');
  }
  const cdp = browserName === 'chromium' ? await page.context().newCDPSession(page) : null;
  if (cdp) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 4, y: 160 }] });
    for (let step = 1; step <= 8; step += 1) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 4 + step * 24, y: 160 }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(4, 160);
    await page.mouse.down();
    await page.mouse.move(196, 160, { steps: 8 });
    await page.mouse.up();
  }
  await expect(page.getByTestId('detail-page-underlay')).toHaveCount(0);
  await expect(page).toHaveURL('/card/master336-001');
  await page.getByTestId('book-header-back').click();
  await expect(page).not.toHaveURL('/card/master336-001');
  expect(await cancelledTouch(4)).toBe('false');
});

test('スマホのタッチで縦に読め、横へスワイプすると次のページへ移る', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium specific');
  await page.goto('/card/master336-001');
  await expect(page.locator('#roku-launch')).toBeHidden();
  const scroll = page.getByTestId('technique-detail-scroll');
  await expect(scroll).toBeVisible();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 214, y: 580 }] });
  for (let step = 1; step <= 8; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 214, y: 580 - step * 22 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(50);
  await expect(page).toHaveURL('/card/master336-001');
  await expect(page.getByTestId('detail-page-sheet')).toHaveCSS('transform', 'none');

  const title = (await page.getByTestId('technique-detail-title').boundingBox())!;
  const y = title.y + title.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 310, y }] });
  for (let step = 1; step <= 8; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 310 - step * 22, y }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page).toHaveURL('/card/master336-002');
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBe(0);
});
