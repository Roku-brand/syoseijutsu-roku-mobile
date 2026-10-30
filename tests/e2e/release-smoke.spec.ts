Warning: truncated output (original token count: 17659)
Total output lines: 1121

import { expect, test, type Page } from '@playwright/test';
import scope from '../../src/data/content-scope.json';
import metadata from '../../src/data/generated/metadata.json';

async function startFreeHome(page: Page) {
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
}

test('owner operations routes do not expose operational data to signed-out users', async ({ page }) => {
  for (const route of [
    '/owner/operations',
    '/owner/operations/inquiries',
    '/owner/operations/social',
    '/owner/operations/tasks',
    '/owner/operations/faq',
    '/owner/operations/logs',
  ]) {
    await page.goto(route);
    await expect(page.getByText('owner権限が必要です')).toBeVisible();
    await expect(page.getByTestId('owner-operations-page')).toHaveCount(0);
  }
});

test('ホームが初期画面になり、旧ウェルカムURLもホームへ転送する', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/', '/welcome', '/onboarding']) {
      await page.goto(route);
      await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
      await expect(page.getByRole('heading', { name: /流れていく知恵を、.*体系にする。/ })).toHaveCount(0);
      await expect(page.getByTestId('home-welcome-modal')).toHaveCount(0);
    }
  }
});

test('設定からアプリ設定とホーム画面への追加を削除する', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText('ウェルカムページを非表示にする')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ホーム画面に追加' })).toHaveCount(0);
  await expect(page.getByText('アプリ設定', { exact: true })).toHaveCount(0);
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

test('マイページはプロフィールと巻物に続いてお気に入りと自作カードを表示する', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-os');
  const profileCard = page.getByTestId('profile-principle-card');
  await expect(profileCard).toBeVisible();
  await expect(page.getByTestId('personal-principle-card')).toBeVisible();
  await expect(page.getByText('いまの座右の銘', { exact: true })).toBeVisible();
  await expect(page.getByText('志は高く、腰は低く。', { exact: true })).toBeVisible();
  await expect(page.getByTestId('personal-principle-edit')).toBeVisible();
  await expect(page.getByTestId('personal-principle-edit')).toHaveAttribute('aria-label', '座右の銘を編集');
  await expect(profileCard).toContainText('無料版を利用中');
  await expect(profileCard).not.toContainText('無料公開分');
  await expect(profileCard).not.toContainText('完全版を見る');
  await expect(page.getByTestId('my-page-tabs')).toHaveCount(0);
  await expect(page.getByTestId('favorites-overview')).toContainText('お気に入り');
  await expect(page.getByTestId('personal-memos-preview').getByRole('heading', { name: 'マイ処世術', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '閲覧履歴を開く', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'オリジナルの処世術を作る', exact: true }).click();
  await page.getByRole('textbox', { name: 'マイ処世術' }).fill('一呼吸おいて、相手の話を聞く。');
  await page.getByRole('textbox', { name: 'フォルダー名', exact: true }).fill('日々の気づき');
  await page.getByRole('button', { name: 'マイ処世術を追加', exact: true }).click();
  await expect(page.getByRole('button', { name: 'マイ処世術：日々の気づき', exact: true })).toContainText('1件');
  await page.getByRole('button', { name: 'マイ処世術をすべて見る', exact: true }).click();
  await page.getByRole('button', { name: 'マイ処世術：日々の気づき', exact: true }).click();
  await expect(page.getByRole('button', { name: '一呼吸おいて、相手の話を聞く。を編集' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'マイ処世術：日々の気づき', exact: true }).click();
  await expect(page.getByRole('button', { name: '一呼吸おいて、相手の話を聞く。を編集' })).toBeVisible();
  await page.getByRole('button', { name: '一呼吸おいて、相手の話を聞く。を編集' }).click();
  await page.getByRole('textbox', { name: 'マイ処世術' }).fill('一呼吸おいて、最後まで話を聞く。');
  await page.getByRole('button', { name: '変更を保存', exact: true }).click();
  await expect(page.getByRole('button', { name: '一呼吸おいて、最後まで話を聞く。を編集' })).toBeVisible();
});

test('マイページの統合カードとタブはスマホ幅に収まり、座右の銘を編集できる', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/my-os');
  const card = await page.getByTestId('profile-principle-card').boundingBox();
  const tabs = await page.getByTestId('favorites-overview').boundingBox();
  expect(card).not.toBeNull();
  expect(tabs).not.toBeNull();
  expect(card!.height).toBeLessThan(300);
  expect(tabs!.y).toBeGreaterThan(card!.y + card!.height);
  expect(tabs!.y - card!.y - card!.height).toBeLessThanOrEqual(36);
  await page.getByTestId('personal-principle-edit').click();
  const longPrinciple = '自分の歩幅を守りながら、相手への敬意を忘れず、焦らず静かに一つずつ進んでいく。';
  await page.getByRole('textbox', { name: '座右の銘' }).fill(longPrinciple);
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByTestId('personal-principle-card')).toContainText(longPrinciple);
  const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
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
  await expect(page.getByTestId('persona-header-subtitle')).toHaveText('14の処世術');
  await expect(page.getByTestId('persona-technique-list').getByRole('link')).toHaveCount(14);
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

test('無料版の関連理論は完全版のタイトルも表示し、未収録理論は購入ページへ送る', async ({ page }) => {
  await page.goto('/card/master336-007');
  const relatedTheories = page.getByTestId('related-theories');
  await expect(relatedTheories).toBeVisible();
  const primaryTheories = page.getByTestId('primary-theories');
  const supplementaryTheories = page.getByTestId('supplementary-theories');
  await expect(page.getByText('主要理論', { exact: true })).toBeVisible();
  // This card is fully explained by its two primary mechanisms. Do not
  // restore redundant mirroring effects just to fill a supplementary list.
  await expect(page.getByText('あわせて読む理論', { exact: true })).toHaveCount(0);
  await expect(primaryTheories.getByText('言語スタイル同調', { exact: true })).toBeVisible();
  await expect(primaryTheories.getByText('行動同調', { exact: true })).toBeVisible();
  await expect(primaryTheories.getByRole('link')).toHaveCount(2);
  await expect(supplementaryTheories).toHaveCount(0);
  await expect(relatedTheories).not.toContainText('完全版の理論');
  const lockedTheoryLink = relatedTheories.getByRole('link', { name: '行動同調を開く' });
  await expect(lockedTheoryLink).toHaveAttribute('href', '/upgrade?source=discover_theory');
  await lockedTheoryLink.click();
  await expect(page).toHaveURL(/\/upgrade\?source=discover_theory/);
});

test('theory metadata sits beside its identifier and content is never ellipsized', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/theory/kb_001');
  const meta = page.getByTestId('theory-meta');
  const title = page.getByTestId('theory-title');
  await expect(meta).toBeVisible();
  await expect(title).toBeVisible();
  await expect(meta).toContainText('P-003');
  await expect(title).not.toContainText('…');
});

test('理論詳細は短い定義・処世術・理論・情報の順で表示する', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/theory/kb_008');
  const summary = page.getByTestId('theory-summary');
  await expect(summary).toBeVisible();
  expect(await summary.innerText()).toContain('自分のことを適度に話すと、相手も自分のことを話しやすくなること。');
  const article = await page.locator('[data-testid="theory-title"]').locator('xpath=ancestor-or-self::*').first().evaluate(() => document.body.innerText);
  expect(article.indexOf('自己開示の返報性とは')).toBeGreaterThan(0);
  expect(article.indexOf('自己開示の返報性とは')).toBeLessThan(article.indexOf('この考え方を実生活でどう使う？'));
  expect(article.indexOf('この考え方を実生活でどう使う？')).toBeLessThan(article.indexOf('関連する知識'));
  expect(article.indexOf('関連する知識')).toBeLessThan(article.indexOf('理論情報'));
  await page.getByRole('button', { name: '出典・理論情報', exact: true }).click();
  await expect(page.getByTestId('theory-information')).toContainText('出典状態');
  await expect(page.getByTestId('theory-information')).toContainText('提唱者');
  await expect(page.getByTestId('theory-information')).toContainText('著作・研究');
  await expect(page.getByTestId('theory-information')).toContainText('注記');
});

