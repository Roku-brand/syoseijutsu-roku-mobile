import { test, expect } from '@playwright/test';

for (const width of [320, 390, 430]) {
  test(`処世術詳細のタブと固定表示 (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto('/card/master336-001');
    const explanation = page.getByRole('tab', { name: '解説' });
    const practice = page.getByRole('tab', { name: '実践' });
    const related = page.getByRole('tab', { name: '関連知識' });
    const boxes = await Promise.all([explanation, practice, related].map(tab => tab.boundingBox()));
    expect(boxes.every(box => box !== null)).toBe(true);
    expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(2);
    expect(Math.abs(boxes[1]!.y - boxes[2]!.y)).toBeLessThan(2);
    expect(boxes[0]!.x + boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x + 1);
    expect(boxes[1]!.x + boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x + 1);
    await expect(page.getByRole('list', { name: 'パンくずリスト' })).toHaveCount(0);
    await expect(explanation).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('原理と解説')).toBeVisible();
    await expect(page.getByText('今日からできる実践')).toHaveCount(0);
    await practice.click();
    await expect(page.getByText('今日からできる実践')).toBeVisible();
    await expect(page.getByText('原理と解説')).toHaveCount(0);
    await related.click();
    await expect(page.getByTestId('related-theories')).toBeVisible();
    await expect(page.getByText('今日からできる実践')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByTestId('related-techniques').getByRole('link').first().click();
    await expect(explanation).toHaveAttribute('aria-selected', 'true');
  });
}

for (const width of [320, 390]) {
  test(`無料版の関連知識は定義と共通の一覧を表示する (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/card/master336-009');
    const tab = page.getByRole('tab', { name: '関連知識' });
    await tab.click();
    const primary = page.getByTestId('primary-theories');
    const supplementary = page.getByTestId('supplementary-theories');
    const definition = primary.getByRole('link', { name: '自己開示の返報性を開く' });
    const titleOnly = primary.getByRole('link', { name: '質問好意効果を開く' });
    await expect(definition).toContainText('自分のことを適度に話すと、相手も自分のことを話しやすくなること。');
    await expect(definition).not.toContainText('最近困っていること');
    await expect(titleOnly).toHaveText('02質問好意効果›');
    await expect(supplementary).toContainText('やりすぎは不足と同じように問題になるという教え。');
    await expect(supplementary).not.toContainText(/助言も気遣いも|実践手法｜|思想・言葉による補完｜/);
    await expect(page.getByTestId('related-techniques')).toHaveCount(0);

    for (const [name, list] of [['主要理論', primary], ['あわせて読む理論', supplementary]] as const) {
      const heading = page.getByRole('heading', { name, exact: true });
      const rows = list.getByRole('link');
      await expect(rows).toHaveCount(2);
      await expect(heading.locator('..').getByText('全 2 件', { exact: true })).toBeVisible();
      await expect(rows.first().getByText('01', { exact: true })).toBeVisible();
      await expect(rows.last().getByText('02', { exact: true })).toBeVisible();
      await expect(rows.first()).toHaveCSS('border-bottom-width', '1px');
      await expect(rows.last()).toHaveCSS('border-bottom-width', '1px');
    }
    expect((await titleOnly.boundingBox())!.height).toBeLessThanOrEqual(54);
    expect((await titleOnly.boundingBox())!.height).toBeLessThan((await definition.boundingBox())!.height);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    const scroll = page.getByTestId('technique-detail-scroll');
    await scroll.evaluate(node => { node.scrollTop += node.querySelector('[data-testid="technique-detail-tabs"]')!.getBoundingClientRect().top - node.getBoundingClientRect().top; });
    await expect(page.getByTestId('technique-detail-tabs')).toHaveCSS('background-color', 'rgb(251, 248, 242)');
    if (width === 390) await page.screenshot({ path: test.info().outputPath('related-knowledge-free-390.png') });

    await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
    const tags = page.getByRole('heading', { name: 'タグ', exact: true }).locator('../..');
    const bottomNavigation = page.getByTestId('persistent-bottom-navigation');
    const [tagsBox, navBox] = await Promise.all([tags.boundingBox(), bottomNavigation.boundingBox()]);
    expect(tagsBox!.y + tagsBox!.height).toBeLessThanOrEqual(navBox!.y);
    await definition.click();
    await expect(page.getByTestId('theory-title').filter({ visible: true })).toHaveText('自己開示の返報性', { timeout: 15_000 });
    await expect(page.getByTestId('theory-summary')).toContainText('最近困っていること');
  });
}

test('関連知識が1件の場合も一覧の件数を表示する', async ({ page }) => {
  await page.goto('/card/master336-002');
  await page.getByRole('tab', { name: '関連知識' }).click();
  const primary = page.getByTestId('primary-theories');
  await expect(primary.getByRole('link')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: '主要理論' }).locator('..').getByText('全 1 件', { exact: true })).toBeVisible();
  await expect(primary.getByRole('link').first().getByText('01', { exact: true })).toBeVisible();
  await expect(page.getByTestId('supplementary-theories')).toHaveCount(0);
});

test('タブ切替時に共通エリアを自動スクロールしない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto('/card/master336-001');
  const title = page.getByTestId('technique-detail-title');
  const practice = page.getByRole('tab', { name: '実践' });
  await expect(title).toBeVisible();
  const before = await title.boundingBox();
  expect(before).not.toBeNull();
  await practice.click();
  await expect(page.getByText('今日からできる実践')).toBeVisible();
  await page.waitForTimeout(500);
  const after = await title.boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
});

for (const width of [390, 1440]) test(`読み進めた詳細タブはヘッダー直下に隙間なく固定される (${width}px)`, async ({ page }) => {
  // The desktop article is shorter; use a shallow viewport so it scrolls far
  // enough to pin the tabs instead of reaching the end of the page first.
  await page.setViewportSize({ width, height: width >= 1000 ? 480 : 700 });
  await page.goto('/card/master336-001');
  const tabs = page.getByTestId('technique-detail-tabs');
  await expect(tabs).toBeVisible();
  await page.getByTestId('technique-detail-scroll').evaluate(node => { node.scrollTop = 900; });
  await expect.poll(async () => {
    const tab = (await tabs.boundingBox())!;
    const header = (await page.getByTestId('book-header').boundingBox())!;
    return Math.abs(tab.y - header.y - header.height);
  }).toBeLessThan(1);
  await page.screenshot({ path: test.info().outputPath(`detail-sticky-${width}.png`) });
});
