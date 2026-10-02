import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const curriculum = JSON.parse(fs.readFileSync('src/data/generated/learning.full.json', 'utf8'));
const index = JSON.parse(fs.readFileSync('src/data/generated/learning.index.json', 'utf8'));
const theories = JSON.parse(fs.readFileSync('src/data/generated/theories.json', 'utf8'));
const categories = JSON.parse(fs.readFileSync('src/data/generated/techniques.json', 'utf8')).categories;
const techniques = categories.flatMap((category: any) => category.subcategories.flatMap((persona: any) => persona.items.map((item: any) => ({ ...item, categoryKey: category.key, categoryName: category.name, subcategory: persona.name, articleTitle: persona.articleTitle ?? persona.name }))));
const stateKey = '@shoseijutsu-roku/state/v1';

async function account(page: Page, status: 'active' | 'expired' = 'active', learningDelay = 0) {
  const user = { id: '00000000-0000-4000-8000-000000000021', aud: 'authenticated', role: 'authenticated', email: 'ui-qa@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: 4102444800 })).toString('base64url');
  const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname.split('.')[0];
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: `sb-${project}-auth-token`, value: session });
  await page.route('**/auth/v1/**', route => route.fulfill({ json: user }));
  await page.route('**/rest/v1/**', route => route.request().url().includes('/profiles')
    ? route.fulfill({ json: { role: 'user', display_name: '学びの記録', avatar_url: null } })
    : route.fulfill({ status: 400, json: { message: 'Use bundled catalogue' } }));
  await page.route('**/functions/v1/**', async route => {
    if (route.request().url().includes('/access')) return route.fulfill({ json: { access: status, accessType: 'thirty_day', accessExpiresAt: status === 'active' ? new Date(Date.now() + 5 * 86400000).toISOString() : '2020-01-01T00:00:00Z' } });
    const type = new URL(route.request().url()).searchParams.get('type');
    if (type === 'learning' && learningDelay) await new Promise(resolve => { setTimeout(resolve, learningDelay); });
    const items = type === 'theory' ? theories : type === 'technique' ? techniques : curriculum;
    return route.fulfill({ json: { items: items.map((item: any) => ({ content_type: type, content_id: item.id ?? item.tagId, payload: item })) } });
  });
}

test('学習ロードマップは正規21ケース・保存済み進捗・自由なステージ選択に連動する', async ({ page }) => {
  await account(page, 'active', 2500);
  await page.addInitScript(({ key }) => localStorage.setItem(key, JSON.stringify({ learningCurriculumVersion: 2, learningRecords: { 'case-01': { caseId: 'case-01', choiceId: 'b', answeredAt: '2026-10-01T00:00:00Z' }, 'case-08': { caseId: 'case-08', choiceId: 'a', answeredAt: '2026-10-01T00:00:00Z' } } })), { key: stateKey });
  await page.goto('/learn');
  await expect(page.getByTestId('learning-overall-progress')).toContainText('2 / 21');
  for (const stage of [1, 2, 3]) {
    await expect(page.getByTestId(`learning-stage-${stage}`)).toContainText(`${stage === 3 ? 0 : 1} / 7`);
    await expect(page.getByTestId(`learning-challenge-${stage}`)).toHaveText('挑戦する　→');
    await expect(page.getByTestId(`learning-challenge-${stage}`)).toBeEnabled();
    const cases = index.filter((item: any) => item.stage === stage);
    for (const item of cases.slice(0, 3)) await expect(page.getByTestId(`learning-stage-${stage}`)).toContainText(item.title);
    await page.getByRole('button', { name: `ステージ${stage}の残りのケースを見る` }).click();
    for (const item of cases) await expect(page.getByTestId(`learning-stage-${stage}`)).toContainText(item.title);
  }
  await expect(page.getByText('未着手')).toHaveCount(0);
  await expect(page.getByTestId('rokumaru-guide')).toHaveCount(1);
  await expect(page.getByText('焦らず、一歩ずつ。')).toHaveCount(0);
  await page.getByTestId('learning-challenge-3').click();
  await expect(page).toHaveURL(/\/learn\/case-15/);
  await expect(page.getByTestId('learning-question-card')).toContainText(curriculum.find((item: any) => item.id === 'case-15').title);
});

