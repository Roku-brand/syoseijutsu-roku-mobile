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

test('ヘッダー検索は元のページを保ち、3種別を選べて閉じるとフォーカスが戻る', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const trigger = page.getByTestId('book-header').getByRole('button', { name: '検索', exact: true });
  await trigger.click();
  const popup = page.getByTestId('header-search-popup');
  await expect(popup.getByRole('heading', { name: '検索', exact: true })).toHaveCount(0);
  expect((await popup.boundingBox())!.height).toBeLessThanOrEqual(160);
  await expect(popup).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await expect(popup.getByRole('tab')).toHaveText(['処世術', '理論', '特集']);
  const input = popup.getByRole('textbox', { name: 'キーワードを検索' });
  await expect(input).toBeFocused();
  await input.fill('  初頭効果  ');
  await popup.getByRole('tab', { name: '理論', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.screenshot({ path: test.info().outputPath('header-search-desktop.png') });
  await input.press('Escape');
  await expect(popup).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(input).toHaveValue('  初頭効果  ');
  await popup.getByRole('tab', { name: '理論', exact: true }).click();
  await input.press('Enter');
  await expect(page).toHaveURL(/\/search\?/);
  expect(new URL(page.url()).searchParams.get('q')).toBe('初頭効果');
  expect(new URL(page.url()).searchParams.get('mode')).toBe('theories');
  await expect(page.getByTestId('search-page-results')).toContainText('初頭効果');
  await expect(page.getByRole('tab')).toHaveCount(3);
  await expect(page.getByRole('tab', { name: '人物像', exact: true })).toHaveCount(0);
});

test('320pxと390pxでも検索が画面内に収まり、空欄・閉じる・外側タップが機能する', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/discover');
    await page.getByTestId('book-header').getByRole('button', { name: '検索', exact: true }).click();
    const popup = page.getByTestId('header-search-popup');
    await expect(popup).toBeVisible();
    const box = await popup.boundingBox();
    await expect(popup.getByRole('heading', { name: '検索', exact: true })).toHaveCount(0);
    expect(box!.height).toBeLessThanOrEqual(150);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    await popup.getByRole('button', { name: '検索を実行' }).click();
    await expect(page).toHaveURL(/\/discover$/);
    await expect(popup).toBeVisible();
    await page.screenshot({ path: test.info().outputPath(`header-search-${width}.png`) });
    await popup.getByRole('button', { name: '検索を閉じる' }).click();
    await expect(popup).toHaveCount(0);
    await page.getByTestId('book-header').getByRole('button', { name: '検索', exact: true }).click();
    await page.getByTestId('header-search-backdrop').click({ position: { x: 8, y: 400 } });
    await expect(popup).toHaveCount(0);
  }
});

test('理論一覧の検索はポップアップ内で理論を初期選択する', async ({ page }) => {
  await page.goto('/theories');
  await page.getByRole('button', { name: '理論一覧を検索', exact: true }).click();
  const popup = page.getByTestId('header-search-popup');
  await expect(popup.getByRole('tab', { name: '理論', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/\/theories$/);
  await popup.getByRole('textbox').fill('神経可塑性');
  await popup.getByRole('button', { name: '検索を実行' }).click();
  await expect(page.getByTestId('search-page-results')).toContainText('脳の可塑性');
});

test('特集は本文も検索し、下書きを除外し、再読込とURL復元に対応する', async ({ page }) => {
  await page.goto('/features');
  await page.getByTestId('book-header').getByRole('button', { name: '検索', exact: true }).click();
  const popup = page.getByTestId('header-search-popup');
  await expect(popup.getByRole('tab', { name: '特集', exact: true })).toHaveAttribute('aria-selected', 'true');
  await popup.getByRole('textbox').fill('本文だけの検証語');
  await popup.getByRole('button', { name: '検索を実行' }).click();
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
  await expect(header.getByRole('button', { name: '蔵書に保存', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: '共有', exact: true })).toBeVisible();
  await expect(page.getByTestId('feature-article').getByRole('button', { name: /保存/ })).toHaveCount(0);
  await header.getByRole('button', { name: '蔵書に保存', exact: true }).click();
  await expect(header.getByRole('button', { name: '蔵書から外す', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await header.getByRole('button', { name: '共有', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__sharedArticle?.url)).toBe(`https://app.shoseijutsuroku.com/features/${features[0].slug}`);
  await page.reload();
  await expect(header.getByRole('button', { name: '蔵書から外す', exact: true })).toBeVisible();
  await page.goto('/library');
  await page.getByRole('button', { name: '蔵書：すべて', exact: true }).click();
  await expect(page.getByText(features[0].title, { exact: true })).toBeVisible();
  await page.goto(`/features/${features[0].slug}`);
  await header.getByRole('button', { name: '蔵書から外す', exact: true }).click();
  await expect(header.getByRole('button', { name: '蔵書に保存', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('feature-header-actions.png') });
});