test('理論詳細の関連項目は横幅いっぱいの読みやすいボックスになる', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/theory/kb_008');
  const techniqueRow = page.getByTestId('theory-related-techniques').getByRole('link').first();
  const theoryRow = page.getByTestId('theory-related-theories').getByRole('link').first();
  await expect(techniqueRow).toBeVisible();
  await expect(theoryRow).toBeVisible();
  const [techniqueBox, theoryBox] = await Promise.all([techniqueRow.boundingBox(), theoryRow.boundingBox()]);
  expect(techniqueBox).not.toBeNull();
  expect(theoryBox).not.toBeNull();
  expect(techniqueBox!.width).toBeGreaterThan(700);
  expect(techniqueBox!.width).toBeLessThanOrEqual(820);
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

test('persona technique menu leaves saving to each technique detail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/subcategory/interpersonal/印象がいい人');
  await expect(page.getByRole('button', { name: 'お気に入りに保存' })).toHaveCount(0);
  await expect(page.getByTestId('persona-technique-list').getByRole('link')).toHaveCount(14);
});

test('初回訪問でホームを直接表示し、再読み込み後も維持できる', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(1);
  await expect(page.getByText('ホーム', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId('home-shortcuts')).toBeVisible();
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
  await expect(page.getByTestId('home-brand-slide-1')).toContainText('編集部の特集');
  await expect(page.getByRole('tab', { name: /枚目を表示/ })).toHaveCount(4);
  await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  await page.goto('/');
  await expect(page.getByTestId('home-brand-carousel')).toBeVisible();
});

test('主要4タブのヘッダーはブランド、検索、メニューを表示する', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const [route, title] of [
    ['/', 'ホーム'],
    ['/discover', '探す'],
    ['/learn', '学ぶ'],
    ['/my-os', 'マイページ'],
  ] as const) {
    await page.goto(route);
    const header = page.getByTestId('book-header');
    await expect(header.getByText(title, { exact: true })).toHaveCount(0);
    await expect(header.getByText('処世術禄', { exact: true })).toBeVisible();
    await expect(header.getByText('人生をうまく生きる方法を、すべての人へ', { exact: true })).toBeVisible();
    await expect(header.getByRole('button', { name: '検索' })).toBeVisible();
    await expect(header.getByRole('button', { name: '設定を開く' })).toBeVisible();
    await expect(header.getByText('完全版を見る →', { exact: true })).toHaveCount(0);
  }
  await page.getByTestId('book-header').getByRole('button', { name: '検索' }).click();
  await expect(page.getByTestId('header-search-popup')).toBeVisible();
  await expect(page).toHaveURL(/\/my-os$/);
});

