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
  test(`${title} は横ドラッグに追従し、ページをめくって前後に移動する`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(from);
    await expect(page.locator('#roku-launch')).toBeHidden();
    const sheet = page.getByTestId('detail-page-sheet');
    const rotation = () => sheet.evaluate(node => {
      const transform = getComputedStyle(node).transform;
      return transform === 'none' ? 0 : new DOMMatrix(transform).m13;
    });
    await expect(page.getByTestId(title)).toBeVisible();

    await drag(page, title, -42);
    await expect.poll(rotation).toBeGreaterThan(0.05);
    await page.mouse.up();
    await expect.poll(rotation).toBe(0);
    await expect(page).toHaveURL(from);

    await drag(page, title, -158);
    await expect.poll(rotation).toBeGreaterThan(0.15);
    await page.mouse.up();
    await expect(page).toHaveURL(to);
    await expect.poll(rotation).toBe(0);

    await drag(page, title, 158);
    await expect.poll(rotation).toBeLessThan(-0.15);
    await page.mouse.up();
    await expect(page).toHaveURL(from);
    await expect.poll(rotation).toBe(0);
  });
}

test('動きを減らす設定ではページを回転せず、横スワイプで移動できる', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/card/master336-001');
  await expect(page.locator('#roku-launch')).toBeHidden();
  await expect(page.getByTestId('technique-detail-title')).toBeVisible();
  await drag(page, 'technique-detail-title', -148);
  await expect(page.getByTestId('detail-page-sheet')).toHaveCSS('transform', 'none');
  await page.mouse.up();
  await expect(page).toHaveURL('/card/master336-002');
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
