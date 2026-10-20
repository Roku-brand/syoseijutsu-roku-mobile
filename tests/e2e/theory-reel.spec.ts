import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const theories = JSON.parse(fs.readFileSync('src/data/generated/theories.json', 'utf8'));
const subcategories = JSON.parse(fs.readFileSync('src/data/generated/theory-subcategories.json', 'utf8'));
const psychology = subcategories.filter((s: any) => s.categoryId === 'psychology');
const redirects = JSON.parse(fs.readFileSync('src/data/generated/theory-subcategory-redirects.json', 'utf8'));
const scrollPosition = (page: Page) => page.getByTestId('theory-subcategory-scroll').evaluate(el => el.scrollLeft);

async function expectCategory(page: Page, id?: string, category = 'psychology') {
  const current = page.getByTestId('theory-subcategory-tab');
  const sections = subcategories.filter((s: any) => s.categoryId === category);
  const index = id ? sections.findIndex((s: any) => s.id === id) + 1 : 0;
  const title = id ? sections.find((s: any) => s.id === id).title : 'すべて';
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute('aria-selected', 'true');
  await expect(current).toHaveAccessibleName(`${title}で内部分類を絞り込む`);
  await expect.poll(() => { const value = new URL(page.url()).searchParams.get('subcategory'); return value ? redirects[value] ?? value : null; }).toBe(id ?? null);
  const count = theories.filter((t: any) => t.categoryId === category && (!id || t.subcategoryId === id)).length;
  await expect(page.getByTestId('theory-index-row-card')).toHaveCount(count);
  await expect(page.getByTestId('theory-index-count')).toHaveText(`${count}件`);
  await expect(page.getByTestId('theory-subcategory-position')).toHaveText(`${index + 1} / ${sections.length + 1}`);
  await expect(page.getByTestId('theory-subcategory-indicator-active')).toHaveCount(1);
  await expect.poll(async () => {
    const [item, viewport] = await Promise.all([current.boundingBox(), page.getByTestId('theory-subcategory-scroll').boundingBox()]);
    return Math.abs(item!.x + item!.width / 2 - viewport!.x - viewport!.width / 2);
  }).toBeLessThan(1.5);
}

