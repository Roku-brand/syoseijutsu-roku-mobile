import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const theories = JSON.parse(fs.readFileSync('src/data/generated/theories.json', 'utf8'));
const stateKey = '@shoseijutsu-roku/state/v1';
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: { message: 'Bundled catalogue for test' } }));
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

test('検索ボタン・各タブ件数・クリア・Enter・URL復元が連動する', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/search');
  const input = page.getByRole('textbox', { name: 'キーワードを検索' });
  await input.fill('ストレス');
  await page.getByRole('button', { name: '検索を実行', exact: true }).click();
  await expect(page.getByRole('tab', { name: '処世術', exact: true })).toHaveText('処世術 0');
  await expect(page.getByRole('tab', { name: '理論', exact: true })).toHaveText(`理論 ${theories.filter((item: any) => item.subcategoryId === 'psychology-e').length}`);
  await page.getByRole('tab', { name: '理論', exact: true }).click();
  await expect(page.getByTestId('search-page-results')).toContainText('ストレス評価理論');
  await page.getByRole('button', { name: '検索語を消す', exact: true }).click();
  await expect(input).toHaveValue('');
  await expect(page.getByTestId('search-page-results')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('q')).toBeNull();
  await input.fill('Proteus effect');
  await input.press('Enter');
  await expect(page.getByTestId('search-page-results')).toContainText('プロテウス効果');
  await page.reload();
  await expect(input).toHaveValue('Proteus effect');
  await expect(page.getByTestId('search-page-results')).toContainText('プロテウス効果');
  await page.screenshot({ path: test.info().outputPath('search-mobile.png') });
});

test('内部分類の選択はURL・分類切り替えに連動し、分類内は全件表示する', async ({ page }) => {
  await page.goto('/theories');
  await expect(page.getByText(`${theories.length}件`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '心理学で理論を絞り込む', exact: true }).click();
  await page.getByRole('button', { name: '自己理解・成長で内部分類を絞り込む', exact: true }).click();
  const development = theories.filter((item: any) => item.categoryId === 'psychology' && item.subcategoryTitle === '自己理解・成長');
  await expect(page.getByTestId('theory-index-row-card')).toHaveCount(development.length);
  await expect(page.getByRole('heading', { name: '自己理解・成長', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('theory-index-row-card')).toHaveCount(development.length);
  await page.getByRole('button', { name: '人間関係・コミュニケーションで内部分類を絞り込む', exact: true }).click();
  const interpersonal = theories.filter((item: any) => item.subcategoryId === 'psychology-i');
  expect(interpersonal.length).toBeGreaterThan(100);
  await expect(page.getByTestId('theory-index-row-card')).toHaveCount(interpersonal.length);
  await expect(page.getByTestId('theory-index-pagination')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('subcategory')).toBe('psychology-i');
  await page.getByRole('button', { name: '行動科学で理論を絞り込む', exact: true }).click();
  expect(new URL(page.url()).searchParams.get('subcategory')).toBeNull();
  await page.getByRole('button', { name: '理論一覧を検索', exact: true }).click();
  await page.getByRole('textbox', { name: 'キーワードを検索' }).fill('ハロー効果');
  await page.getByRole('button', { name: '検索を実行', exact: true }).click();
  await expect(page.getByTestId('search-page-results')).toContainText('ハロー効果');
});

test('旧内部分類URLを新分類へ解決し、320pxでも人物像と同じ形の分類ボタンが収まる', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/personas');
  const reference = await page.getByTestId('persona-category-filters').getByRole('button').first().evaluate(el => ({ radius: parseFloat(getComputedStyle(el).borderTopLeftRadius), height: el.getBoundingClientRect().height }));
  await page.goto('/theories?category=psychology&subcategory=psychology-d&page=7');
  await expect(page.getByRole('heading', { name: '自己理解・成長', exact: true })).toBeVisible();
  await expect(page.getByText('ピアジェの認知発達理論', { exact: true })).toBeVisible();
  await expect(page.getByTestId('theory-index-pagination')).toHaveCount(0);
  for (const testId of ['theory-category-filters', 'theory-subcategory-filters']) {
    for (const button of await page.getByTestId(testId).getByRole('button').all()) {
      const size = await button.evaluate(el => ({ radius: parseFloat(getComputedStyle(el).borderTopLeftRadius), height: el.getBoundingClientRect().height }));
      expect(size).toEqual(reference);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: test.info().outputPath('theory-sections-mobile.png') });
  for (const width of [320, 390, 1000, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const category of ['psychology', 'behavioral-science', 'organization-management', 'strategy', 'practical-wisdom', 'classics-thought']) {
      await page.goto(`/theories?category=${category}`);
      const filters = page.getByTestId('theory-subcategory-filters');
      await expect(filters.getByTestId('theory-subcategory-row')).toHaveCount(width >= 1000 ? 1 : 2);
      const bounds = await filters.boundingBox();
      const positions = new Set<number>();
      for (const button of await filters.getByRole('button').all()) {
        const box = await button.boundingBox();
        positions.add(Math.round(box!.y));
        expect(box!.x).toBeGreaterThanOrEqual(bounds!.x - 1);
        expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width + 1);
        const label = await button.locator('div').first().evaluate(el => {
          const range = document.createRange();
          range.selectNodeContents(el);
          const text = range.getBoundingClientRect();
          return { height: el.clientHeight, width: el.clientWidth, textHeight: text.height, textWidth: text.width };
        });
        expect(label.textHeight).toBeLessThanOrEqual(label.height + 1);
        expect(label.textWidth).toBeLessThanOrEqual(label.width + 1);
      }
      expect(positions.size).toBe(width >= 1000 ? 1 : 2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
      if (category === 'psychology') await page.screenshot({ path: test.info().outputPath(`theory-subcategories-${width}.png`) });
    }
  }
});

test('既存の保存と旧理論IDを維持し、フォルダー作成・移動・復元・名前変更・削除を両画面で使える', async ({ page }) => {
  await page.addInitScript(({ key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ savedIds: ['master336-001'], savedTheoryIds: ['kb_392', 'kb_016'], libraryFolders: [{ id: 'old', name: '以前の蔵書', createdAt: '2026-01-01T00:00:00Z' }], libraryFolderByItem: { 'theory:kb_392': 'old' } }));
  }, { key: stateKey });
  await page.goto('/library');
  await expect(page.getByRole('button', { name: '蔵書：すべて', exact: true })).toHaveText('すべて 2');
  await expect(page.getByRole('button', { name: '蔵書：以前の蔵書', exact: true })).toHaveText('以前の蔵書 1');
  await page.getByRole('button', { name: 'フォルダーを追加', exact: true }).click();
  await page.getByRole('textbox', { name: '蔵書フォルダー名', exact: true }).fill('仕事で使う知恵');
  await page.getByRole('button', { name: '蔵書フォルダーを保存', exact: true }).click();
  await page.getByRole('button', { name: '蔵書：すべて', exact: true }).click();
  const moves = page.getByRole('button', { name: /の保存先を変更$/ });
  for (let index = 0; index < 2; index++) {
    await moves.nth(index).click();
    await page.getByRole('button', { name: '保存先：仕事で使う知恵', exact: true }).click();
  }
  await page.reload();
  await expect(page.getByRole('button', { name: '蔵書：仕事で使う知恵', exact: true })).toHaveText('仕事で使う知恵 2');
  await page.goto('/my-os');
  await page.getByRole('tab', { name: '蔵書', exact: true }).click();
  await page.getByRole('button', { name: '蔵書：仕事で使う知恵', exact: true }).click();
  await page.getByRole('button', { name: '蔵書フォルダーを編集', exact: true }).click();
  await page.getByRole('textbox', { name: '蔵書フォルダー名', exact: true }).fill('仕事の知恵');
  await page.getByRole('button', { name: '蔵書フォルダーを保存', exact: true }).click();
  await expect(page.getByRole('button', { name: '蔵書：仕事の知恵', exact: true })).toHaveText('仕事の知恵 2');
  await expect(page.getByRole('dialog', { name: '蔵書フォルダーの編集', exact: true })).toBeHidden();
  await page.screenshot({ path: test.info().outputPath('library-mobile.png') });
  await page.getByRole('button', { name: '蔵書フォルダーを編集', exact: true }).click();
  await page.getByRole('button', { name: '蔵書フォルダーを削除', exact: true }).click();
  await page.getByRole('button', { name: 'フォルダーだけ削除', exact: true }).click();
  await expect(page.getByRole('button', { name: '蔵書：未整理', exact: true })).toHaveText('未整理 2');
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}'), stateKey);
  expect(stored.savedIds).toEqual(['master336-001']);
  expect(stored.savedTheoryIds).toEqual(['kb_016']);
  expect(stored.libraryFolderByItem).toEqual({});
});

