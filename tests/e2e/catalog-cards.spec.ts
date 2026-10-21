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

async function circularPages(pagination: Locator, activeColor: string) {
  const buttons = pagination.getByRole('button');
  expect(await buttons.evaluateAll(nodes => nodes.every(node => {
    const r = node.getBoundingClientRect();
    return r.width === 44 && r.height === 44 && parseFloat(getComputedStyle(node).borderRadius) === 22;
  }))).toBe(true);
  await expect(buttons.first()).toHaveCSS('background-color', activeColor);
  const center = await pagination.evaluate(node => {
    const box = node.getBoundingClientRect();
    const rows = new Map<number, DOMRect[]>();
    Array.from(node.children).forEach(child => { const r = child.getBoundingClientRect(); const values = rows.get(r.y) ?? []; values.push(r); rows.set(r.y, values); });
    return Array.from(rows.values()).every(row => Math.abs((row[0].left + row.at(-1)!.right) / 2 - box.left - box.width / 2) < 1);
  });
  expect(center).toBe(true);
}

for (const width of [320, 390, 768, 1672]) test(`共通背景と種類別カード・円形ページ番号は${width}pxに収まる`, async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width, height: 941 });
  await page.goto('/techniques');
  await expect(page.getByTestId('technique-index-count')).toHaveText(`${techniqueCount}件`);
  await expect(page.getByTestId('technique-index-screen')).toHaveCSS('background-color', 'rgb(250, 249, 245)');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await circularPages(page.getByTestId('technique-index-pagination'), 'rgb(165, 123, 53)');
  const technique = page.getByTestId('shoseijutsu-card').first();
  const bar = technique.getByTestId('technique-category-bar');
  await expect(bar).toHaveCSS('background-color', 'rgb(196, 85, 93)');
  const [cardBox, barBox] = await Promise.all([technique.boundingBox(), bar.boundingBox()]);
  expect(barBox!.width).toBe(7); expect(Math.abs(cardBox!.height - barBox!.height)).toBeLessThanOrEqual(2);
  await expect(technique).toContainText('対人術・印象がいい人');
  await expect(technique).toContainText('清潔感を意識する');
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`techniques-${width}.png`), scale: 'css' });
  await page.goto('/theories');
  await expect(page.getByTestId('theory-index-count')).toHaveText(`${theories.length}件`);
  await expect(page.getByTestId('theory-index-screen')).toHaveCSS('background-color', 'rgb(250, 249, 245)');
  await circularPages(page.getByTestId('theory-index-pagination'), 'rgb(32, 63, 105)');
  await expect(page.getByTestId('theory-category-filters').getByRole('button', { name: 'すべてで理論を絞り込む' })).toHaveCSS('background-color', 'rgb(32, 63, 105)');
  const entry = page.getByTestId('theory-card').first();
  await expect(entry).toHaveCSS('border-color', 'rgb(168, 187, 208)');
  await expect(entry).toHaveCSS('border-radius', '4px');
  await expect(entry.getByTestId('theory-card-title')).toHaveCSS('text-align', 'center');
  const withSummary = page.getByTestId('theory-card').filter({ has: page.getByTestId('theory-card-summary') }).first();
  await expect(withSummary.getByTestId('theory-card-summary')).toHaveCSS('text-align', 'center');
  await expect(entry.getByTestId('theory-card-ornament')).toBeVisible();
  await expect(entry.getByTestId('theory-card-id')).toHaveText('P-001');
  await expect(entry.getByTestId('theory-card-subcategory')).toHaveText(theory.subcategoryTitle);
  await noOverflow(page);
  await page.screenshot({ path: test.info().outputPath(`theories-${width}.png`), scale: 'css' });
  await page.goto('/library');
  await expect(page.getByTestId('library-screen')).toHaveCSS('background-color', 'rgb(250, 249, 245)');
  await page.getByRole('button', { name: '蔵書：対人関係', exact: true }).click();
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(1);
  await expect(page.getByTestId('theory-card')).toHaveCount(1);
  await expect(page.getByTestId('personal-card-image')).toHaveCount(0);
  await expect(page.getByTestId('shoseijutsu-card')).toContainText('No.001');
  await expect(page.getByTestId('theory-card-title')).toHaveText(theory.title);
  await expect(page.getByTestId('theory-card-summary')).toContainText(theory.summary.split('。')[0]);
  await expect(page.getByTestId('save-diamond')).toHaveCount(2);
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

test('混在したお気に入りの移動・解除・再登録と詳細遷移を維持する', async ({ page }) => {
  await seed(page);
  await page.goto('/library');
  await page.getByRole('button', { name: '蔵書：対人関係', exact: true }).click();
  await page.getByRole('button', { name: `${theory.title}の保存先を変更`, exact: true }).click();
  await page.getByRole('button', { name: '保存先：未整理', exact: true }).click();
  await expect(page.getByTestId('theory-card')).toHaveCount(0);
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(1);
  await page.getByRole('button', { name: '清潔感を意識するのお気に入りを解除', exact: true }).click();
  await expect(page.getByText('このフォルダーは空です', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '蔵書：対人関係', exact: true })).toContainText('0件');
  await page.getByRole('button', { name: '蔵書：未整理', exact: true }).click();
  await page.getByRole('button', { name: `${theory.title}を開く`, exact: true }).click();
  await expect(page).toHaveURL('/theory/kb_001');
  await expect(page.getByTestId('theory-title')).toHaveText(theory.title);
  await page.goto('/card/master336-001');
  await page.getByTestId('book-header').getByRole('button', { name: '蔵書に保存', exact: true }).click();
  await page.goto('/library');
  await page.getByRole('button', { name: '蔵書：すべて', exact: true }).click();
  await expect(page.getByTestId('shoseijutsu-card')).toHaveCount(1);
  await page.getByRole('button', { name: `${theory.title}のお気に入りを解除`, exact: true }).click();
  await expect(page.getByTestId('theory-card')).toHaveCount(0);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), stateKey)).toMatchObject({ savedIds: ['master336-001'], savedTheoryIds: [], libraryFolderByItem: {} });
  await page.getByRole('button', { name: '清潔感を意識するを開く', exact: true }).click();
  await expect(page).toHaveURL('/card/master336-001');
});
