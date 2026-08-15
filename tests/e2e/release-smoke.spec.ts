import { expect, test } from '@playwright/test';

test('初回訪問から無料版ホームへ入り、再読み込み後も維持できる', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/');
  await expect(page.getByText('人生をうまく生きる方法を、')).toBeVisible();
  await expect(page.getByText('534').first()).toBeVisible();
  await page.getByRole('button', { name: /4つの人物像を体系ごと無料公開/ }).click();
  await expect(page.getByText(/525の処世術/).first()).toBeVisible();
  await expect(page.getByText(/人物像 01 \/ 40/).first()).toBeVisible();
  await expect(page.getByText('無料公開').first()).toBeVisible();
  await expect(page.getByText(/初対面は、能力を示す前に警戒を下げる/).first()).toBeVisible();
  await page.getByRole('tab', { name: /理論/ }).click();
  await expect(page.getByText('ハロー効果').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(/525の処世術/).first()).toBeVisible();
});

test('購入直前の確認内容と法務導線を表示できる', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/upgrade');
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
  await expect(page.getByText('525の処世術・534の理論・全21ケース')).toBeVisible();
  await expect(page.getByText('30日間', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: /280円で30日間利用する/ }).click();
  await expect(page.getByText('購入内容の確認', { exact: true })).toBeVisible();
  await expect(page.getByText('¥280（税込）')).toBeVisible();
  await expect(page.getByText('決済完了から30日間')).toBeVisible();
  await expect(page.getByText('自動更新', { exact: true })).toBeVisible();
  await expect(page.getByText('特商法表記').first()).toBeVisible();
});

test('決済後のトップURLから購入完了画面へ戻れる', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/?checkout=success&session_id=cs_test_example');
  await expect(page).toHaveURL(/\/syoseijutsu-roku-mobile\/\?checkout=success&session_id=cs_test_example$/);
  await expect(page.getByRole('button', { name: /購入済みの方はこちら|購入を復元する/ })).toBeVisible();
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
});

test('アカウント復旧と設定のサポート導線を表示できる', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/auth?mode=forgot');
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
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
  await page.getByRole('button', { name: /4つの人物像を体系ごと無料公開/ }).click();
  await expect(page.getByText('完全版を30日間利用　¥280')).toBeVisible();
});

test('無料人物像は体系で読め、完全版人物像は南京錠で区別される', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/subcategory/interpersonal/会話がうまい人');
  await expect(page.getByText('13の処世術')).toBeVisible();
  await expect(page.getByText('相手の声量や表情が変わる話題を探す')).toBeVisible();

  await page.goto('/syoseijutsu-roku-mobile/theme/work/目標達成');
  await expect(page.getByText('完全版').first()).toBeVisible();
  await expect(page.getByLabel(/完全版限定/).first()).toBeVisible();
});

test('スマホの人物像一覧は全件を最後まで読み進められる', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/subcategory/interpersonal/印象がいい人');
  const cards = page.getByRole('link', { name: /^\d{2} / });
  await expect(cards).toHaveCount(15);
  const scrollMetrics = await page.evaluate(() => {
    const scrollable = [...document.querySelectorAll('div')]
      .map((element) => ({ element, style: getComputedStyle(element) }))
      .filter(({ element, style }) =>
        (style.overflowY === 'auto' || style.overflowY === 'scroll') && element.scrollHeight > element.clientHeight,
      )
      .sort((left, right) => right.element.scrollHeight - left.element.scrollHeight)[0];
    return scrollable ? { clientHeight: scrollable.element.clientHeight, scrollHeight: scrollable.element.scrollHeight } : null;
  });
  expect(scrollMetrics).not.toBeNull();
  expect(scrollMetrics?.scrollHeight).toBeGreaterThan(scrollMetrics?.clientHeight ?? 0);
  await cards.last().scrollIntoViewIfNeeded();
  await expect(cards.last()).toBeInViewport();
});

test('学ぶの選択肢を押すと結果へ進む', async ({ page }) => {
  await page.goto('/syoseijutsu-roku-mobile/learn');
  await page.getByRole('button', { name: 'ステージ1、空気、どうする？' }).click();
  await expect(page.getByText('CASE 01')).toBeVisible();
  await page.getByRole('button', { name: /^A/ }).click();
  await expect(page.getByText('この局面での評価')).toBeVisible();
  await expect(page.getByText('あなたが選んだ手')).toBeVisible();
});
