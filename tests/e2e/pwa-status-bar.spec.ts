import { expect, test } from '@playwright/test';

test('ホーム画面追加用の上部設定は不透明で、色の補助要素は操作を遮らない', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute('content', 'default');
  const strip = page.locator('#roku-status-bar-background');
  await expect(strip).toHaveCSS('height', '11px');
  await expect(strip).toHaveCSS('background-clip', 'text');
  await expect(strip).toHaveCSS('background-color', 'rgb(255, 253, 248)');
  await expect(strip).toHaveCSS('pointer-events', 'none');
  await expect(page.locator('#roku-launch')).toBeHidden();
  const intercepts = await page.evaluate(() => document.elementFromPoint(innerWidth / 2, 4)?.id === 'roku-status-bar-background');
  expect(intercepts).toBe(false);
  await page.getByRole('button', { name: '検索', exact: true }).click();
  await expect(page).toHaveURL(/\/search/);
});

test('ホーム起動でも画面全体の高さを使わず、システムバーを除く領域にヘッダーとナビが収まる', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 393, height: 793 }, screen: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  try {
    await context.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
    const page = await context.newPage();
    await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
    for (const route of ['/', '/theories']) {
      await page.goto(route);
      for (const height of [793, 500, 793]) {
        await page.setViewportSize({ width: 393, height });
        await expect(page.locator('#root')).toHaveCSS('height', `${height}px`);
        const header = await page.getByTestId('book-header').boundingBox();
        const nav = await page.getByTestId('persistent-bottom-navigation').boundingBox();
        expect(header!.y).toBeGreaterThanOrEqual(0);
        expect(nav!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
        expect(nav!.y + nav!.height).toBeLessThanOrEqual(height + 1);
        expect(nav!.y + nav!.height).toBeGreaterThanOrEqual(height - 1);
      }
    }
  } finally {
    await context.close();
  }
});