test('ホームのブランドリールはキーボードで4枚を横にスライドする', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await startFreeHome(page);

  const rail = page.getByTestId('home-brand-viewport');
  await expect(rail).toBeVisible();
  await expect(page.getByRole('button', { name: '前のスライド' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '次のスライド' })).toHaveCount(0);
  expect(await rail.evaluate((element) => element.scrollLeft)).toBe(0);
  await page.getByRole('tab',{name:'1枚目を表示'}).focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
});

test('編集カルーセルの4枚は実在する遷移先を持つ',async({page})=>{
 const routes=[/\/features/,/\/(subcategory|personas)/,/\/(card|discover)/,/\/learn/];
 for(let i=1;i<=4;i++){await page.goto('/');await startFreeHome(page);await page.getByRole('tab',{name:i+'枚目を表示'}).click();await page.getByTestId('home-brand-slide-'+i).click({position:{x:25,y:25}});await expect(page).toHaveURL(routes[i-1]);}
});

test('購入直前の確認内容と法務導線を表示できる', async ({ page }) => {
  await page.goto('/upgrade');
  await expect(page.getByTestId('persistent-bottom-navigation')).toHaveCount(0);
  await expect(page.getByText('処世術禄　完全版')).toBeVisible();
  await expect(page.getByText('まずは処世術禄を体験', { exact: true })).toBeVisible();
  await expect(page.getByText(/完全版/).first()).toBeVisible();
  await expect(page.getByTestId('upgrade-fixed-purchase')).toContainText('30日間利用できます');
  await expect(page.getByText('一回払い・自動更新なし').first()).toBeVisible();
  await page.getByRole('button', { name: /完全版を購入する/ }).click();
  await expect(page.getByText('購入内容の確認', { exact: true })).toBeVisible();
  await expect(page.getByText('¥320（税込）', { exact: true }).last()).toBeVisible();
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

test('マイ処世術はマイページ内で作成・フォルダー整理・削除ができる', async ({ page }) => {
  await page.goto('/my-os');
  await page.getByRole('button', { name: 'マイ処世術をすべて見る', exact: true }).click();
  await expect(page).toHaveURL(/\/my-techniques/);
  await page.getByRole('button', { name: 'フォルダーを管理', exact: true }).click();
  await page.getByRole('button', { name: 'フォルダーを追加' }).click();
  await page.getByRole('textbox', { name: 'フォルダー名' }).fill('仕事');
  await page.getByRole('button', { name: 'フォルダーを作成', exact: true }).click();
  await page.getByRole('button', { name: 'このフォルダーに新規作成', exact: true }).click();
  await page.getByRole('textbox', { name: 'マイ処世術' }).fill('焦ったら、一度だけ深呼吸する');
  await page.getByRole('button', { name: 'マイ処世術を追加', exact: true }).click();
  await expect(page.getByRole('button', { name: '焦ったら、一度だけ深呼吸するを編集' })).toContainText('仕事');
  await page.getByRole('button', { name: '焦ったら、一度だけ深呼吸するのメニュー' }).click();
  await page.getByRole('button', { name: '削除', exact: true }).click();
  await page.getByRole('button', { name: 'このマイ処世術を削除' }).click();
  await expect(page.getByText('このフォルダーはまだ空です')).toBeVisible();
});

test('閲覧履歴はマイページ内で確認できる', async ({ page }) => {
  await page.goto('/my-os');
  await page.getByRole('button', { name: '閲覧履歴を開く', exact: true }).click();
  await expect(page.getByText('まだ閲覧履歴はありません')).toBeVisible();
});

test('理論の閲覧もマイページから開く履歴画面へ蓄積される', async ({ page }) => {
  await page.goto('/theory/kb_001');
  await expect(page.getByTestId('theory-title')).toHaveText('初頭効果');
  await page.goto('/my-os');
  await page.getByRole('button', { name: '閲覧履歴を開く', exact: true }).click();
  await expect(page.getByTestId('history-content')).toBeVisible();
  await page.getByRole('tab', { name: '理論', exact: true }).click();
  await expect(page.getByRole('button', { name: '初頭効果を開く' })).toBeVisible();
  await expect(page).toHaveURL(/\/history/);
});

test('探すは検索と人物像・理論への入口から始まる', async ({ page }) => {
  await page.goto('/discover');
  await expect(page.getByRole('button', { name: '処世術・理論・特集を検索' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '処世術を探す', level: 2 })).toBeVisible();
  await expect(page.getByTestId('discover-techniques-section').getByRole('heading', { name: '人物像から探す', level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { name: '理論を探す', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'よく見られる検索' })).toBeVisible();
  await expect(page.getByRole('button', { name: '第一印象を検索' })).toBeVisible();
});

test('探すのカテゴリと人気検索はスマホ幅で揃い、既存の一覧に遷移する', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/discover');
    const destinations = page.getByTestId('discover-search');
    const categories = page.getByTestId('discover-categories');
    const popular = page.getByTestId('discover-popular');
    const destinationBox = await destinations.boundingBox();
    const categoryBox = await categories.boundingBox();
    const popularBox = await popular.boundingBox();
    expect(destinationBox && categoryBox && popularBox).toBeTruthy();
    expect(destinationBox!.y + destinationBox!.height).toBeLessThanOrEqual(categoryBox!.y);
    expect(categoryBox!.y + categoryBox!.height).toBeLessThan(popularBox!.y);
    await expect(page.getByTestId('discover-technique-grid').getByRole('link')).toHaveCount(3);
    await expect(page.getByTestId('discover-theory-grid').getByRole('link')).toHaveCount(6);
    await expect(popular.getByRole('button')).toHaveCount(6);
    const headings = await page.getByRole('heading', { level: 2 }).evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).fontSize));
    expect(headings).toEqual([headings[0], headings[0]]);
    const widths = await page.getByTestId('discover-technique-grid').getByRole('link').evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().width)));
    expect(new Set(widths).size).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.getByRole('link', { name: '心理学から探す' }).click();
  await expect(page).toHaveURL(/\/theories\?category=psychology/);
  await page.goto('/discover');
  await page.getByRole('link', { name: '対人術から探す' }).click();
  await expect(page).toHaveURL(/\/personas\?category=interpersonal/);
  await page.goto('/discover');
  await page.getByRole('button', { name: '第一印象を検索' }).click();
  await expect(page).toHaveURL(/\/search\?.*q=/);
  await expect(page.getByRole('textbox', { name: 'キーワードを検索' })).toHaveValue('第一印象');
});

