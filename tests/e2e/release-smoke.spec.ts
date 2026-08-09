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
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
  await expect(page.getByText('216の処世術・595の理論・全21ケース')).toBeVisible();
  await expect(page.getByText('リリース記念価格')).toBeVisible();
  await page.getByRole('button', { name: /¥280で完全版を購入/ }).click();
  await expect(page.getByText('購入内容の確認', { exact: true })).toBeVisible();
  await expect(page.getByText('¥280（税込）')).toBeVisible();
  await expect(page.getByText('一回払い・買い切り')).toBeVisible();
  await expect(page.getByText('特商法表記').first()).toBeVisible();
});

test('決済後のトップURLから購入完了画面へ戻れる', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/?checkout=success&session_id=cs_test_example');
  await expect(page).toHaveURL(/\/syoseijutsu-roku-mobile\/\?checkout=success&session_id=cs_test_example$/);
  await expect(page.getByRole('button', { name: /購入済みの方はこちら|購入を復元する/ })).toBeVisible();
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
});

test('アカウント復旧と設定のサポート導線を表示できる', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/auth?mode=signin');
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
  await page.getByText('パスワードを忘れた方').click();
  await expect(page.getByText('パスワードを再設定')).toBeVisible();
  await page.goto('/syoseijutsu-roku-mobile/settings');
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(1);
  await expect(page.getByText('購入・完全版 FAQ')).toBeVisible();
  await expect(page.getByText('特定商取引法に基づく表記')).toBeVisible();
  await expect(page.getByText('お問い合わせ')).toBeVisible();
  await page.getByText('購入・完全版 FAQ').click();
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
});

test('ホームの完全版導線に価格を表示する', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/');
  await page.getByRole('button', { name: /まずは無料で試す/ }).click();
  await expect(page.getByText('全216件を解放する　¥280')).toBeVisible();
});

test('学ぶの選択肢を押すと結果へ進む', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/learn');
  await page.getByRole('button', { name: 'ステージ1、空気、どうする？' }).click();
  await expect(page.getByText('CASE 01')).toBeVisible();
  await page.getByRole('button', { name: /^A/ }).click();
  await expect(page.getByText('この局面での評価')).toBeVisible();
  await expect(page.getByText('あなたが選んだ手')).toBeVisible();
});
