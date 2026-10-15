import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const site = 'https://app.shoseijutsuroku.com';
const output = 'docs/ui/feature-thumbnails-20261015';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1500 }, serviceWorkers: 'block' });
  await page.addInitScript(() => {
    localStorage.setItem('@shoseijutsu-roku/installation-welcome/v1', 'done');
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__publicationSharedUrl = text; } } });
  });
  const { expect } = await import('@playwright/test');
  await page.goto(`${site}/features`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('feature-thumbnail-headline')).toHaveCount(6, { timeout: 30_000 });
  await expect(page.locator('#roku-launch')).toBeHidden();
  const sources = [];
  for (const thumbnail of await page.getByTestId('feature-thumbnail').all()) {
    const image = thumbnail.locator('img');
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate(element => element.naturalWidth)).toBeGreaterThan(100);
    sources.push(await image.getAttribute('src'));
  }
  expect(new Set(sources).size).toBe(6);
  await page.screenshot({ path: `${output}/production-desktop.png`, fullPage: true });
  await page.getByTestId('book-header').getByRole('button', { name: /検索/ }).click();
  await expect(page).toHaveURL(`${site}/features`);
  const popup = page.getByTestId('header-search-popup');
  await expect(popup.getByRole('tab')).toHaveCount(3);
  await expect(popup.getByRole('tab', { name: '特集', exact: true })).toHaveAttribute('aria-selected', 'true');
  await popup.getByRole('textbox').fill('年齢');
  await popup.getByRole('textbox').press('Enter');
  await page.getByTestId('search-page-results').getByRole('link', { name: 'なぜ私たちは、年齢に焦るのかを読む', exact: true }).click();
  await expect(page.getByTestId('feature-body')).toBeVisible();
  const header = page.getByTestId('book-header');
  await header.getByRole('button', { name: '蔵書に保存', exact: true }).click();
  await page.reload();
  await expect(header.getByRole('button', { name: '蔵書から外す', exact: true })).toBeVisible();
  await header.getByRole('button', { name: /共有/ }).click();
  await expect.poll(() => page.evaluate(() => window.__publicationSharedUrl)).toBe(`${site}/features/the-secret-behind-age`);
  await header.getByRole('button', { name: '蔵書から外す', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.goto(`${site}/features`);
  await expect(page.getByTestId('feature-thumbnail-headline')).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await expect(page.locator('#roku-launch')).toBeHidden();
  await page.screenshot({ path: `${output}/production-mobile.png`, fullPage: true });
  console.log(JSON.stringify({ site, thumbnails: 6, distinctImages: 6, popup: 'passed', search: 'passed', headerSaveShare: 'passed', mobileOverflow: false }));
} finally {
  await browser.close();
}