test('探すの検索欄は独立検索ページを開く', async ({ page }) => {
  await page.goto('/discover');
  await page.getByRole('button', { name: '処世術・理論・特集を検索' }).click();
  await expect(page).toHaveURL(/\/search\?mode=techniques/);
  const input = page.getByRole('textbox', { name: 'キーワードを検索' });
  await input.fill('聞き上手');
  await input.press('Enter');
  await expect(page.getByText(/処世術 \d+件/).first()).toBeVisible();
});

test('人物像ギャラリーと理論索引は役割を分けてレスポンシブ表示する', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/personas');
  const desktopCards = page.getByTestId('personas-grid').getByRole('button');
  await expect(desktopCards.nth(4)).toBeVisible();
  const desktopBoxes = await Promise.all([0, 1, 2, 3, 4].map((index) => desktopCards.nth(index).boundingBox()));
  expect(new Set(desktopBoxes.slice(0, 4).map((box) => Math.round(box!.y))).size).toBe(1);
  expect(desktopBoxes[4]!.y).toBeGreaterThan(desktopBoxes[0]!.y + 100);

  await page.goto('/theories');
  await expect(page.getByRole('heading', { name: '理論一覧' })).toBeVisible();
  await expect(page.getByText(`${scope.complete.theories}件`, { exact: true })).toBeVisible();
  const labels = await page.getByTestId('theory-category-filters').getByRole('button').allTextContents();
  expect(labels).toEqual(['すべて', '心理学', '行動科学', '組織・経営論', '戦略論', '実践知', '古典・思想']);
  const filters = page.getByTestId('theory-category-filters').getByRole('button');
  const boxes = await Promise.all(Array.from({ length: 7 }, (_, index) => filters.nth(index).boundingBox()));
  expect(boxes.every(Boolean)).toBe(true);
  expect(new Set(boxes.map((box) => Math.round(box!.y))).size).toBe(1);
  expect(boxes.every((box) => Math.abs(box!.height - 44) <= 1)).toBe(true);
  await expect(page.getByRole('textbox')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => {
    const mobileBoxes = await Promise.all(Array.from({ length: 7 }, (_, index) => filters.nth(index).boundingBox()));
    if (mobileBoxes.some((box) => box === null)) return false;
    return mobileBoxes.slice(0, 4).every((box) => Math.abs(box!.y - mobileBoxes[0]!.y) <= 1)
      && mobileBoxes.slice(4).every((box) => Math.abs(box!.y - mobileBoxes[4]!.y) <= 1)
      && mobileBoxes[4]!.y > mobileBoxes[0]!.y
      && mobileBoxes.every((box) => Math.abs(box!.height - 44) <= 1);
  }).toBe(true);
});

test('追加理論は詳細・出典・関連導線まで表示される', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/theory/kb_706');
  await expect(page.getByTestId('theory-title')).toHaveText('ダニング＝クルーガー効果');
  await expect(page.getByTestId('theory-summary')).toContainText('自分の出来を高く見積もりやすいこと。');
  await page.getByRole('button', { name: '出典・理論情報', exact: true }).click();
  await expect(page.getByTestId('theory-information')).toContainText('David Dunning');
  // The authoritative DB has no technique links for kb_706. Do not restore
  // outdated generated-only associations just to fill the section.
  await expect(page.getByTestId('theory-related-techniques')).toHaveCount(0);
  await expect(page.getByTestId('theory-related-theories').getByRole('link').first()).toBeVisible();
  const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});

