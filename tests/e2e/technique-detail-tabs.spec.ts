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
    const relatedTechniques = page.getByTestId('related-techniques').getByRole('link');
    await expect(relatedTechniques).toHaveCount(4);
    await expect(relatedTechniques.first()).toHaveText('01質問と自己開示のバランスがいい›');
    await expect(relatedTechniques.first()).toHaveAttribute('href', '/card/master336-021');

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
  await page.setViewportSize({ width: 390, height: 620 });
  await page.goto('/card/master336-001');
  const title = page.getByTestId('technique-detail-title');
  const practice = page.getByRole('tab', { name: '実践' });
  await expect(title).toBeVisible();
  const body = page.getByTestId('technique-detail-scroll');
  await body.evaluate(node => { node.scrollTop = 40; });
  await expect.poll(() => body.evaluate(node => node.scrollTop)).toBe(40);
  const before = await title.boundingBox();
  expect(before).not.toBeNull();
  await practice.click();
  await expect(page.getByText('今日からできる実践')).toBeVisible();
  await page.waitForTimeout(500);
  const after = await title.boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
  expect(await body.evaluate(node => node.scrollTop)).toBe(40);
});

for (const [width, height] of [[320, 568], [390, 844], [1440, 480]]) {
  test(`処世術のタイトルと番号を固定し、本質とタブは本文とスクロールする (${width}x${height})`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/card/master336-001');
    const persona = page.getByTestId('technique-detail-persona');
    await expect(persona).toHaveText('印象がいい人');
    const personaBox = (await persona.boundingBox())!;
    const starsBox = (await page.getByTestId('technique-detail-importance').boundingBox())!;
    expect(personaBox.x).toBeGreaterThanOrEqual(starsBox.x + starsBox.width);
    expect(Math.abs(personaBox.y - starsBox.y)).toBeLessThan(2);
    const fixed = ['book-header', 'technique-detail-number', 'technique-detail-title', 'technique-detail-persona']
      .map(id => page.getByTestId(id));
    const body = page.getByTestId('technique-detail-scroll');
    const movable = ['technique-essence', 'technique-detail-tabs'].map(id => page.getByTestId(id));
    const initial = await Promise.all(fixed.map(part => part.boundingBox()));
    const before = await Promise.all(movable.map(part => part.boundingBox()));
    expect(initial.every(Boolean)).toBeTruthy();
    expect(before.every(Boolean)).toBeTruthy();
    const scrollBox = (await body.boundingBox())!;
    expect(scrollBox.y).toBeGreaterThanOrEqual(initial[2]!.y + initial[2]!.height - 1);
    expect(scrollBox.y).toBeLessThan(before[0]!.y);
    expect(scrollBox.height).toBeGreaterThan(150);

    await body.evaluate(node => { node.scrollTop = 300; });
    await expect.poll(() => body.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    const distance = await body.evaluate(node => node.scrollTop);
    for (const [index, part] of fixed.entries()) {
      expect(Math.abs((await part.boundingBox())!.y - initial[index]!.y)).toBeLessThan(2);
    }
    for (const [index, part] of movable.entries()) {
      expect(Math.abs((await part.boundingBox())!.y - before[index]!.y + distance)).toBeLessThan(2);
    }
    await page.screenshot({ path: test.info().outputPath(`detail-fixed-${width}.png`) });
  });
}