test('購入済みでは再購入を表示せずホームを開き、期限切れでは購入条件を表示する', async ({ page }) => {
  await account(page);
  let checkouts = 0;
  await page.route('**/functions/v1/create-checkout-session', route => { checkouts++; return route.abort(); });
  await page.goto('/upgrade');
  await expect(page.getByTestId('upgrade-fixed-purchase')).toContainText('完全版を利用中');
  await expect(page.getByTestId('upgrade-purchase-cta')).toHaveText('完全版を開く→');
  await expect(page.getByTestId('upgrade-fixed-purchase')).not.toContainText('¥320');
  await expect(page.getByLabel(/スマートフォン/)).toHaveCount(0);
  await page.getByTestId('upgrade-purchase-cta').click();
  await expect(page).toHaveURL(/\/$/);
  expect(checkouts).toBe(0);
});

test('利用期間終了の表示は既存の期限判定を使う', async ({ page }) => {
  await account(page, 'expired');
  await page.goto('/upgrade');
  await expect(page.getByTestId('upgrade-fixed-purchase')).toContainText('完全版（30日間）');
  await expect(page.getByTestId('upgrade-fixed-purchase')).toContainText('¥320');
  await expect(page.getByTestId('upgrade-purchase-cta')).toContainText('もう一度');
  await page.goto('/my-os');
  await expect(page.getByTestId('account-membership-card')).toContainText('利用期間終了');
});

test('新UIの共有ヘッダー・ロードマップ・購入バーは小型iPhoneからPCまで収まる', async ({ page }) => {
  for (const width of [320, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/', '/discover', '/learn', '/my-os']) {
      await page.goto(path);
      await expect(page.getByTestId('book-header-tagline')).toHaveText('人生をうまく生きる方法を、すべての人へ');
      const bounds = await page.getByTestId('book-header-tagline').boundingBox();
      const actions = await page.getByTestId('book-header-actions').boundingBox();
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(actions!.x);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.goto('/learn');
    const buttons = await page.locator('[data-testid^="learning-challenge-"]').evaluateAll(elements => elements.map(element => { const style = getComputedStyle(element); return [style.width, style.height, style.borderRadius, style.backgroundColor]; }));
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toEqual(buttons[1]);
    expect(buttons[1]).toEqual(buttons[2]);
    await page.screenshot({ path: test.info().outputPath(`learn-${width}.png`) });
    await page.goto('/my-os');
    expect(await page.getByTestId('profile-principle-card').evaluate(element => getComputedStyle(element).borderTopWidth)).toBe('0px');
    await page.screenshot({ path: test.info().outputPath(`my-page-${width}.png`) });
    await page.goto('/upgrade');
    await expect(page.getByTestId('book-header')).toHaveCount(0);
    const bar = await page.getByTestId('upgrade-fixed-purchase').boundingBox();
    expect(bar!.y + bar!.height).toBeLessThanOrEqual(901);
    expect(bar!.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: test.info().outputPath(`upgrade-${width}.png`) });
  }
});

test('マイページは保存した実際の履歴・蔵書・完全版残期間を表示する', async ({ page }) => {
  await account(page);
  const technique = techniques[0], theory = theories[0];
  await page.addInitScript(({ key, cardId, theoryId }) => localStorage.setItem(key, JSON.stringify({ learningCurriculumVersion: 2, historyIds: [cardId, theoryId], savedIds: [cardId], savedTheoryIds: [theoryId], personalPrinciple: '静かに考え、一歩を選ぶ。' })), { key: stateKey, cardId: technique.id, theoryId: theory.tagId });
  await page.goto('/my-os');
  await expect(page.getByTestId('account-membership-card')).toContainText('学びの記録');
  await expect(page.getByTestId('account-membership-card')).toContainText('残り');
  await expect(page.getByTestId('personal-principle-card')).toContainText('静かに考え、一歩を選ぶ。');
  await expect(page.getByRole('button', { name: `${technique.title}を開く` })).toBeVisible();
  await expect(page.getByRole('button', { name: `${theory.title}を開く` })).toBeVisible();
  await page.getByRole('tab', { name: '蔵書' }).click();
  await expect(page.getByRole('button', { name: `${technique.title}を開く` })).toBeVisible();
  await page.getByRole('button', { name: `${theory.title}を開く` }).click();
  await expect(page).toHaveURL(new RegExp(`/theory/${theory.tagId}`));
});

 test('完全版ケースへ取得中に移動しても、到着した実データが表示される', async ({ page }) => {
  await account(page, 'active', 2500);
  await page.goto('/learn/case-15');
  await expect(page.getByText('学習ケースを読み込んでいます…')).toBeVisible();
  await expect(page.getByTestId('learning-question-card')).toContainText(curriculum.find((item: any) => item.id === 'case-15').title);
});
