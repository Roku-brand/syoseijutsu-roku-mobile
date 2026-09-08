import { expect, test } from '@playwright/test';

for (const width of [390, 1440]) {
test(`navigation at ${width}px animates content, keeps chrome fixed, and reverses on back`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (this.getAttribute('data-testid') === 'route-transition-content') {
        this.setAttribute('data-last-motion', JSON.stringify(frames));
      }
      return original.call(this, frames, options);
    };
  });
  await page.goto('/discover');
  const content = page.getByTestId('route-transition-content');
  const header = page.getByTestId('book-header');
  const nav = page.getByTestId('persistent-bottom-navigation');
  await expect(header).toBeVisible();
  const originalHeader = await header.elementHandle();
  const headerBox = await header.boundingBox();
  const navBox = await nav.boundingBox();

  await nav.getByRole('link', { name: /^学ぶ/ }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(content).toHaveAttribute('data-last-motion', /translateY\(4px\)/);
  expect(await header.evaluate((element, previous) => element === previous, originalHeader)).toBe(true);
  expect(await header.boundingBox()).toEqual(headerBox);
  expect(await nav.boundingBox()).toEqual(navBox);

  await page.getByRole('button', { name: '設定を開く', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(content).toHaveAttribute('data-last-motion', /translateX\(16px\)/);
  await page.goBack();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(content).toHaveAttribute('data-last-motion', /translateX\(-16px\)/);

  await page.getByTestId('header-upgrade-banner').click();
  await expect(page).toHaveURL(/\/upgrade/);
  await expect(content).toHaveAttribute('data-last-motion', /translateY\(20px\)/);
  await page.getByRole('button', { name: '前の画面へ戻る' }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(content).toHaveAttribute('data-last-motion', /translateY\(-20px\)/);
  await expect.poll(() => content.evaluate((element) => element.getAnimations().length)).toBe(0);
  expect(await content.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  await page.screenshot({ path: test.info().outputPath('navigation.png') });
});
}

test('reduced motion disables transitions and rapid tab changes remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/discover');
  const content = page.getByTestId('route-transition-content');
  const nav = page.getByTestId('persistent-bottom-navigation');
  await expect(nav).toBeVisible();
  for (const name of [/^学ぶ/, /^マイページ/, /^探す/]) {
    await nav.getByRole('link', { name }).click();
    expect(await content.evaluate((element) => element.getAnimations().length)).toBe(0);
    expect(await content.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
  }
  await expect(page).toHaveURL(/\/discover$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
