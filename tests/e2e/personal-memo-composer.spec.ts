import { expect, test } from '@playwright/test';

const stateKey = '@shoseijutsu-roku/state/v1';

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

for (const width of [320, 390, 768, 1440]) {
  test(`作成パネルが${width}px幅に収まりキャンセルで保存しない`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/my-os?compose=1');
    const panel = page.getByTestId('personal-memo-composer');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'マイ処世術を作る', exact: true })).toBeVisible();
    await expect(panel.getByRole('textbox', { name: 'フォルダー名', exact: true })).toHaveCount(0);
    const input = panel.getByRole('textbox', { name: 'マイ処世術', exact: true });
    await expect(input).not.toBeFocused();
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await page.screenshot({ path: `release-evidence/memo-composer-20261116/composer-${width}.png`, scale: 'css' });
    await input.fill('まず一呼吸おく');
    await expect(panel.getByText('7 / 140文字', { exact: true })).toBeVisible();
    await panel.getByRole('button', { name: '作成をキャンセル', exact: true }).click();
    await expect(panel).toHaveCount(0);
    const memos = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}').personalMemos ?? [], stateKey);
    expect(memos).toHaveLength(0);
  });
}

test('新規フォルダー入力から既存の保存先へ切り替えて保存する', async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(key, JSON.stringify({
    personalMemoFolders: [{ id: 'work', name: '仕事の知恵' }],
    personalMemos: [{ id: 'old', folderId: 'work', text: '先に確認する', createdAt: '2026-11-16T00:00:00Z' }],
  })), stateKey);
  await page.setViewportSize({ width: 390, height: 600 });
  await page.goto('/my-os?compose=1');
  const panel = page.getByTestId('personal-memo-composer');
  await panel.getByRole('textbox', { name: 'マイ処世術', exact: true }).fill('相手の話を最後まで聞く');
  const save = panel.getByRole('button', { name: 'マイ処世術を追加', exact: true });
  await expect(save).toBeDisabled();
  await panel.getByRole('button', { name: '新しいフォルダーを作る', exact: true }).click();
  const folder = panel.getByRole('textbox', { name: 'フォルダー名', exact: true });
  await expect(folder).toBeFocused();
  await folder.fill('仮のフォルダー');
  await expect(save).toBeEnabled();
  await panel.getByRole('button', { name: '保存先フォルダーを選択', exact: true }).click();
  await panel.getByRole('radio', { name: '仕事の知恵', exact: true }).click();
  await expect(folder).toHaveCount(0);
  await expect(panel.getByRole('button', { name: '保存先フォルダーを選択', exact: true })).toContainText('仕事の知恵');
  await save.click();
  await expect(panel).toHaveCount(0);
  const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), stateKey);
  expect(state.personalMemoFolders).toHaveLength(1);
  expect(state.personalMemos).toHaveLength(2);
  expect(state.personalMemos.find((memo: { text: string }) => memo.text === '相手の話を最後まで聞く').folderId).toBe('work');
});
