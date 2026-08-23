import { expect, test } from '@playwright/test';

test('groups interpersonal personas under consistent theme labels', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/category/interpersonal');
  await expect(page.getByText('関係の構築', { exact: true })).toBeVisible();
  await expect(page.getByText('関係の管理', { exact: true })).toBeVisible();
  await expect(page.getByText('集団での立ち回り', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /関係の構築/ }).click();
  await expect(page.getByText('印象がいい人', { exact: true })).toBeVisible();
  await expect(page.getByText('聞き上手な人', { exact: true })).toBeVisible();
});
