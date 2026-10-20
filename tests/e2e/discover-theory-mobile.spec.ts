import { expect, test } from '@playwright/test';

test('mobile theory category names remain readable and wrap at word boundaries', async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: { message: 'Use the bundled public catalog for this test' } }));
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/discover');
    const grid = page.getByTestId('discover-theory-grid');
    await expect(grid.getByRole('link')).toHaveCount(6);
    for (const label of ['組織・経営論', '古典・思想']) {
      const card = grid.getByRole('link', { name: `${label}から探す`, exact: true });
      await expect(card).toBeVisible();
      await expect(card.getByText(label.match(/[^・]+・?/g)![0], { exact: true })).toBeVisible();
      const size = await card.evaluate(el => {
        const title = el.lastElementChild!.firstElementChild!;
        return {
          height: title.getBoundingClientRect().height,
          words: [...title.children].map(word => ({ text: word.textContent, height: word.getBoundingClientRect().height, line: parseFloat(getComputedStyle(word).lineHeight), font: parseFloat(getComputedStyle(word).fontSize), width: word.clientWidth, scroll: word.scrollWidth })),
        };
      });
      expect(size.words.map(word => word.text)).toEqual(label.match(/[^・]+・?/g));
      expect(size.height).toBeLessThanOrEqual(2 * size.words[0].line + 1);
      for (const word of size.words) {
        expect(word.height).toBeLessThanOrEqual(word.line + 1);
        expect(word.scroll).toBeLessThanOrEqual(word.width + 1);
        expect(word.font).toBeGreaterThanOrEqual(18);
      }
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
  await expect(list.getByTestId('theory-index-row-card')).toHaveCount(100);
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
  await expect(pager).toHaveCount(0);
  await expect(page.getByTestId('theory-subcategory-filters')).toBeVisible();
  await page.getByRole('button', { name: 'すべてで理論を絞り込む', exact: true }).click();
  await expect(pager.getByRole('button', { name: '1ページ目', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(list.getByTestId('theory-index-row-card')).toHaveCount(100);
  await page.screenshot({ path: test.info().outputPath('theory-pagination-top.png') });
});
