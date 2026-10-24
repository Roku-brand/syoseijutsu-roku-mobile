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
  await expect(bar).toHaveCSS('background-color', 'rgb(196, 85, 93)');
  const [cardBox, barBox] = await Promise.all([technique.boundingBox(), bar.boundingBox()]);
  expect(barBox!.width).toBe(7); expect(Math.abs(cardBox!.height - barBox!.height)).toBeLessThanOrEqual(2);
  const numberBox = (await technique.getByTestId('technique-index-id').boundingBox())!;
  expect(Math.abs(numberBox.y + numberBox.height / 2 - cardBox!.y - cardBox!.height / 2)).toBeLessThan(2);
  expect(numberBox.x - cardBox!.x).toBeGreaterThanOrEqual(16);
  await expect(technique).toContainText('対人術・印象がいい人');
  await expect(technique).toContainText('清潔感を意識する');
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`techniques-${width}.png`), scale: 'css' });
  await page.goto('/theories');
  await expect(page.getByTestId('theory-index-count')).toHaveText(`${theories.length}件`);
  await expect(page.getByTestId('theory-index-screen')).toHaveCSS('background-color', 'rgb(250, 249, 245)');
  await compactPages(page.getByTestId('theory-index-pagination'), 'rgb(32, 63, 105)');
  await expect(page.getByTestId('theory-category-filters').getByRole('button', { name: 'すべてで理論を絞り込む' })).toHaveCSS('background-color', 'rgb(32, 63, 105)');
  const entry = page.getByTestId('theory-card').first();
  await expect(entry).toHaveCSS('border-color', 'rgb(168, 187, 208)');
  await expect(entry).toHaveCSS('border-radius', '4px');
  await expect(entry.getByTestId('theory-card-title')).toHaveCSS('text-align', 'center');
  const withSummary = page.getByTestId('theory-card').filter({ has: page.getByTestId('theory-card-summary') }).first();
  await expect(withSummary.getByTestId('theory-card-summary')).toHaveCSS('text-align', 'left');
  await expect(entry.getByTestId('theory-card-ornament')).toBeVisible();
  await expect(entry.getByTestId('theory-card-id')).toHaveText('P-001');
  await expect(entry.getByTestId('theory-card-subcategory')).toHaveCount(0);
  const [entryBox, codeBox] = await Promise.all([entry.boundingBox(), entry.getByTestId('theory-card-id').boundingBox()]);
  expect(entryBox!.height).toBeGreaterThanOrEqual(width < 700 ? 116 : 104);
  expect(entryBox!.height).toBeLessThan(148);
  expect(codeBox!.y - entryBox!.y).toBeGreaterThanOrEqual(14);
  expect(entryBox!.x + entryBox!.width - codeBox!.x - codeBox!.width).toBeGreaterThanOrEqual(16);
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`theories-${width}.png`), scale: 'css' });
  await page.goto('/library');
  await expect(page.getByTestId('library-screen')).toHaveCSS('background-color', 'rgb(250, 249, 245)');
  await expect(page.getByTestId('saved-kind-tabs')).toBeVisible();
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(1);
  await expect(page.getByTestId('theory-card')).toHaveCount(0);
  await expect(page.getByTestId('personal-card-image')).toHaveCount(0);
  await expect(page.getByTestId('shoseijutsu-card')).toContainText('No.001');
  await page.getByRole('tab', { name: /^理論のお気に入り/ }).click();
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(0);
  await expect(page.getByTestId('theory-card')).toHaveCount(1);
  await expect(page.getByTestId('theory-card-title')).toHaveText(theory.title);
  await expect(page.getByTestId('theory-card-summary')).toContainText(theory.summary.split('。')[0]);
  await expect(page.getByTestId('save-diamond')).toHaveCount(1);
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`favorites-${width}.png`), scale: 'css' });
});

test('大分類から縦バーの色を選び、IDと全文タイトルを維持する', async ({ page }) => {
  for (const [category, color] of [['interpersonal', 'rgb(196, 85, 93)'], ['work', 'rgb(74, 125, 168)'], ['life', 'rgb(88, 134, 106)']]) {
    await page.goto(`/techniques?category=${category}`);
    await expect(page.getByTestId('technique-category-bar').first()).toHaveCSS('background-color', color);
  }
  await page.goto('/techniques?q=002');
  await expect(page.getByTestId('technique-index-title')).toHaveAccessibleName('表情・視線・姿勢・声を安定させる');
  await expect(page.getByTestId('technique-index-id')).toHaveText('No.002');
  await expect(page.getByTestId('technique-essence')).toHaveCount(0);
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
