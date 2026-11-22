import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const features = JSON.parse(fs.readFileSync('content/features/manifest.json', 'utf8')).map((row: any, index: number) => ({
  ...row, title: index === 0 ? '検索で見つかる特集' : row.title, lead: '特集の導入文', body: index === 0 ? '本文だけの検証語を含む記事です。' : '別の記事本文',
  status: 'published', updated_at: '2026-10-15T00:00:00Z', related_technique_ids: [], related_theory_ids: [], related_feature_ids: [], source_references: [], editorial_character_id: null,
}));
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => {
    if (new URL(route.request().url()).pathname.endsWith('/feature_articles')) return route.fulfill({ json: [...features, { ...features[0], id: 'draft-search', slug: 'draft-search', title: '下書き特集', status: 'draft' }] });
    return route.fulfill({ status: 503, json: {} });
  });
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

test('ヘッダー検索は探すタブに切り替え、検索欄に入力できる', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByTestId('book-header').getByRole('button', { name: '検索', exact: true }).click();
  await expect(page).toHaveURL(/\/discover$/);
  const input = page.getByTestId('discover-search-input');
  await expect(input).toBeFocused();
  await expect(page.getByTestId('persistent-bottom-navigation').getByRole('link', { name: /^探す/ })).toHaveAttribute('aria-current', 'page');
  await input.fill('  初頭効果  ');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/search\?/);
  expect(new URL(page.url()).searchParams.get('q')).toBe('初頭効果');
  await page.getByRole('tab', { name: '理論', exact: true }).click();
  await expect(page.getByTestId('search-page-results')).toContainText('初頭効果');
  await expect(page.getByRole('tab')).toHaveCount(3);
});

for (const width of [320, 390]) test(`狭い画面で検索欄はズームせず、探すにいる場合は先頭に戻る (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto('/discover');
  const scroll = page.getByTestId('discover-scroll');
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
  const input = page.getByTestId('discover-search-input');
  await expect(input).not.toBeFocused();
  await page.getByTestId('book-header').getByRole('button', { name: '検索', exact: true }).tap();
  await expect(input).toBeFocused();
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBe(0);
  expect(await input.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(() => [window.visualViewport?.scale, window.scrollY])).toEqual([1, 0]);
  await page.setViewportSize({ width, height: 470 });
  await expect(input).toBeFocused();
  await expect(input).toBeInViewport();
  await expect(page.getByTestId('persistent-bottom-navigation')).toBeInViewport();
  await input.fill('聞き上手');
  await input.press('Enter');
  await expect(page.getByTestId('search-page-results')).toBeVisible();
});

test('理論一覧のヘッダーからも探すの検索欄に移り、理論を検索する', async ({ page }) => {
  await page.goto('/theories');
  await page.getByRole('button', { name: '理論一覧を検索', exact: true }).click();
  await expect(page).toHaveURL(/\/discover$/);
  const input = page.getByTestId('discover-search-input');
  await expect(input).toBeFocused();
  await input.fill('神経可塑性');
  await page.getByTestId('discover-search-submit').click();
  await expect(page).toHaveURL(/preferredMode=theories/);
  await expect(page.getByTestId('search-page-results')).toContainText('脳の可塑性');
});

test('特集は本文も検索し、下書きを除外し、再読込とURL復元に対応する', async ({ page }) => {
  await page.goto('/features');
  await page.getByTestId('book-header').getByRole('button', { name: '検索', exact: true }).click();
  await expect(page).toHaveURL(/\/discover$/);
  const input = page.getByTestId('discover-search-input');
  await expect(input).toBeFocused();
  await input.fill('本文だけの検証語');
  await page.getByTestId('discover-search-submit').click();
  const results = page.getByTestId('search-page-results');
  await expect(results.getByTestId('feature-card')).toHaveCount(1);
  await expect(results).toContainText('検索で見つかる特集');
  await expect(results).not.toContainText('下書き特集');
  await page.reload();
  await expect(page.getByRole('tab', { name: '特集', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(results.getByTestId('feature-card')).toHaveCount(1);
  await results.getByRole('link', { name: '検索で見つかる特集を読む' }).click();
  await expect(page).toHaveURL(new RegExp(`/features/${features[0].slug}$`));
  await page.route('**/rest/v1/feature_articles**', route => route.fulfill({ status: 400, json: { message: 'Feature request failed' } }));
  await page.goto('/search?mode=features&q=検証');
  await expect(results).toContainText('記事を読み込めませんでした');
  await expect(results.getByRole('button', { name: '特集を再読み込み' })).toBeVisible();
});

test('共有に対応しないブラウザーでは特集リンクをコピーする', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (url: string) => { (window as any).__copiedArticle = url; } } });
  });
  await page.goto(`/features/${features[0].slug}`);
  await page.getByTestId('book-header').getByRole('button', { name: '共有', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__copiedArticle)).toBe(`https://app.shoseijutsuroku.com/features/${features[0].slug}`);
  await expect(page.getByText('共有リンクをコピーしました', { exact: true })).toBeVisible();
});

test('特集の保存と共有は処世術と同じヘッダーで操作できる', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: ShareData) => { (window as any).__sharedArticle = data; } });
  });
  await page.goto(`/features/${features[0].slug}`);
  const header = page.getByTestId('book-header');
  await expect(header.getByRole('button', { name: 'お気に入りに保存', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: '共有', exact: true })).toBeVisible();
  await expect(page.getByTestId('feature-article').getByRole('button', { name: /保存/ })).toHaveCount(0);
  await header.getByRole('button', { name: 'お気に入りに保存', exact: true }).click();
  await expect(header.getByRole('button', { name: 'お気に入りから外す', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await header.getByRole('button', { name: '共有', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__sharedArticle?.url)).toBe(`https://app.shoseijutsuroku.com/features/${features[0].slug}`);
  await page.reload();
  await expect(header.getByRole('button', { name: 'お気に入りから外す', exact: true })).toBeVisible();
  await page.goto('/library');
  await page.getByRole('tab', { name: /^特集のお気に入り/ }).click();
  await expect(page.getByText(features[0].title, { exact: true })).toBeVisible();
  await page.goto(`/features/${features[0].slug}`);
  await header.getByRole('button', { name: 'お気に入りから外す', exact: true }).click();
  await expect(header.getByRole('button', { name: 'お気に入りに保存', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('feature-header-actions.png') });
});
