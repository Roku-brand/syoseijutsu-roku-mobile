import { expect, test } from '@playwright/test';

test('a paid theory cannot be read through its direct URL', async ({ page }) => {
  await page.goto('/theory/kb_021');
  await expect(page).toHaveURL(/\/upgrade\?source=discover_theory$/);
  await expect(page.getByTestId('upgrade-single-screen')).toBeVisible();
});

test('social loafing is part of the free SEO theory portfolio', async ({ page }) => {
  await page.goto('/theory/kb_070');
  await expect(page).toHaveURL(/\/theory\/kb_070$/);
  await expect(page.getByRole('heading', { level: 1, name: '社会的手抜き' })).toBeVisible();
});
