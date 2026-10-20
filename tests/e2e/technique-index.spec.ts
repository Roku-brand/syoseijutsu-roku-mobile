import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

test('処世術一覧の入口は3つの人物像ボタンの下に並び、スマホとPCで開ける', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/discover');
    const grid = page.getByTestId('discover-technique-grid');
    const link = page.getByRole('link', { name: '処世術一覧', exact: true });
    await expect(grid.getByRole('link')).toHaveCount(3);
    const [buttons, entry, theories] = await Promise.all([grid.boundingBox(), link.boundingBox(), page.getByTestId('discover-theory-grid').boundingBox()]);
    expect(buttons!.y + buttons!.height).toBeLessThan(entry!.y);
    expect(entry!.y + entry!.height).toBeLessThan(theories!.y);
    expect(Math.abs(buttons!.width - entry!.width)).toBeLessThan(1);
    await link.click();
    await expect(page).toHaveURL(/\/techniques$/);
    await expect(page.getByTestId('book-header')).toContainText('処世術一覧');
    await expect(page.getByTestId('technique-index-count')).toHaveText('356件');
    await expect(page.getByTestId('technique-index-row')).toHaveCount(100);
    expect(await page.getByTestId('technique-index-id').allTextContents()).toEqual(Array.from({ length: 100 }, (_, i) => `No.${String(i + 1).padStart(3, '0')}`));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`technique-index-${width}.png`) });
  }
});

test('通しID検索とページ送りは固定番号を保ち、詳細と完全版の制限に接続する', async ({ page }) => {
  await page.goto('/techniques?page=4');
  await expect(page.getByTestId('technique-index-row')).toHaveCount(56);
  await expect(page.getByTestId('technique-index-id').first()).toHaveText('No.301');
  await expect(page.getByTestId('technique-index-id').last()).toHaveText('No.356');
  await page.getByRole('button', { name: '対人術で処世術を絞り込む' }).click();
  await expect(page).not.toHaveURL(/page=4/);
  const input = page.getByRole('textbox', { name: '通しID・処世術名・人物像で検索' });
  await input.fill('No.337');
  await input.press('Enter');
  await expect(page.getByTestId('technique-index-row')).toHaveCount(1);
  await expect(page.getByTestId('technique-index-row')).toContainText('一緒にいて疲れない人');
  await expect(page.getByTestId('technique-index-row')).toContainText('完全版の処世術');
  await page.reload();
  await expect(input).toHaveValue('No.337');
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
});
