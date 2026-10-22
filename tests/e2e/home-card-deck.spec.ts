import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

for (const width of [320, 390, 1440]) {
  test(`おすすめを裏返して回収し、新しい裏向きのカードを配ってめくる (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const deck = page.getByTestId('home-recommendation-deck');
    const button = page.getByTestId('home-discovery-refresh');
    const cards = page.getByTestId('home-recommendation-card');
    await expect(cards).toHaveCount(7);
    await button.scrollIntoViewIfNeeded();
    const before = await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    const height = (await deck.boundingBox())!.height;

    // Sample actual painted faces and positions, so a text-only replacement cannot pass.
    await page.evaluate(() => {
      const frames: { labels: (string | null)[]; front: number[]; back: number[]; x: number; height: number }[] = [];
      (window as any).__deckFrames = frames;
      const sample = () => {
        const root = document.querySelector('[data-testid="home-recommendation-deck"]')!;
        const slot = root.querySelector('[data-testid="home-deck-slot"]')!;
        frames.push({
          labels: [...root.querySelectorAll('[data-testid="home-recommendation-card"]')].map(node => node.getAttribute('aria-label')),
          front: [...root.querySelectorAll('[data-testid="home-deck-front"]')].map(node => Number(getComputedStyle(node).opacity)),
          back: [...root.querySelectorAll('[data-testid="home-deck-back"]')].map(node => Number(getComputedStyle(node).opacity)),
          x: new DOMMatrix(getComputedStyle(slot).transform).m41,
          height: root.getBoundingClientRect().height,
        });
        if (!(window as any).__deckStop) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await button.click();
    await expect(button).toBeDisabled();
    await expect(deck).toHaveAttribute('aria-busy', 'true');
    await expect(cards.first()).toHaveAttribute('aria-disabled', 'true');
    // A second activation while collecting must not queue another replacement.
    await button.dispatchEvent('click');
    await expect(button).toBeEnabled();
    await expect(deck).toHaveAttribute('aria-busy', 'false');
    const after = await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    expect(after).not.toEqual(before);
    const frames = await page.evaluate(() => { (window as any).__deckStop = true; return (window as any).__deckFrames; });
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    expect(frames.some((frame: any) => same(frame.labels, before) && frame.back.every((value: number) => value === 1) && frame.front.every((value: number) => value === 0))).toBe(true);
    expect(frames.some((frame: any) => same(frame.labels, before) && frame.x < -40)).toBe(true);
    expect(frames.some((frame: any) => same(frame.labels, after) && frame.x > 40 && frame.front.every((value: number) => value === 0))).toBe(true);
    expect(frames.some((frame: any) => same(frame.labels, after) && frame.front[0] === 1 && frame.front[2] === 0)).toBe(true);
    expect(frames.every((frame: any) => Math.abs(frame.height - height) < 1)).toBe(true);
    await expect(page.getByTestId('home-deck-front').first()).toHaveCSS('opacity', '1');
    await expect(page.getByTestId('home-deck-back').first()).toHaveCSS('opacity', '0');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`deck-after-${width}.png`) });

    const rail = page.getByTestId('home-recommendation-rail');
    await rail.evaluate(element => { element.scrollLeft = 500; });
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(100);
    await button.click();
    await expect(button).toBeDisabled();
    await expect(button).toBeEnabled();
    await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBe(0);
    await cards.first().click();
    await expect(page).toHaveURL(/\/(card|theory)\//);
  });
}

test('動きを減らす設定では回転や移動を省いて入れ替え、キーボードでも使える', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const button = page.getByTestId('home-discovery-refresh');
  const cards = page.getByTestId('home-recommendation-card');
  await expect(cards).toHaveCount(7);
  const before = await cards.allTextContents();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => cards.allTextContents()).not.toEqual(before);
  await expect(button).toBeEnabled();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
  for (const front of await page.getByTestId('home-deck-front').all()) await expect(front).toHaveCSS('opacity', '1');
  for (const back of await page.getByTestId('home-deck-back').all()) await expect(back).toHaveCSS('opacity', '0');
});

test('演出中に動きを減らす設定へ変更しても操作が復帰する', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const button = page.getByTestId('home-discovery-refresh');
  await button.click();
  await expect(button).toBeDisabled();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(button).toBeEnabled();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByTestId('home-deck-front').first()).toHaveCSS('opacity', '1');
  const before = await page.getByTestId('home-recommendation-card').allTextContents();
  await button.click();
  await expect.poll(() => page.getByTestId('home-recommendation-card').allTextContents()).not.toEqual(before);
});
