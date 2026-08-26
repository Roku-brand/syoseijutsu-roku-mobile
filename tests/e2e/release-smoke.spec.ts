import { expect, test } from '@playwright/test';

test('welcome keeps both entry actions above the fold on desktop and compact mobile', async ({ page }) => {
  const assertWelcomeFits = async () => {
    const purchase = page.getByRole('button', { name: /完全版の内容を見る/ });
    const free = page.getByRole('button', { name: /無料版をはじめる/ });
    await expect(purchase).toBeVisible();
    await expect(free).toBeVisible();
    const [purchaseBox, freeBox, viewport] = await Promise.all([
      purchase.boundingBox(),
      free.boundingBox(),
      page.evaluate(() => ({ height: window.innerHeight, scrollHeight: document.documentElement.scrollHeight })),
    ]);
    expect(purchaseBox).not.toBeNull();
    expect(freeBox).not.toBeNull();
    expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.height);
    expect(purchaseBox!.y + purchaseBox!.height).toBeLessThanOrEqual(viewport.height);
    expect(freeBox!.y + freeBox!.height).toBeLessThanOrEqual(viewport.height);
  };

  await page.setViewportSize({ width: 1920, height: 868 });
  await page.goto('/welcome');
  await assertWelcomeFits();

  await page.setViewportSize({ width: 393, height: 667 });
  await page.reload();
  await assertWelcomeFits();
});

test('my page keeps the guest account entry compact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-os');

  await expect(page.getByTestId('account-membership-card')).toHaveCount(1);
  await expect(page.getByTestId('account-plan-badge')).toBeVisible();
  await expect(page.getByTestId('account-membership-card')).toContainText('ログインしていません');
  await expect(page.getByTestId('account-complete-cta')).toHaveCount(0);
});

test('profile settings guide guests to log in before editing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings/profile');
  await expect(page.getByText('ログインしてプロフィールをつくる')).toBeVisible();
  await expect(page.getByText('ログイン / アカウントを作成')).toBeVisible();
});

test('personal principle editing stays in the compact card header', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-os');
  const card = page.getByTestId('personal-principle-card');
  const edit = page.getByTestId('personal-principle-edit');
  await expect(card).toBeVisible();
  await expect(edit).toBeVisible();
  const [cardBox, editBox] = await Promise.all([card.boundingBox(), edit.boundingBox()]);
  expect(cardBox).not.toBeNull();
  expect(editBox).not.toBeNull();
  expect(editBox!.y).toBeLessThan(cardBox!.y + 70);
  expect(editBox!.y + editBox!.height).toBeLessThan(cardBox!.y + cardBox!.height / 2);
});

test('mobile technique detail keeps the full essence visible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/card/master336-001');
  const essence = page.getByTestId('technique-essence');
  const marker = page.getByTestId('technique-essence-marker');
  await expect(essence).toBeVisible();
  await expect(marker).toBeVisible();
  const [essenceBox, markerBox] = await Promise.all([essence.boundingBox(), marker.boundingBox()]);
  expect(essenceBox).not.toBeNull();
  expect(markerBox).not.toBeNull();
  expect(essenceBox?.width).toBeGreaterThan(300);
  expect(markerBox!.y + markerBox!.height).toBeLessThanOrEqual(essenceBox!.y);
  expect(await essence.innerText()).not.toContain('…');
});

test('theory metadata sits beside its identifier and content is never ellipsized', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/theory/kb_001');
  const meta = page.getByTestId('theory-meta');
  const title = page.getByTestId('theory-title');
  await expect(meta).toBeVisible();
  await expect(title).toBeVisible();
  await expect(meta).toContainText('P－1');
  await expect(title).not.toContainText('…');
});

test('persona technique rows offer the shared diamond save action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/subcategory/interpersonal/印象がいい人');
  await expect(page.getByRole('button', { name: '蔵書に保存' })).toHaveCount(14);
});

