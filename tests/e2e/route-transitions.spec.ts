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
  await expect(scroll.locator('..').getByTestId('vertical-scroll-indicator')).toHaveCSS('pointer-events', 'auto');
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

test('the vertical scroll indicator follows the body and fades without shifting the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 620 });
  await page.goto('/subcategory/interpersonal/' + encodeURIComponent('印象がいい人'));
  const intro = page.getByTestId('persona-page-intro');
  const scroll = page.getByTestId('persona-technique-scroll');
  const indicator = scroll.locator('..').getByTestId('vertical-scroll-indicator');
  await expect(page.getByTestId('persona-technique-list').getByRole('link').first()).toBeVisible();
  await expect(indicator).toHaveCSS('opacity', '0');
  const headline = await intro.boundingBox();
  const viewport = await scroll.boundingBox();
  await scroll.evaluate(node => { node.scrollTop = 180; });
  await expect(indicator).toHaveCSS('opacity', '1');
  const first = (await indicator.boundingBox())!;
  await scroll.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect.poll(async () => (await indicator.boundingBox())!.y).toBeGreaterThan(first.y);
  await expect(indicator).toHaveCSS('opacity', '0');
  expect(await intro.boundingBox()).toEqual(headline);
  expect(await scroll.boundingBox()).toEqual(viewport);
  expect(first.x + first.width).toBeGreaterThan(viewport!.x + viewport!.width - 10);
});

test('a touch holds the scrollbar in place, then expands it and lets the finger drag', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch input is Chromium specific');
  await page.setViewportSize({ width: 390, height: 620 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'userActivation', {
      get: () => ({ hasBeenActive: !document.documentElement.hasAttribute('data-activate-on-release') }),
    });
    window.addEventListener('touchend', () => {
      document.documentElement.removeAttribute('data-activate-on-release');
    }, true);
    navigator.vibrate = (duration) => {
      const root = document.documentElement;
      root.dataset.scrollbarVibrations = [root.dataset.scrollbarVibrations, duration].filter(Boolean).join(',');
      return true;
    };
  });
  await page.goto('/learn');
  await expect(page.getByTestId('learning-challenge-1')).toBeVisible();
  const scroll = page.getByTestId('learn-scroll');
  const thumb = scroll.locator('..').getByTestId('vertical-scroll-indicator');
  const paint = thumb.locator(':scope > div');
  const thumbColor = 'rgba(45, 45, 45, 0.44)';
  await expect(thumb).toHaveCSS('pointer-events', 'none');
  await expect(paint).toHaveCSS('width', '3px');
  await expect(paint).toHaveCSS('background-color', thumbColor);
  const scrollBox = (await scroll.boundingBox())!;
  const session = await context.newCDPSession(page);
  const root = page.locator('html');
  const revealThumb = async (progress: number) => {
    const oldPosition = await thumb.evaluate(node => node.style.transform);
    const top = await scroll.evaluate((node, progress) => {
      node.scrollTop = (node.scrollHeight - node.clientHeight) * progress;
      return node.scrollTop;
    }, progress);
    await expect.poll(() => thumb.evaluate(node => node.style.transform)).not.toBe(oldPosition);
    await expect(thumb).toHaveCSS('pointer-events', 'auto');
    const box = (await thumb.boundingBox())!;
    return { top, x: box.x + box.width - 6, y: box.y + box.height / 2 };
  };
  const tap = await revealThumb(0.3);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tap.x, y: tap.y }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: tap.x, y: tap.y + 4 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await scroll.evaluate(node => node.scrollTop)).toBe(tap.top);
  await expect(paint).toHaveCSS('width', '3px');
  await expect(root).not.toHaveAttribute('data-scrollbar-vibrations');

  const { top, x, y } = await revealThumb(0.45);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  try {
    await expect(paint).toHaveCSS('width', '7px');
    await expect(paint).toHaveCSS('background-color', thumbColor);
    await expect(root).toHaveAttribute('data-scrollbar-vibrations', '35');
    expect(await scroll.evaluate(node => node.scrollTop)).toBe(top);
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 14 }] });
    await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBeGreaterThan(top);
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: scrollBox.y + scrollBox.height - 2 }] });
    await expect.poll(() => scroll.evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop)).toBeLessThan(2);
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: scrollBox.y + 2 }] });
    await expect.poll(() => scroll.evaluate(node => node.scrollTop)).toBe(0);
    await expect(thumb).toHaveCSS('opacity', '1');
    await expect(root).toHaveAttribute('data-scrollbar-vibrations', '35');
  } finally {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await expect(paint).toHaveCSS('width', '3px');
  await expect(root).toHaveAttribute('data-scrollbar-vibrations', '35');

  await root.evaluate(node => node.setAttribute('data-activate-on-release', ''));
  const firstGesture = await revealThumb(0.6);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: firstGesture.x, y: firstGesture.y }] });
  try {
    await expect(paint).toHaveCSS('width', '7px');
    await expect(root).toHaveAttribute('data-scrollbar-vibrations', '35');
  } finally {
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await expect(root).toHaveAttribute('data-scrollbar-vibrations', '35,35');
  await expect(paint).toHaveCSS('width', '3px');
  await expect(thumb).toHaveCSS('opacity', '0');
  await expect(thumb).toHaveCSS('pointer-events', 'none');
});
