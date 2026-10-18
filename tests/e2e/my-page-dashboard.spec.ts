import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
const key = '@shoseijutsu-roku/state/v1';
const categories = JSON.parse(readFileSync('src/data/generated/techniques.public.json', 'utf8')).categories;
const cards = categories.map((category: any) => category.subcategories[0].items[0]);
const theory = JSON.parse(readFileSync('src/data/generated/theories.public.json', 'utf8')).find((row: any) => row.status !== 'locked');
const articles = JSON.parse(readFileSync('content/features/manifest.json', 'utf8')).map((row: any) => ({ ...row, body: readFileSync(`content/features/${row.slug}.md`, 'utf8'), lead: '特集の概要', related_technique_ids: [], related_theory_ids: [], status: 'published' }));
async function seed(page: Page, state = {}) {
  await page.addInitScript(({ key, state }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state)); }, { key, state });
  await page.route('**/rest/v1/**', route => route.request().url().includes('/feature_articles') ? route.fulfill({ json: articles }) : route.fulfill({ status: 503, json: {} }));
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
}
const readState = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);

for (const width of [320, 375, 430, 1440]) test(`ダッシュボードの順序・最新3件・共通カテゴリ写真 ${width}px`, async ({ page }) => {
  await seed(page, { personalMemos: Array.from({ length: 4 }, (_, i) => ({ id: `memo${i}`, text: `気づき ${i}\n自分の歩幅で進む。`, folderId: null, createdAt: `2026-10-${15 + i}T00:00:00Z` })) });
  await page.setViewportSize({ width, height: width === 320 ? 568 : 932 });
  await page.goto('/discover');
  const sources = new Map<string, string | null>();
  for (const category of ['interpersonal', 'work', 'life']) sources.set(category, await page.getByTestId(`category-art-${category}`).locator('img').getAttribute('src'));
  await page.goto('/my-os');
  await expect(page.getByTestId('profile-avatar-fallback')).toBeVisible();
  await expect(page.getByTestId('my-page-tabs')).toHaveCount(0);
  await expect(page.locator('[data-testid="personal-memo-card"]:visible')).toHaveCount(3);
  await expect(page.locator('[data-testid="personal-memo-card"]:visible').first()).toContainText('気づき 3');
  await expect(page.getByText('気づき 0', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('favorites-overview')).toContainText('お気に入り');
  await expect(page.getByText('マイコレクション', { exact: true })).toHaveCount(0);
  for (const category of ['interpersonal', 'work', 'life']) expect(await page.getByTestId(`category-art-${category}`).locator('img').getAttribute('src')).toBe(sources.get(category));
  const positions = await page.locator('[data-testid="profile-principle-card"], [data-testid="favorites-overview"], [data-testid="personal-memos-preview"], [data-testid="history-entry"]').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().y));
  expect(positions).toHaveLength(4);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  const categoryRows = await page.locator('[data-testid^="favorite-category-"]').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().y));
  expect(new Set(categoryRows).size).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`mypage-${width}.png`), fullPage: true });
  const openAll = page.getByRole('button', { name: 'マイ処世術をすべて見る', exact: true });
  await openAll.scrollIntoViewIfNeeded();
  const scroll = page.locator('[data-testid="my-page-scroll"]:visible');
  const scrollTop = await scroll.evaluate(node => node.scrollTop);
  await page.getByTestId('history-entry').scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath(`mypage-${width}-personal.png`), scale: 'css' });
  await openAll.scrollIntoViewIfNeeded();
  const beforeOpen = await scroll.evaluate(node => node.scrollTop);
  expect(beforeOpen).toBeGreaterThanOrEqual(scrollTop - 5);
  await openAll.click();
  await expect(page.locator('[data-testid="personal-memo-card"]:visible')).toHaveCount(4);
  await page.getByTestId('book-header-back').click();
  await expect(page).toHaveURL(/\/my-os/);
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBe(beforeOpen);
});

test('直接開いた個人用一覧の戻る先はマイページになる', async ({ page }) => {
  await seed(page);
  await page.goto('/library');
  await page.getByTestId('book-header-back').click();
  await expect(page).toHaveURL(/\/my-os/);
});

