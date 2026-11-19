import { expect, test } from '@playwright/test';
import scope from '../../src/data/content-scope.json';

const techniqueCount = scope.complete.techniques;
const excludedDisplayIds = new Set(scope.excludedTechniqueIds.map((id) => id.replace('master336-', 'No.')));
const firstPageDisplayIds = Array.from({ length: 100 + excludedDisplayIds.size }, (_, i) => `No.${String(i + 1).padStart(3, '0')}`)
  .filter((id) => !excludedDisplayIds.has(id))
  .slice(0, 100);

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

test('各術で追加された無料処世術を解説まで読め、対象外は完全版のまま', async ({ page }) => {
  for (const [id, title] of [
    ['master336-015', '会話は内容よりテンポ'],
    ['master336-201', '様々なことに興味を持つ'],
    ['master336-279', '面倒くささより好奇心を優先する'],
  ]) {
    await page.goto(`/card/${id}`);
    await expect(page.getByTestId('technique-detail-title')).toHaveText(title);
    await expect(page.getByText('原理と解説', { exact: true })).toBeVisible();
  }
  await page.goto('/card/master336-211');
  await expect(page).toHaveURL(/\/upgrade\?source=discover_technique$/);
  await expect(page.getByText('原理と解説', { exact: true })).toHaveCount(0);
});

test('処世術一覧は見出しのすべて見るからスマホとPCで開ける', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/discover');
    const grid = page.getByTestId('discover-technique-grid');
    const link = page.getByRole('link', { name: 'すべての処世術を見る', exact: true });
    await expect(page.getByRole('link', { name: '全処世術一覧', exact: true })).toHaveCount(0);
    await expect(grid.getByRole('link')).toHaveCount(3);
    const [buttons, entry] = await Promise.all([grid.boundingBox(), link.boundingBox()]);
    expect(entry!.y + entry!.height).toBeLessThan(buttons!.y);
    expect(Math.abs(buttons!.x + buttons!.width - entry!.x - entry!.width)).toBeLessThan(1);
    await link.click();
    await expect(page).toHaveURL(/\/techniques$/);
    await expect(page.getByTestId('book-header')).toContainText('処世術一覧');
    await expect(page.getByTestId('technique-index-count')).toHaveText(`${techniqueCount}件`);
    await expect(page.getByTestId('technique-index-row')).toHaveCount(100);
    expect(await page.getByTestId('technique-index-id').allTextContents()).toEqual(firstPageDisplayIds);
    const [firstRow, firstId] = await Promise.all([page.getByTestId('technique-index-row').first().boundingBox(), page.getByTestId('technique-index-id').first().boundingBox()]);
    expect(firstRow!.height).toBeLessThanOrEqual(140);
    expect(Math.abs(firstId!.y + firstId!.height / 2 - firstRow!.y - firstRow!.height / 2)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`technique-index-${width}.png`) });
  }
});

test('通しID検索とページ送りは固定番号を保ち、詳細と完全版の制限に接続する', async ({ page }) => {
  await page.goto('/techniques?page=4');
  await expect(page.getByTestId('technique-index-row')).toHaveCount(techniqueCount - 300);
  await expect(page.getByTestId('technique-index-id').first()).toHaveText('No.307');
  await expect(page.getByTestId('technique-index-id').last()).toHaveText('No.356');
  await page.getByRole('button', { name: '対人術で処世術を絞り込む' }).click();
  await expect(page).not.toHaveURL(/page=4/);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await page.getByTestId('book-header').getByRole('button', { name: '処世術一覧を検索', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'キーワードを検索', exact: true });
  await input.fill('No.337');
  await input.press('Enter');
  await expect(page.getByTestId('technique-index-row')).toHaveCount(1);
  await expect(page.getByTestId('technique-index-row')).toContainText('一緒にいて疲れない人');
  await expect(page.getByTestId('technique-index-row')).toContainText('完全版の処世術');
  await page.reload();
  await page.getByTestId('book-header').getByRole('button', { name: '処世術一覧を検索', exact: true }).click();
  await expect(input).toHaveValue('No.337');
  await page.getByRole('button', { name: '検索を閉じる', exact: true }).click();
  await expect(page.getByTestId('technique-index-id')).toHaveText('No.337');
  await page.getByTestId('technique-index-row').click();
  await expect(page).toHaveURL(/\/upgrade\?source=discover_technique$/);
  await expect(page.getByTestId('technique-essence')).toHaveCount(0);
  await page.goto('/techniques?q=050');
  await expect(page.getByTestId('technique-index-id')).toHaveText('No.050');
  await page.getByTestId('technique-index-row').click();
  await expect(page).toHaveURL(/\/card\/master336-050$/);
  await expect(page.getByRole('main').getByText('No.050', { exact: true })).toBeVisible();
  await page.goto('/techniques?q=存在しない検索語');
  await expect(page.getByTestId('technique-index-count')).toHaveText('0件');
  await expect(page.getByText('該当する処世術はありません。')).toBeVisible();
  await page.getByTestId('book-header').getByRole('button', { name: '処世術一覧を検索', exact: true }).click();
  await input.fill(''); await input.press('Enter');
  await expect(page.getByTestId('technique-index-count')).toHaveText(`${techniqueCount}件`);
  await expect(page).not.toHaveURL(/q=/);
});
