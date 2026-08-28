import { expect, test } from '@playwright/test';

test('welcome presents both entry actions on desktop and mobile', async ({ page }) => {
  const assertWelcomeFits = async () => {
    await expect(page.getByText(/人生をうまく生きる/)).toBeVisible();
    const purchase = page.getByRole('button', { name: 'すべての内容を見る' });
    const free = page.getByRole('button', { name: '無料で始める' });
    await free.scrollIntoViewIfNeeded();
    await purchase.scrollIntoViewIfNeeded();
    await expect(purchase).toBeVisible();
    await expect(free).toBeVisible();
  };

  await page.setViewportSize({ width: 1920, height: 868 });
  await page.goto('/welcome');
  await expect(page.getByText('利用状態を確認しています')).toHaveCount(0);
  await assertWelcomeFits();
  const stats = await page.getByTestId('welcome-stats').boundingBox();
  const steps = await page.getByTestId('welcome-steps').boundingBox();
  expect(stats?.width).toBeGreaterThan(700);
  expect(steps?.width).toBeGreaterThan(300);
  expect(steps?.width).toBeLessThan(420);

  await page.setViewportSize({ width: 393, height: 667 });
  await page.reload();
  await assertWelcomeFits();
});

test('settings can hide the recurring welcome page', async ({ page }) => {
  await page.goto('/settings');
  const hideWelcome = page.getByRole('switch', { name: 'ウェルカムページを非表示にする' });
  await expect(hideWelcome).toBeVisible();
  await hideWelcome.click();
  await page.goto('/');
  await expect(page.getByText(/人物像 01 \/ 26/).first()).toBeVisible();
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

test('マイページに判断原則・数値付きの蔵書とマイ処世術・最新履歴を表示する', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-os');
  await expect(page.getByTestId('personal-principle-card')).toBeVisible();
  await expect(page.getByTestId('personal-principle-edit')).toBeVisible();
  await expect(page.getByRole('button', { name: '蔵書を開く' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'マイ処世術を開く' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'すべての履歴を見る' })).toBeVisible();
});

test('account login screen keeps login and registration paths distinct', async ({ page }) => {
  await page.goto('/auth?mode=signin');
  await expect(page.getByText('アカウント作成・ログイン', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  await expect(page.getByRole('button', { name: '新規登録はこちら' })).toBeVisible();
  await expect(page.getByText('購入情報はアカウントに紐づけて安全に管理されます。')).toBeVisible();
});

test('persona detail presents its dynamic total at the header and list end', async ({ page }) => {
  await page.goto('/subcategory/interpersonal/%E5%8D%B0%E8%B1%A1%E3%81%8C%E3%81%84%E3%81%84%E4%BA%BA');
  await expect(page.getByText('14の処世術', { exact: true })).toBeVisible();
  const end = page.getByTestId('persona-list-end');
  await end.scrollIntoViewIfNeeded();
  await expect(end).toHaveText('14 / 14');
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
  await expect(page.getByText(/人生をうまく生きる/)).toBeVisible();
  await expect(page.getByText(/流れていく知恵を、/)).toBeVisible();
  await page.getByRole('button', { name: '無料で始める' }).click();
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(1);
  await expect(page.getByText('ホーム', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('印象がいい人').first()).toBeVisible();
  await expect(page.getByText(/人物像 01 \/ 26/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /を詳しく見る/ }).first()).toBeVisible();
  await page.getByRole('tab', { name: /理論/ }).click();
  await expect(page.getByRole('tab', { name: '理論', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.goto('/');
  await expect(page.getByText(/人生をうまく生きる/)).toBeVisible();
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
  await expect(page.getByText(/決済前にアカウントを作成またはログインします/)).toBeVisible();
  await expect(page.getByText(/クレジットカード・PayPayはStripeの決済画面で選べます/)).toBeVisible();
  await expect(page.getByText('特商法表記').first()).toBeVisible();
  await page.getByText('アカウント作成・ログインへ', { exact: true }).click();
  await expect(page).toHaveURL(/\/auth\?intent=checkout&mode=signin/);
  await expect(page.getByText('完全版を購入するための登録')).toBeVisible();
  await page.getByRole('button', { name: /新規登録はこちら/ }).click();
  await expect(page.getByRole('button', { name: 'アカウントを作成して決済へ進む' })).toBeVisible();
});

test('PCの購入確認でも対応決済手段を読みやすく表示する', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/upgrade');
  await page.getByRole('button', { name: /完全版を購入する/ }).click();
  const support = page.getByText(/決済前にアカウントを作成またはログインします/);
  await expect(support).toBeVisible();
  const supportBox = await support.boundingBox();
  expect(supportBox).not.toBeNull();
  expect(supportBox!.width).toBeGreaterThan(300);
  expect(supportBox!.y + supportBox!.height).toBeLessThanOrEqual(900);
});

test('マイ処世術は専用ページで作成・フォルダー整理・削除ができる', async ({ page }) => {
  await page.goto('/my-os');
  await page.getByRole('button', { name: 'マイ処世術を開く' }).click();
  await expect(page).toHaveURL(/\/my-techniques/);
  await expect(page.getByText('いまの自分の指針')).toHaveCount(0);
  await page.getByRole('button', { name: 'フォルダーを追加' }).click();
  await page.getByRole('textbox', { name: 'フォルダー名' }).fill('仕事');
  await page.getByRole('button', { name: 'フォルダーを作成する' }).click();
  await page.getByRole('button', { name: 'マイ処世術を新規作成' }).click();
  await page.getByRole('textbox', { name: 'マイ処世術' }).fill('焦ったら、一度だけ深呼吸する');
  await page.getByRole('radio', { name: '仕事' }).click();
  await page.getByRole('button', { name: 'マイ処世術を追加' }).click();
  await expect(page.getByText('焦ったら、一度だけ深呼吸する')).toBeVisible();
  await expect(page.getByText('▱ 仕事')).toBeVisible();
  await page.getByRole('button', { name: '1番目のマイ処世術を削除' }).click();
  await expect(page.getByText('このフォルダーはまだ空です。')).toBeVisible();
});

test('ウェルカムのヘッダーに無料版・完全版の導線とホームアイコンを置く', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/welcome');
  await expect(page.getByTestId('welcome-entry-header')).toBeVisible();
  await expect(page.getByLabel('処世術禄のホームアイコン')).toBeVisible();
  await expect(page.getByRole('button', { name: '無料ではじめる' })).toBeVisible();
  await expect(page.getByRole('button', { name: '完全版を購入する' })).toBeVisible();
  await expect(page.getByText('登録不要・すぐに使えます')).toBeVisible();
  await expect(page.getByText('全コンテンツ・30日間アクセス')).toBeVisible();
  await expect(page.getByText('処 世 術 禄', { exact: true })).toHaveCount(0);
});

test('履歴はマイページで最新を示し、全件は独立ページで読める', async ({ page }) => {
  await page.goto('/my-os');
  await page.getByRole('button', { name: 'すべての履歴を見る' }).click();
  await expect(page).toHaveURL(/\/history/);
  await expect(page.getByText('まだ閲覧履歴はありません')).toBeVisible();
});

test('探すは検索欄から始まり、目的語タグを表示する', async ({ page }) => {
  await page.goto('/discover');
  await expect(page.getByText('DISCOVER')).toHaveCount(0);
  await expect(page.getByText('知りたいことから探す')).toHaveCount(0);
  for (const label of ['友達', '出世', '進路', '転職', '自己肯定感', 'リーダーシップ']) {
    await expect(page.getByRole('button', { name: `${label}で検索` })).toBeVisible();
  }
  await page.getByRole('button', { name: '友達で検索' }).click();
  await expect(page.getByLabel('処世術・理論カードを検索')).toHaveValue('友達');
});

test('公開済みの管理コンテンツは同梱済みカードを置き換える', async ({ page }) => {
  await page.route('**/rest/v1/techniques*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{
        id: 'master336-001',
        persona_id: '印象がいい人',
        category: 'interpersonal',
        title: '公開反映テスト',
        essence: '公開した本質が反映される。',
        explanation: '管理画面で確定した解説です。',
        memo: '',
        importance: 3,
        practices: ['公開後の実践も反映する'],
        examples: ['公開後の具体例も反映する'],
        cautions: ['公開後の注意点も反映する'],
        theory_ids: ['kb_001'],
        status: 'published',
        display_order: 1,
        updated_at: '2026-08-27T00:00:00.000Z',
      }]),
    });
  });

  await page.goto('/card/master336-001');
  await expect(page.getByText('公開反映テスト')).toBeVisible();
  await expect(page.getByText('公開した本質が反映される。')).toBeVisible();
  await expect(page.getByText('公開後の実践も反映する')).toBeVisible();

  await page.goto('/subcategory/interpersonal/印象がいい人');
  await expect(page.getByText('公開反映テスト')).toBeVisible();
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
  await expect(page.getByText('通常価格', { exact: true })).toBeVisible();
  await expect(page.getByText(/理論\s*45件/)).toBeVisible();
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
  await expect(page.getByText(/決済に使用したメールアドレスでログインすると、完全版を有効にできます/)).toBeVisible();
  await expect(page.getByRole('button', { name: '決済に使ったメールアドレスでログインして完全版を有効にする' })).toBeVisible();
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
});