test('探すの人物像カードは参考レイアウトの寸法を保つ', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/personas');
  const firstCard = page.getByTestId('personas-grid').getByRole('button').first();
  await expect(firstCard).toBeVisible();
  const box = await firstCard.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(236);
  expect(box…2659 tokens truncated… await page.goto('/auth?intent=claim&session_id=cs_test_example&mode=signin');
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

test('ホームの4つの編集テーマはスマホで横にはみ出さない', async ({ page }) => {
 await page.setViewportSize({width:390,height:844}); await page.goto('/'); await startFreeHome(page);
 await expect(page.getByRole('tab',{name:/枚目を表示/})).toHaveCount(4);
 for(const [i,text] of ['編集部の特集','注目の人物像','知識のつながり','今日の問い'].entries()){
  await page.getByRole('tab',{name:(i+1)+'枚目を表示'}).click();
  await expect(page.getByTestId('home-brand-slide-'+(i+1))).toContainText(text);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('理論カテゴリは一つの理論一覧で絞り込む', async ({ page }) => {
  for (const [category, label] of [
    ['organization-management', '組織・経営論'],
    ['practical-wisdom', '実践知'],
    ['classics-thought', '古典・思想'],
  ] as const) {
    await page.goto(`/theories?category=${category}`);
    await expect(page.getByRole('button', { name: `${label}で理論を絞り込む` })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('theory-index-list')).toBeVisible();
  }
});

test('理論一覧はPCでも読みやすい一列の索引幅を保つ', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/theories');
  const rows = page.getByTestId('theory-index-list').getByRole('link');
  await expect(rows).toHaveCount(100);
  const [first, second] = await Promise.all([rows.nth(0).boundingBox(), rows.nth(1).boundingBox()]);
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(first!.width).toBeGreaterThan(550);
  expect(first!.height).toBeGreaterThanOrEqual(70);
  expect(Math.abs(first!.width - second!.width)).toBeLessThan(2);
  expect(Math.abs(first!.x - second!.x)).toBeLessThan(2);
  expect(second!.y).toBeGreaterThan(first!.y + first!.height - 2);
  const firstRowStyle = await page.getByTestId('theory-card').first().evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      borderStyle: computed.borderTopStyle,
      borderWidth: computed.borderTopWidth,
      borderRadius: Number.parseFloat(computed.borderTopLeftRadius),
    };
  });
  expect(firstRowStyle.borderStyle).toBe('solid');
  expect(firstRowStyle.borderWidth).toBe('1px');
  expect(firstRowStyle.borderRadius).toBeGreaterThan(0);
});

test('詳細ページの階層リンクは探す配下の統合一覧へ戻る', async ({ page }) => {
  await page.goto('/card/master336-001');
  await expect(page.getByRole('link', { name: '探すへ移動' })).toHaveAttribute('href', '/discover');
  await expect(page.getByRole('link', { name: '対人術へ移動' })).toHaveAttribute('href', '/personas?category=interpersonal');

  await page.goto('/theory/kb_001');
  await expect(page.getByRole('link', { name: '探すへ移動' })).toHaveAttribute('href', '/discover');
  await expect(page.getByRole('link', { name: '心理学へ移動' })).toHaveAttribute('href', '/theories?category=psychology');
});

test('詳細ヘッダーは保存・共有を維持し、設定や五大原則を表示しない', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const route of ['/card/master336-001', '/theory/kb_001']) {
    await page.goto(route);
    const header = page.getByTestId('book-header');
    await expect(header.getByRole('button', { name: '設定を開く' })).toHaveCount(0);
    await expect(header.getByRole('button', { name: '処世術の五大原則を開く' })).toHaveCount(0);
    await expect(header.getByRole('button', { name: '共有', exact: true })).toBeVisible();
    await expect(header.getByTestId('header-share-symbol')).toBeVisible();
    await header.getByRole('button', { name: 'お気に入りに保存', exact: true }).click();
    await expect(header.getByRole('button', { name: 'お気に入りから外す', exact: true })).toBeVisible();
    await page.reload();
    await expect(header.getByRole('button', { name: 'お気に入りから外す', exact: true })).toBeVisible();
    await header.getByRole('button', { name: 'お気に入りから外す', exact: true }).click();
    await expect(header.getByRole('button', { name: 'お気に入りに保存', exact: true })).toBeVisible();
    const buttons = await header.getByRole('button').evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height, right: rect.right };
    }));
    expect(buttons.every(rect => rect.width >= 44 && rect.height >= 44 && rect.right <= 320)).toBe(true);
  }
});

test('学習ケースの直接アクセスからヘッダーで学ぶへ戻れる', async ({ page }) => {
  await page.goto('/learn/case-01');
  const header = page.getByTestId('book-header');
  await expect(header.getByRole('button')).toHaveCount(1);
  await header.getByTestId('book-header-back').click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByTestId('learning-stage-1')).toBeVisible();
  await expect(header.getByRole('button', { name: '設定を開く' })).toBeVisible();
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

test('人物像ページは処世術を選ぶメニューに徹する', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/subcategory/interpersonal/印象がいい人');
  await expect(page.getByRole('button', { name: 'お気に入りに保存' })).toHaveCount(0);
  await expect(page.getByTestId('persona-technique-list').getByRole('link')).toHaveCount(14);
});

test('理論索引はカテゴリで絞り込める', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/theories');
  await page.getByRole('button', { name: '行動科学で理論を絞り込む' }).click();
  await expect(page.getByRole('button', { name: '行動科学で理論を絞り込む' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(`${metadata.categoryCounts['behavioral-science']}件`, { exact: true })).toBeVisible();
  const viewportInfo = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewportInfo.scrollWidth).toBeLessThanOrEqual(viewportInfo.width);
});

test('PCホームは編集バナーと幅を抑えたデッキを収める',async({page})=>{
 await page.setViewportSize({width:1440,height:1000}); await page.goto('/'); await startFreeHome(page);
 const reel=(await page.getByTestId('home-brand-carousel').boundingBox())!;
 const header=(await page.getByTestId('book-header').boundingBox())!;expect(Math.abs(reel.width-header.width)).toBeLessThanOrEqual(1);expect(Math.abs(reel.x-header.x)).toBeLessThanOrEqual(1);
 const card=(await page.getByTestId('home-recommendation-card').boundingBox())!;expect(card.width).toBeLessThanOrEqual(356);
});

