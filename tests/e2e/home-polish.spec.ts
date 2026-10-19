import { expect, test } from '@playwright/test';

test('ホームリールは画面の横幅いっぱいに表示しページ位置の点を控えめにする', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const viewport = page.getByTestId('home-brand-viewport');
    await expect(viewport).toBeVisible();
    await expect(async () => {
      const box = (await viewport.boundingBox())!;
      expect(Math.abs(box.x)).toBeLessThan(1);
      expect(Math.abs(box.width - width)).toBeLessThan(1);
      const header = (await page.getByTestId('book-header').boundingBox())!;
      expect(Math.abs(box.y - header.y - header.height)).toBeLessThan(1);
    }).toPass();
    const indicators = page.getByTestId('home-brand-indicators');
    const indicatorBox = (await indicators.boundingBox())!;
    expect(indicatorBox.width).toBeLessThanOrEqual(110);
    expect(indicatorBox.height).toBeLessThanOrEqual(16);
    await expect(indicators.getByRole('tab')).toHaveCount(7);
    for (let index = 1; index <= 7; index++) {
      await indicators.getByRole('tab', { name: `${index}枚目を表示`, exact: true }).click();
      await expect(indicators.getByRole('tab', { name: `${index}枚目を表示`, exact: true })).toHaveAttribute('aria-selected', 'true');
      const slide = page.getByTestId(`home-brand-slide-${index}`);
      expect(await slide.evaluate(el => getComputedStyle(el).borderTopLeftRadius)).toBe('0px');
      for (const dot of await page.getByTestId('home-brand-indicator-dot').all()) {
        const box = (await dot.boundingBox())!;
        expect(box.height).toBeLessThanOrEqual(3);
        expect(box.width).toBeLessThanOrEqual(8);
      }
    }
    await indicators.getByRole('tab', { name: '1枚目を表示', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`full-width-home-${width}.png`) });
  }
});

test('完全版の価格は詳しく見るの左に並び、スマホの画像を白く覆わない', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const row = page.getByTestId('home-premium-action-row');
    const price = row.getByTestId('home-premium-price');
    const cta = row.getByText('詳しく見る →');
    await expect(row).toBeVisible();
    const [a, b] = await Promise.all([price.boundingBox(), cta.boundingBox()]);
    expect(a!.x + a!.width).toBeLessThanOrEqual(b!.x);
    expect(Math.abs(a!.y + a!.height / 2 - b!.y - b!.height / 2)).toBeLessThan(3);
    const headingBox = await page.getByTestId('home-premium-heading').boundingBox();
    const taglineBox = await page.getByTestId('home-premium-tagline').boundingBox();
    expect(headingBox!.y + headingBox!.height).toBeLessThanOrEqual(taglineBox!.y + 1);
    expect(taglineBox!.y + taglineBox!.height).toBeLessThanOrEqual(a!.y + 1);
    const copy = page.getByTestId('home-premium-heading').locator('../..');
    expect(await copy.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('リール7枚は画像や余白を押しても開き、地図内の理論リンクも保持する', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const destinations = [/\/card\//, /\/subcategory\//, /\/theory\//, /\/card\//, /\/personas$/, /\/upgrade\?source=home_carousel/, /\/learn$/];
  for (let index = 1; index <= 7; index++) {
    await page.goto('/');
    await page.getByRole('tab', { name: `${index}枚目を表示`, exact: true }).click();
    const slide = page.getByTestId(`home-brand-slide-${index}`);
    await expect(slide).toHaveAttribute('role', 'link');
    await slide.click({ position: { x: 8, y: 8 } });
    await expect(page).toHaveURL(destinations[index - 1]);
  }
  await page.goto('/');
  await page.getByRole('tab', { name: '4枚目を表示', exact: true }).click();
  await page.getByTestId('home-brand-map-theory-1').click();
  await expect(page).toHaveURL(/\/theory\//);
});

test('販売者氏名は末尾に通常表示し、冒頭リンクから直接到達できる', async ({ page }) => {
  for (const document of ['terms', 'commerce']) {
    await page.goto(`/legal/${document}`);
    const seller = page.getByTestId('legal-seller-details');
    await expect(seller).toContainText('大南翼');
    expect(await seller.evaluate(el => el.nextElementSibling?.getAttribute('data-testid') ?? null)).not.toBe('legal-section');
    expect(await page.getByTestId('legal-section').first().textContent()).not.toContain('大南翼');
    const jump = page.getByTestId('legal-seller-jump');
    await expect(jump).toBeVisible();
    await jump.click();
    await expect(seller.getByText(/運営者・販売事業者：/)).toBeInViewport();
    expect(await seller.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  }
});
