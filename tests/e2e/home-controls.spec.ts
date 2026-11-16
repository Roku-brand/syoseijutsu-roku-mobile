import { expect, test, type Page } from '@playwright/test';

const key = '@shoseijutsu-roku/discovery-deck/v1/free';
const state = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
};
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

for (const [width, height] of [[320, 568], [375, 667], [390, 844], [430, 932], [768, 1024], [1440, 1000]]) {
  test(`unified actions and unobstructed navigation at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await ready(page);
    const filter = page.getByTestId('home-deck-filter');
    const shuffle = page.getByTestId('home-discovery-refresh');
    await filter.scrollIntoViewIfNeeded();
    const a = (await filter.boundingBox())!;
    const b = (await shuffle.boundingBox())!;
    expect(a.height).toBe(44);
    expect(b.height).toBe(a.height);
    expect(a.y).toBe(b.y);
    expect(a.x + a.width).toBeLessThan(b.x);
    expect(b.x + b.width).toBeLessThanOrEqual(width);
    const heading = (await page.getByTestId('home-deck-heading').boundingBox())!;
    if (width < 1000) expect(heading.y + heading.height).toBeLessThan(a.y);
    await expect(filter).toHaveText('すべて');
    await expect(shuffle).toHaveAccessibleName('シャッフル');
    const shape = (node: HTMLElement | SVGElement) => {
      const css = getComputedStyle(node);
      return { radius: css.borderRadius, background: css.backgroundColor };
    };
    expect((await filter.evaluate(shape)).radius).toBe((await shuffle.evaluate(shape)).radius);
    await expect(filter).toHaveCSS('border-color', 'rgb(198, 161, 93)');
    await expect(shuffle).toHaveCSS('background-color', 'rgb(146, 107, 46)');
    await expect(page.getByTestId('book-header')).toHaveCSS('background-color', 'rgb(9, 31, 29)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `release-evidence/home-controls-20261115/after-${width}-top.png` });
    await page.getByTestId('home-deck-next').scrollIntoViewIfNeeded();
    const next = (await page.getByTestId('home-deck-next').boundingBox())!;
    const previous = (await page.getByTestId('home-deck-previous').boundingBox())!;
    expect(next.height).toBeGreaterThanOrEqual(44);
    expect(next.width).toBe(previous.width);
    expect(next.y).toBe(previous.y);
    const nav = (await page.getByTestId('persistent-bottom-navigation').boundingBox())!;
    if (width < 1000) expect(next.y + next.height).toBeLessThanOrEqual(nav.y);
    await page.screenshot({ path: `release-evidence/home-controls-20261115/after-${width}-deck.png` });
    for (const [testID, lines] of [['home-shortcut-popular', ['人気', 'ランキング']], ['home-create-technique', ['処世術を', '作る']]] as const) {
      const shortcut = page.getByTestId(testID);
      const first = shortcut.getByText(lines[0], { exact: true });
      const second = shortcut.getByText(lines[1], { exact: true });
      const a = (await first.boundingBox())!, b = (await second.boundingBox())!;
      expect(a.y + a.height).toBeCloseTo(b.y, 0);
      for (const line of [first, second]) expect(await line.evaluate(node => {
        const css = getComputedStyle(node);
        return node.getBoundingClientRect().height <= parseFloat(css.lineHeight) + 1 && node.scrollWidth <= node.clientWidth;
      })).toBe(true);
    }
  });
}

test('theme follows selection immediately; shuffle excludes the old hand and rejects repeated input', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);
  const filter = page.getByTestId('home-deck-filter');
  const shuffle = page.getByTestId('home-discovery-refresh');
  for (const [category, label, color] of [
    ['interpersonal', '対人術', 'rgb(185, 76, 85)'], ['work', '仕事術', 'rgb(67, 116, 157)'],
    ['life', '人生術', 'rgb(78, 123, 96)'], ['theory', '理論', 'rgb(32, 63, 105)'], ['all', 'すべて', 'rgb(146, 107, 46)'],
  ]) {
    await filter.click();
    await page.getByTestId(`home-deck-filter-${category}`).click();
    await expect(filter).toHaveText(label);
    await filter.evaluate((node: HTMLElement) => node.blur());
    await expect(filter).toHaveCSS('border-color', category === 'all' ? 'rgb(198, 161, 93)' : color);
    await expect(shuffle).toHaveCSS('background-color', color);
    await ready(page);
    const old = await state(page);
    await shuffle.evaluate((node: HTMLElement) => { node.click(); node.click(); node.click(); });
    await expect(shuffle).toBeDisabled();
    await expect(filter).toBeDisabled();
    await ready(page);
    const updated = await state(page);
    expect(updated.round).toBe(old.round + 1);
    expect(updated.filter).toBe(category);
    expect(updated.cursor).toBe(0);
    expect(updated.order.filter((id: string) => old.order.includes(id))).toEqual([]);
    await expect(page.getByTestId('home-deck-position')).toHaveText('01  / 05');
    if (category !== 'all') await expect(page.getByTestId('home-recommendation-card').getByText(label, { exact: true })).toBeVisible();
    await filter.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `release-evidence/home-controls-20261115/theme-${category}.png` });
  }
});

test('Reduced Motion interrupts a shuffle once, and saving and detail navigation remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);
  const old = await state(page);
  await page.getByTestId('home-discovery-refresh').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  expect((await state(page)).round).toBe(old.round + 1);
  const save = page.getByTestId('home-deck-save');
  const selected = await save.getAttribute('aria-pressed');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', selected === 'true' ? 'false' : 'true');
  await expect(page).toHaveURL(/\/$/);
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', selected!);
  await page.waitForTimeout(360);
  await page.getByTestId('home-recommendation-card').click();
  await expect(page).toHaveURL(/\/(card|theory)\//);
  await page.goBack();
  await ready(page);
  await expect(page.getByTestId('home-deck-position')).toContainText('01');
  for (const cursor of [1, 2, 3, 4, 0]) {
    await page.getByTestId('home-deck-next').click();
    await ready(page);
    await expect(page.getByTestId('home-deck-position')).toContainText(String(cursor + 1).padStart(2, '0'));
    const active = await page.getByTestId('home-deck-position').evaluate(node =>
      Array.from(node.parentElement!.firstElementChild!.children).map(mark => getComputedStyle(mark).backgroundColor === 'rgb(146, 107, 46)'));
    expect(active.filter(Boolean)).toHaveLength(1);
    expect(active[cursor]).toBe(true);
  }
});
