import { expect, test } from '@playwright/test';

test('初回訪問から無料版ホームへ入り、再読み込み後も維持できる', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/');
  await expect(page.getByText('人生をうまく生きる方法を、')).toBeVisible();
  await expect(page.getByText('595').first()).toBeVisible();
  await page.getByRole('button', { name: /まずは無料で試す/ }).click();
  await expect(page.getByText(/216の処世術/).first()).toBeVisible();
  await expect(page.getByText(/595の理論/).first()).toBeVisible();
  await expect(page.getByText(/盛り上げるより安心感を与えよ/).first()).toBeVisible();
  await page.getByRole('tab', { name: '理論' }).click();
  await expect(page.getByText('初頭効果').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(/216の処世術/).first()).toBeVisible();
});

test('購入直前の確認内容と法務導線を表示できる', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/upgrade');
  await expect(page.getByText('216の処世術・595の理論・全21ケース')).toBeVisible();
  await expect(page.getByText('リリース記念価格')).toBeVisible();
  await page.getByRole('button', { name: /¥280で完全版を購入/ }).click();
  await expect(page.getByText('購入内容の確認', { exact: true })).toBeVisible();
  await expect(page.getByText('¥280（税込）')).toBeVisible();
  await expect(page.getByText('一回払い・買い切り')).toBeVisible();
  await expect(page.getByText('特商法表記')).toBeVisible();
});

test('アカウント復旧と設定のサポート導線を表示できる', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/auth?mode=signin');
  await page.getByText('パスワードを忘れた方').click();
  await expect(page.getByText('パスワードを再設定')).toBeVisible();
  await page.goto('/syoseijutsu-roku-mobile/settings');
  await expect(page.getByText('購入・完全版 FAQ')).toBeVisible();
  await expect(page.getByText('特定商取引法に基づく表記')).toBeVisible();
  await expect(page.getByText('お問い合わせ')).toBeVisible();
});