test('ホームは編集バナー、5導線、デッキの順に並び、五大原則を開ける',async({page})=>{
 await page.goto('/');await startFreeHome(page);
 const hero=(await page.getByTestId('home-brand-carousel').boundingBox())!;
 const shortcuts=(await page.getByTestId('home-shortcuts').boundingBox())!;
 const deck=(await page.getByTestId('home-recommendations-section').boundingBox())!;
 expect(hero.y+hero.height).toBeLessThanOrEqual(shortcuts.y);expect(shortcuts.y+shortcuts.height).toBeLessThan(deck.y);
 await expect(page.getByTestId('home-continue-section')).toHaveCount(0);await expect(page.getByTestId('home-premium-banner')).toBeVisible();
 await page.getByTestId('home-shortcut-principles').click();await expect(page.getByText('処世術の五大原則',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'原則を閉じる'}).last().click();
});

test('ホームのデッキは一枚を主役にして前後へめくれる',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await startFreeHome(page);
 const card=page.getByTestId('home-recommendation-card');await expect(card).toHaveCount(1);await expect(page.getByTestId('home-deck-layer')).toHaveCount(4);
 const before=await card.getAttribute('aria-label');await page.getByTestId('home-deck-next').click();await expect(card).not.toHaveAttribute('aria-label',before!);
 await page.getByTestId('home-deck-previous').click();await expect(card).toHaveAttribute('aria-label',before!);
});

test('最初のバナーは個別カードではなく特集への入口になる',async({page})=>{
 await page.goto('/');await startFreeHome(page);await page.getByRole('tab',{name:'1枚目を表示'}).click();
 await expect(page.getByTestId('home-brand-slide-1')).toContainText('編集部の特集');await page.getByTestId('home-brand-slide-1').click({position:{x:25,y:25}});await expect(page).toHaveURL(/\/features/);
});

test('理論一覧の検索は右上からポップアップを開く', async ({ page }) => {
  await page.goto('/theories');
  await expect(page.getByText('理論一覧', { exact: true }).last()).toBeVisible();
  await expect(page.getByText(`${scope.complete.theories}件`, { exact: true })).toBeVisible();
  await expect(page.getByTestId('theory-index-list').getByRole('link')).toHaveCount(100);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByText('あいうえお順', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '理論一覧を検索' }).click();
  await expect(page).toHaveURL(/\/theories$/);
  await expect(page.getByTestId('header-search-popup').getByRole('tab', { name: '理論', exact: true })).toHaveAttribute('aria-selected', 'true');
  const input = page.getByRole('textbox', { name: 'キーワードを検索' });
  await input.fill('初頭');
  await input.press('Enter');
  await expect(page.getByTestId('search-page-results').getByText('初頭効果', { exact: true }).first()).toBeVisible();
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
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await startFreeHome(page);
  await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: '1枚目を表示' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '2枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
});

test('ホームのブランドリールは前後どちら向きにも何周も循環する', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await startFreeHome(page);
  await page.getByRole('tab', { name: '1枚目を表示' }).focus();
  for (let index = 0; index < 4; index += 1) await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  for (let index = 0; index < 4; index += 1) await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  const viewport = page.getByTestId('home-brand-viewport');
  await expect.poll(async () => {
    const metrics = await viewport.evaluate((element) => ({ left: element.scrollLeft, width: element.clientWidth }));
    return Math.abs(metrics.left);
  }).toBeLessThan(2);
});

test('ホームのブランドリールはタッチ移動で米粒表示を更新し両端から繰り返し循環する', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await startFreeHome(page);
  const viewport = page.getByTestId('home-brand-viewport');

  const cdp = await page.context().newCDPSession(page);
  const dispatchTouchSwipe = async (startOffsetX: number, endOffsetX: number) => {
    const box = await viewport.boundingBox();
    expect(box).not.toBeNull();
    const y = box!.y + box!.height / 2;
    const startX = box!.x + startOffsetX;
    const endX = box!.x + endOffsetX;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y }] });
    for (let step = 1; step <= 6; step += 1) {
      const x = startX + ((endX - startX) * step) / 6;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await page.waitForTimeout(18);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(450);
  };

  await dispatchTouchSwipe(300, 60);
  await expect(page.getByRole('tab', { name: '2枚目を表示' })).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('tab', { name: '1枚目を表示' }).click();
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await dispatchTouchSwipe(60, 300);
    await expect(page.getByRole('tab', { name: '4枚目を表示' })).toHaveAttribute('aria-selected', 'true');
    await dispatchTouchSwipe(300, 60);
    await expect(page.getByRole('tab', { name: '1枚目を表示' })).toHaveAttribute('aria-selected', 'true');
  }
});

test('編集バナーから詳細へ往復しても選択位置を復元する',async({page})=>{
 await page.goto('/');await startFreeHome(page);await page.getByRole('tab',{name:'3枚目を表示'}).click();
 await page.getByTestId('home-brand-slide-3').click({position:{x:25,y:25}});await expect(page).toHaveURL(/\/card\//);await page.goBack();
 await expect(page.getByRole('tab',{name:'3枚目を表示'})).toHaveAttribute('aria-selected','true');
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
    // React Native's onLayout responds asynchronously to viewport changes.
    // Keep the exact geometry contract, but wait for the resized layout.
    await expect(async () => {
      const [viewportBox, slideBox] = await Promise.all([viewport.boundingBox(), slide.boundingBox()]);
      expect(viewportBox).not.toBeNull();
      expect(slideBox).not.toBeNull();
      expect(Math.abs(slideBox!.x - viewportBox!.x)).toBeLessThan(2);
      expect(Math.abs(slideBox!.width - viewportBox!.width)).toBeLessThan(2);
      const pageWidth = await page.evaluate(() => ({ inner: innerWidth, scroll: document.documentElement.scrollWidth }));
      expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.inner);
    }).toPass({ timeout: 5000 });
  }
});

