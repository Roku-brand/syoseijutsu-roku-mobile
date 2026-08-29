import { expect, test } from '@playwright/test';

test('social loafing shows the linked master336-154 technique and its access gate', async ({ page }) => {
  await page.goto('/theory/kb_070');
  await expect(page.getByRole('button', { name: '役割と期待を明示するを開く' })).toBeVisible();
  await page.getByRole('button', { name: '役割と期待を明示するを開く' }).click();
  await expect(page).toHaveURL(/\/upgrade\?source=discover_technique$/);
});