test('重複保存を二重計上せず、分野と理論・特集を自動分類する', async ({ page }) => {
  await seed(page, { savedIds: [cards[0].id, cards[0].id, cards[1].id, cards[2].id], savedTheoryIds: [theory.tagId, theory.tagId], savedFeatureIds: [articles[0].id, articles[0].id], libraryFolders: [{ id: 'existing', name: '大切な知恵' }], libraryFolderByItem: { [`technique:${cards[0].id}`]: 'existing' } });
  await page.goto('/my-os');
  for (const label of ['対人術', '仕事術', '人生術']) {
    await page.getByRole('button', { name: `${label}のお気に入り 1件`, exact: true }).click();
    await expect(page.getByTestId('personal-content-technique')).toHaveCount(1);
    await expect(page.getByTestId('personal-content-theory')).toHaveCount(0);
    await page.getByTestId('book-header-back').click();
  }
  await page.getByRole('button', { name: '理論のお気に入り 1件', exact: true }).click();
  await expect(page.getByTestId('personal-content-theory')).toHaveCount(1);
  await page.getByTestId('book-header-back').click();
  await page.getByRole('button', { name: '特集のお気に入り 1件', exact: true }).click();
  await expect(page.locator('[data-testid="personal-content-feature"]:visible')).toHaveCount(1);
  await page.getByRole('button', { name: 'すべてのお気に入りとフォルダーを見る', exact: true }).click();
  await expect(page.getByRole('button', { name: '蔵書：すべて', exact: true })).toContainText('5件');
  await expect(page.getByRole('button', { name: '蔵書：大切な知恵', exact: true })).toContainText('1件');
});

test('空状態から自作・編集・メニュー削除ができ、再起動しても保存を維持する', async ({ page }) => {
  await seed(page);
  await page.goto('/my-os');
  await expect(page.locator('[data-testid="personal-memo-card"]:visible')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '理論のお気に入り 0件', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '最初のマイ処世術を作る', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'マイ処世術', exact: true });
  await expect(input).not.toBeFocused();
  await expect(page.getByRole('button', { name: /閉じる/ })).toHaveCount(1);
  await input.fill('一度立ち止まる\n焦ったときほど、確認する。');
  await page.getByRole('button', { name: '保存する', exact: true }).click();
  await page.reload();
  await expect(page.locator('[data-testid="personal-memo-card"]:visible')).toContainText('焦ったときほど、確認する。');
  await page.getByRole('button', { name: /のメニュー$/ }).click();
  const menu = page.getByRole('dialog', { name: 'マイ処世術の操作', exact: true });
  await menu.getByRole('button', { name: '編集', exact: true }).click();
  await input.fill('確認してから、返事をする。');
  await page.getByRole('button', { name: '保存する', exact: true }).click();
  await page.getByRole('button', { name: /のメニュー$/ }).click();
  await menu.getByRole('button', { name: '削除', exact: true }).click();
  await menu.getByRole('button', { name: 'このマイ処世術を削除', exact: true }).click();
  await expect(page.getByTestId('personal-memos-empty')).toBeVisible();
  expect((await readState(page)).personalMemos).toHaveLength(0);
});

test('古い保存IDを保持し、自動分類の件数には誤って含めない', async ({ page }) => {
  await seed(page, { savedIds: ['missing-legacy-id', cards[0].id] });
  await page.goto('/my-os');
  await page.getByRole('button', { name: '対人術のお気に入り 1件', exact: true }).click();
  await expect(page.getByTestId('personal-content-technique')).toHaveCount(1);
  await page.getByRole('button', { name: 'すべてのお気に入りとフォルダーを見る', exact: true }).click();
  await expect(page.getByRole('button', { name: '蔵書：すべて', exact: true })).toContainText('2件');
  expect((await readState(page)).savedIds).toContain('missing-legacy-id');
});

test('処世術と理論の検索一覧も共通の菱形で保存・解除できる', async ({ page }) => {
  await seed(page);
  await page.goto(`/search?q=${encodeURIComponent(cards[0].title)}`);
  await page.getByRole('button', { name: '保存', exact: true }).first().click();
  const saved = page.getByRole('button', { name: '保存を解除', exact: true });
  await expect(saved).toHaveAttribute('aria-pressed', 'true');
  await expect(saved.getByTestId('save-diamond')).toHaveCSS('background-color', 'rgb(165, 123, 53)');
  await saved.click();
  await expect(saved).toHaveCount(0);
  await page.goto(`/search?mode=theories&q=${encodeURIComponent(theory.title)}`);
  await page.getByRole('button', { name: '蔵書に保存', exact: true }).first().click();
  const theorySaved = page.getByRole('button', { name: '蔵書から外す', exact: true });
  await expect(theorySaved).toHaveAttribute('aria-pressed', 'true');
  await expect(theorySaved.getByTestId('save-diamond')).toHaveCSS('background-color', 'rgb(165, 123, 53)');
  await theorySaved.click();
  await expect(theorySaved).toHaveCount(0);
});

