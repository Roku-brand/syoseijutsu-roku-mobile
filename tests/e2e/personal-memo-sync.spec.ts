import { expect, test, type Page } from '@playwright/test';

const key = '@shoseijutsu-roku/state/v1';
const home = (page: Page) => page.getByRole('link', { name: /^ホーム。/ }).click();
const myPage = (page: Page) => page.getByRole('link', { name: /^マイページ。/ }).click();
const create = (page: Page) => page.locator('[data-testid="home-create-technique"]:visible').click();
const memoInput = (page: Page) => page.getByRole('textbox', { name: 'マイ処世術', exact: true });
const folderInput = (page: Page) => page.getByRole('textbox', { name: 'フォルダー名', exact: true });
const save = (page: Page) => page.getByRole('button', { name: 'マイ処世術を追加', exact: true });
const readState = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);

async function seed(page: Page, state = {}) {
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key, state });
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
}

test('ホームとマイページで同じフォルダーを作成・追記・編集し、再起動後も一致する', async ({ page }) => {
  await seed(page);
  await page.goto('/');
  await create(page);
  await expect(page).toHaveURL(/\/my-os/);
  await memoInput(page).fill('要点から伝える');
  await expect(save(page)).toBeDisabled();
  await folderInput(page).fill('仕事の知恵');
  await page.screenshot({ path: test.info().outputPath('first-memo-folder-name.png') });
  await save(page).click();
  await expect(page.getByRole('button', { name: 'マイ処世術：仕事の知恵', exact: true })).toContainText('1件');

  await home(page);
  await create(page);
  await page.getByRole('radio', { name: '仕事の知恵', exact: true }).click();
  await expect(folderInput(page)).toHaveCount(0);
  await memoInput(page).fill('返事の前に確認する');
  await save(page).click();
  await page.getByRole('button', { name: 'マイ処世術：仕事の知恵', exact: true }).click();
  await expect(page.getByTestId('personal-memo-card')).toHaveCount(2);
  await page.getByRole('button', { name: '要点から伝えるを編集', exact: true }).click();
  await memoInput(page).fill('最初に結論を伝える');
  await page.getByRole('button', { name: '変更を保存', exact: true }).click();
  await myPage(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'マイ処世術：仕事の知恵', exact: true })).toContainText('2件');
  const state = await readState(page);
  expect(state.personalMemoFolders).toHaveLength(1);
  expect(state.personalMemos).toHaveLength(2);
  expect(state.personalMemos.every((memo: { folderId: string }) => memo.folderId === state.personalMemoFolders[0].id)).toBe(true);
  expect(state.personalMemos.map((memo: { text: string }) => memo.text)).toContain('最初に結論を伝える');

  await home(page);
  await create(page);
  await expect(memoInput(page)).toHaveValue('');
  await folderInput(page).fill('人間関係の知恵');
  await memoInput(page).fill('相手の話を最後まで聞く');
  await save(page).click();
  await expect(page.getByRole('button', { name: 'マイ処世術：人間関係の知恵', exact: true })).toContainText('1件');
  await expect(page.getByRole('button', { name: 'マイ処世術：仕事の知恵', exact: true })).toContainText('2件');
  await expect.poll(async () => (await readState(page)).personalMemoFolders.length).toBe(2);
});

test('各空フォルダーの最初の処世術は名前も設定でき、取り消しでは内容を変えない', async ({ page }) => {
  await seed(page, { personalMemoFolders: [{ id: 'f1', name: '仕事' }, { id: 'f2', name: '暮らし' }] });
  await page.goto('/my-techniques');
  for (const [before, after] of [['仕事', '仕事で使う知恵'], ['暮らし', '暮らしの気づき']]) {
    await page.getByRole('button', { name: `マイ処世術：${before}`, exact: true }).click();
    await page.getByRole('button', { name: 'このフォルダーに新規作成', exact: true }).click();
    await expect(folderInput(page)).toHaveValue(before);
    await folderInput(page).fill(after);
    await page.getByRole('button', { name: '作成を閉じる', exact: true }).click();
    expect((await readState(page)).personalMemos).toHaveLength(before === '仕事' ? 0 : 1);
    await page.getByRole('button', { name: 'このフォルダーに新規作成', exact: true }).click();
    await expect(folderInput(page)).toHaveValue(before);
    await folderInput(page).fill(after);
    await memoInput(page).fill(`${before}の最初の気づき`);
    await save(page).click();
    await expect(page.getByRole('button', { name: `${before}の最初の気づきを編集`, exact: true })).toContainText(after);
    await page.getByRole('button', { name: 'このフォルダーに新規作成', exact: true }).click();
    await expect(folderInput(page)).toHaveCount(0);
    await page.getByRole('button', { name: '作成を閉じる', exact: true }).click();
    await page.getByRole('button', { name: 'フォルダー一覧に戻る', exact: true }).click();
  }
  await page.reload();
  await expect(page.getByRole('button', { name: 'マイ処世術：仕事で使う知恵', exact: true })).toContainText('1件');
  await expect(page.getByRole('button', { name: 'マイ処世術：暮らしの気づき', exact: true })).toContainText('1件');
});

test('既存フォルダーへの作成リンクは保存済みデータの読込後も同じ保存先を使う', async ({ page }) => {
  await seed(page, {
    personalMemoFolders: [{ id: 'f1', name: '日々の知恵' }],
    personalMemos: [{ id: 'm1', text: '一呼吸おく', folderId: 'f1', createdAt: '2026-10-23T00:00:00Z' }],
  });
  await page.goto('/my-techniques?folder=f1&compose=1');
  await expect(page.getByRole('radio', { name: '日々の知恵', exact: true })).toBeChecked();
  await expect(folderInput(page)).toHaveCount(0);
  await memoInput(page).fill('確認してから返事する');
  await save(page).click();
  await expect(page.getByRole('button', { name: '確認してから返事するを編集', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('personal-memo-card')).toHaveCount(2);
  expect((await readState(page)).personalMemos.every((memo: { folderId: string }) => memo.folderId === 'f1')).toBe(true);
});