test('購入済みゲストは同じメールアドレスで安全に引き換えられる', async ({ page }) => {
  await page.goto('/auth?intent=claim&session_id=cs_test_example&mode=signin');
  await expect(page.getByText('完全版を有効にする', { exact: true })).toBeVisible();
  await expect(page.getByText(/決済に使用したメールアドレスでアカウントを作成またはログイン/)).toBeVisible();
  await expect(page.getByText('ログインして完全版を有効にする', { exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: '無料で始める' }).click();
  await expect(page.getByText('完全版で、すべての内容を読む')).toBeVisible();
  await expect(page.getByText('¥280', { exact: true })).toBeVisible();
});

test('スマホの理論ショートカット6件と無料版ロック表示を確認できる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '無料で始める' }).click();
  await expect(page.getByTestId('home-editorial-persona-card-active').getByTestId('home-persona-access-badge')).toBeVisible();
  await page.getByRole('tab', { name: '理論', exact: true }).click();

  const indexes = ['心理学', '行動科学', '組織・経営', '戦略', '古典', '格言'];
  await expect(page.getByRole('tab', { name: /の先頭の理論へ移動/ })).toHaveCount(6);
  for (const label of indexes) {
    const shortcut = page.getByRole('tab', { name: `${label}の先頭の理論へ移動` });
    await expect(shortcut).toBeVisible();
    await expect(page.getByText(`${label}へ ›`, { exact: true })).toBeVisible();
    const box = await shortcut.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  }
});

