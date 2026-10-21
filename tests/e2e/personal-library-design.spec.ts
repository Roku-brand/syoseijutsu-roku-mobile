import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const key = '@shoseijutsu-roku/state/v1';
const categories = JSON.parse(readFileSync('src/data/generated/techniques.public.json', 'utf8')).categories;
const techniques = categories.flatMap((c: any) => c.subcategories.flatMap((s: any) => s.items));
const theories = JSON.parse(readFileSync('src/data/generated/theories.public.json', 'utf8')).filter((item: any) => item.status !== 'locked');
const articles = JSON.parse(readFileSync('content/features/manifest.json', 'utf8')).map((row: any) => ({ ...row, lead: '確認用の特集概要', body: readFileSync(`content/features/${row.slug}.md`, 'utf8'), related_technique_ids: [], related_theory_ids: [], related_feature_ids: [], source_references: [], status: 'published' }));
async function fixture(page: Page, extra = {}) {
  let featureRequests = 0;
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state: { savedIds: [techniques[0].id], savedTheoryIds: [theories[0].tagId], savedFeatureIds: [articles[0].id], historyIds: [techniques[0].id, theories[0].tagId], featureHistoryIds: [articles[0].id], personalMemos: [{ id: 'm1', text: 'まず相手の話を聞く', folderId: 'f1', createdAt: '2026-10-15T00:00:00Z' }], personalMemoFolders: [{ id: 'f1', name: '大切な言葉' }], libraryFolders: [{ id: 'l1', name: '読み返したい知恵' }], libraryFolderByItem: { [`technique:${techniques[0].id}`]: 'l1' }, ...extra } });
  await page.route('**/rest/v1/**', route => {
    if (route.request().url().includes('/feature_articles')) { featureRequests++; return route.fulfill({ json: articles }); }
    return route.fulfill({ status: 503, json: {} });
  });
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
  return () => featureRequests;
}

for (const width of [320, 390, 1440]) test(`ranking artwork and folder fronts fit ${width}px`, async ({ page }) => {
  await fixture(page);
  await page.setViewportSize({ width, height: 950 });
  await page.goto('/discover');
  const art = page.getByTestId('discover-categories').locator('[data-testid^="category-art-"]');
  await expect(art).toHaveCount(9);
  await expect(page.locator('#roku-launch')).toBeHidden();
  await expect.poll(() => art.locator('img').evaluateAll(imgs => imgs.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const sources = await art.locator('img').evaluateAll(imgs => imgs.map(img => (img as HTMLImageElement).src));
  expect(new Set(sources).size).toBe(4);
  for (const category of ['interpersonal', 'work', 'life', 'psychology', 'behavioral-science', 'strategy', 'organization-management', 'classics-thought', 'practical-wisdom']) await expect(page.getByTestId(`category-art-${category}`)).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`discover-${width}.png`), fullPage: true });
  await page.goto('/my-os');
  await page.getByRole('button', { name: 'お気に入りをすべて見る', exact: true }).click();
  await expect(page.getByTestId('personal-card-image')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '蔵書：読み返したい知恵', exact: true })).toContainText('1件');
  await page.screenshot({ path: test.info().outputPath(`library-folders-${width}.png`), fullPage: true });
  await page.getByRole('button', { name: '蔵書：すべて', exact: true }).click();
  await expect(page.getByTestId('personal-card-image')).toHaveCount(1);
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(1);
  await expect(page.getByTestId('theory-card')).toHaveCount(1);
  await page.screenshot({ path: test.info().outputPath(`library-cards-${width}.png`), fullPage: true });
  await page.goto('/my-os');
  await page.getByRole('button', { name: 'マイ処世術をすべて見る', exact: true }).click();
  await page.getByRole('button', { name: 'フォルダー一覧に戻る', exact: true }).click();
  await expect(page.getByRole('button', { name: 'まず相手の話を聞くを編集', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'マイ処世術：大切な言葉', exact: true })).toContainText('1件');
  await page.getByRole('button', { name: 'マイ処世術：大切な言葉', exact: true }).click();
  await expect(page.getByRole('button', { name: 'まず相手の話を聞くを編集', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('history separates three kinds, records features and keeps older saved IDs', async ({ page }) => {
  await fixture(page);
  await page.goto('/history');
  await expect(page.getByTestId('personal-content-technique')).toHaveCount(1);
  await expect(page.getByTestId('personal-content-theory')).toHaveCount(0);
  await page.getByRole('tab', { name: '理論', exact: true }).click();
  await expect(page.getByTestId('personal-content-theory')).toHaveCount(1);
  await expect(page.getByTestId('personal-content-technique')).toHaveCount(0);
  await page.getByRole('tab', { name: '特集', exact: true }).click();
  const feature = page.locator('[data-testid="personal-content-feature"]:visible');
  await expect(feature).toHaveCount(1);
  const card = await feature.boundingBox(), thumb = await feature.getByTestId('personal-card-image').boundingBox();
  expect(thumb!.x).toBeLessThanOrEqual(card!.x + 20);
  await page.getByRole('button', { name: `${articles[0].title}を開く`, exact: true }).click();
  await expect(page.getByTestId('feature-body')).toBeVisible();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).featureHistoryIds, key)).toEqual([articles[0].id]);
  await page.goto(`/features/${articles[1].slug}`);
  await expect(page.getByTestId('feature-body')).toBeVisible();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).featureHistoryIds, key)).toEqual([articles[1].id, articles[0].id]);
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(state.historyIds).toEqual([techniques[0].id, theories[0].tagId]);
  expect(state.savedIds).toEqual([techniques[0].id]);
});

