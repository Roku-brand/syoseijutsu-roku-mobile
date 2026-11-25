import { expect, test } from '@playwright/test';

for (const width of [320, 390, 430]) {
  test(`処世術数とページ選択が同じ行に並ぶ (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
    await page.goto('/techniques');
    const count = page.getByTestId('technique-index-count');
    const pagination = page.getByTestId('technique-index-pagination');
    await expect(count).toBeVisible({ timeout: 30_000 });
    await expect(pagination).toBeVisible();
    const [a, b] = await Promise.all([count.boundingBox(), pagination.boundingBox()]);
    expect(Math.abs(a!.y + a!.height / 2 - b!.y - b!.height / 2)).toBeLessThan(4);
    expect(a!.x + a!.width).toBeLessThan(b!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await pagination.getByRole('button', { name: '次のページ' }).click();
    await expect(pagination.getByRole('button', { name: /処世術一覧のページ選択：2\// })).toBeVisible();
  });
}
