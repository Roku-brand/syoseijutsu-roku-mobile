import { expect, test } from '@playwright/test';

const storageKey = '@shoseijutsu-roku/state/v1';

test('旧メモを復元し、新しいメモと一緒に再読み込み後も保持する', async ({ page }) => {
  await page.addInitScript(({ key }) => {
    if (!sessionStorage.getItem('personal-state-seeded')) {
      localStorage.setItem(key, JSON.stringify({
        savedIds: ['master336-001'],
        personalMemos: ['旧形式のメモ'],
        personalPrinciple: '以前の座右の銘',
        notes: { old: '以前のノート' },
        collections: ['retired'],
      }));
      sessionStorage.setItem('personal-state-seeded', 'true');
    }
  }, { key: storageKey });
  await page.goto('/my-os');
  await expect(page.getByTestId('personal-principle-card')).toContainText('以前の座右の銘');
  await page.getByRole('tab', { name: 'マイ処世術' }).click();
  await expect(page.getByRole('button', { name: '旧形式のメモを編集' })).toBeVisible();
  await page.getByRole('button', { name: '＋ 作る' }).click();
  await page.getByRole('textbox', { name: 'マイ処世術' }).fill('追加したメモ');
  await page.getByRole('button', { name: '保存する' }).click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).personalMemos.length, storageKey)).toBe(2);
  await page.reload();
  await page.getByRole('tab', { name: 'マイ処世術' }).click();
  await expect(page.getByRole('button', { name: '旧形式のメモを編集' })).toBeVisible();
  await expect(page.getByRole('button', { name: '追加したメモを編集' })).toBeVisible();
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey);
  expect(stored.savedIds).toEqual(['master336-001']);
  expect(stored.notes).toEqual({ old: '以前のノート' });
  expect(stored).not.toHaveProperty('collections');
});

test('破損した保存データを初期値やセッション中の編集で上書きしない', async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{broken-data'), storageKey);
  await page.goto('/my-os');
  await expect(page.getByTestId('personal-principle-card')).toContainText('志は高く、腰は低く。');
  await page.getByTestId('personal-principle-edit').click();
  await page.getByRole('textbox', { name: '座右の銘' }).fill('セッション中の編集');
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByTestId('personal-principle-card')).toContainText('セッション中の編集');
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe('{broken-data');
});
