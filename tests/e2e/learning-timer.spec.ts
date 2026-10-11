import { expect, test, type Page } from '@playwright/test';

async function openRound(page: Page) {
  await page.clock.install();
  await page.goto('/learn/case-01?retry=1');
  await expect(page.getByTestId('learning-seconds')).toHaveText('60 秒');
  // Wait for persisted state hydration and focus before moving the fake clock.
  await page.clock.runFor(1000);
}

test('60 seconds expires as unanswered, retry and next case get a full minute', async ({ page }) => {
  await openRound(page);
  await page.clock.runFor(49_000);
  await expect(page.getByTestId('learning-seconds')).toHaveText('10 秒');
  await expect(page.getByTestId('learning-countdown')).toContainText('あと少し');
  await page.clock.runFor(9000);
  await expect(page.getByTestId('learning-seconds')).toHaveText('01 秒');
  await page.clock.runFor(1000);
  await expect(page.getByText('時間切れ', { exact: true })).toBeVisible();
  await expect(page.getByText('未回答です。解説で判断を磨こう。')).toBeVisible();
  await expect(page.getByText('あなたの回答', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'もう一度挑戦' }).click();
  await expect(page.getByTestId('learning-seconds')).toHaveText('60 秒');
  await page.getByRole('button', { name: /^B / }).click();
  await expect(page.getByText('正解！', { exact: true })).toBeVisible();
  await page.clock.runFor(65_000);
  await expect(page.getByText('正解！', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /次の問題へ/ }).click();
  await expect(page.getByTestId('learning-seconds')).toHaveText('60 秒');
});

test('timeout leaves progress unchanged', async ({ page }) => {
  await openRound(page);
  await page.clock.runFor(60_000);
  await expect(page.getByText('時間切れ', { exact: true })).toBeVisible();
  await page.getByTestId('book-header-back').click();
  await expect(page.getByTestId('learning-stage-1')).toContainText('0 / 7');
});

test('sound toggle persists; blocked playback cannot interrupt the round', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException('Autoplay denied', 'NotAllowedError'));
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openRound(page);
  const toggle = page.getByTestId('learning-sound-toggle');
  await toggle.click();
  await expect(toggle).toContainText('SE OFF');
  await page.reload();
  await expect(toggle).toContainText('SE OFF');
  await toggle.click();
  await expect(toggle).toContainText('SE ON');
  await page.getByRole('button', { name: /^A / }).click();
  await expect(page.getByText('おしい！', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('hidden page pauses the remaining time', async ({ page }) => {
  await openRound(page);
  await page.clock.runFor(9000);
  const remaining = await page.getByTestId('learning-seconds').textContent();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByText('一時停止中', { exact: true })).toBeVisible();
  await page.clock.runFor(80_000);
  await expect(page.getByTestId('learning-seconds')).toHaveText(remaining!);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(1000);
  await expect(page.getByTestId('learning-seconds')).not.toHaveText(remaining!);
});

test('all five packaged cues play; mute suppresses countdown audio', async ({ page }) => {
  await page.addInitScript(() => {
    const played: string[] = [];
    (window as any).__learningSounds = played;
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      return original.call(this).then(() => { played.push(this.src); });
    };
  });
  await openRound(page);
  const heard = async (name: string) => expect.poll(() => page.evaluate((cue) => (window as any).__learningSounds.some((src: string) => src.includes(`learning-${cue}`)), name)).toBe(true);
  const toggle = page.getByTestId('learning-sound-toggle');
  await toggle.click();
  await toggle.click();
  await heard('start');
  await page.getByRole('button', { name: /^B / }).click();
  await heard('correct');
  await page.getByRole('button', { name: 'もう一度挑戦' }).click();
  await page.getByRole('button', { name: /^A / }).click();
  await heard('incorrect');
  await page.getByRole('button', { name: 'もう一度挑戦' }).click();
  await page.clock.runFor(50_000);
  await heard('tick');
  await page.clock.runFor(10_000);
  await heard('timeout');
  await page.getByRole('button', { name: 'もう一度挑戦' }).click();
  await toggle.click();
  const count = await page.evaluate(() => (window as any).__learningSounds.length);
  await page.clock.runFor(60_000);
  expect(await page.evaluate(() => (window as any).__learningSounds.length)).toBe(count);
});

test('countdown fits compact and desktop screens', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/learn/case-01?retry=1');
    await expect(page.getByTestId('learning-countdown')).toBeVisible();
    await expect(page.locator('#roku-launch')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) await page.screenshot({ path: 'release-evidence/learning-60-seconds-mobile.png', fullPage: true });
    if (width === 1440) await page.screenshot({ path: 'release-evidence/learning-60-seconds-desktop.png', fullPage: true });
  }
});