test('スマホの編集バナーは4枚とも横長比率を保つ',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await startFreeHome(page);
 for(let i=1;i<=4;i++){await page.getByRole('tab',{name:i+'枚目を表示'}).click();const box=(await page.getByTestId('home-brand-slide-'+i).boundingBox())!;expect(box.width/box.height).toBeGreaterThan(1.4);}
});

test('編集バナーは320pxとPCで内部にはみ出さない',async({page})=>{
 for(const width of [320,1440]){await page.setViewportSize({width,height:900});await page.goto('/');await startFreeHome(page);
 for(let i=1;i<=4;i++){await page.getByRole('tab',{name:i+'枚目を表示'}).click();const m=await page.getByTestId('home-brand-slide-'+i).evaluate(e=>({w:e.clientWidth,sw:e.scrollWidth,h:e.clientHeight,sh:e.scrollHeight}));expect(m.sw).toBeLessThanOrEqual(m.w+2);expect(m.sh).toBeLessThanOrEqual(m.h+2);}}
});

test('知識のつながりは既存の実践と関連理論を紹介する',async({page})=>{
 await page.goto('/');await startFreeHome(page);await page.getByRole('tab',{name:'3枚目を表示'}).click();
 await expect(page.getByTestId('home-brand-slide-3')).toContainText('知識のつながり');await expect(page.getByTestId('home-brand-slide-3')).toContainText('実践と理論をつなぐ');
});

test('320pxでも人物像を2列にし学ぶページの語句と横幅を崩さない', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/personas');
  const cards = page.getByTestId('personas-grid').getByRole('button');
  await expect(cards).toHaveCount(metadata.productPersonaCount);
  const [first, second, third] = await Promise.all([cards.nth(0).boundingBox(), cards.nth(1).boundingBox(), cards.nth(2).boundingBox()]);
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(third).not.toBeNull();
  expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
  expect(second!.x).toBeGreaterThan(first!.x + 40);
  expect(third!.y).toBeGreaterThan(first!.y + 100);

  await page.goto('/learn');
  await expect(page.getByText(/1問60秒。\s*その場で活きる判断を、\s*3つのステージで\s*自分の力に。/)).toBeVisible();
  await expect(page.getByText('\\u2060')).toHaveCount(0);
  const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});

test('人物像カードは一覧の最終行まで同じ寸法で表示する', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/personas');
  const cards = page.getByTestId('personas-grid').getByRole('button');
  await expect(cards).toHaveCount(metadata.productPersonaCount);
  await expect(page.getByRole('button', { name: '一緒にいて疲れない人は完全版で利用できます', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '人たらしの人、23処世術を開く' })).toBeVisible();
  const sizes = await cards.evaluateAll((elements) => elements.map((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(Math.max(...sizes.map((size) => size.width)) - Math.min(...sizes.map((size) => size.width))).toBeLessThan(1);
  expect(Math.max(...sizes.map((size) => size.height)) - Math.min(...sizes.map((size) => size.height))).toBeLessThan(1);
});

test('スマホの人物像カードと処世術メニューは横幅を崩さない', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/subcategory/interpersonal/人たらしの人');
  await expect(page.getByTestId('persona-page-title')).toContainText('人たらしの人');
  await expect(page.getByTestId('persona-technique-list').getByRole('link')).toHaveCount(23);

  const documentWidth = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(documentWidth.scrollWidth).toBeLessThanOrEqual(documentWidth.width);
});

test('権威付けの装飾と人物像メニューの保存操作を表示しない', async ({ page }) => {
  await page.goto('/');
  await startFreeHome(page);
  await expect(page.getByText('賢者の手帳')).toHaveCount(0);
  await expect(page.getByText('COMPLETE EDITION')).toHaveCount(0);
  await expect(page.getByText('♛')).toHaveCount(0);
  await page.goto('/subcategory/interpersonal/印象がいい人');
  await expect(page.getByRole('button', { name: 'お気に入りに保存' })).toHaveCount(0);
});

test('各領域の無料2人物像は配下の処世術をすべて読める', async ({ page }) => {
  for (const [category, name, count] of [
    ['interpersonal', '印象がいい人', 14],
    ['interpersonal', '人たらしの人', 23],
    ['work', '仕事ができる人', 15],
    ['work', 'タスク処理がうまい人', 14],
    ['life', '充実した人生を過ごせる人', 16],
    ['life', '自分らしく生きられる人', 13],
  ] as const) {
    await page.goto(`/subcategory/${category}/${name}`);
    await expect(page.getByTestId('persona-page-title')).toContainText(name);
    await expect(page.getByTestId('persona-technique-list').getByRole('link')).toHaveCount(count);
  }

  await page.goto('/subcategory/interpersonal/会話がうまい人');
  await expect(page).toHaveURL(/\/upgrade\?source=discover_technique/);

  await page.goto('/subcategory/work/頭がいい人');
  await expect(page).toHaveURL(/\/upgrade\?source=discover_technique/);
});

test('人物像詳細は番号順の一列メニューとして一覧できる', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/subcategory/interpersonal/印象がいい人');
  const cards = page.getByRole('link', { name: /^\d{2} / });
  await expect(cards).toHaveCount(14);
  await expect(page.getByTestId('persona-technique-list').getByRole('link')).toHaveCount(14);
  await expect(page.getByTestId('technique-column-1')).toHaveCount(0);
  await expect(page.getByTestId('technique-column-2')).toHaveCount(0);
  await expect(page.getByText('STEP 1')).toHaveCount(0);
  const visibleNumbers = await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label')?.slice(0, 2)));
  expect(visibleNumbers).toEqual(Array.from({ length: 14 }, (_, index) => String(index + 1).padStart(2, '0')));
  await cards.last().scrollIntoViewIfNeeded();
  await expect(cards.last()).toBeInViewport();
});