async function clickPreview(page: Page, title: string) {
  const viewport = (await page.getByTestId('theory-subcategory-scroll').boundingBox())!;
  const target = (await page.getByRole('button', { name: `${title}で内部分類を絞り込む`, exact: true }).boundingBox())!;
  const x = Math.max(viewport.x + 12, Math.min(viewport.x + viewport.width - 12, target.x + target.width / 2));
  await page.mouse.click(x, viewport.y + viewport.height / 2);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

for (const width of [320, 393, 768, 1440]) test(`背景なしのテキストリールは中央・左右の名称と位置を表示する ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/theories?category=psychology&subcategory=psychology-s');
  await expectCategory(page, 'psychology-s');
  await expect(page.locator('#roku-launch')).toBeHidden();
  await expect(page.getByRole('button', { name: /^(前|次)の内部分類を表示$/ })).toHaveCount(0);
  await expect(page.getByTestId('theory-index-list').getByRole('heading')).toHaveCount(0);
  const current = page.getByTestId('theory-subcategory-tab');
  expect(await current.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect((await page.getByTestId('theory-subcategory-reel').boundingBox())!.height).toBeLessThanOrEqual(100);
  const underline = await page.getByTestId('theory-subcategory-underline').boundingBox();
  expect(underline!.width).toBeGreaterThanOrEqual(48); expect(underline!.width).toBeLessThanOrEqual(56);
  expect(underline!.height).toBeGreaterThanOrEqual(2); expect(underline!.height).toBeLessThanOrEqual(3);
  const viewport = (await page.getByTestId('theory-subcategory-scroll').boundingBox())!;
  for (const title of ['感情・ストレス', '人間関係・コミュニケーション']) {
    const neighbor = (await page.getByRole('button', { name: `${title}で内部分類を絞り込む`, exact: true }).boundingBox())!;
    const visible = Math.min(neighbor.x + neighbor.width, viewport.x + viewport.width) - Math.max(neighbor.x, viewport.x);
    expect(visible).toBeGreaterThan(20); expect(visible).toBeLessThan(neighbor.width / 2);
  }
  await clickPreview(page, '人間関係・コミュニケーション');
  await expectCategory(page, 'psychology-i');
  await expect(page.getByRole('heading', { name: '人間関係・コミュニケーション', exact: true })).toHaveCount(1);
  await clickPreview(page, '自己理解・成長');
  await expectCategory(page, 'psychology-s');
  await page.reload(); await expectCategory(page, 'psychology-s');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`text-reel-${width}.png`) });
});

test('すべては実データの見出しと件数、個別選択は重複見出しを省いてURLと同期する', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/theories?category=psychology');
  await expectCategory(page);
  for (const section of psychology) {
    const heading = page.getByTestId('theory-index-list').getByRole('heading', { name: section.title, exact: true });
    await expect(heading).toBeVisible();
    await expect(heading.locator('..')).toContainText(`${theories.filter((t: any) => t.subcategoryId === section.id).length}件`);
  }
  for (const section of psychology) {
    await page.getByTestId('theory-subcategory-tab').focus(); await page.keyboard.press('ArrowRight');
    await expectCategory(page, section.id);
    await expect(page.getByTestId('theory-index-list').getByRole('heading')).toHaveCount(0);
  }
  const end = await scrollPosition(page);
  await page.keyboard.press('ArrowRight'); await expectCategory(page, psychology.at(-1).id);
  expect(await scrollPosition(page)).toBeCloseTo(end, 0);
  await page.keyboard.press('Home'); await expectCategory(page);
  await page.keyboard.press('ArrowLeft'); await expectCategory(page); expect(await scrollPosition(page)).toBe(0);
  await page.keyboard.press('End'); await expectCategory(page, psychology.at(-1).id);
  await page.getByRole('button', { name: '行動科学で理論を絞り込む', exact: true }).click();
  await expectCategory(page, undefined, 'behavioral-science');
});

for (const width of [320, 393]) test(`タッチで指に追従し最寄りへスナップ、端では止まり縦スクロールを保つ ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/theories?category=psychology'); await expectCategory(page);
  await expect(page.locator('#roku-launch')).toBeHidden();
  const viewport = page.getByTestId('theory-subcategory-scroll');
  const box = (await viewport.boundingBox())!;
  const slot = (await page.getByTestId('theory-subcategory-tab').boundingBox())!.width;
  const session = await context.newCDPSession(page);
  const swipe = async (distance: number, cancel = false) => {
    const x = box.x + box.width * (distance > 0 ? 0.8 : 0.2), y = box.y + box.height / 2;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 8; i++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - distance * i / 8, y }] });
      await page.evaluate(() => new Promise<void>(resolve => { requestAnimationFrame(() => resolve()); }));
    }
    const during = await scrollPosition(page);
    await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
    return during;
  };
  expect(await swipe(slot * 0.72)).toBeGreaterThan(slot * 0.4); await expectCategory(page, psychology[0].id);
  await swipe(slot * 0.25); await expectCategory(page, psychology[0].id);
  await swipe(-slot * 0.72); await expectCategory(page);
  await swipe(-slot * 0.72); await expectCategory(page); expect(await scrollPosition(page)).toBe(0);
  await swipe(slot * 0.72, true); await expectCategory(page);
  await viewport.evaluate(el => { for (let parent = el.parentElement; parent; parent = parent.parentElement) if (parent.scrollHeight > parent.clientHeight + 50 && ['auto', 'scroll'].includes(getComputedStyle(parent).overflowY)) { parent.dataset.qaVertical = 'true'; break; } });
  const vertical = page.locator('[data-qa-vertical]'); const before = await vertical.evaluate(el => el.scrollTop);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 140 * i / 8 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => vertical.evaluate(el => el.scrollTop)).toBeGreaterThan(before + 30);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test.describe('PCの入力', () => {
  test.use({ isMobile: false, hasTouch: false, deviceScaleFactor: 1, viewport: { width: 1440, height: 900 } });
test('ホイール・キーボード・連続操作も実スクロールと分類を一致させる', async ({ page }) => {
  await page.goto('/theories?category=psychology'); await expectCategory(page);
  await expect(page.locator('#roku-launch')).toBeHidden();
  const viewport = (await page.getByTestId('theory-subcategory-scroll').boundingBox())!;
  const slot = (await page.getByTestId('theory-subcategory-tab').boundingBox())!.width;
  await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
  await page.mouse.wheel(slot * 0.72, 0); await expectCategory(page, psychology[0].id);
  await page.getByTestId('theory-subcategory-tab').focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expectCategory(page, psychology[3].id);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft');
  await expectCategory(page, psychology[2].id);
});
});

