import { expect, test } from '@playwright/test';

test('groups interpersonal personas under three consistent theme labels', async ({ page }) => {
  await page.goto('/category/interpersonal');
  await expect(page.getByText('関係を育てる', { exact: true })).toBeVisible();
  await expect(page.getByText('距離を整える', { exact: true })).toBeVisible();
  await expect(page.getByText('集団で力を発揮する', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /、.*件/ })).toHaveCount(3);

  await page.getByRole('button', { name: /関係を育てる/ }).click();
  await expect(page.getByText('印象がいい人', { exact: true })).toBeVisible();
  await expect(page.getByText('聞き上手な人', { exact: true })).toBeVisible();
});
