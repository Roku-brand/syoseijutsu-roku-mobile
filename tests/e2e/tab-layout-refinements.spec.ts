import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

test('four tabs share one continuous header and status-area background', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  let headerHeight = 0;
  for (const label of ['ホーム', '探す', '学ぶ', 'マイページ']) {
    await page.getByTestId('persistent-bottom-navigation').getByRole('link', { name: label, exact: true }).click();
    const safe = page.getByTestId('book-header-safe-area');
    await expect(safe).toHaveCSS('background-color', 'rgb(247, 240, 228)');
    await expect(page.getByTestId('book-header')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const shell = (await safe.boundingBox())!;
    const landscape = (await page.getByTestId('home-header-landscape').boundingBox())!;
    expect(landscape.y).toBe(shell.y);
    expect(landscape.height).toBe(shell.height);
    expect(await page.locator('meta[name="theme-color"]').getAttribute('content')).toBe('#F7F0E4');
    const height = (await page.getByTestId('book-header').boundingBox())!.height;
    if (headerHeight) expect(height).toBe(headerHeight);
    headerHeight = height;
  }
});

for (const width of [320, 390, 1440]) {
  test(`deck selection uses the principles popup and the editorial section ends without extra space (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
    await page.getByTestId('home-deck-filter').click();
    const popup = page.getByTestId('home-deck-filter-popup');
    await expect(popup).toBeVisible();
    await expect(popup.getByRole('heading', { name: 'デッキを選ぶ' })).toBeVisible();
    const box = (await popup.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    if (width < 1000) expect(box.y + box.height).toBeCloseTo(700, 0);
    await page.getByTestId('home-deck-filter-work').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('home-deck-filter-work')).toContainText('仕事の進め方を、ひとつの人物像から');
    await page.screenshot({ path: test.info().outputPath('deck-popup.png') });
    await page.getByTestId('home-deck-filter-work').click();
    await expect(popup).toHaveCount(0);
    await expect(page.getByTestId('home-deck-layer')).toHaveCount(5);
    await page.getByTestId('home-shortcut-principles').click();
    await expect(page.getByRole('heading', { name: '処世術の五大原則' })).toBeVisible();
    await page.getByRole('button', { name: '原則を閉じる' }).last().click();
    await page.getByTestId('home-scroll').evaluate(node => { node.scrollTop = node.scrollHeight; });
    const rail = (await page.getByTestId('home-editorial-rail').boundingBox())!;
    const cards = page.getByTestId('home-editorial-card').or(page.getByTestId('home-editorial-fallback'));
    const card = (await cards.first().boundingBox())!;
    expect(rail.height - card.height).toBeLessThanOrEqual(12);
    const scroll = page.getByTestId('home-scroll');
    const contentBottom = await scroll.evaluate(node => node.firstElementChild!.getBoundingClientRect().bottom);
    const gap = contentBottom - (card.y + card.height);
    expect(gap).toBeLessThanOrEqual(32);
    await page.screenshot({ path: test.info().outputPath('editorial-bottom.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('guest settings show one account link and a preview of the active theme', async ({ page }) => {
  await page.goto('/settings');
  const theme = page.getByRole('button', { name: /^背景テーマ/ });
  await expect(theme).toBeVisible();
  const titles = await theme.evaluate(node => Array.from(node.parentElement!.children).map(child => child.textContent));
  expect(titles).toHaveLength(3);
  expect(titles[0]).toContain('アカウント作成・ログイン');
  expect(titles[1]).toContain('完全版');
  expect(titles[2]).toContain('背景テーマ');
  const before = await theme.locator('img').getAttribute('src');
  expect(before).toBeTruthy();
  await page.getByRole('button', { name: 'アカウント作成・ログイン', exact: false }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await page.getByRole('button', { name: /新規登録はこちら/ }).click();
  await expect(page.getByRole('checkbox', { name: '利用規約とプライバシーポリシーを確認して同意する' })).toBeVisible();
  await page.goBack();
  await theme.click();
  await expect(page).toHaveURL(/\/settings\/background$/);
  await page.getByRole('radio', { name: '春の梅', exact: true }).click();
  await page.getByTestId('book-header-back').click();
  await expect(theme.locator('img')).not.toHaveAttribute('src', before!);
});