test('短いPC画面でも無料版ホームの購入導線が見切れない', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 667 });
  await page.goto('/');
  await page.getByRole('button', { name: '無料で始める' }).click();
  const cta = await page.getByTestId('home-purchase-cta').boundingBox();
  expect(cta).not.toBeNull();
  expect(cta!.y).toBeGreaterThanOrEqual(0);
  expect(cta!.y + cta!.height).toBeLessThanOrEqual(667);
});

test('ホーム下部の領域ボタンはカルーセル内を移動する', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '無料で始める' }).click();
  const interpersonal = page.getByRole('tab', { name: '対人術の先頭の人物像へ移動' });
  const life = page.getByRole('tab', { name: '人生術の先頭の人物像へ移動' });
  await expect(interpersonal).toHaveAttribute('aria-selected', 'true');
  await life.click();
  await expect(life).toHaveAttribute('aria-selected', 'true');
});

test('desktop home keeps the editorial card, reel controls, and category index aligned', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '無料で始める' }).click();
  const [reel, shortcuts] = await Promise.all([
    page.getByTestId('home-reel-stage').boundingBox(),
    page.getByTestId('home-shortcuts').boundingBox(),
  ]);
  const card = await page.getByTestId('home-editorial-persona-card-active').boundingBox();
  expect(reel).not.toBeNull();
  expect(shortcuts).not.toBeNull();
  expect(card).not.toBeNull();
  expect(card!.width).toBeLessThan(700);
  expect(card!.height).toBeLessThan(470);
  expect(reel!.height).toBeGreaterThan(450);
  expect(shortcuts!.y).toBeGreaterThan(reel!.y + reel!.height);
  expect(shortcuts!.y + shortcuts!.height).toBeLessThanOrEqual(900);

  const interpersonal = page.getByRole('tab', { name: '対人術の先頭の人物像へ移動' });
  await expect(interpersonal).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(/人物像 01 \/ 26/).first()).toBeVisible();
  await expect(page.getByTestId('home-editorial-persona-card-active')).toHaveAttribute('aria-label', '印象がいい人を詳しく見る');
  await page.getByRole('button', { name: '次のカードへ' }).click();
  await expect(interpersonal).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('home-editorial-persona-card-active')).toHaveAttribute('aria-label', '会話がうまい人を詳しく見る');

  const work = page.getByRole('tab', { name: '仕事術の先頭の人物像へ移動' });
  await work.click();
  await expect(work).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: '仕事ができる人を詳しく見る' })).toBeVisible();
  await page.getByRole('button', { name: '仕事ができる人を詳しく見る' }).click();
  await expect(page).toHaveURL(/\/subcategory\/work\//);

  await page.goto('/');
  await page.getByRole('button', { name: '無料で始める' }).click();

  await page.getByRole('tab', { name: '理論', exact: true }).click();
  await expect(page.getByText(/理論 06 \/ 45/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '相補性を詳しく見る' })).toBeVisible();
  await expect(page.getByText('P-006', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '相補性を詳しく見る' }).click();
  await expect(page).toHaveURL(/\/theory\/kb_006/);

  await page.goto('/');
  await page.getByRole('button', { name: '無料で始める' }).click();
  await page.getByRole('tab', { name: '理論', exact: true }).click();
  const theoryIndexes = ['心理学', '行動科学', '組織・経営', '戦略', '古典', '格言'];
  for (const label of theoryIndexes) {
    const index = page.getByRole('tab', { name: `${label}の先頭の理論へ移動` });
    await expect(index).toBeVisible();
    const box = await index.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  }
});