test('初回訪問から無料版ホームへ入り、再読み込み後も維持できる', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('人生をうまく生きる方法を、')).toBeVisible();
  await expect(page.getByText('流れて消える人生の知識を、何度でも使える知恵に。')).toBeVisible();
  await page.getByRole('button', { name: /無料版をはじめる/ }).click();
  await expect(page.getByText(/336の処世術/).first()).toBeVisible();
  await expect(page.getByText(/人物像 01 \/ 26/).first()).toBeVisible();
  await expect(page.getByText('無料公開').first()).toBeVisible();
  await expect(page.getByText(/清潔感で足切りを超える/).first()).toBeVisible();
  await page.getByRole('tab', { name: /理論/ }).click();
  await expect(page.getByText('ハロー効果').first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(/336の処世術/).first()).toBeVisible();
});

test('購入直前の確認内容と法務導線を表示できる', async ({ page }) => {
  await page.goto('/upgrade');
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
  await expect(page.getByText('処世術禄　完全版')).toBeVisible();
  await expect(page.getByText('無料版', { exact: true })).toBeVisible();
  await expect(page.getByText(/完全版/).first()).toBeVisible();
  await expect(page.getByText('完全版・30日間')).toBeVisible();
  await expect(page.getByText('一回払い・自動更新なし').first()).toBeVisible();
  await page.getByRole('button', { name: /完全版を購入する/ }).click();
  await expect(page.getByText('購入内容の確認', { exact: true })).toBeVisible();
  await expect(page.getByText('¥280（税込）', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('決済完了から30日間', { exact: true })).toBeVisible();
  await expect(page.getByText('自動更新', { exact: true })).toBeVisible();
  await expect(page.getByText('特商法表記').first()).toBeVisible();
});

test('スマホの購入画面は初期表示から購入ボタンを押せる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto('/upgrade');
  const purchaseButton = page.getByRole('button', { name: /完全版を購入する/ });
  await expect(purchaseButton).toBeVisible();
  await expect(page.getByText('網羅性を追求')).toBeVisible();
  await expect(page.getByText('利用規約')).toBeVisible();
  const purchaseBox = await purchaseButton.boundingBox();
  const legalBox = await page.getByText('利用規約').boundingBox();
  expect(purchaseBox).not.toBeNull();
  expect(legalBox).not.toBeNull();
  expect(purchaseBox!.y + purchaseBox!.height).toBeLessThanOrEqual(667);
  expect(legalBox!.y + legalBox!.height).toBeLessThanOrEqual(667);
});

test('PCの購入画面は初期表示で購入条件まで確認できる', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/upgrade');
  const purchaseButton = page.getByRole('button', { name: /完全版を購入する/ });
  await expect(purchaseButton).toBeVisible();
  await expect(page.getByText('独自の処世術集')).toBeVisible();
  const purchaseBox = await purchaseButton.boundingBox();
  expect(purchaseBox).not.toBeNull();
  expect(purchaseBox!.y + purchaseBox!.height).toBeLessThanOrEqual(900);
});

test('利用規約にコンテンツ変更の範囲と利用者保護を明示する', async ({ page }) => {
  await page.goto('/upgrade');
  await page.getByText('利用規約', { exact: true }).first().click();
  await expect(page.getByText(/バージョン3\.2/)).toBeVisible();
  await expect(page.getByText(/処世術のタイトル、本質、解説、分類、重要度、理論カード、学習問題/)).toBeVisible();
  await expect(page.getByText(/購入時点の各文章、項目数および構成が将来にわたり同一のまま維持されることを保証するものではありません/)).toBeVisible();
  await expect(page.getByText(/商品の主要な利用目的を損なう重大な不利益変更は行わず/)).toBeVisible();
});

test('決済後のトップURLから購入完了画面へ戻れる', async ({ page }) => {
  await page.goto('/?checkout=success&session_id=cs_test_example');
  await expect(page).toHaveURL(/\/\?checkout=success&session_id=cs_test_example$/);
  await expect(page.getByRole('button', { name: /購入済みの方はこちら|購入を復元する|購入済みの方は復元する/ })).toBeVisible();
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
});