for (const width of [320, 1440]) test(`分類名は自然にスクロールしアニメーション中も端を越えない ${width}px`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width, height: 900 });
  await page.goto('/theories?category=psychology'); await expectCategory(page);
  await expect(page.locator('#roku-launch')).toBeHidden();
  await clickPreview(page, psychology[0].title);
  await expect.poll(() => scrollPosition(page), { intervals: [16] }).toBeGreaterThan(3);
  await expectCategory(page, psychology[0].id);
  await page.getByTestId('theory-subcategory-tab').focus(); await page.keyboard.press('End');
  await expectCategory(page, psychology.at(-1).id);
  const end = await scrollPosition(page);
  await page.keyboard.press('ArrowRight'); await expectCategory(page, psychology.at(-1).id);
  expect(await scrollPosition(page)).toBeCloseTo(end, 0);
});

test('動きを減らす設定と外部URL・大分類変更・画面幅変更に従う', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/theories?category=psychology'); await expectCategory(page);
  await expect(page.locator('#roku-launch')).toBeHidden();
  await clickPreview(page, psychology[0].title); await expectCategory(page, psychology[0].id);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await clickPreview(page, psychology[1].title);
  await page.getByRole('button', { name: '行動科学で理論を絞り込む', exact: true }).click();
  await expectCategory(page, undefined, 'behavioral-science');
  await page.waitForTimeout(250); expect(new URL(page.url()).searchParams.get('subcategory')).toBeNull();
  await page.goto('/theories?category=psychology&subcategory=psychology-d'); await expectCategory(page, 'psychology-s');
  await page.setViewportSize({ width: 320, height: 900 }); await expectCategory(page, 'psychology-s');
  await page.getByTestId('theory-subcategory-tab').focus(); await page.keyboard.press('ArrowRight');
  await expectCategory(page, 'psychology-i');
});

test('狭い画面・長い分類名・文字拡大でも文字とプレビューが重ならない', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/theories?category=psychology&subcategory=psychology-i'); await expectCategory(page, 'psychology-i');
  await expect(page.locator('#roku-launch')).toBeHidden();
  await page.addStyleTag({ content: '[data-testid="theory-subcategory-reel"] [role="heading"] { font-size: 30px !important; line-height: 39px !important; }' });
  const title = page.getByRole('heading', { name: '人間関係・コミュニケーション', exact: true });
  await expect.poll(() => title.evaluate(el => {
    const text = document.createRange(); text.selectNodeContents(el);
    const rect = text.getBoundingClientRect(), item = el.closest('[role="button"]')!.getBoundingClientRect();
    return rect.height <= item.height + 1 && rect.width <= item.width + 1;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('text-reel-enlarged.png') });
});

test('完全版の新規本文は匿名に出ない', async ({ page }) => {
  await page.goto('/theory/kb_957');
  await expect(page).toHaveURL(/upgrade/);
  await expect(page.getByTestId('theory-summary')).toHaveCount(0);
});
