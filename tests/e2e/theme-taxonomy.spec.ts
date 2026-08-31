import { expect, test } from '@playwright/test';

test('opens the consolidated persona archive with the requested category selected', async ({ page }) => {
  await page.goto('/personas?category=interpersonal');
  await expect(page.getByRole('button', { name: '対人術で絞り込む' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('印象がいい人', { exact: true })).toBeVisible();
  await expect(page.getByText('会話がうまい人', { exact: true })).toBeVisible();
  await expect(page.getByText('仕事ができる人', { exact: true })).toHaveCount(0);
});
