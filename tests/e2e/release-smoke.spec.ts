import { expect, test, type Page } from '@playwright/test';

async function startFreeHome(page: Page) {
  await page.getByRole('button', { name: '無料で始める' }).click();
  const welcomeModal = page.getByTestId('home-welcome-modal');
  if (await welcomeModal.isVisible({ timeout: 800 })) {
    await welcomeModal.getByRole('button', { name: 'あとで見る' }).click();
  }
}

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
  expect(await page.getByTestId('welcome-stats').innerText()).not.toContain('\\n');

  await page.setViewportSize({ width: 393, height: 667 });
  await page.reload();
  await assertWelcomeFits();
  expect(await page.getByTestId('welcome-stats').innerText()).not.toContain('\\n');
});

test('settings can hide the recurring welcome page', async ({ page }) => {
  await page.goto('/settings');
  const hideWelcome = page.getByRole('switch', { name: 'ウェルカムページを非表示にする' });
  await expect(hideWelcome).toBeVisible();
  await hideWelcome.click();
  await page.goto('/');
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
});

test('my page keeps the guest profile entry compact', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-os');

  await expect(page.getByTestId('account-membership-card')).toHaveCount(1);
  await expect(page.getByTestId('account-membership-card')).toContainText('プロフィールを設定');
  await expect(page.getByTestId('account-membership-card')).toHaveAttribute('aria-label', 'ログインしてプロフィールを設定');
  await expect(page.getByTestId('account-complete-cta')).toHaveCount(0);
});

test('profile settings guide guests to log in before editing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/settings/profile');
  await expect(page.getByText('ログインしてプロフィールをつくる')).toBeVisible();
  await expect(page.getByText('ログイン / アカウントを作成')).toBeVisible();
});

test('マイページに座右の銘・3つの蓄積先・最近の蓄積を表示する', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-os');
  await expect(page.getByTestId('personal-principle-card')).toBeVisible();
  await expect(page.getByText('いまの座右の銘', { exact: true })).toBeVisible();
  await expect(page.getByText('志は高く、腰は低く。', { exact: true })).toBeVisible();
  await expect(page.getByTestId('personal-principle-edit')).toBeVisible();
  await expect(page.getByTestId('personal-principle-edit')).toHaveAttribute('aria-label', '座右の銘を編集');
  await expect(page.getByRole('button', { name: '蔵書を開く' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'マイ処世術を開く' })).toBeVisible();
  await expect(page.getByRole('button', { name: '履歴を開く' })).toBeVisible();
  await expect(page.getByText('最近保存したもの', { exact: true })).toBeVisible();
  await expect(page.getByText('最近の履歴', { exact: true })).toBeVisible();
  await expect(page.getByText('まだ保存したものはありません', { exact: true })).toBeVisible();
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

test('無料版の関連理論には実データだけを紐づいた順に表示する', async ({ page }) => {
  await page.goto('/card/master336-007');
  const relatedTheories = page.getByTestId('related-theories');
  await expect(relatedTheories).toBeVisible();
  await expect(relatedTheories.getByText('ミラーリング効果', { exact: true })).toBeVisible();
  await expect(relatedTheories.getByText('言語スタイル同調', { exact: true })).toBeVisible();
  await expect(relatedTheories).not.toContainText('完全版の理論');
  expect((await relatedTheories.innerText()).indexOf('ミラーリング効果')).toBeLessThan((await relatedTheories.innerText()).indexOf('言語スタイル同調'));
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

test('理論詳細は概要・処世術・理論・情報の順で、概要を2文に分ける', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/theory/kb_001');
  const summary = page.getByTestId('theory-summary');
  await expect(summary).toBeVisible();
  expect(await summary.innerText()).toContain('最初に得た情報が、その後の印象や評価の基準として強く残る傾向。\n第一印象は後から修正しにくいため、関係の入口ほど重要になる。');
  const article = await page.locator('[data-testid="theory-title"]').locator('xpath=ancestor-or-self::*').first().evaluate(() => document.body.innerText);
  expect(article.indexOf('概要')).toBeLessThan(article.indexOf('関連する処世術'));
  expect(article.indexOf('関連する処世術')).toBeLessThan(article.indexOf('関連する理論'));
  expect(article.indexOf('関連する理論')).toBeLessThan(article.indexOf('理論情報'));
  await expect(page.getByTestId('theory-information')).toContainText('出典状態');
  await expect(page.getByTestId('theory-information')).toContainText('提唱者');
  await expect(page.getByTestId('theory-information')).toContainText('著作・研究');
  await expect(page.getByTestId('theory-information')).toContainText('注記');
});

test('理論詳細の関連項目は横幅いっぱいの読みやすいボックスになる', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/theory/kb_001');
  const techniqueRow = page.getByTestId('theory-related-techniques').getByRole('link').first();
  const theoryRow = page.getByTestId('theory-related-theories').getByRole('link').first();
  await expect(techniqueRow).toBeVisible();
  await expect(theoryRow).toBeVisible();
  const [techniqueBox, theoryBox] = await Promise.all([techniqueRow.boundingBox(), theoryRow.boundingBox()]);
  expect(techniqueBox).not.toBeNull();
  expect(theoryBox).not.toBeNull();
  expect(techniqueBox!.width).toBeGreaterThan(1100);
  expect(techniqueBox!.height).toBeGreaterThanOrEqual(94);
  expect(Math.abs(techniqueBox!.width - theoryBox!.width)).toBeLessThan(2);
});

test('処世術詳細の関連理論と関連処世術も同じボックスで揃う', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/card/master336-001');
  const theoryRow = page.getByTestId('related-theories').getByRole('link').first();
  const techniqueRow = page.getByTestId('related-techniques').getByRole('link').first();
  await expect(theoryRow).toBeVisible();
  await expect(techniqueRow).toBeVisible();
  const [theoryBox, techniqueBox] = await Promise.all([theoryRow.boundingBox(), techniqueRow.boundingBox()]);
  expect(theoryBox).not.toBeNull();
  expect(techniqueBox).not.toBeNull();
  expect(theoryBox!.width).toBeGreaterThan(1000);
  expect(theoryBox!.height).toBeGreaterThanOrEqual(94);
  expect(Math.abs(theoryBox!.width - techniqueBox!.width)).toBeLessThan(2);
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
  await startFreeHome(page);
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(1);
  await expect(page.getByText('ホーム', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/おはようございます|こんにちは|こんばんは/).first()).toBeVisible();
  await expect(page.getByText('今日も、少しだけ判断を磨く。')).toBeVisible();
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await expect(page.getByTestId('home-brand-slide-1')).toContainText('今日の一枚｜処世術');
  await expect(page.getByRole('tab', { name: /枚目を表示/ })).toHaveCount(7);
  await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  await page.goto('/');
  await expect(page.getByText(/人生をうまく生きる/)).toBeVisible();
});

