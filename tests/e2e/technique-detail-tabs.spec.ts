import { test, expect } from '@playwright/test';

for (const width of [320, 390, 430]) {
  test(`処世術詳細のタブと固定表示 (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/card/master336-001');
    const explanation = page.getByRole('tab', { name: '解説' });
    const practice = page.getByRole('tab', { name: '実践' });
    const related = page.getByRole('tab', { name: '関連知識' });
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

