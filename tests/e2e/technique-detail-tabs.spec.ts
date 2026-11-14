import { test, expect } from '@playwright/test';

for (const width of [320, 390, 430]) {
  test(`処世術詳細のタブと固定表示 (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/card/master336-001');
    const explanation = page.getByRole('tab', { name: '解説' });
    const practice = page.getByRole('tab', { name: '実践' });
    const related = page.getByRole('tab', { name: '関連知識' });
    const boxes = await Promise.all([explanation, practice, related].map(tab => tab.boundingBox()));
    expect(boxes.every(box => box !== null)).toBe(true);
    expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(2);
    expect(Math.abs(boxes[1]!.y - boxes[2]!.y)).toBeLessThan(2);
    expect(boxes[0]!.x + boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x + 1);
    expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x + 1);
    const discover = page.getByRole('list', { name: 'パンくずリスト' }).getByRole('link', { name: '探すへ移動' });
    await expect(discover).toBeVisible();
    await expect.poll(async () => {
      const box = await discover.boundingBox();
      const lineHeight = await discover.locator('div').last().evaluate(element => parseFloat(getComputedStyle(element).lineHeight));
      return box!.height <= lineHeight + 1;
    }).toBe(true);
    await expect(explanation).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('原理と解説')).toBeVisible();
    await expect(page.getByText('今日からできる実践')).toHaveCount(0);
    await practice.click();
    await expect(page.getByText('今日からできる実践')).toBeVisible();
    await expect(page.getByText('原理と解説')).toHaveCount(0);
    await related.click();
    await expect(page.getByTestId('related-theories')).toBeVisible();
    await expect(page.getByText('今日からできる実践')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByTestId('related-techniques').getByRole('link').first().click();
    await expect(explanation).toHaveAttribute('aria-selected', 'true');
  });
}


test('タブ切替時に共通エリアを自動スクロールしない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto('/card/master336-001');
  const title = page.getByTestId('technique-detail-title');
  const practice = page.getByRole('tab', { name: '実践' });
  await expect(title).toBeVisible();
  const before = await title.boundingBox();
  expect(before).not.toBeNull();
  await practice.click();
  await expect(page.getByText('今日からできる実践')).toBeVisible();
  await page.waitForTimeout(500);
  const after = await title.boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
});