test('ホームのブランドリールは矢印で7枚を横にスライドする', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/welcome');
  await startFreeHome(page);

  const rail = page.getByTestId('home-brand-viewport');
  const next = page.getByRole('button', { name: '次のスライド' });
  await expect(rail).toBeVisible();
  await expect(next).toBeVisible();
  expect(await rail.evaluate((element) => element.scrollLeft)).toBe(0);
  await next.click();
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test('ホームの各CTAは正式コンテンツと既存画面へ遷移する', async ({ page }) => {
  await page.goto('/welcome');
  await startFreeHome(page);

  await page.getByTestId('home-brand-technique-cta').click();
  await expect(page).toHaveURL(/\/card\/master336-014$/);

  await page.goBack();
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await page.getByRole('tab', { name: '2枚目を表示' }).click();
  await page.getByTestId('home-brand-persona-cta').click();
  await expect(page).toHaveURL(/\/subcategory\/interpersonal\/%E5%8D%B0%E8%B1%A1%E3%81%8C%E3%81%84%E3%81%84%E4%BA%BA$/);

  await page.goBack();
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await page.getByRole('tab', { name: '3枚目を表示' }).click();
  await page.getByTestId('home-brand-theory-cta').click();
  await expect(page).toHaveURL(/\/upgrade\?source=discover_theory$/);

  await page.goBack();
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await page.getByRole('tab', { name: '4枚目を表示' }).click();
  await page.getByTestId('home-brand-map-theory-1').click();
  await expect(page).toHaveURL(/\/theory\/kb_014$/);

  await page.goBack();
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await page.getByRole('tab', { name: '5枚目を表示' }).click();
  await page.getByTestId('home-brand-system-cta').click();
  await expect(page).toHaveURL(/\/personas$/);

  await page.goBack();
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await page.getByRole('tab', { name: '6枚目を表示' }).click();
  await page.getByTestId('home-brand-premium-cta').click();
  await expect(page).toHaveURL(/\/upgrade\?source=home_carousel$/);
});

test('ウェルカムから初回ホームへ入ると今日の一枚へ導く歓迎ポップアップを一度だけ表示する', async ({ page }) => {
  await page.goto('/welcome');
  await page.getByRole('button', { name: '無料で始める' }).click();

  const welcomeModal = page.getByTestId('home-welcome-modal');
  await expect(welcomeModal).toBeVisible();
  await expect(welcomeModal).toContainText('処世術禄へようこそ');
  await expect(welcomeModal).toContainText('判断に迷う日に、静かな手がかりを。');
  await welcomeModal.getByRole('button', { name: '今日の一枚を見る' }).click();
  await expect(welcomeModal).toHaveCount(0);
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();

  await page.goto('/welcome');
  await page.getByRole('button', { name: '無料で始める' }).click();
  await expect(welcomeModal).toHaveCount(0);
});

test('初回歓迎ポップアップはスマホ画面内に収まり、あとで閉じられる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await page.goto('/welcome');
  await page.getByRole('button', { name: '無料で始める' }).click();

  const welcomeModal = page.getByTestId('home-welcome-modal');
  const primary = welcomeModal.getByRole('button', { name: '今日の一枚を見る' });
  await expect(welcomeModal).toBeVisible();
  await expect(primary).toBeVisible();
  const [modalBox, primaryBox] = await Promise.all([welcomeModal.boundingBox(), primary.boundingBox()]);
  expect(modalBox).not.toBeNull();
  expect(primaryBox).not.toBeNull();
  expect(modalBox!.y).toBeGreaterThanOrEqual(0);
  expect(modalBox!.y + modalBox!.height).toBeLessThanOrEqual(667);
  expect(primaryBox!.y + primaryBox!.height).toBeLessThanOrEqual(667);

  await welcomeModal.getByRole('button', { name: 'あとで見る' }).click();
  await expect(welcomeModal).toHaveCount(0);
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
  await expect(page.getByText('焦ったら、一度だけ深呼吸する').last()).toBeVisible();
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

test('ウェルカムの無料版と完全版の入口は、それぞれ正しい画面へ進む', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/welcome');
  await page.getByRole('button', { name: '無料ではじめる' }).click();
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(1);
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();

  await page.goto('/welcome');
  await page.getByRole('button', { name: '完全版を購入する' }).click();
  await expect(page).toHaveURL(/\/upgrade$/);
  await expect(page.getByText('完全版・30日間', { exact: true })).toBeVisible();
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
});

test('履歴はマイページで最新を示し、全件は独立ページで読める', async ({ page }) => {
  await page.goto('/my-os');
  await page.getByRole('button', { name: 'すべての履歴を見る' }).click();
  await expect(page).toHaveURL(/\/history/);
  await expect(page.getByText('まだ閲覧履歴はありません')).toBeVisible();
});

test('理論の閲覧もマイページと履歴一覧へ蓄積される', async ({ page }) => {
  await page.goto('/theory/kb_001');
  await expect(page.getByTestId('theory-title')).toHaveText('初頭効果');
  await page.goto('/my-os');
  await expect(page.getByText('最近の履歴', { exact: true })).toBeVisible();
  await expect(page.getByText('初頭効果', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'すべての履歴を見る' }).click();
  await expect(page).toHaveURL(/\/history/);
  await expect(page.getByRole('button', { name: '初頭効果を開く' })).toBeVisible();
});

test('探すは検索欄から始まり、目的語タグを表示する', async ({ page }) => {
  await page.goto('/discover');
  await expect(page.getByText('DISCOVER')).toHaveCount(0);
  await expect(page.getByText('知りたいことから探す')).toHaveCount(0);
  for (const label of ['友達', '出世', '進路', '転職', '自己肯定感', 'リーダーシップ']) {
    await expect(page.getByRole('button', { name: `${label}で検索` })).toBeVisible();
  }
  await page.getByRole('button', { name: '友達で検索' }).click();
  await expect(page.getByLabel('処世術・人物像・理論・キーワードを検索')).toHaveValue('友達');
});

test('探すは人物像を横に流し、独立一覧と理論カテゴリへ遷移できる', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/discover');

  await expect(page.getByRole('tab', { name: '処世術　336' })).toBeVisible();
  await expect(page.getByText('処世術のカテゴリから絞り込む', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'すべてで絞り込む' })).toBeVisible();
  await expect(page.getByText('（すべて）', { exact: true })).toBeVisible();
  await expect(page.getByTestId('discover-persona-rail')).toBeVisible();
  await expect(page.getByRole('button', { name: '前の人物像へ' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '次の人物像へ' })).toBeEnabled();
  await page.getByRole('button', { name: '次の人物像へ' }).click();
  await expect.poll(() => page.getByTestId('discover-persona-rail').evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await page.getByRole('button', { name: '仕事術で絞り込む' }).click();
  await expect(page.getByText('（仕事術）', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /仕事ができる人、仕事術、.*処世術を開く/ })).toBeVisible();

  await page.getByRole('link', { name: '26人物像を一覧で見る' }).click();
  await expect(page).toHaveURL(/\/personas$/);
  await expect(page.getByText('3領域・26人物像から選ぶ', { exact: true })).toBeVisible();
  await expect(page.getByTestId('personas-grid').getByRole('link')).toHaveCount(26);
  await page.getByRole('button', { name: '人生術で絞り込む' }).click();
  await expect(page.getByTestId('personas-grid').getByRole('link')).toHaveCount(7);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/discover');
  await expect(page.getByTestId('discover-persona-rail')).toBeVisible();

  await page.getByRole('tab', { name: '理論　630' }).click();
  await expect(page.getByText('理論のカテゴリから絞り込む', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '心理学で理論を絞り込む' })).toBeVisible();
  await expect(page.getByRole('button', { name: '格言で理論を絞り込む' })).toBeVisible();
  await expect(page.getByTestId('discover-theory-rail')).toBeVisible();
  await expect(page.getByRole('link', { name: '630理論を一覧で見る' })).toBeVisible();
  const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});

