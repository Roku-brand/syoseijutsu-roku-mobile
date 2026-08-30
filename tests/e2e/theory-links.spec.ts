import { expect, test } from '@playwright/test';

test('a paid theory cannot be read through its direct URL', async ({ page }) => {
  await page.goto('/theory/kb_021');
  await expect(page).toHaveURL(/\/upgrade\?source=discover_theory$/);
  await expect(page.getByTestId('upgrade-single-screen')).toBeVisible();
});

test('social loafing is gated before its linked master336-154 technique can be exposed', async ({ page }) => {
  await page.goto('/theory/kb_070');
  await expect(page).toHaveURL(/\/upgrade\?source=discover_theory$/);
});
