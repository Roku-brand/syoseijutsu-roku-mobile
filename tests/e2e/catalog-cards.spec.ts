import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const stateKey = '@shoseijutsu-roku/state/v1';
const source = JSON.parse(readFileSync('src/data/generated/techniques.public.json', 'utf8'));
const techniqueCount = source.categories.flatMap((c: any) => c.subcategories.flatMap((s: any) => s.items)).length;
const theories = JSON.parse(readFileSync('src/data/generated/theories.public.json', 'utf8'));
const theory = theories.find((t: any) => t.tagId === 'kb_001');

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

async function seed(page: Page) {
  await page.addInitScript(key => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      savedIds: ['master336-001'], savedTheoryIds: ['kb_001'],
      libraryFolders: [{ id: 'people', name: '対人関係' }],
      libraryFolderByItem: { 'technique:master336-001': 'people', 'theory:kb_001': 'people' },
    }));
  }, stateKey);
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

async function compactPages(pagination: Locator, ink: string) {
  await expect(pagination.getByRole('button')).toHaveCount(3);
  const trigger = pagination.getByRole('button', { name: /一覧のページ選択：/ });
  await expect(trigger).toContainText('1');
  await expect(trigger).toHaveCSS('border-top-width', '0px');
  await expect(trigger.getByText('1', { exact: true })).toHaveCSS('color', ink);
  await expect(pagination.getByRole('button', { name: '前のページ' })).toBeDisabled();
  const box = await pagination.boundingBox();
  expect(box!.height).toBe(44);
}