test('探すの人物像カードは参考レイアウトの寸法を保つ', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/discover');
  const firstCard = page.getByTestId('discover-persona-rail').getByRole('link').first();
  await expect(firstCard).toBeVisible();
  const box = await firstCard.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(236);
  expect(box!.height).toBeGreaterThanOrEqual(228);
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
  await expect(page.getByRole('heading', { name: '公開反映テスト', level: 1 })).toBeVisible();
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

test('ホームは7つのブランドスライドをスマホでも横にはみ出さず表示する', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await startFreeHome(page);
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await expect(page.getByRole('tab', { name: /枚目を表示/ })).toHaveCount(7);
  await page.getByRole('tab', { name: '4枚目を表示' }).click();
  await expect(page.getByTestId('home-brand-slide-4')).toContainText('相手のテンポに寄せる');
  await expect(page.getByTestId('home-brand-slide-4')).toContainText('ミラーリング効果');
  await expect(page.getByTestId('home-brand-slide-4')).toContainText('言語スタイル同調');
  await expect(page.getByTestId('home-brand-slide-4')).toContainText('行動同調');
  const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});

test('理論カテゴリは一つの理論一覧で絞り込む', async ({ page }) => {
  for (const [category, label] of [
    ['maxims-experience', '格言'],
    ['organization-management', '組織・経営'],
    ['classics-thought', '古典・思想'],
  ] as const) {
    await page.goto(`/theories?category=${category}`);
    await expect(page.getByRole('button', { name: `${label}で理論を絞り込む` })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('theory-index-list')).toBeVisible();
  }
});

