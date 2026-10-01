import { expect, test } from '@playwright/test';

test('mobile theory category names fit one readable line', async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: { message: 'Use the bundled public catalog for this test' } }));
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/discover');
    const grid = page.getByTestId('discover-theory-grid');
    await expect(grid.getByRole('link')).toHaveCount(6);
    for (const label of ['組織・経営論', '古典・思想']) {
      const title = grid.getByRole('link', { name: `${label}から探す`, exact: true }).getByText(label, { exact: true });
      const size = await title.evaluate(el => ({ height: el.getBoundingClientRect().height, line: parseFloat(getComputedStyle(el).lineHeight), font: parseFloat(getComputedStyle(el).fontSize), width: el.clientWidth, scroll: el.scrollWidth }));
      expect(size.height).toBeLessThanOrEqual(size.line + 1);
      expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
      expect(size.font).toBeGreaterThanOrEqual(11);
    }
    await page.screenshot({ path: test.info().outputPath(`discover-${width}.png`) });
  }
});

test('theory pagination is above the list and restores the selected page', async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: { message: 'Use the bundled public catalog for this test' } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/theories');
  const pager = page.getByTestId('theory-index-pagination');
  const list = page.getByTestId('theory-index-list');
  await expect(pager).toHaveCount(1);
  const [pagerBox, listBox] = await Promise.all([pager.boundingBox(), list.boundingBox()]);
  expect(pagerBox!.y + pagerBox!.height).toBeLessThanOrEqual(listBox!.y);
  expect(pagerBox!.y + pagerBox!.height).toBeLessThan(844);
  const firstPageTitle = await list.getByTestId('theory-index-row-card').first().textContent();
  await pager.getByRole('button', { name: '2ページ目', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(pager.getByRole('button', { name: '2ページ目', exact: true })).toHaveAttribute('aria-selected', 'true');
  const secondPageTitle = await list.getByTestId('theory-index-row-card').first().textContent();
  expect(secondPageTitle).not.toBe(firstPageTitle);
  await page.reload();
  await expect(pager.getByRole('button', { name: '2ページ目', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(list.getByTestId('theory-index-row-card').first()).toHaveText(secondPageTitle!);
  await page.getByRole('button', { name: '心理学で理論を絞り込む', exact: true }).click();
  await expect(page).toHaveURL(/category=psychology/);
  await expect(pager.getByRole('button', { name: '1ページ目', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: test.info().outputPath('theory-pagination-top.png') });
});