test('学ぶトップは同じ挑戦ボタンと実進捗を表示し、完全版の購入導線を維持する', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/learn');
  await expect(page.getByText('処世術を習得しよう！')).toBeVisible();
  await expect(page.getByTestId('learning-stage-list').getByRole('button', { name: /^ステージ[123]、/ })).toHaveCount(3);
  await expect(page.getByTestId('learning-stage-1')).toContainText('0 / 7');
  await expect(page.getByTestId('learning-stage-2')).toContainText('挑戦する');
  await expect(page.getByTestId('rokumaru-guide')).toBeVisible();

  await page.getByRole('button', { name: /ステージ2、仕事を、どう動かす？/ }).click();
  await expect(page).toHaveURL(/\/upgrade\?source=learning/);
});

test('人物像の処世術はキーボードでフォーカスできるリンクになっている', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/subcategory/interpersonal/印象がいい人');

  const link = page.getByRole('link', { name: /^01 / });
  await link.focus();
  await expect(link).toBeFocused();
});

test('学ぶの改善が必要な選択は理由・関連知識・次ケースへつながる', async ({ page }) => {
  await page.goto('/learn');
  await page.getByRole('button', { name: 'ステージ1、人と、どう関わる？' }).click();
  const header = page.getByTestId('book-header');
  await expect(header.getByRole('button', { name: '用語集を開く' })).toHaveCount(0);
  await expect(header.getByRole('button', { name: '設定を開く' })).toHaveCount(0);
  await expect(header.getByRole('button', { name: '処世術の五大原則を開く' })).toHaveCount(0);
  await expect(header.getByTestId('book-header-back')).toBeVisible();
  await expect(header.getByText('用語集', { exact: true })).toHaveCount(0);
  await expect(header.getByText('設定', { exact: true })).toHaveCount(0);
  await expect(page.getByText('CASE 01 / 21')).toBeVisible();
  await expect(page.getByTestId('learning-question-card')).toBeVisible();
  await expect(page.getByTestId('learning-question-card').getByTestId('rokumaru-guide')).toBeVisible();
  await page.getByRole('button', { name: /^A/ }).click();
  await expect(page.getByText('おしい！')).toBeVisible();
  await expect(page.getByText('ここで違いを覚えましょう。')).toBeVisible();
  await expect(page.getByTestId('learning-review-choice-a')).toContainText('あなたの回答');
  await expect(page.getByTestId('learning-review-choice-a')).toContainText('おしい');
  await expect(page.getByTestId('learning-review-choice-b')).toContainText('正解');
  await expect(page.getByTestId('learning-review-choice-c')).toContainText('解説：');
  await expect(page.getByTestId('rokumaru-encourage')).toBeVisible();
  await expect(page.getByRole('link', { name: /関連する基礎知識、初対面は面白さより安心感を開く/ })).toBeVisible();
  await expect(page.getByText('関連する理論')).toBeVisible();

  await page.getByRole('button', { name: /次の問題へ/ }).click();
  await expect(page).toHaveURL(/\/learn\/case-02/);
  await expect(page.getByText('CASE 02 / 21')).toBeVisible();
});

test('学ぶの良い判断は正解表情と解説を示し、進捗へ保存する', async ({ page }) => {
  await page.goto('/learn/case-01?retry=1');
  await page.getByRole('button', { name: /^B/ }).click();
  await expect(page.getByText('正解！')).toBeVisible();
  await expect(page.getByText('いい判断です。', { exact: true })).toBeVisible();
  await expect(page.getByText('このケースの処世術')).toBeVisible();
  await expect(page.getByText('安心できる小さな往復から始める。')).toBeVisible();
  await expect(page.getByTestId('rokumaru-happy')).toBeVisible();

  await page.getByRole('link', { name: /学ぶ。/ }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByTestId('learning-stage-1')).toContainText('1 / 7');
});

test('学ぶはスマホで縦積みになり横にはみ出さない', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/learn');
  await expect(page.getByTestId('learning-stage-1')).toBeVisible();
  await expect(page.getByTestId('rokumaru-guide')).toBeVisible();

  await page.getByTestId('learning-challenge-1').click();
  await expect(page.getByTestId('learning-question-card')).toBeVisible();
  await expect(page.getByRole('button', { name: /^A/ })).toBeVisible();
  await page.getByRole('button', { name: /^B/ }).click();
  await expect(page.getByTestId('learning-result-card')).toBeVisible();
  await expect(page.getByTestId('rokumaru-happy')).toBeVisible();
  const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
});

