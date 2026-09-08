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


test('theory information distinguishes bibliography and links to its source on mobile', async ({ page }) => {
  await page.goto('/theory/kb_070');
  const information = page.getByTestId('theory-information');
  await expect(information).toContainText('書誌確認済み');
  await expect(information).toContainText('1979年');
  const source = information.getByRole('link', { name: '文献情報・原文（DOI）' });
  await expect(source).toHaveAttribute('href', 'https://doi.org/10.1037/0022-3514.37.6.822');
  await expect(source).toHaveAttribute('target', '_blank');
  await expect(information).toContainText('効果の強さや再現性を示す評価ではありません');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
