import { test, expect } from '@playwright/test';
import articles from './fixtures/feature-thumbnails.json';

test('公開中6記事に別々のサムネイルを表示し、狭い画面でも文字と画像が収まる', async ({ page }) => {
  test.setTimeout(60_000);
  await page.route('**/rest/v1/**', route => route.fulfill({ status: route.request().url().includes('/feature_articles') ? 200 : 503, json: route.request().url().includes('/feature_articles') ? articles : {} }));
  for (const width of [320, 390, 700, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('/features');
    const thumbnails = page.getByTestId('feature-thumbnail');
    await expect(thumbnails).toHaveCount(5);
    await expect(page.locator('#roku-launch')).toBeHidden();
    const sources = [await page.getByTestId('features-hero').locator('img').first().getAttribute('src')];
    for (const thumbnail of await thumbnails.all()) {
      const image = thumbnail.locator('img');
      await expect(image).toHaveJSProperty('complete', true);
      expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(100);
      sources.push(await image.getAttribute('src'));
      const headline = thumbnail.getByTestId('feature-thumbnail-headline');
      await expect(headline).toBeVisible();
      const frame = await thumbnail.boundingBox();
      const text = await headline.boundingBox();
      expect(text!.x).toBeGreaterThanOrEqual(frame!.x);
      expect(text!.x + text!.width).toBeLessThanOrEqual(frame!.x + frame!.width);
      expect(text!.y + text!.height).toBeLessThanOrEqual(frame!.y + frame!.height);
    }
    expect(new Set(sources).size).toBe(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath(`thumbnails-${width}.png`), fullPage: true });
  }
});

test('CMSで差し替えた写真とタイトルを優先し、古い見出しを重ねない', async ({ page }) => {
  const revised = articles.map((article, index) => index === 0 ? { ...article, image_path: 'bundled:feature-mountain' } : index === 1 ? { ...article, title: '編集後の見出し' } : article);
  await page.route('**/rest/v1/**', route => route.fulfill({ status: route.request().url().includes('/feature_articles') ? 200 : 503, json: route.request().url().includes('/feature_articles') ? revised : {} }));
  await page.goto('/features');
  await expect(page.getByTestId('feature-thumbnail')).toHaveCount(5);
  await expect(page.getByTestId('feature-thumbnail-headline')).toHaveCount(4);
  await expect(page.getByTestId('features-hero').locator('img').first()).toHaveAttribute('src', /mountain/);
  await expect(page.getByRole('link', { name: '編集後の見出しを読む', exact: true })).toBeVisible();
});
