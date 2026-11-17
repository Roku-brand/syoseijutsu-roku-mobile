import { expect, test, type Page } from '@playwright/test';

const storageKey = '@shoseijutsu-roku/discovery-deck/v1/free';
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
};
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

for (const width of [320, 375, 390, 430, 768, 1440]) {
  test(`reading-first home, four tiles and the editorial shelf at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.goto('/'); await ready(page);
    const front = (await page.getByTestId('home-deck-front').boundingBox())!;
    expect(front.height).toBeGreaterThanOrEqual(306);
    expect(front.x).toBeGreaterThanOrEqual(0);
    expect(front.x + front.width).toBeLessThanOrEqual(width);
    const shortcuts = page.getByTestId('home-shortcuts');
    await expect(shortcuts.getByRole('link')).toHaveCount(3);
    await expect(shortcuts.getByRole('button')).toHaveCount(1);
    await expect(page.getByTestId('home-shortcut-features')).toHaveCount(0);
    const boxes = await shortcuts.locator(':scope > *').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
    expect(boxes).toHaveLength(4);
    expect(new Set(boxes.map(box => box.y)).size).toBe(1);
    expect(new Set(boxes.map(box => box.height)).size).toBe(1);
    expect(Math.max(...boxes.map(box => box.width)) - Math.min(...boxes.map(box => box.width))).toBeLessThan(1);
    const controls = (await page.getByTestId('home-deck-controls').boundingBox())!;
    expect(controls.y).toBeGreaterThan(front.y + front.height);
    const banner = (await page.getByTestId('home-premium-banner').boundingBox())!;
    expect(banner.y).toBeGreaterThan(boxes[0].y + boxes[0].height);
    const editorial = page.getByTestId('home-editorial-section');
    expect((await editorial.boundingBox())!.y).toBeGreaterThan(banner.y + banner.height);
    await page.getByTestId('home-editorial-see-all').click();
    await expect(page).toHaveURL(/\/features$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

async function startSampling(page: Page) {
  await page.getByTestId('home-deck-controls').evaluate(root => {
    const ids = ['home-deck-previous', 'home-deck-next', 'home-deck-position', 'home-deck-indicators'];
    const refs = ids.map(id => root.querySelector(`[data-testid="${id}"]`)!);
    const state = { running: true, samples: [] as { stable: boolean; opacity: number; x: number; y: number; width: number; height: number; disabled: boolean }[][] };
    (window as any).__navigationSample = state;
    const sample = () => {
      state.samples.push(refs.map((node, index) => {
        const r = node.getBoundingClientRect();
        let opacity = 1;
        for (let p: Element | null = node; p; p = p.parentElement) opacity *= Number(getComputedStyle(p).opacity);
        return { stable: node === root.querySelector(`[data-testid="${ids[index]}"]`), opacity, x: r.x, y: r.y, width: r.width, height: r.height, disabled: node.getAttribute('aria-disabled') === 'true' || node.hasAttribute('disabled') };
      }));
      if (state.running) requestAnimationFrame(sample);
    };
    sample();
  });
}
async function assertStable(page: Page) {
  const samples = await page.evaluate(() => {
    const state = (window as any).__navigationSample;
    state.running = false;
    return state.samples as { stable: boolean; opacity: number; x: number; y: number; width: number; height: number; disabled: boolean }[][];
  });
  expect(samples.length).toBeGreaterThan(4);
  for (const frame of samples) frame.forEach((sample, index) => {
    expect(sample.stable).toBe(true);
    expect(sample.opacity).toBe(1);
    expect(sample.disabled).toBe(false);
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(sample[key]).toBeCloseTo(samples[0][index][key], 1);
  });
}

test('arrows, number and dots remain mounted, opaque and enabled during drag, settle and shuffle', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  await startSampling(page);
  const box = (await page.getByTestId('home-recommendation-card').boundingBox())!;
  await page.mouse.move(box.x + box.width - 25, box.y + 110); await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 112, { steps: 18 }); await page.mouse.up();
  await expect(page.getByTestId('home-deck-position')).toHaveText('02 / 07'); await ready(page);
  await assertStable(page);
  await startSampling(page);
  await page.getByTestId('home-discovery-refresh').click(); await ready(page);
  await expect(page.getByTestId('home-deck-position')).toHaveText('01 / 07');
  await assertStable(page);
});

test('rapid arrow input is queued, and 7→1 follows the same leftward paper path', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/'); await ready(page);
  const original = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).order, storageKey);
  const first = await page.getByTestId('home-recommendation-card').getAttribute('aria-label');
  for (const number of ['02', '03', '04', '05', '06', '07']) {
    await page.getByTestId('home-deck-next').click();
    await expect(page.getByTestId('home-deck-position')).toHaveText(`${number} / 07`); await ready(page);
  }
  await startSampling(page);
  await page.getByTestId('home-deck-next').click();
  const endX = await page.evaluate(() => {
    const animation = document.getAnimations().find(a => (a.effect as KeyframeEffect)?.target?.id === 'home-deck-slot-0');
    const keys = (animation?.effect as KeyframeEffect)?.getKeyframes();
    return keys ? new DOMMatrix(keys.at(-1)!.transform as string).m41 : null;
  });
  expect(endX).not.toBeNull(); expect(endX!).toBeLessThan(-300);
  await expect(page.getByTestId('home-deck-position')).toHaveText('01 / 07'); await ready(page);
  await expect(page.getByTestId('home-recommendation-card')).toHaveAttribute('aria-label', first!);
  await assertStable(page);
  for (let i = 0; i < 3; i++) await page.getByTestId('home-deck-next').click();
  await expect(page.getByTestId('home-deck-position')).toHaveText('04 / 07'); await ready(page);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).order, storageKey)).toEqual(original);
});