test('アカウント復旧と設定のサポート導線を表示できる', async ({ page }) => {
  await page.goto('/auth?mode=forgot');
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
  await expect(page.getByText('パスワードを再設定')).toBeVisible();
  await page.goto('/settings');
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(1);
  await expect(page.getByText('購入・完全版 FAQ')).toBeVisible();
  await expect(page.getByText('特定商取引法に基づく表記')).toBeVisible();
  await expect(page.getByText('お問い合わせ')).toBeVisible();
  await page.getByText('購入・完全版 FAQ').click();
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
});

test('ホームの完全版導線に価格を表示する', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /無料版をはじめる/ }).click();
  await expect(page.getByText('完全版で、すべての内容を読む')).toBeVisible();
  await expect(page.getByText('¥280', { exact: true })).toBeVisible();
});

test('ホーム下部の領域ボタンはカルーセル内を移動する', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /無料版をはじめる/ }).click();
  const interpersonal = page.getByRole('tab', { name: '対人術の先頭の人物像へ移動' });
  const life = page.getByRole('tab', { name: '人生術の先頭の人物像へ移動' });
  await expect(interpersonal).toHaveAttribute('aria-selected', 'true');
  await life.click();
  await expect(life).toHaveAttribute('aria-selected', 'true');
});

test('権威付けの装飾を表示せず保存のひし形操作は維持する', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /無料版をはじめる/ }).click();
  await expect(page.getByText('賢者の手帳')).toHaveCount(0);
  await expect(page.getByText('COMPLETE EDITION')).toHaveCount(0);
  await expect(page.getByText('♛')).toHaveCount(0);
  await page.goto('/subcategory/interpersonal/印象がいい人');
  await expect(page.getByRole('button', { name: '蔵書に保存' })).toHaveCount(14);
});

test('無料人物像は体系で読め、完全版人物像は南京錠で区別される', async ({ page }) => {
  await page.goto('/subcategory/interpersonal/会話がうまい人');
  await expect(page.getByText('会話は内容よりテンポ')).toBeVisible();

  await page.goto('/subcategory/work/頭がいい人');
  await expect(page.getByText('完全版').first()).toBeVisible();
});

test('人物像一覧は縦順の2段組として一覧できる', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/subcategory/interpersonal/印象がいい人');
  const cards = page.getByRole('link', { name: /^\d{2} / });
  await expect(cards).toHaveCount(14);
  await expect(page.getByTestId('technique-column-1').getByRole('link')).toHaveCount(7);
  await expect(page.getByTestId('technique-column-2').getByRole('link')).toHaveCount(7);
  await expect(page.getByText('STEP 1')).toHaveCount(0);
  const visibleNumbers = await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')?.slice(0, 2)));
  expect(visibleNumbers).toEqual(Array.from({ length: 14 }, (_, index) => String(index + 1).padStart(2, '0')));
  const scrollMetrics = await page.evaluate(() => {
    const scrollable = [...document.querySelectorAll('div')]
      .map((element) => ({ element, style: getComputedStyle(element) }))
      .filter(({ element, style }) =>
        (style.overflowY === 'auto' || style.overflowY === 'scroll') && element.scrollHeight > element.clientHeight,
      )
      .sort((left, right) => right.element.scrollHeight - left.element.scrollHeight)[0];
    return scrollable ? { clientHeight: scrollable.element.clientHeight, scrollHeight: scrollable.element.scrollHeight } : null;
  });
  expect(scrollMetrics).toBeNull();
  await expect(cards.last()).toBeInViewport();
});

test('学ぶの選択肢を押すと結果へ進む', async ({ page }) => {
  await page.goto('/learn');
  await page.getByRole('button', { name: 'ステージ1、人と、どう関わる？' }).click();
  await expect(page.getByText('CASE 01')).toBeVisible();
  await page.getByRole('button', { name: /^A/ }).click();
  await expect(page.getByText('この局面での評価')).toBeVisible();
  await expect(page.getByText('あなたが選んだ手')).toBeVisible();
  await expect(page.getByText('この手を選ぶと、次の問題が起きる。')).toBeVisible();
  await expect(page.getByText('この手で起きること')).toBeVisible();
  await expect(page.getByText('相手は聞き役に固定され、会話ではなく自己紹介を採点する時間になる。次の質問も出にくくなる。').first()).toBeVisible();
});