test('保存した完全版のタイトルは整理できても、有料本文は購入案内で保護する', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({ savedTheoryIds: ['kb_869'] })), stateKey);
  await page.goto('/library');
  await page.getByRole('button', { name: 'プロテウス効果を開く', exact: true }).click();
  await expect(page).toHaveURL(/\/upgrade/);
  await expect(page.getByTestId('theory-summary')).toHaveCount(0);
});

test('文字の濃い金色・拡大許可・設定アイコン・OSS重複解消・正規件数が公開画面に反映される', async ({ page }) => {
  await page.goto('/theories');
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
  expect(viewport).not.toContain('user-scalable=no');
  expect(viewport).not.toContain('maximum-scale=1');
  await expect(page.getByText('151件を無料公開', { exact: true })).toHaveCSS('color', 'rgb(125, 89, 35)');
  await page.getByRole('button', { name: '設定を開く', exact: true }).click();
  await expect(page).toHaveURL(/\/settings/);
  await expect(page.getByRole('button', { name: /オープンソースの通知/ })).toHaveCount(1);
  await page.goto('/');
  await page.getByRole('tab', { name: '5枚目を表示', exact: true }).click();
  await expect(page.getByTestId('home-brand-system-stat-4')).toContainText(String(theories.length));
});

test('PC本文の横幅を820px以内に抑え、狭い画面にも収まる', async ({ page }) => {
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/theory/kb_003');
    const article = page.getByTestId('theory-summary');
    await expect(article).toBeVisible();
    const bounds = await article.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(Math.min(width, 820));
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await expect(page.locator('#roku-launch')).toBeHidden();
    await page.screenshot({ path: test.info().outputPath(`theory-${width}.png`) });
  }
});