test('無料理論の分類は一部無料として閲覧でき、残りだけ購入へ案内する', async ({ page }) => {
  await page.goto('/discover');
  await page.getByRole('tab', { name: /理論/ }).click();
  await expect(page.getByText('理論　45', { exact: true })).toBeVisible();

  const psychology = page.getByRole('button', { name: /心理学、無料20件、全249件、一部無料/ });
  await expect(psychology).toBeVisible();
  await expect(page.getByTestId('discover-theory-partial-badge')).toHaveCount(6);
  await expect(page.getByTestId('discover-theory-locked-badge')).toHaveCount(0);

  await psychology.click();
  await expect(page).toHaveURL(/\/theories\/psychology/);
  await expect(page.getByText('20件を無料公開', { exact: true })).toBeVisible();
  await expect(page.getByTestId('theory-category-upgrade-panel')).toBeVisible();
  await expect(page.getByRole('button', { name: '心理学の完全版を見る' })).toBeVisible();
});

test('ゲストのマイページからログイン導線を直接開ける', async ({ page }) => {
  await page.goto('/my-os');
  const account = page.getByTestId('account-membership-card');
  await expect(account).toHaveAttribute('aria-label', 'ログイン / アカウントを作成');
  await expect(account).toContainText('ログイン / アカウントを作成');
  await account.click();
  await expect(page).toHaveURL(/\/auth\?mode=signin/);
});

test('ホームの全人物像カードは処世術ではなく指定スローガンを表示し、リール移動後も同期する', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: '無料で始める' }).click();
  await expect(page.getByTestId('book-header-app-icon')).toBeVisible();

  const groups = [
    {
      category: '対人術',
      entries: [
        ['印象がいい人', '好印象をつくる方法'],
        ['会話がうまい人', '会話を続け、深める方法'],
        ['聞き上手な人', '相手の話を引き出す方法'],
        ['信頼される人', '信頼を積み上げる方法'],
        ['人たらしの人', '人を惹きつける極意'],
        ['面白い人', '人を楽しませる方法'],
        ['人を見極められる人', '人の本質を見抜く方法'],
        ['人に振り回されない人', '人との境界線を守る方法'],
        ['軽く扱われない人', '対等に扱われる方法'],
        ['人間関係が安定する人', '関係を長く続ける方法'],
        ['集団に馴染める人', '集団に居場所をつくる方法'],
        ['リーダーシップがある人', '人をまとめ、動かす方法'],
        ['カリスマ性のある人', '人を惹きつける存在のつくり方'],
      ],
    },
    {
      category: '仕事術',
      entries: [
        ['仕事ができる人', '成果を出し続ける仕事術'],
        ['タスク処理がうまい人', '仕事を滞らせない処理術'],
        ['頭がいい人', '物事を深く理解する思考法'],
        ['正しく評価される人', '実力を評価につなげる方法'],
        ['交渉がうまい人', '交渉を有利に進める方法'],
        ['組織でうまく立ち回れる人', '組織を賢く生き抜く処世術'],
      ],
    },
    {
      category: '人生術',
      entries: [
        ['充実した人生を過ごせる人', '人生を豊かにする方法'],
        ['自分らしく生きられる人', '自分の軸で生きる方法'],
        ['人生を楽しめる人', '人生を楽しみ尽くす方法'],
        ['不安に強い人', '不安とうまく付き合う方法'],
        ['後悔しない人', '後悔を減らす選び方'],
        ['立ち直れる人', '逆境から立ち直る方法'],
        ['可能性を広げられる人', '人生の可能性を広げる方法'],
      ],
    },
  ] as const;

  const activeCard = page.getByTestId('home-editorial-persona-card-active');
  for (const group of groups) {
    await page.getByRole('tab', { name: `${group.category}の先頭の人物像へ移動` }).click();
    for (const [title, slogan] of group.entries) {
      await expect(activeCard).toHaveAttribute('aria-label', `${title}を詳しく見る`);
      await expect(activeCard.getByTestId('home-persona-slogan')).toHaveText(slogan);
      await expect(activeCard).not.toContainText('つの処世術を見る');
      if (title !== group.entries[group.entries.length - 1][0]) {
        await page.getByRole('button', { name: '次のカードへ' }).click();
      }
    }
  }
});

test('権威付けの装飾を表示せず保存のひし形操作は維持する', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '無料で始める' }).click();
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
