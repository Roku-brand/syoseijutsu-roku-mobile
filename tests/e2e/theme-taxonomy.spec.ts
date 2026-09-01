import { expect, test } from '@playwright/test';

test('opens the consolidated persona archive with the requested category selected', async ({ page }) => {
  await page.goto('/personas?category=interpersonal');
  await expect(page.getByRole('button', { name: '対人術で絞り込む' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('印象がいい人', { exact: true })).toBeVisible();
  await expect(page.getByText('人たらしの人', { exact: true })).toBeVisible();
  await expect(page.getByText('会話がうまい人', { exact: true })).toBeVisible();
  const personaLinks = page.getByTestId('personas-grid').getByRole('link');
  await expect(personaLinks.nth(0)).toHaveAccessibleName(/^印象がいい人/);
  await expect(personaLinks.nth(1)).toHaveAccessibleName(/^人たらしの人/);
  await expect(personaLinks.nth(2)).toHaveAccessibleName(/^会話がうまい人/);
  await expect(page.getByText('仕事ができる人', { exact: true })).toHaveCount(0);
});

test('new persona order also updates the visible technique number without changing its stable URL', async ({ page }) => {
  await page.goto('/card/master336-050');
  await expect(page.getByText('No.15', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '人生を楽しそうにする' })).toBeVisible();
});