test('理論一覧はPCで均等な2列カードを保つ', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/theories');
  const rows = page.getByTestId('theory-index-list').getByRole('link');
  await expect(rows).toHaveCount(45);
  const [first, second] = await Promise.all([rows.nth(0).boundingBox(), rows.nth(1).boundingBox()]);
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(first!.width).toBeGreaterThan(550);
  expect(first!.height).toBeGreaterThanOrEqual(174);
  expect(Math.abs(first!.width - second!.width)).toBeLessThan(2);
  expect(second!.x).toBeGreaterThan(first!.x + first!.width);
});

test('詳細ページの階層リンクは探す配下の統合一覧へ戻る', async ({ page }) => {
  await page.goto('/card/master336-001');
  await expect(page.getByRole('link', { name: '探すへ移動' })).toHaveAttribute('href', '/discover');
  await expect(page.getByRole('link', { name: '対人術へ移動' })).toHaveAttribute('href', '/personas?category=interpersonal');

  await page.goto('/theory/kb_001');
  await expect(page.getByRole('link', { name: '探すへ移動' })).toHaveAttribute('href', '/discover');
  await expect(page.getByRole('link', { name: '心理学へ移動' })).toHaveAttribute('href', '/theories?category=psychology');
});

test('旧カテゴリ個別ページは削除されている', async ({ page }) => {
  const categoryResponse = await page.goto('/category/interpersonal');
  expect(categoryResponse?.status()).toBe(404);
  const theoryResponse = await page.goto('/theories/behavioral-science');
  expect(theoryResponse?.status()).toBe(404);
});

