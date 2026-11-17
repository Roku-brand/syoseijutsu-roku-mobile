import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import { turnDeck, expectDeckCursor } from './deck-helpers';

const key = '@shoseijutsu-roku/discovery-deck/v1/free';
const catalog = JSON.parse(fs.readFileSync('src/data/generated/techniques.public.json', 'utf8'));
const numbers = JSON.parse(fs.readFileSync('src/data/technique-display-ids.json', 'utf8'));
const cards = catalog.categories.flatMap((c: any) => c.subcategories.flatMap((p: any) => p.items)).filter((c: any) => c.status !== 'locked' && c.title !== '完全版の処世術').slice(0, 7);
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
};

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.addInitScript(({ key, order }) => {
    const day = Math.floor((Date.now() + 9 * 3600000) / 86400000);
    localStorage.setItem(key, JSON.stringify({ day, round: 0, order, cursor: 0, seen: [], filter: 'all' }));
  }, { key, order: cards.map((c: any) => `technique:${c.id}`) });
});

for (const width of [320, 375, 390, 430, 768, 1440]) {
  test(`portrait knowledge card, real identity and compact four tiles at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.goto('/'); await ready(page);
    await page.evaluate(() => document.fonts.ready);
    const front = (await page.getByTestId('home-deck-front').boundingBox())!;
    expect(front.height).toBeGreaterThan(front.width);
    expect(front.height / front.width).toBeLessThan(1.4);
    expect(front.x).toBeGreaterThanOrEqual(0); expect(front.x + front.width).toBeLessThanOrEqual(width);
    const context = (await page.getByTestId('home-deck-context').boundingBox())!;
    const number = page.getByTestId('home-deck-number');
    await expect(number).toHaveText(`No.${String(numbers[cards[0].id]).padStart(3, '0')}`);
    const n = (await number.boundingBox())!, title = (await page.getByTestId('home-deck-title').boundingBox())!;
    expect(n.y).toBeGreaterThanOrEqual(context.y + context.height);
    expect(n.y + n.height).toBeLessThanOrEqual(title.y);
    const essence = page.getByTestId('home-deck-essence');
    expect((await essence.boundingBox())!.y).toBeGreaterThan(title.y + title.height);
    await expect(page.getByTestId('home-deck-title')).toHaveCSS('color', 'rgb(36, 49, 58)');
    const image = page.getByTestId('home-recommendation-card').getByRole('img');
    expect((await image.boundingBox())!.y).toBeGreaterThan((await essence.boundingBox())!.y + (await essence.boundingBox())!.height + 8);
    for (const id of ['home-deck-controls', 'home-deck-next', 'home-deck-previous', 'home-deck-position', 'home-deck-indicators']) await expect(page.getByTestId(id)).toHaveCount(0);
    const shortcuts = page.getByTestId('home-shortcuts');
    await expect(shortcuts.getByRole('link')).toHaveCount(3); await expect(shortcuts.getByRole('button')).toHaveCount(1);
    const boxes = await shortcuts.locator(':scope > *').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { y: r.y, width: r.width, height: r.height }; }));
    expect(boxes).toHaveLength(4); expect(new Set(boxes.map(b => b.y)).size).toBe(1);
    expect(new Set(boxes.map(b => b.height)).size).toBe(1);
    if (width < 700) expect(boxes[0].height).toBeLessThanOrEqual(88);
    const stage = (await page.getByTestId('home-deck-stage').boundingBox())!;
    expect(boxes[0].y - stage.y - stage.height).toBeLessThanOrEqual(12);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`portrait-${width}.png`) });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await turnDeck(page); await expectDeckCursor(page, 1);
    await expect(number).toHaveText(`No.${String(numbers[cards[1].id]).padStart(3, '0')}`);
    await page.getByTestId('home-editorial-see-all').click(); await expect(page).toHaveURL(/\/features$/);
  });
}

test('the same seven cards loop, cancel and shuffle without restoring pagination or remounting the stage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  const first = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
  const order = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).order, key);
  await page.getByTestId('home-deck-stage').evaluate(stage => { (window as any).__portraitStage = stage; });
  for (let i = 0; i < 7; i++) { await turnDeck(page); await ready(page); }
  await expectDeckCursor(page, 0);
  await expect(page.getByTestId('home-recommendation-card')).toHaveAttribute('aria-label', first!);
  expect(await page.getByTestId('home-deck-stage').evaluate(stage => stage === (window as any).__portraitStage)).toBe(true);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).order, key)).toEqual(order);
  await page.getByTestId('home-discovery-refresh').click(); await ready(page);
  for (const id of ['home-deck-controls', 'home-deck-position', 'home-deck-indicators']) await expect(page.getByTestId(id)).toHaveCount(0);
  await expect(page.getByTestId('home-deck-number')).not.toHaveText('No.—');
});