for (const width of [320, 390, 768, 1672]) test(`共通背景と種類別カード・共通のコンパクトなページ選択は${width}pxに収まる`, async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width, height: 941 });
  await page.goto('/techniques');
  await expect(page.getByTestId('technique-index-count')).toHaveText(`${techniqueCount}件`);
  await expect(page.getByTestId('technique-index-screen')).toHaveCSS('background-color', 'rgb(250, 249, 245)');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await compactPages(page.getByTestId('technique-index-pagination'), 'rgb(125, 89, 35)');
  const technique = page.getByTestId('shoseijutsu-card').first();
  const bar = technique.getByTestId('technique-category-bar');
  await expect(bar).toHaveCSS('background-color', 'rgb(185, 76, 85)');
  const [cardBox, barBox] = await Promise.all([technique.boundingBox(), bar.boundingBox()]);
  expect(barBox!.width).toBe(7); expect(Math.abs(cardBox!.height - barBox!.height)).toBeLessThanOrEqual(2);
  const numberBox = (await technique.getByTestId('technique-index-id').boundingBox())!;
  expect(Math.abs(numberBox.y + numberBox.height / 2 - cardBox!.y - cardBox!.height / 2)).toBeLessThan(2);
  expect(numberBox.x - cardBox!.x).toBeGreaterThanOrEqual(16);
  await expect(technique).toContainText('対人術・印象がいい人');
  await expect(technique).toContainText('清潔感を意識する');
  await expect(technique.getByTestId('catalog-index-mountains')).toBeVisible();
  await expect(technique.getByTestId('save-diamond')).toBeVisible();
  const count = (await page.getByTestId('technique-index-count').boundingBox())!;
  const pages = (await page.getByTestId('technique-index-pagination').boundingBox())!;
  expect(pages.y).toBeGreaterThan(count.y);
  await expect(page.getByRole('button', { name: /並び替え/ })).toHaveCount(0);
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`techniques-${width}.png`), scale: 'css' });
  await page.goto('/theories');
  await expect(page.getByTestId('theory-index-count')).toHaveText(`${theories.length}件`);
  await expect(page.getByTestId('theory-index-screen')).toHaveCSS('background-color', 'rgb(250, 249, 245)');
  await compactPages(page.getByTestId('theory-index-pagination'), 'rgb(49, 91, 73)');
  const activeFilter = page.getByTestId('theory-category-filters').getByRole('button', { name: 'すべてで理論を絞り込む' });
  await expect(activeFilter.locator(':scope > div').first()).toHaveCSS('background-color', 'rgb(49, 91, 73)');
  const entry = page.getByTestId('theory-card').first();
  await expect(entry).toHaveCSS('border-color', 'rgb(161, 177, 166)');
  await expect(entry).toHaveCSS('border-radius', '12px');
  await expect(entry.getByTestId('theory-card-title')).toHaveCSS('text-align', 'left');
  const withSummary = page.getByTestId('theory-card').filter({ has: page.getByTestId('theory-card-summary') }).first();
  await expect(withSummary.getByTestId('theory-card-summary')).toHaveCSS('text-align', 'left');
  await expect(entry.getByTestId('catalog-index-mountains')).toBeVisible();
  await expect(entry.getByTestId('save-diamond')).toBeVisible();
  await expect(page.getByRole('button', { name: /並び替え/ })).toHaveCount(0);
  await expect(entry.getByTestId('theory-card-id')).toHaveText('P-001');
  await expect(entry.getByTestId('theory-card-subcategory')).toHaveCount(0);
  const [entryBox, codeBox] = await Promise.all([entry.boundingBox(), entry.getByTestId('theory-card-id').boundingBox()]);
  expect(entryBox!.height).toBeLessThan(125);
  expect(Math.abs(codeBox!.y + codeBox!.height / 2 - entryBox!.y - entryBox!.height / 2)).toBeLessThan(2);
  const titleBox = (await entry.getByTestId('theory-card-title').boundingBox())!;
  expect(titleBox.x).toBeGreaterThan(codeBox!.x + codeBox!.width);
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`theories-${width}.png`), scale: 'css' });
  await page.goto('/library');
  await expect(page.getByTestId('library-screen')).toHaveCSS('background-color', 'rgb(250, 249, 245)');
  await expect(page.getByTestId('saved-kind-tabs')).toBeVisible();
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(1);
  await expect(page.getByTestId('theory-card')).toHaveCount(0);
  await expect(page.getByTestId('personal-card-image')).toHaveCount(0);
  await expect(page.getByTestId('shoseijutsu-card')).toContainText('No.001');
  await expect(page.getByTestId('saved-technique-row').getByTestId('catalog-index-mountains')).toBeVisible();
  await page.getByRole('tab', { name: /^理論のお気に入り/ }).click();
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(0);
  await expect(page.getByTestId('theory-card')).toHaveCount(1);
  await expect(page.getByTestId('saved-theory-row').getByTestId('catalog-index-mountains')).toBeVisible();
  await expect(page.getByTestId('theory-card-title')).toHaveText(theory.title);
  await expect(page.getByTestId('theory-card-summary')).toContainText(theory.summary.split('。')[0]);
  await expect(page.getByTestId('save-diamond')).toHaveCount(1);
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`favorites-${width}.png`), scale: 'css' });
});

test('大分類から縦バーの色を選び、IDと全文タイトルを維持する', async ({ page }) => {
  for (const [category, color] of [['interpersonal', 'rgb(185, 76, 85)'], ['work', 'rgb(67, 116, 157)'], ['life', 'rgb(78, 123, 96)']]) {
    await page.goto(`/techniques?category=${category}`);
    await expect(page.getByTestId('technique-category-bar').first()).toHaveCSS('background-color', color);
  }
  await page.goto('/techniques?q=002');
  await expect(page.getByTestId('technique-index-title')).toHaveAccessibleName('表情・視線・姿勢・声を安定させる');
  await expect(page.getByTestId('technique-index-id')).toHaveText('No.002');
  await expect(page.getByTestId('technique-essence')).toHaveCount(0);
  await page.setViewportSize({ width: 320, height: 900 });
  const title = page.getByTestId('technique-index-title');
  await expect.poll(() => title.evaluate(el => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect().height > Number.parseFloat(getComputedStyle(el).lineHeight);
  })).toBe(true);
  await noOverflow(page);
});

test('狭い画面で文字を拡大しても処世術番号を一行で表示する', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/techniques?q=002');
  const code = page.getByTestId('technique-index-id');
  await expect(code).toHaveText('No.002');
  await page.addStyleTag({ content: '[data-testid="technique-index-id"] { font-size: 20px !important; line-height: 28px !important; }' });
  await expect.poll(() => code.evaluate(node => {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getClientRects().length === 1 && node.scrollWidth <= node.clientWidth;
  })).toBe(true);
  await noOverflow(page);
});