test('主ナビはPCとタブレットで幅を失わない', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/discover');
  const desktopItem = page.getByTestId('persistent-bottom-navigation').getByRole('link', { name: /^ホーム/ });
  await expect(desktopItem).toBeVisible();
  await expect.poll(async () => (await desktopItem.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(112);

  await page.setViewportSize({ width: 768, height: 1024 });
  const tabletItem = page.getByTestId('persistent-bottom-navigation').getByRole('link', { name: /^ホーム/ });
  await expect(tabletItem).toBeVisible();
  await expect.poll(async () => (await tabletItem.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(190);
});

test('人物像ページの保存操作は各行の右端に揃う', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/subcategory/interpersonal/印象がいい人');
  const firstRow = page.getByTestId('technique-column-1').getByRole('button', { name: '蔵書に保存' }).first();
  const secondRow = page.getByTestId('technique-column-1').getByRole('button', { name: '蔵書に保存' }).nth(1);
  await expect(firstRow).toBeVisible();
  await expect(secondRow).toBeVisible();
  const [first, second] = await Promise.all([firstRow.boundingBox(), secondRow.boundingBox()]);
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(Math.abs(first!.x - second!.x)).toBeLessThan(2);
  expect(first!.x).toBeGreaterThan(560);
});

test('探す理論リールはカテゴリで切り替え、矢印で横に送れる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/discover');
  await page.getByRole('tab', { name: /理論/ }).click();
  await page.getByRole('button', { name: '行動科学で理論を絞り込む' }).click();
  await expect(page.getByText('（行動科学）', { exact: true })).toBeVisible();
  await expect(page.getByTestId('discover-theory-rail').getByRole('button')).toHaveCount(5);
  const viewportInfo = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewportInfo.scrollWidth).toBeLessThanOrEqual(viewportInfo.width);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.reload();
  await page.getByRole('tab', { name: /理論/ }).click();
  const rail = page.getByTestId('discover-theory-rail');
  const before = await rail.evaluate((element) => element.scrollLeft);
  await page.getByRole('button', { name: '次の理論へ' }).click();
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(before);
});

test('PCホームは挨拶と7枚のブランドリールを上品に収める', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await startFreeHome(page);
  const reel = await page.getByTestId('home-brand-carousel').boundingBox();
  expect(reel).not.toBeNull();
  expect(reel!.width).toBeGreaterThan(850);
  expect(reel!.height).toBeGreaterThan(300);
  await expect(page.getByText('今日も、少しだけ判断を磨く。')).toBeVisible();
  await expect(page.getByLabel('次のスライド')).toBeVisible();
  await page.getByRole('tab', { name: '3枚目を表示' }).click();
  await expect(page.getByTestId('home-brand-slide-3')).toContainText('ピーク・エンドの法則');
  const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});

