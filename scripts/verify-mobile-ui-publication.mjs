import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const site = process.env.PUBLICATION_SITE ?? 'https://app.shoseijutsuroku.com';
const output = 'test-results/production-mobile-ui';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const checks = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await context.addInitScript(() => localStorage.setItem('@shoseijutsu-roku/installation-welcome/v1', 'done'));
  const page = await context.newPage();
  const ready = async (path) => {
    await page.goto(site + path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('book-header')).toBeVisible();
    await expect(page.locator('#roku-launch')).toBeHidden();
  };
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await ready('/');
    await expect(page.getByTestId('home-premium-heading')).toHaveText('論理性 × 網羅性 × 体系性');
    await expect(page.getByTestId('home-premium-tagline')).toHaveText('知識を、もっと広く。もっと深く。');
    await expect(page.getByTestId('home-premium-price')).toHaveText('30日間・320円（税込）');
    await page.screenshot({ path: `${output}/home-${width}.png` });
    await page.getByTestId('book-header').getByRole('button', { name: '検索', exact: true }).click();
    const popup = page.getByTestId('header-search-popup');
    expect(await popup.getByRole('textbox').evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    await expect(popup.getByRole('tab')).toHaveCount(3);
    await ready('/features/');
    const hero = page.getByTestId('features-hero');
    await expect(hero).toBeVisible();
    const box = await hero.boundingBox();
    if (width < 700) expect(box.width / box.height).toBeGreaterThan(1.5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(hero.locator('img')).toHaveJSProperty('complete', true);
    await page.screenshot({ path: `${output}/features-${width}.png` });
    checks.push({ width, searchFont: '>=16px', banner: 'passed', featureHero: { width: box.width, height: box.height } });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await ready('/');
  await page.getByRole('tab', { name: '1枚目を表示', exact: true }).click();
  await expect(page.getByRole('tab', { name: '2枚目を表示', exact: true })).toHaveAttribute('aria-selected', 'true', { timeout: 7_000 });
  checks.push({ reel: 'advanced after 5 seconds' });
  await page.getByTestId('home-create-technique').click();
  const input = page.getByRole('textbox', { name: 'マイ処世術', exact: true });
  await expect(input).toBeVisible();
  await expect(input).not.toBeFocused();
  await expect(page.getByRole('button', { name: /閉じる/ })).toHaveCount(1);
  await page.screenshot({ path: `${output}/composer.png` });
  await input.tap();
  await expect(input).toBeFocused();
  await page.getByRole('button', { name: '作成を閉じる', exact: true }).click();
  checks.push({ composer: 'single bottom close, keyboard focus only after tap' });
  const cdp = await context.newCDPSession(page);
  const swipe = async (from, to) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 180, y: from }] });
    for (let step = 1; step <= 10; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y: from + (to - from) * step / 10 }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(300);
  };
  for (const path of ['/', '/theories', '/features/five-guidelines']) {
    await ready(path);
    if (path.startsWith('/features/')) await expect(page.getByTestId('feature-body')).toBeVisible();
    const position = () => page.evaluate(() => Math.max(0, ...Array.from(document.querySelectorAll('*')).filter(el => el.clientHeight > 300 && el.scrollHeight > el.clientHeight && ['auto', 'scroll'].includes(getComputedStyle(el).overflowY)).map(el => el.scrollTop)));
    await swipe(650, 200);
    const down = await position();
    expect(down).toBeGreaterThan(30);
    await swipe(220, 700);
    await expect.poll(position).toBeLessThan(down);
    checks.push({ path, scrollDown: down, scrollUp: await position() });
  }
  await writeFile(`${output}/result.json`, JSON.stringify({ site, checkedAt: new Date().toISOString(), checks }, null, 2));
  console.log(JSON.stringify({ site, checks }));
  await context.close();
} finally {
  await browser.close();
}