test('自作フォルダーの改名・移動・削除でカードを失わない', async ({ page }) => {
  await seed(page, { personalMemos: [{ id: 'original', text: 'まず話を聞く', folderId: null, createdAt: '2026-10-15T00:00:00Z' }] });
  await page.goto('/my-techniques?folder=all');
  await page.getByRole('button', { name: 'フォルダーを追加', exact: true }).click();
  await page.getByRole('textbox', { name: 'フォルダー名', exact: true }).fill('仕事');
  await page.getByRole('button', { name: '作成する', exact: true }).click();
  await page.getByRole('button', { name: 'マイ処世術フォルダーを編集', exact: true }).click();
  await page.getByRole('textbox', { name: 'フォルダー名', exact: true }).fill('仕事で使う');
  await page.getByRole('button', { name: 'フォルダーを保存する', exact: true }).click();
  await page.getByRole('button', { name: 'フォルダー一覧に戻る', exact: true }).click();
  await page.getByRole('button', { name: 'マイ処世術：すべて', exact: true }).click();
  await page.getByRole('button', { name: /のメニュー$/ }).click();
  await page.getByRole('button', { name: 'フォルダーへ整理・移動', exact: true }).click();
  await page.getByRole('button', { name: '保存先：仕事で使う', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'フォルダー一覧に戻る', exact: true }).click();
  await page.getByRole('button', { name: 'マイ処世術：仕事で使う', exact: true }).click();
  await expect(page.locator('[data-testid="personal-memo-card"]:visible')).toHaveCount(1);
  await page.getByRole('button', { name: 'マイ処世術フォルダーを編集', exact: true }).click();
  await page.getByRole('button', { name: 'フォルダーを削除', exact: true }).click();
  await page.getByRole('button', { name: 'フォルダーだけ削除', exact: true }).click();
  expect((await readState(page)).personalMemos).toEqual([{ id: 'original', text: 'まず話を聞く', folderId: null, createdAt: '2026-10-15T00:00:00Z' }]);
});

test('300件の既存自作カードは新規追加後もすべて残る', async ({ page }) => {
  await seed(page, { personalMemos: Array.from({ length: 300 }, (_, i) => ({ id: `m${i}`, text: `一文 ${i}`, folderId: null, createdAt: '2026-10-15T00:00:00Z' })) });
  await page.goto('/my-os');
  await page.getByRole('button', { name: '＋ 作る', exact: true }).click();
  await page.getByRole('textbox', { name: 'マイ処世術', exact: true }).fill('新しい気づき');
  await page.getByRole('button', { name: '保存する', exact: true }).click();
  await expect.poll(async () => (await readState(page)).personalMemos.length).toBe(301);
  await page.reload();
  expect((await readState(page)).personalMemos).toHaveLength(301);
});

test('処世術・理論・特集の菱形保存は即時反映し再起動後も一致する', async ({ page }) => {
  await seed(page);
  for (const url of [`/card/${cards[0].id}`, `/theory/${theory.tagId}`, `/features/${articles[0].slug}`]) {
    await page.goto(url);
    const header = page.getByTestId('book-header-actions');
    const save = header.getByRole('button', { name: '蔵書に保存', exact: true });
    await expect(save).toHaveAttribute('aria-pressed', 'false');
    await save.click();
    const saved = header.getByRole('button', { name: '蔵書から外す', exact: true });
    await expect(saved).toHaveAttribute('aria-pressed', 'true');
    await expect(saved.getByTestId('save-diamond')).toHaveCSS('background-color', 'rgb(165, 123, 53)');
    await page.reload();
    await expect(saved).toHaveAttribute('aria-pressed', 'true');
    await saved.click();
    await expect(save).toHaveAttribute('aria-pressed', 'false');
  }
  await page.goto('/my-os');
  await expect(page.getByRole('button', { name: '理論のお気に入り 0件', exact: true })).toBeVisible();
});