test('理論一覧は検索・カテゴリ・ソートをURLへ保持し、0件を静かに示す', async ({ page }) => {
  await page.goto('/theories');
  await expect(page.getByText('理論一覧', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('45件を無料公開', { exact: true })).toBeVisible();
  await expect(page.getByTestId('theory-index-list').getByRole('link')).toHaveCount(45);
  await page.getByLabel('理論名・キーワードから検索').fill('初頭');
  await expect(page.getByTestId('theory-index-list').getByRole('link')).toHaveCount(1);
  await expect(page).toHaveURL(/q=%E5%88%9D%E9%A0%AD.*category=all.*sort=source.*page=1/);
  await page.getByRole('tab', { name: 'あいうえお順' }).click();
  await expect(page).toHaveURL(/sort=alpha/);
  await page.getByLabel('理論名・キーワードから検索').fill('存在しない理論名');
  await expect(page.getByText('該当する理論が見つかりませんでした。')).toBeVisible();
  await page.getByRole('button', { name: '理論一覧の条件を解除' }).click();
  await expect(page.getByText('45件を無料公開', { exact: true })).toBeVisible();
});

test('ゲストのマイページからログイン導線を直接開ける', async ({ page }) => {
  await page.goto('/my-os');
  const account = page.getByTestId('account-membership-card');
  await expect(account).toHaveAttribute('aria-label', 'ログインしてプロフィールを設定');
  await expect(account).toContainText('プロフィールを設定');
  await account.click();
  await expect(page).toHaveURL(/\/auth\?mode=signin/);
});

test('ホームのブランドリールは前後操作で同じ一枚へ戻れる', async ({ page }) => {
  await page.goto('/');
  await startFreeHome(page);
  await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  await page.getByLabel('次のスライド').click();
  await expect(page.getByRole('tab', { name: '2枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  await page.getByLabel('前のスライド').click();
  await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
});

test('ホームのブランドリールは前後どちら向きにも何周も循環する', async ({ page }) => {
  await page.goto('/');
  await startFreeHome(page);
  await expect(page.getByLabel('前のスライド')).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByLabel('次のスライド')).not.toHaveAttribute('aria-disabled', 'true');
  for (let index = 0; index < 7; index += 1) await page.getByLabel('次のスライド').click({ force: true });
  await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  for (let index = 0; index < 7; index += 1) await page.getByLabel('前のスライド').click({ force: true });
  await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  const viewport = page.getByTestId('home-brand-viewport');
  await expect.poll(async () => {
    const metrics = await viewport.evaluate((element) => ({ left: element.scrollLeft, width: element.clientWidth }));
    return Math.abs(metrics.left);
  }).toBeLessThan(2);
});

test('ホームのカードから詳細へ移動して戻ると、選択位置を初期表示から復元する', async ({ page }) => {
  await page.goto('/');
  await startFreeHome(page);
  await page.getByRole('tab', { name: '4枚目を表示' }).click();
  await expect(page.getByRole('tab', { name: '4枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('home-brand-map-technique-cta').click();
  await expect(page).toHaveURL(/\/card\//);
  await page.getByRole('button', { name: '前の画面へ戻る' }).click();
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await expect(page.getByRole('tab', { name: '4枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  const viewport = page.getByTestId('home-brand-viewport');
  await expect.poll(async () => {
    const metrics = await viewport.evaluate((element) => ({ left: element.scrollLeft, width: element.clientWidth }));
    return Math.abs(metrics.left - metrics.width * 3);
  }).toBeLessThan(2);
});

test('ホームのブランドリールはPC・タブレット・スマホでカードが途中で切れない', async ({ page }) => {
  await page.goto('/');
  await startFreeHome(page);
  for (const viewportSize of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewportSize);
    const viewport = page.getByTestId('home-brand-viewport');
    const slide = page.getByTestId('home-brand-slide-1');
    await expect(viewport).toBeVisible();
    await expect(slide).toBeVisible();
    const [viewportBox, slideBox] = await Promise.all([viewport.boundingBox(), slide.boundingBox()]);
    expect(viewportBox).not.toBeNull();
    expect(slideBox).not.toBeNull();
    expect(Math.abs(slideBox!.x - viewportBox!.x)).toBeLessThan(2);
    expect(Math.abs(slideBox!.width - viewportBox!.width)).toBeLessThan(2);
    const pageWidth = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.inner);
  }
});

test('スマホのホームリールは横長比率を保ち全7枚を読みやすく表示する', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await startFreeHome(page);
  for (let index = 1; index <= 7; index += 1) {
    await page.getByRole('tab', { name: `${index}枚目を表示` }).click();
    const slideBox = await page.getByTestId(`home-brand-slide-${index}`).boundingBox();
    expect(slideBox).not.toBeNull();
    expect(slideBox!.width / slideBox!.height).toBeGreaterThan(1.4);
  }
});

test('ホームリール全7枚はスマホ・PCともカード内部にはみ出さない', async ({ page }) => {
  for (const viewportSize of [{ width: 320, height: 740 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewportSize);
    await page.goto('/');
    await startFreeHome(page);
    for (let index = 1; index <= 7; index += 1) {
      await page.getByRole('tab', { name: `${index}枚目を表示` }).click();
      const metrics = await page.getByTestId(`home-brand-slide-${index}`).evaluate((element) => ({
        clientHeight: element.clientHeight,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        scrollWidth: element.scrollWidth,
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 2);
      expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 2);
    }
  }
});

test('320pxでは人物像を1列にし学ぶページの語句と横幅を崩さない', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/personas');
  const cards = page.getByTestId('personas-grid').getByRole('link');
  await expect(cards).toHaveCount(26);
  const [first, second] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox()]);
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(Math.abs(first!.x - second!.x)).toBeLessThan(2);

  await page.goto('/learn');
  await expect(page.getByText('3つのステージで、判断を少しずつ自分の力に。')).toBeVisible();
  await expect(page.getByText('\\u2060')).toHaveCount(0);
  const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});

test('権威付けの装飾を表示せず保存のひし形操作は維持する', async ({ page }) => {
  await page.goto('/');
  await startFreeHome(page);
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

test('学ぶトップは3ステージの実進捗と禄丸を表示し、無料版ロックを維持する', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learn');
  await expect(page.getByText('処世術を習得しよう！')).toBeVisible();
  await expect(page.getByTestId('learning-stage-list').getByRole('button')).toHaveCount(3);
  await expect(page.getByTestId('learning-stage-1')).toContainText('0 / 7');
  await expect(page.getByTestId('learning-stage-2')).toContainText('完全版');
  await expect(page.getByTestId('rokumaru-guide')).toBeVisible();

  await page.getByRole('button', { name: /ステージ2、仕事を、どう動かす？/ }).click();
  await expect(page).toHaveURL(/\/upgrade\?source=learning/);
});

test('学ぶの改善が必要な選択は理由・関連知識・次ケースへつながる', async ({ page }) => {
  await page.goto('/learn');
  await page.getByRole('button', { name: 'ステージ1、人と、どう関わる？' }).click();
  await expect(page.getByText('CASE 01 / 21')).toBeVisible();
  await expect(page.getByTestId('learning-question-card')).toBeVisible();
  await expect(page.getByTestId('learning-question-card').getByTestId('rokumaru-guide')).toBeVisible();
  await page.getByRole('button', { name: /^A/ }).click();
  await expect(page.getByText('この場面での評価')).toBeVisible();
  await expect(page.getByText('あなたの選択')).toBeVisible();
  await expect(page.getByText('この選択だと、次の問題が起きる。')).toBeVisible();
  await expect(page.getByText('この選択による問題')).toBeVisible();
  await expect(page.getByText('相手は聞き役に固定され、会話ではなく自己紹介を採点する時間になる。次の質問も出にくくなる。').first()).toBeVisible();
  await expect(page.getByTestId('rokumaru-encourage')).toBeVisible();
  await expect(page.getByRole('link', { name: /関連する処世術、初対面は面白さより安心感を開く/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /関連する理論、不確実性低減理論を開く/ })).toBeVisible();

  await page.getByRole('button', { name: /次のケースへ/ }).click();
  await expect(page).toHaveURL(/\/learn\/case-02/);
  await expect(page.getByText('CASE 02 / 21')).toBeVisible();
});

test('学ぶの良い判断は正解表情と解説を示し、進捗へ保存する', async ({ page }) => {
  await page.goto('/learn/case-01?retry=1');
  await page.getByRole('button', { name: /^B/ }).click();
  await expect(page.getByText('いい選択です。')).toBeVisible();
  await expect(page.getByText('この手が活きる理由')).toBeVisible();
  await expect(page.getByText('安心できる小さな往復から始める。')).toBeVisible();
  await expect(page.getByTestId('rokumaru-happy')).toBeVisible();

  await page.getByRole('button', { name: /解説を閉じる/ }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByTestId('learning-stage-1')).toContainText('1 / 7');
});

test('学ぶはスマホで縦積みになり横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/learn');
  await expect(page.getByTestId('learning-stage-1')).toBeVisible();
  await expect(page.getByTestId('rokumaru-guide')).toBeVisible();

  await page.getByTestId('learning-stage-1').click();
  await expect(page.getByTestId('learning-question-card')).toBeVisible();
  await expect(page.getByRole('button', { name: /^A/ })).toBeVisible();
  await page.getByRole('button', { name: /^B/ }).click();
  await expect(page.getByTestId('learning-result-card')).toBeVisible();
  await expect(page.getByTestId('rokumaru-happy')).toBeVisible();
  const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});