test('お気に入りを種類別に表示し、解除・再登録と詳細遷移を維持する', async ({ page }) => {
  await seed(page);
  await page.goto('/library');
  await expect(page.getByRole('button', { name: /フォルダー/ })).toHaveCount(0);
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(1);
  await page.getByRole('tab', { name: /^理論のお気に入り/ }).click();
  await expect(page.getByTestId('theory-card')).toHaveCount(1);
  await page.getByRole('button', { name: `${theory.title}を開く`, exact: true }).click();
  await expect(page).toHaveURL('/theory/kb_001');
  await expect(page.getByTestId('theory-title')).toHaveText(theory.title);
  await page.goto('/library');
  await page.getByRole('tab', { name: /^理論のお気に入り/ }).click();
  await page.getByRole('button', { name: `${theory.title}のお気に入りを解除`, exact: true }).click();
  await expect(page.getByTestId('theory-card')).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), stateKey)).toMatchObject({ savedIds: ['master336-001'], savedTheoryIds: [] });
  await page.reload();
  await expect(page.getByRole('tab', { name: /^理論のお気に入り 0件$/ })).toBeVisible();
  await page.getByRole('tab', { name: /^処世術のお気に入り/ }).click();
  await expect(page.getByRole('button', { name: `${theory.title}のお気に入りを解除`, exact: true })).toHaveCount(0);
  await page.goto('/theory/kb_001');
  await page.getByTestId('book-header').getByRole('button', { name: 'お気に入りに保存', exact: true }).click();
  await page.goto('/library');
  await page.getByRole('tab', { name: /^理論のお気に入り/ }).click();
  await expect(page.getByTestId('theory-card')).toHaveCount(1);
  await page.getByRole('tab', { name: /^処世術のお気に入り/ }).click();
  await page.getByRole('button', { name: '清潔感を意識するを開く', exact: true }).click();
  await expect(page).toHaveURL('/card/master336-001');
});

test('検索の案内枠を省き、処世術と理論を共通カードの右上から保存できる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const { title, mode, rowID, cardID, detail } of [
    { title: '清潔感を意識する', mode: 'techniques', rowID: 'technique-search-row', cardID: 'shoseijutsu-card', detail: '/card/master336-001' },
    { title: theory.title as string, mode: 'theories', rowID: 'theory-search-row', cardID: 'theory-card', detail: '/theory/kb_001' },
  ]) {
    await page.goto(`/search?mode=${mode}&q=${encodeURIComponent(title)}`);
    await expect(page.getByRole('heading', { name: 'キーワード検索', exact: true })).toHaveCount(1);
    await expect(page.getByText('処世術・理論・特集を横断して探せます')).toHaveCount(0);
    const [header, searchBox] = await Promise.all([page.getByTestId('book-header').boundingBox(), page.getByTestId('independent-search-box').boundingBox()]);
    expect(searchBox!.y - header!.y - header!.height).toBeLessThanOrEqual(25);
    const row = page.getByTestId(rowID).filter({ hasText: title }).first();
    await expect(row.getByTestId('catalog-index-mountains')).toBeVisible();
    await expect(row.getByRole('button')).toHaveCount(0);
    const card = page.getByTestId(cardID).filter({ has: row });
    const save = card.getByRole('button', { name: `${title}をお気に入りに保存` });
    await expect(save).toHaveAttribute('aria-pressed', 'false');
    const [cardBox, diamond] = await Promise.all([card.boundingBox(), save.getByTestId('save-diamond').boundingBox()]);
    expect(diamond!.y - cardBox!.y).toBeLessThan(20);
    expect(cardBox!.x + cardBox!.width - diamond!.x - diamond!.width).toBeLessThan(24);
    await save.click();
    await expect(card.getByRole('button', { name: `${title}のお気に入りを解除` })).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/\/search\?/);
    await noOverflow(page);
    await page.screenshot({ path: test.info().outputPath(`search-${mode}-390.png`) });
    await row.click();
    await expect(page).toHaveURL(detail);
  }
});