test('folder contents render twenty at a time and preserve all three hundred memos', async ({ page }) => {
  await fixture(page, { savedIds: techniques.slice(0, 80).map((c: any) => c.id), savedTheoryIds: [], savedFeatureIds: [], personalMemos: Array.from({ length: 300 }, (_, i) => ({ id: `m${i}`, text: `大切な一文 ${i + 1}`, folderId: null, createdAt: '2026-10-15T00:00:00Z' })) });
  await page.goto('/library');
  await expect(page.getByTestId('personal-card-image')).toHaveCount(0);
  await page.getByRole('button', { name: '蔵書：すべて', exact: true }).click();
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(20);
  await page.getByRole('button', { name: '次の20件を表示', exact: true }).click();
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(40);
  await page.getByRole('button', { name: 'フォルダー一覧に戻る', exact: true }).click();
  await expect(page.getByTestId('personal-card-image')).toHaveCount(0);
  await page.goto('/my-techniques');
  await expect(page.getByText('大切な一文 1', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'マイ処世術：未整理', exact: true }).click();
  await expect(page.locator('[data-testid="personal-memo-card"]:visible')).toHaveCount(20);
  await page.getByRole('button', { name: '次の20件を表示', exact: true }).click();
  await expect(page.locator('[data-testid="personal-memo-card"]:visible')).toHaveCount(40);
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(state.personalMemos).toHaveLength(300);
});

test('history and saved features reuse cached data and refresh once stale', async ({ page }) => {
  const requests = await fixture(page);
  await page.goto('/my-os');
  await page.getByRole('button', { name: '閲覧履歴を開く', exact: true }).click();
  for (let i = 0; i < 4; i++) {
    await page.getByRole('tab', { name: '特集', exact: true }).click();
    await expect(page.locator('[data-testid="personal-content-feature"]:visible')).toHaveCount(1);
    await page.getByTestId('book-header-back').click();
    await page.getByRole('button', { name: 'お気に入りをすべて見る', exact: true }).click();
    await page.getByRole('button', { name: '蔵書：すべて', exact: true }).click();
    await page.getByTestId('book-header-back').click();
    await page.getByRole('button', { name: '閲覧履歴を開く', exact: true }).click();
  }
  expect(requests()).toBe(1);
  await page.clock.install();
  await page.clock.fastForward(61_000);
  await page.getByRole('tab', { name: '特集', exact: true }).click();
  await expect.poll(requests).toBe(2);
});

for (const width of [320, 390, 768, 1672]) test(`reference my page preserves data and fits ${width}px`, async ({ page }) => {
  await fixture(page, { personalPrinciple: '志は高く、腰は低く。', libraryFolders: [{ id: 'people', name: '対人術' }, { id: 'work', name: '仕事術' }] });
  await page.setViewportSize({ width, height: 941 });
  await page.goto('/my-os');
  await expect(page.getByTestId('personal-principle-card')).toContainText('志は高く、腰は低く。');
  await expect(page.getByTestId('my-page-tabs')).toHaveCount(0);
  const favoriteCards = page.locator('[data-testid^="favorite-category-"]');
  await expect(favoriteCards).toHaveCount(3);
  const bounds = await favoriteCards.evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().y));
  expect(new Set(bounds).size).toBe(1);
  await page.screenshot({ path: test.info().outputPath(`reference-history-${width}.png`), scale: 'css' });
  await page.getByRole('button', { name: 'お気に入りをすべて見る', exact: true }).click();
  await expect(page.getByRole('button', { name: '蔵書：すべて', exact: true })).toContainText('3件');
  const folders = page.getByTestId('folder-fronts');
  await expect(folders.getByRole('button')).toHaveCount(4);
  await expect.poll(() => folders.locator('img').evaluateAll(images => images.length === 4 && images.every(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const cards = await folders.getByRole('button').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
  if (width >= 768) { expect(cards[0].y).toBe(cards[1].y); expect(cards[2].y).toBeGreaterThan(cards[0].y); }
  else expect(cards[1].y).toBeGreaterThan(cards[0].y);
  await page.screenshot({ path: test.info().outputPath(`reference-library-${width}.png`), scale: 'css' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '蔵書：すべて', exact: true }).click();
  await expect(page.getByTestId('personal-card-image')).toHaveCount(1);
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(1);
  await expect(page.getByTestId('theory-card')).toHaveCount(1);
  await page.getByTestId('book-header-back').click();
  await page.getByRole('button', { name: '座右の銘を編集', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '座右の銘', exact: true })).toHaveValue('志は高く、腰は低く。');
  await page.getByRole('textbox', { name: '座右の銘', exact: true }).fill('大切な言葉を、忘れない。');
  await page.getByRole('button', { name: '保存する', exact: true }).click();
  await expect(page.getByTestId('personal-principle-card')).toContainText('大切な言葉を、忘れない。');
});
