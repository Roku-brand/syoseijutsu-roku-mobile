import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const theories = JSON.parse(fs.readFileSync('src/data/generated/theories.json', 'utf8'));
const subcategories = JSON.parse(fs.readFileSync('src/data/generated/theory-subcategories.json', 'utf8'));
const psychology = subcategories.filter((s: any) => s.categoryId === 'psychology');

async function expectCategory(page: Page, id?: string) {
  const current = page.getByTestId('theory-subcategory-tab');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => new URL(page.url()).searchParams.get('subcategory')).toBe(id ?? null);
  const title = id ? psychology.find((s: any) => s.id === id).title : 'すべて';
  await expect(current).toHaveAccessibleName(`${title}で内部分類を絞り込む`);
  const count = theories.filter((t: any) => t.categoryId === 'psychology' && (!id || t.subcategoryId === id)).length;
  await expect(page.getByTestId('theory-index-row-card')).toHaveCount(count);
  await expect(current).toContainText(String(count));
}

for (const width of [320, 393, 768, 1440]) test(`内部分類は1つだけ表示し矢印・キー・URLで切り替わる ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.route('**/rest/v1/**', r => r.fulfill({ status: 503, json: {} }));
  await page.goto('/theories?category=psychology');
  await expectCategory(page);
  const next = page.getByRole('button', { name: '次の内部分類を表示', exact: true });
  const previous = page.getByRole('button', { name: '前の内部分類を表示', exact: true });
  await expect(previous).toBeDisabled();
  for (const subcategory of psychology) {
    await next.click();
    await expectCategory(page, subcategory.id);
  }
  await expect(next).toBeDisabled();
  await previous.click();
  await expectCategory(page, psychology.at(-2).id);
  await page.reload();
  await expectCategory(page, psychology.at(-2).id);
  await page.getByTestId('theory-subcategory-tab').focus();
  await page.keyboard.press('ArrowRight');
  await expectCategory(page, psychology.at(-1).id);
  await page.keyboard.press('ArrowLeft');
  await expectCategory(page, psychology.at(-2).id);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const current = page.getByTestId('theory-subcategory-tab');
  const viewport = page.getByTestId('theory-subcategory-scroll');
  expect(await current.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
  expect(await viewport.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`single-category-${width}.png`) });
  await page.getByRole('button', { name: '行動科学で理論を絞り込む', exact: true }).click();
  await expect(page.getByTestId('theory-subcategory-tab')).toHaveAccessibleName('すべてで内部分類を絞り込む');
  await expect(previous).toBeDisabled();
  expect(new URL(page.url()).searchParams.get('subcategory')).toBeNull();
});

for (const width of [320, 393, 768, 1440]) test(`スワイプとホイールで表示中の1分類だけを切り替える ${width}px`, async ({ page, context }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.route('**/rest/v1/**', r => r.fulfill({ status: 503, json: {} }));
  await page.goto('/theories?category=psychology');
  await expectCategory(page);
  await expect(page.locator('#roku-launch')).toBeHidden();
  const scroll = page.getByTestId('theory-subcategory-scroll');
  const box = (await scroll.boundingBox())!;
  const y = box.y + box.height / 2, left = box.x + 20, right = box.x + box.width - 20;
  const session = await context.newCDPSession(page);
  const swipe = async (x1: number, y1: number, x2: number, y2: number, cancel = false) => {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
    for (let i = 1; i <= 10; i++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / 10, y: y1 + (y2 - y1) * i / 10 }] });
      await page.evaluate(() => new Promise<void>(resolve => { requestAnimationFrame(() => resolve()); }));
    }
    await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
  };
  await swipe(right, y, left, y); await expectCategory(page, psychology[0].id);
  await swipe(right, y, left, y); await expectCategory(page, psychology[1].id);
  await swipe(left, y, right, y); await expectCategory(page, psychology[0].id);
  await swipe(right, y, right - 22, y); await expectCategory(page, psychology[0].id);
  await swipe(right, y, left, y, true); await expectCategory(page, psychology[0].id);
  const burstStart = Date.now() / 1000;
  for (const [index, delta] of [900, 500, 120, 20].entries()) {
    await session.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: (left + right) / 2, y, deltaX: delta, deltaY: 0, timestamp: burstStart + index * 0.04 });
  }
  await expectCategory(page, psychology[1].id);
  await page.waitForTimeout(340);
  await page.mouse.move((left + right) / 2, y);
  await page.mouse.wheel(-900, 0); await expectCategory(page, psychology[0].id);
  await page.waitForTimeout(220);
  await page.keyboard.down('Shift'); await page.mouse.wheel(0, 900); await page.keyboard.up('Shift');
  await expectCategory(page, psychology[1].id);
  await scroll.evaluate(el => { for (let p = el.parentElement; p; p = p.parentElement) if (p.scrollHeight > p.clientHeight + 50 && ['auto', 'scroll'].includes(getComputedStyle(p).overflowY)) { p.dataset.qaVertical = 'true'; break; } });
  const vertical = page.locator('[data-qa-vertical]');
  const before = await vertical.evaluate(el => el.scrollTop);
  await swipe((left + right) / 2, y, (left + right) / 2, y - 140);
  await expect.poll(() => vertical.evaluate(el => el.scrollTop)).toBeGreaterThan(before + 40);
  await expectCategory(page, psychology[1].id);
});

test('完全版の新規本文は匿名に出ない', async ({ page }) => {
  await page.route('**/rest/v1/**', r => r.fulfill({ status: 503, json: {} }));
  await page.goto('/theory/kb_957');
  await expect(page).toHaveURL(/upgrade/);
  await expect(page.getByTestId('theory-summary')).toHaveCount(0);
});
