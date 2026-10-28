import { expect, test } from '@playwright/test';


test('販売者氏名は末尾に通常表示し、冒頭リンクから直接到達できる', async ({ page }) => {
  for (const document of ['terms', 'commerce']) {
    await page.goto(`/legal/${document}`);
    const seller = page.getByTestId('legal-seller-details');
    await expect(seller).toContainText('大南翼');
    expect(await seller.evaluate(el => el.nextElementSibling?.getAttribute('data-testid') ?? null)).not.toBe('legal-section');
    expect(await page.getByTestId('legal-section').first().textContent()).not.toContain('大南翼');
    const jump = page.getByTestId('legal-seller-jump');
    await expect(jump).toBeVisible();
    await jump.click();
    await expect(seller.getByText(/運営者・販売事業者：/)).toBeInViewport();
    expect(await seller.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  }
});
