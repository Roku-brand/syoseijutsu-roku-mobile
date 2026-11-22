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
        const duration = typeof options === 'number' ? options : options?.duration;
        this.setAttribute('data-last-motion-duration', String(duration));
      }
      return original.call(this, frames, options);
    };
  });
  await page.goto('/');
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
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
  await expect(content).toHaveAttribute('data-last-motion', /translateX\(14px\)/);
  await expect(content).toHaveAttribute('data-last-motion-duration', '240');
  expect(await header.evaluate((element, previous) => element === previous, originalHeader)).toBe(true);
  expect(await header.boundingBox()).toEqual(headerBox);
  expect(await nav.boundingBox()).toEqual(navBox);

  await nav.getByRole('link', { name: /^探す/ }).click();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(content).toHaveAttribute('data-last-motion', /translateX\(-14px\)/);
  await nav.getByRole('link', { name: /^学ぶ/ }).click();
  await expect(page).toHaveURL(/\/learn$/);

  await page.getByRole('button', { name: '設定を開く', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(content).toHaveAttribute('data-last-motion', /translateX\(16px\)/);
  await expect(content).toHaveAttribute('data-last-motion-duration', '300');
  await page.goBack();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(content).toHaveAttribute('data-last-motion', /translateX\(-16px\)/);

  await nav.getByRole('link', { name: /^ホーム/ }).click();
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
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

test('one press on any root tab scrolls to its top without reloading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 540 });
  await page.goto('/');
  const nav = page.getByTestId('persistent-bottom-navigation');
  for (const [label, pathname, scrollId] of [
    ['ホーム', '/', 'home-scroll'],
    ['探す', '/discover', 'discover-scroll'],
    ['学ぶ', '/learn', 'learn-scroll'],
    ['マイページ', '/my-os', 'my-page-scroll'],
  ]) {
    const tab = nav.getByRole('link', { name: label, exact: true });
    if (pathname !== '/') await tab.click();
    const scroll = page.getByTestId(scrollId);
    await expect(scroll).toBeVisible();
    await expect.poll(() => scroll.evaluate(node => node.scrollHeight - node.clientHeight)).toBeGreaterThan(50);
    await scroll.evaluate(node => { node.scrollTop = 120; });
    await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(50);
    await tab.click();
    await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBe(0);
    expect(new URL(page.url()).pathname).toBe(pathname);
  }
});

test('switching tabs resumes the last detail, query, and scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 620 });
  await page.goto('/learn');
  const nav = page.getByTestId('persistent-bottom-navigation');
  const learn = nav.getByRole('link', { name: '学ぶ', exact: true });
  const myPage = nav.getByRole('link', { name: 'マイページ', exact: true });
  await page.getByTestId('learning-challenge-1').click();
  await expect(page).toHaveURL(/\/learn\/[^/?]+/);
  const lesson = page.url();

  await myPage.click();
  await page.getByRole('button', { name: '閲覧履歴を開く', exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  await learn.click();
  await expect(page).toHaveURL(lesson);
  await myPage.click();
  await expect(page).toHaveURL(/\/history$/);
  await page.getByTestId('book-header-back').click();
  await expect(page).toHaveURL(/\/my-os$/);

  await learn.click();
  await expect(page).toHaveURL(lesson);
  await learn.click();
  await expect(page).toHaveURL(/\/learn$/);
  const scroll = page.getByTestId('learn-scroll').filter({ visible: true });
  await scroll.evaluate(node => { node.scrollTop = 120; });
  const top = await scroll.evaluate(node => node.scrollTop);
  expect(top).toBeGreaterThan(0);
  await myPage.click();
  await expect(page).toHaveURL(/\/my-os$/);
  await learn.click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBe(top);

  await page.goto('/search?mode=theories&q=初頭効果');
  const search = page.url();
  await myPage.click();
  await nav.getByRole('link', { name: '探す', exact: true }).click();
  await expect(page).toHaveURL(search);
});

test('the browser owns the vertical scrollbar and the reading header stays fixed', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 620 });
  await page.goto('/subcategory/interpersonal/' + encodeURIComponent('印象がいい人'));
  const intro = page.getByTestId('persona-page-intro');
  const scroll = page.getByTestId('persona-technique-scroll');
  await expect(page.getByTestId('persona-technique-list').getByRole('link').first()).toBeVisible();
  await expect(scroll).toHaveCSS('overflow-y', 'auto');
  await expect(scroll).toHaveCSS('scrollbar-width', 'auto');
  await expect(scroll).toHaveCSS('scrollbar-color', 'auto');
  await expect(page.getByTestId('vertical-scroll-indicator')).toHaveCount(0);
  expect(await scroll.evaluate(node => getComputedStyle(node, '::-webkit-scrollbar').display)).not.toBe('none');
  const headline = await intro.boundingBox();
  const viewport = await scroll.boundingBox();
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
  expect(await scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  expect(await intro.boundingBox()).toEqual(headline);
  expect(await scroll.boundingBox()).toEqual(viewport);
});
