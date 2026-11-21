import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

const initial = JSON.parse(fs.readFileSync('content/features/manifest.json', 'utf8')).map((row: any) => {
  const source = fs.readFileSync(`content/features/${row.slug}.md`, 'utf8').replace(/\r\n/g, '\n').trim();
  const split = source.indexOf('\n\n');
  return { ...row, lead: source.slice(0, split), body: source.slice(split + 2), related_technique_ids: [], related_theory_ids: [], editorial_character_id: 'sumino-haruka', related_feature_ids: [], source_references: [], status: 'published', updated_at: '2026-10-13T00:00:00Z' };
});
const initialGuide = { id: 'sumino-haruka', name: '澄野 遥', role: '処世術禄 編集案内人', bio: '人はなぜ、そう考え、そう行動するのか。身近な疑問を出発点に、心理学や社会科学の知見から、人間と人生の仕組みを探ります。', interests: ['人間関係', '心理学', '自己理解'], image_path: 'bundled:sumino-haruka', image_alt: '架空の案内人のイラスト', status: 'published', display_order: 10, updated_at: '2026-10-14T00:00:00Z' };
const concernsMigration = fs.readdirSync('supabase/migrations').find(name => name.endsWith('_add_generational_concerns.sql'))!;
const concerns = JSON.parse(fs.readFileSync(`supabase/migrations/${concernsMigration}`, 'utf8').split('$articles$')[1]) as Array<{ slug: string; title: string; lead: string; body: string; life_stage: string; display_order: number }>;

function concernRows() {
  return concerns.map(article => ({ ...initial[0], ...article, id: article.slug, series_id: 'generational-concerns', category_id: null, editorial_character_id: null, image_path: null, is_featured: false, show_in_list: false, show_in_series: true }));
}
async function mockFeatures(page: Page, owner = false) {
  let articles = structuredClone(initial);
  let characters = [structuredClone(initialGuide), { ...structuredClone(initialGuide), id: 'sakaki-naoto', name: '榊 直人', image_path: 'bundled:sakaki-naoto', display_order: 20 }, { ...structuredClone(initialGuide), id: 'onose-tsumugi', name: '小野瀬 紬', image_path: 'bundled:onose-tsumugi', display_order: 30 }];
  let drafts: any[] = [];
  if (owner) {
    const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'owner@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
    const token = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: 4102444800 })).toString('base64url')}.test`;
    const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname.split('.')[0];
    await page.addInitScript(({ key, user, token }) => localStorage.setItem(key, JSON.stringify({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user })), { key: `sb-${project}-auth-token`, user, token });
  }
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    // Keep the real bundled catalog for this focused CMS fixture. A successful
    // empty response would authoritatively remove all catalog entries.
    if (['public_techniques', 'public_theories', 'personas', 'content_categories', 'theory_subcategories'].some(table => path.endsWith(`/${table}`))) return route.fulfill({ status: 503, json: {} });
    if (path.endsWith('/profiles')) return route.fulfill({ json: { role: owner ? 'owner' : 'user', display_name: '検証利用者' } });
    if (path.endsWith('/feature_articles')) return route.fulfill({ json: url.searchParams.has('status') ? articles.filter((row: any) => row.status === 'published') : articles });
    if (path.endsWith('/feature_article_drafts')) return route.fulfill({ json: drafts });
    if (path.endsWith('/editorial_characters')) return route.fulfill({ json: characters
      .filter(item => !url.searchParams.has('status') || item.status === 'published')
      .sort((left, right) => left.display_order - right.display_order || left.id.localeCompare(right.id)) });
    if (path.endsWith('/save_editorial_character')) {
      const params = route.request().postDataJSON();
      const existing = characters.find(row => row.id === params.target_id);
      if (existing && params.expected_updated_at !== existing.updated_at) return route.fulfill({ status: 409, json: { message: '案内人が別の画面で変更されています。再読み込みしてください。' } });
      const row = { ...params.content, id: params.target_id ?? 'new-guide', updated_at: '2026-10-14T01:00:00Z' };
      characters = [...characters.filter(item => item.id !== row.id), row];
      return route.fulfill({ json: row });
    }
    if (path.endsWith('/save_feature_article_draft')) {
      const params = route.request().postDataJSON();
      const id = params.target_id ?? 'new-article';
      const row = articles.find((article: any) => article.id === id);
      const change = drafts.find(draft => draft.article_id === id);
      if (row && (params.expected_updated_at !== row.updated_at || params.expected_revision !== (change?.revision ?? null))) return route.fulfill({ status: 409, json: { message: '下書きが別の画面で変更されています。' } });
      if (!row) articles.push({ ...params.content, slug: params.content.slug?.trim() || id, id, status: 'draft', updated_at: initial[0].updated_at });
      const next = { article_id: id, payload: { ...params.content, slug: params.content.slug?.trim() || row?.slug || id }, base_updated_at: row?.updated_at ?? initial[0].updated_at, revision: (change?.revision ?? 0) + 1 };
      drafts = [...drafts.filter(draft => draft.article_id !== id), next];
      return route.fulfill({ json: { id, revision: next.revision, base_updated_at: next.base_updated_at, slug: next.payload.slug } });
    }
    if (path.endsWith('/publish_feature_article')) {
      const params = route.request().postDataJSON();
      const draft = drafts.find(row => row.article_id === params.target_id);
      articles = articles.map((row: any) => row.id === params.target_id ? { ...row, ...draft.payload, status: 'published', updated_at: '2026-10-13T01:00:00Z' } : row);
      drafts = drafts.filter(row => row.article_id !== params.target_id);
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/archive_feature_article')) {
      const params = route.request().postDataJSON();
      articles = articles.map((row: any) => row.id === params.target_id ? { ...row, status: 'archived', updated_at: '2026-10-13T02:00:00Z' } : row);
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/delete_feature_article')) {
      const params = route.request().postDataJSON();
      const row = articles.find((item: any) => item.id === params.target_id);
      const draft = drafts.find(item => item.article_id === params.target_id);
      if (!row || row.updated_at !== params.expected_updated_at || (draft?.revision ?? null) !== params.expected_revision) return route.fulfill({ status: 409, json: { message: '記事または下書きが別の画面で変更されています。再読み込みしてください。' } });
      articles = articles.filter((item: any) => item.id !== row.id).map((item: any) => ({ ...item, related_feature_ids: item.related_feature_ids.filter((id: string) => id !== row.id) }));
      drafts = drafts.filter(item => item.article_id !== row.id);
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: [] });
  });
  return { articles: () => articles, drafts: () => drafts, characters: () => characters };
}

for (const status of ['published', 'archived', 'draft'] as const) {
  test(`CMSで${status}の記事を確認・取り消し後に削除し、他の記事を保持する`, async ({ page }) => {
    const server = await mockFeatures(page, true);
    server.articles()[0].status = status;
    const otherArticles = structuredClone(server.articles().slice(1));
    await page.goto('/owner/features');
    await page.getByRole('button', { name: `${initial[0].title}を編集`, exact: true }).click();
    await expect(page.getByRole('button', { name: '削除する', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '削除する', exact: true }).click();
    await expect(page.getByTestId('feature-action-confirm')).toContainText(initial[0].title);
    await page.getByRole('button', { name: '取り消す', exact: true }).click();
    expect(server.articles()).toHaveLength(4);
    await page.getByRole('button', { name: '削除する', exact: true }).click();
    await page.getByRole('button', { name: 'この特集を完全に削除する', exact: true }).click();
    await expect(page.getByText('特集を削除しました。', { exact: true })).toBeVisible();
    expect(server.articles()).toEqual(otherArticles);
    await page.goto('/features');
    await expect(page.getByTestId('features-grid').getByTestId('feature-card')).toHaveCount(3);
  });
}
test('CMSは別画面で変更された下書きを削除しない', async ({ page }) => {
  const server = await mockFeatures(page, true);
  await page.goto('/owner/features');
  await page.getByRole('button', { name: `${initial[0].title}を編集`, exact: true }).click();
  await page.getByRole('button', { name: '削除する', exact: true }).click();
  server.drafts().push({ article_id: initial[0].id, revision: 1, payload: initial[0], base_updated_at: initial[0].updated_at });
  await page.getByRole('button', { name: 'この特集を完全に削除する', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('別の画面で変更');
  expect(server.articles()).toHaveLength(4);
  expect(server.drafts()).toHaveLength(1);
});

test('ホームから無料の特集に入り、指針と3記事を日付なしで読める', async ({ page }) => {
  await mockFeatures(page);
  await page.goto('/');
  await page.getByTestId('home-editorial-see-all').click();
  await expect(page).toHaveURL(/\/features$/);
  await expect(page.getByTestId('features-hero').getByRole('heading', { name: initial[0].title, exact: true })).toBeVisible();
  await expect(page.getByTestId('feature-card')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'ふかぼり処世術記事', exact: true })).toBeVisible();
  await expect(page.getByTestId('features-page')).not.toContainText(/厳選セレクション|新着|特集記事|\d+分前|\d+時間前|読了|2026年/);
  await page.getByRole('link', { name: 'メタ発言はなぜ気分を害するのかを読む', exact: true }).click();
  await expect(page.getByTestId('feature-body')).toContainText(initial[2].body.split('\n\n')[1]);
  await expect(page.getByRole('heading', { name: initial[2].title, exact: true })).toBeVisible();
  await expect(page).toHaveTitle(`${initial[2].title}｜処世術禄`);
  await page.getByTestId('book-header').getByRole('button', { name: 'お気に入りに保存', exact: true }).click();
  await page.reload();
  await expect(page.getByTestId('book-header').getByRole('button', { name: 'お気に入りから外す', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/library');
  await page.getByRole('tab', { name: /^特集のお気に入り/ }).click();
  await expect(page.getByText(initial[2].title, { exact: true })).toBeVisible();
  await page.getByText(initial[2].title, { exact: true }).click();
  await expect(page.getByTestId('feature-body')).toBeVisible();
});

test('320pxからデスクトップまで記事とヒーローが収まり、写真が表示される', async ({ page }) => {
  test.setTimeout(60_000);
  await mockFeatures(page);
  for (const width of [320, 390, 700, 1000, 1280, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/features');
    await expect(page.getByTestId('feature-card')).toHaveCount(3);
    const heroBounds = await page.getByTestId('features-hero').boundingBox();
    expect(heroBounds!.height).toBeLessThanOrEqual(width >= 1100 ? 370 : 460);
    for (const card of await page.getByTestId('feature-card').all()) {
      const bounds = await card.boundingBox();
      expect(bounds!.width).toBeLessThanOrEqual(320);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await expect(page.getByTestId('features-hero').locator('img')).toHaveJSProperty('complete', true);
    const photo = await page.getByTestId('features-hero').locator('img').boundingBox();
    expect(photo!.height).toBeGreaterThan(100);
    const cardBounds = await Promise.all((await page.getByTestId('feature-card').all()).map(card => card.boundingBox()));
    if (width >= 700) expect(cardBounds[0]!.y).toBe(cardBounds[1]!.y);
    if (width >= 1280) expect(cardBounds[1]!.y).toBe(cardBounds[2]!.y);
    const tabList = page.getByTestId('feature-category-tabs');
    await expect(tabList).toHaveAttribute('aria-orientation', 'horizontal');
    const seriesTab = tabList.getByRole('tab').last();
    await expect(seriesTab).toHaveText('各世代の悩み');
    await seriesTab.scrollIntoViewIfNeeded();
    const societyTab = (await tabList.getByRole('tab', { name: '社会・時代', exact: true }).boundingBox())!;
    const seriesBounds = (await seriesTab.boundingBox())!;
    expect(seriesBounds.y).toBe(societyTab.y);
    expect(seriesBounds.x).toBeGreaterThanOrEqual(societyTab.x + societyTab.width);
    await expect(seriesTab).toBeInViewport({ ratio: 0.95 });
    const read = page.getByTestId('features-hero').getByRole('link', { name: `${initial[0].title}を読む`, exact: true });
    await expect(read).toBeVisible();
    if (width < 700) {
      const button = await read.boundingBox();
      expect(button!.x + button!.width).toBeLessThanOrEqual(photo!.x);
      expect(heroBounds!.width / heroBounds!.height).toBeGreaterThan(1.5);
    }
    await page.screenshot({ path: test.info().outputPath(`features-${width}.png`), fullPage: true });
    await page.goto('/features/five-guidelines');
    await expect(page.getByTestId('feature-body')).toBeVisible();
    await expect(page.getByRole('heading', { name: '1．選べる側になる', exact: true })).toBeVisible();
    const headingLine = await page.getByTestId('feature-section-heading').first().evaluate(element => ({ width: parseFloat(getComputedStyle(element).borderLeftWidth), color: getComputedStyle(element).borderLeftColor }));
    expect(headingLine).toEqual({ width: 1, color: 'rgb(146, 107, 46)' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath(`article-${width}.png`), fullPage: true });
  }
});

test('公開記事がない場合は種記事を復活させず、CMSはオーナー専用', async ({ page }) => {
  await page.route('**/rest/v1/feature_articles*', route => route.fulfill({ json: [] }));
  await page.goto('/features');
  await expect(page.getByText('現在公開中の特集はありません。')).toBeVisible();
  await expect(page.getByTestId('feature-card')).toHaveCount(0);
  await page.goto('/owner/features');
  await expect(page).toHaveURL(/auth/);
  await expect(page.getByTestId('feature-editor')).toHaveCount(0);
});

test('CMSは下書きをプレビューしてから公開し、非公開でも本文を保持する', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const server = await mockFeatures(page, true);
  await page.goto('/owner/features');
  const title = page.getByRole('textbox', { name: 'タイトル', exact: true });
  await expect(title).toHaveCount(0);
  await page.getByRole('button', { name: `${initial[1].title}を編集`, exact: true }).click();
  await expect(page.getByRole('radio', { name: '自己理解・成長', exact: true })).toBeChecked();
  await page.getByRole('radio', { name: '社会・時代', exact: true }).click();
  await title.fill('ティルトと向き合う');
  await page.getByRole('textbox', { name: '本文', exact: true }).fill('## 感情を手がかりにする\n\n初稿をCMSで編集した本文です。');
  await page.getByRole('button', { name: '下書きを保存', exact: true }).click();
  await expect(page.getByText('下書きを保存しました。公開中の内容は変わりません。')).toBeVisible();
  expect(server.articles()[1].title).toBe(initial[1].title);
  expect(server.articles()[1].category_id).toBe('self-growth');
  expect(server.drafts()[0].payload.title).toBe('ティルトと向き合う');
  expect(server.drafts()[0].payload.category_id).toBe('society-era');
  await page.getByRole('button', { name: /記事一覧に戻る/ }).click();
  const listing = page.getByRole('button', { name: `${initial[1].title}を編集`, exact: true });
  await expect(listing).toContainText('社会・時代');
  await listing.click();
  await page.getByRole('button', { name: 'プレビュー', exact: true }).click();
  await expect(page.getByTestId('feature-article')).toContainText('感情を手がかりにする');
  await page.getByRole('button', { name: '公開する', exact: true }).click();
  await page.getByRole('button', { name: 'この内容で公開', exact: true }).click();
  await expect(page.getByText('特集を公開しました。')).toBeVisible();
  expect(server.articles()[1].title).toBe('ティルトと向き合う');
  expect(server.articles()[1].category_id).toBe('society-era');
  expect(server.drafts()).toHaveLength(0);
  await page.getByRole('button', { name: '公開画面を見る', exact: true }).click();
  await expect(page.getByTestId('features-grid')).toContainText('ティルトと向き合う');
  await page.getByRole('tab', { name: '社会・時代', exact: true }).click();
  await expect(page.getByTestId('feature-card')).toHaveCount(1);
  await expect(page.getByTestId('features-grid')).toContainText('ティルトと向き合う');
  await page.goto('/owner/features');
  await page.getByRole('button', { name: 'ティルトと向き合うを編集', exact: true }).click();
  await expect(title).toHaveValue('ティルトと向き合う');
  await page.getByRole('textbox', { name: '導入文', exact: true }).fill('幅を変えても編集中の内容を保つ');
  await page.setViewportSize({ width: 390, height: 950 });
  await expect(title).toHaveValue('ティルトと向き合う');
  await expect(page.getByRole('textbox', { name: '導入文', exact: true })).toHaveValue('幅を変えても編集中の内容を保つ');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: '下書きを保存', exact: true }).click();
  await expect(page.getByText('下書きを保存しました。公開中の内容は変わりません。')).toBeVisible();
  await page.getByRole('button', { name: '非公開にする', exact: true }).click();
  await page.getByRole('button', { name: 'この特集を非公開にする', exact: true }).click();
  await expect(page.getByText('記事を非公開にしました。本文と下書きは保持されています。')).toBeVisible();
  expect(server.articles()[1].body).toContain('CMSで編集した本文');
  expect(server.articles()[1].status).toBe('archived');
  await page.getByRole('button', { name: '公開画面を見る', exact: true }).click();
  await expect(page.getByTestId('feature-card')).toHaveCount(2);
  await expect(page.getByTestId('features-grid')).not.toContainText('ティルトと向き合う');
});

test('特集タブで主題を絞り込み、0件のテーマへの切り替えでもページを保つ', async ({ page }) => {
  await mockFeatures(page);
  await page.goto('/features');
  await expect(page.getByTestId('feature-card')).toHaveCount(3);
  const tabs = page.getByTestId('feature-category-tabs').getByRole('tab');
  await expect(tabs).toHaveText(['すべて', '人間関係', '自己理解・成長', '生き方・選択', '社会・時代', '各世代の悩み']);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  const documentStart = await page.evaluate(() => performance.timeOrigin);
  const heroHeight = (await page.getByTestId('features-hero').boundingBox())!.height;
  for (const [label, ids] of [
    ['人間関係', ['meta-comments']],
    ['自己理解・成長', ['mastering-tilt', 'passion-and-cynicism']],
    ['生き方・選択', ['five-guidelines']],
    ['社会・時代', []],
  ] as const) {
    await page.getByRole('tab', { name: label, exact: true }).click();
    await expect(page.getByRole('tab', { name: label, exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('feature-card')).toHaveCount(ids.length);
    await expect(page.getByTestId('features-hero')).toHaveCount(1);
    await expect(page.getByTestId('features-hero').getByRole('heading', { name: initial[0].title, exact: true })).toHaveCount(1);
    expect((await page.getByTestId('features-hero').boundingBox())!.height).toBe(heroHeight);
    if (label === '自己理解・成長') {
      await page.getByTestId('features-page').evaluate(node => { node.scrollTop = 0; });
      await page.screenshot({ path: test.info().outputPath('category-hero-preserved.png') });
    }
    for (const slug of ids) await expect(page.getByTestId('features-grid').getByRole('link', { name: `${initial.find((article: any) => article.slug === slug).title}を読む`, exact: true })).toBeVisible();
    if (!ids.length) await expect(page.getByText('このテーマの記事は、まだありません。', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStart);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.getByRole('tab', { name: 'すべて', exact: true }).click();
  await expect(page.getByTestId('feature-card')).toHaveCount(3);
  await page.getByTestId('features-hero').getByRole('link', { name: `${initial[0].title}を読む`, exact: true }).click();
  await expect(page.getByTestId('feature-body')).toContainText('1．選べる側になる');
});

test('ホームの編集部の特集は5件未満でも横スワイプして開ける', async ({ page, context }) => {
  await mockFeatures(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const rail = page.getByTestId('home-editorial-rail');
  const cards = page.getByTestId('home-editorial-card');
  await expect(cards).toHaveCount(4);
  await rail.scrollIntoViewIfNeeded();
  const box = (await rail.boundingBox())!;
  const first = (await cards.first().boundingBox())!;
  expect(first.width).toBeLessThan(box.width - 24);
  expect(await rail.evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  const session = await context.newCDPSession(page);
  const x = box.x + box.width * .85, y = box.y + box.height / 2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - box.width * .65 * i / 8, y }] });
    await page.evaluate(() => new Promise<void>(resolve => { requestAnimationFrame(() => resolve()); }));
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => rail.evaluate(node => node.scrollLeft)).toBeGreaterThan(100);
  await page.screenshot({ path: test.info().outputPath('home-editorial-swiped.png') });
  await cards.last().scrollIntoViewIfNeeded();
  await cards.last().click();
  await expect(page).toHaveURL(new RegExp(`/features/${initial[3].slug}$`));
  await expect(page.getByTestId('feature-body')).toBeVisible();
});

test('ホームの特集はおすすめを優先して長編を最大5件表示する', async ({ page }) => {
  const server = await mockFeatures(page);
  server.articles().unshift(...concernRows());
  for (const slug of ['extra-editorial-a', 'extra-editorial-b']) {
    server.articles().push({ ...initial[1], id: slug, slug, title: slug });
  }
  await page.goto('/');
  const cards = page.getByTestId('home-editorial-card');
  await expect(cards).toHaveCount(5);
  await expect(cards.first()).toContainText(initial[0].title);
  await expect(cards.last()).toContainText('extra-editorial-a');
  await expect(page.getByTestId('home-editorial-rail')).not.toContainText(concerns[0].title);
});

for (const width of [390, 1440]) {
  test(`${width}pxで各世代の悩み21本を一覧と記事URLで読める`, async ({ page }) => {
    const server = await mockFeatures(page);
    server.articles().push(...concernRows());
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/features');
    await expect(page.getByTestId('feature-card')).toHaveCount(3);
    const series = page.getByTestId('generational-concerns');
    const tab = page.getByTestId('feature-category-tabs').getByRole('tab', { name: '各世代の悩み', exact: true });
    await expect(series).toHaveCount(0);
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('feature-card')).toHaveCount(0);
    await expect(page.getByTestId('features-hero')).toHaveCount(1);
    await expect(series.getByRole('heading', { name: '各世代の悩み', exact: true })).toBeVisible();
    await expect(series.getByRole('link')).toHaveCount(21);
    for (const [stage, count] of Object.entries({ student: 4, 'young-adult': 3, 'early-career': 4, crossroads: 4, 'family-formation': 3, 'midlife-and-later': 3 })) {
      await expect(series.getByTestId(`feature-stage-${stage}`).getByRole('link')).toHaveCount(count);
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('tab', { name: '社会・時代', exact: true }).click();
    await expect(series).toHaveCount(0);
    await tab.click();
    const article = concerns[0];
    await series.getByRole('link', { name: new RegExp(article.title) }).click();
    await expect(page).toHaveURL(`/features/${article.slug}`);
    await page.reload();
    await expect(page.getByTestId('feature-article').getByRole('heading', { name: article.title, exact: true })).toHaveCount(1);
    await expect(page.getByTestId('feature-article').getByText(article.lead, { exact: true })).toHaveCount(1);
    await expect(page.getByTestId('feature-article')).toContainText('学生時代');
    await expect(page.getByTestId('feature-body').getByRole('heading')).toHaveCount(2);
    await expect(page.getByTestId('feature-body').getByText(article.body.match(/\*\*(.+?)\*\*/)![1], { exact: true })).toHaveCSS('font-weight', '700');
    await page.getByRole('link', { name: '← 特集一覧へ' }).click();
    await expect(page).toHaveURL('/features?series=generational-concerns');
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(tab).toBeInViewport({ ratio: 0.95 });
    await expect(series.getByRole('link')).toHaveCount(21);
  });
}

test('特集CMSで新シリーズと人生段階を設定して公開できる', async ({ page }) => {
  const server = await mockFeatures(page, true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/owner/features');
  await page.getByRole('button', { name: '＋ 記事を作成' }).click();
  await page.getByRole('radio', { name: '各世代の悩み', exact: true }).click();
  await page.getByRole('radio', { name: '青年期', exact: true }).click();
  await page.getByRole('textbox', { name: 'タイトル', exact: true }).fill('追加する短編');
  await page.getByRole('textbox', { name: '副題', exact: true }).fill('短編の副題');
  await page.getByRole('textbox', { name: '本文', exact: true }).fill('## 短編の見出し\n\n**短編の本文**');
  await page.getByRole('button', { name: '公開する', exact: true }).click();
  await page.getByRole('button', { name: 'この内容で公開', exact: true }).click();
  await expect(page.getByText('特集を公開しました。', { exact: true })).toBeVisible();
  expect(server.articles().at(-1)).toMatchObject({ series_id: 'generational-concerns', life_stage: 'young-adult', status: 'published', show_in_list: false, show_in_series: true });
});

test('カテゴリが未設定・不正でもすべての一覧から記事が消えない', async ({ page }) => {
  const server = await mockFeatures(page);
  server.articles()[1].category_id = null;
  delete server.articles()[2].category_id;
  server.articles()[3].category_id = 'unexpected';
  await page.goto('/features');
  await expect(page.getByTestId('feature-card')).toHaveCount(3);
  await page.getByRole('tab', { name: '自己理解・成長', exact: true }).click();
  await expect(page.getByText('このテーマの記事は、まだありません。', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'すべて', exact: true }).click();
  await expect(page.getByTestId('feature-card')).toHaveCount(3);
});

test('新規特集の主カテゴリを選び、公開後に該当タブで読める', async ({ page }) => {
  const server = await mockFeatures(page, true);
  await page.goto('/owner/features');
  await page.getByRole('button', { name: '＋ 記事を作成', exact: true }).click();
  await page.getByRole('textbox', { name: 'タイトル', exact: true }).fill('選択と向き合う');
  await page.getByRole('textbox', { name: '記事のURL名', exact: true }).fill('choosing-paths');
  await page.getByRole('textbox', { name: '本文', exact: true }).fill('## 選ぶということ\n\n分類を確かめる新しい記事です。');
  await page.getByRole('radio', { name: '生き方・選択', exact: true }).click();
  await page.getByRole('button', { name: '公開する', exact: true }).click();
  await page.getByRole('button', { name: 'この内容で公開', exact: true }).click();
  await expect(page.getByText('特集を公開しました。')).toBeVisible();
  expect(server.articles().find((article: any) => article.slug === 'choosing-paths')?.category_id).toBe('life-choices');
  await page.getByRole('button', { name: '公開画面を見る', exact: true }).click();
  await page.getByRole('tab', { name: '生き方・選択', exact: true }).click();
  await expect(page.getByTestId('feature-card')).toHaveCount(2);
  await expect(page.getByTestId('features-grid')).toContainText('選択と向き合う');
});


test('編集部名義と案内人からプロフィールに進み、記事と編集方針を読める', async ({ page }) => {
  await mockFeatures(page);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/features/meta-comments');
    await expect(page.getByTestId('editorial-byline')).toContainText('制作：処世術禄編集部');
    await page.getByRole('link', { name: '澄野 遥のプロフィール', exact: true }).click();
    await expect(page).toHaveURL(/features\/guides\/sumino-haruka$/);
    await expect(page.getByRole('heading', { name: '澄野 遥', exact: true })).toBeVisible();
    await expect(page.getByTestId('editorial-profile')).not.toContainText('架空');
    await expect(page.getByTestId('editorial-profile')).toContainText('制作：処世術禄編集部');
    await expect(page.getByTestId('feature-card')).toHaveCount(4);
    await expect(page).toHaveTitle('澄野 遥｜編集案内人｜処世術禄');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: test.info().outputPath('guide-' + width + '.png'), fullPage: true });
  }
  await page.getByRole('link', { name: '編集方針 →', exact: true }).click();
  await expect(page.getByTestId('editorial-policy')).toContainText('蓄積型・不朽型');
  await expect(page.getByTestId('editorial-policy')).toContainText('公開日や更新日によって価値を評価しません');
  await page.goto('/about/shoseijutsu');
  await expect(page.getByRole('heading', { name: '蓄積型・不朽型の知識メディア', exact: true })).toBeVisible();
});

test('案内人が未設定・非公開・取得失敗でも記事本文と編集部名義を表示する', async ({ page }) => {
  const server = await mockFeatures(page);
  server.articles()[1].editorial_character_id = null;
  server.characters()[0].status = 'archived';
  await page.goto('/features/mastering-tilt');
  await expect(page.getByTestId('feature-body')).toContainText(initial[1].body.split('\n\n')[1]);
  await expect(page.getByTestId('editorial-byline')).toHaveText('制作：処世術禄編集部');
  await page.goto('/features/guides/sumino-haruka');
  await expect(page.getByText('この案内人は現在公開されていません', { exact: true })).toBeVisible();
  await page.route('**/rest/v1/editorial_characters*', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/features/meta-comments');
  await expect(page.getByTestId('feature-body')).toBeVisible();
  await expect(page.getByTestId('editorial-byline')).toHaveText('制作：処世術禄編集部');
});

test('CMSで案内人・出典・関連特集を編集し、知識への導線と安全な出典を表示する', async ({ page }) => {
  const server = await mockFeatures(page, true);
  await page.goto('/owner/features');
  await page.getByRole('button', { name: initial[1].title + 'を編集', exact: true }).click();
  await expect(page.getByRole('radio', { name: '澄野 遥', exact: true })).toBeChecked();
  await page.getByRole('button', { name: '関連・出典', exact: true }).click();
  await page.getByRole('button', { name: '＋ 出典を追加', exact: true }).click();
  await page.getByRole('textbox', { name: '出典1の名称', exact: true }).fill('確認した参考資料');
  await page.getByRole('textbox', { name: '出典1のURL', exact: true }).fill('https://example.org/source');
  await page.getByRole('textbox', { name: '出典1の補足', exact: true }).fill('対象年と適用範囲を確認');
  await page.getByRole('textbox', { name: '関連する特集を検索', exact: true }).fill('熱血');
  await page.getByRole('button', { name: '＋ 熱血と冷笑の本質', exact: true }).click();
  await page.getByRole('textbox', { name: '関連する理論を検索', exact: true }).fill('認知的柔軟性');
  await page.getByRole('button', { name: '＋ 認知的柔軟性', exact: true }).click();
  await page.getByRole('button', { name: '公開する', exact: true }).click();
  await page.getByRole('button', { name: 'この内容で公開', exact: true }).click();
  await expect(page.getByText('特集を公開しました。')).toBeVisible();
  expect(server.articles()[1].body).toBe(initial[1].body);
  expect(server.articles()[1].related_feature_ids).toEqual(['passion-and-cynicism']);
  await page.goto('/features/mastering-tilt');
  await expect(page.getByTestId('feature-references')).toContainText('対象年と適用範囲を確認');
  await expect(page.getByRole('link', { name: '確認した参考資料', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'この記事に関連する知識', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '認知的柔軟性 →', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '熱血と冷笑の本質 →', exact: true })).toBeVisible();
  await page.getByRole('link', { name: '認知的柔軟性 →', exact: true }).click();
  await expect(page).toHaveURL(/theory\/kb_574$/);
  server.articles()[1].source_references.push({ title: '危険なURL', url: 'javascript:alert(1)', note: '' });
  await page.goto('/features/mastering-tilt');
  await expect(page.getByTestId('feature-references')).toContainText('危険なURL');
  await expect(page.getByRole('link', { name: '危険なURL', exact: true })).toHaveCount(0);
});

test('案内人の追加・名前変更・無効化を管理でき、記事とURLを維持する', async ({ page }) => {
  const server = await mockFeatures(page, true);
  await page.goto('/owner/editorial-characters');
  await expect(page.getByRole('textbox', { name: '名前', exact: true })).toHaveValue('澄野 遥');
  await page.getByRole('textbox', { name: '名前', exact: true }).fill('澄野 はるか');
  await page.getByRole('button', { name: '案内人を保存', exact: true }).click();
  await expect(page.getByText('編集案内人を保存しました。')).toBeVisible();
  await page.getByRole('button', { name: 'プロフィールを見る', exact: true }).click();
  await expect(page).toHaveURL(/features\/guides\/sumino-haruka$/);
  await expect(page.getByRole('heading', { name: '澄野 はるか', exact: true })).toBeVisible();
  await page.goto('/owner/editorial-characters');
  await page.getByRole('button', { name: '無効化する', exact: true }).click();
  await expect(page.getByText('案内人を無効化しました。既存の記事は編集部名義で引き続き表示されます。')).toBeVisible();
  await page.goto('/features/meta-comments');
  await expect(page.getByTestId('editorial-byline')).toHaveText('制作：処世術禄編集部');
  expect(server.articles()[2].body).toBe(initial[2].body);
  await page.goto('/owner/editorial-characters');
  await page.getByRole('button', { name: '＋ 案内人を追加', exact: true }).click();
  await page.getByRole('textbox', { name: '名前', exact: true }).fill('追加案内人');
  await page.getByRole('radio', { name: '公開', exact: true }).click();
  await page.getByRole('button', { name: '案内人を保存', exact: true }).click();
  await expect(page.getByText('編集案内人を保存しました。')).toBeVisible();
  expect(server.characters()).toHaveLength(4);
  await page.setViewportSize({ width: 320, height: 950 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('3名のプロフィールと担当記事を表示し、記事上の説明を簡潔に保つ', async ({ page }) => {
  const server = await mockFeatures(page, true);
  server.articles()[0].editorial_character_id = 'sakaki-naoto';
  server.articles()[3].editorial_character_id = 'sakaki-naoto';
  await page.goto('/features/five-guidelines');
  await expect(page.getByTestId('editorial-byline')).toContainText('案内人：榊 直人');
  await expect(page.getByTestId('editorial-byline')).not.toContainText('架空');
  await page.getByRole('link', { name: '榊 直人のプロフィール', exact: true }).click();
  await expect(page.getByRole('heading', { name: '榊 直人', exact: true })).toBeVisible();
  await expect(page.getByTestId('editorial-profile').getByTestId('feature-card')).toHaveCount(2);
  await expect(page.getByTestId('editorial-profile')).not.toContainText('架空');
  await page.goto('/features/guides/onose-tsumugi');
  await expect(page.getByRole('heading', { name: '小野瀬 紬', exact: true })).toBeVisible();
  await expect(page.getByText('この案内人が設定された特集は、まだありません。', { exact: true })).toBeVisible();
  await page.goto('/features/editorial-policy');
  for (const name of ['澄野 遥', '榊 直人', '小野瀬 紬']) await expect(page.getByRole('link', { name: name + 'のプロフィール', exact: true })).toBeVisible();
  await page.goto('/owner/features');
  await page.getByRole('button', { name: `${initial[0].title}を編集`, exact: true }).click();
  for (const name of ['澄野 遥', '榊 直人', '小野瀬 紬']) await expect(page.getByRole('radio', { name, exact: true })).toBeVisible();
});

for (const width of [320,390,1440]) test(`CMSのサムネと公開確認が画面内で一致する（${width}px）`,async({page})=>{
 await page.setViewportSize({width,height:900});await mockFeatures(page,true);await page.goto('/owner/features');
 await page.getByRole('button', { name: `${initial[0].title}を編集`, exact: true }).click();
 const actions=page.getByTestId('feature-editor-actions');
 await expect(actions.getByRole('button',{name:'公開する',exact:true})).toBeVisible();
 const bounds=await actions.boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(900);
 await actions.getByRole('button',{name:'公開する',exact:true}).click();
 const dialog=page.getByTestId('feature-action-confirm');await expect(dialog).toBeVisible();
 const box=await dialog.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(box!.y+box!.height).toBeLessThanOrEqual(900);
 await dialog.getByRole('button',{name:'取り消す',exact:true}).click();
 await page.getByRole('button',{name:'画像・掲載',exact:true}).click();
 const image=page.getByTestId('feature-image-editor').locator('img');await expect(image).toHaveJSProperty('complete',true);const source=await image.getAttribute('src');expect(source).toContain('five-guidelines-cover');
 await expect(page.locator('#roku-launch')).toBeHidden();await page.screenshot({path:test.info().outputPath(`cms-media-${width}.png`)});
 const alt=await image.getAttribute('alt');
 await page.getByRole('button',{name:'プレビュー',exact:true}).click();await expect(page.getByTestId('feature-article').locator('img').first()).toHaveAttribute('src',source!);await expect(page.getByTestId('feature-article').locator('img').first()).toHaveAttribute('alt',alt!);
 await page.getByRole('button',{name:'公開画面を見る',exact:true}).click();await expect(page.getByTestId('features-hero').locator('img').first()).toHaveAttribute('src',source!);
});

test('CMSの公開エラーは操作欄に表示し、編集内容を失わず再試行できる',async({page})=>{
 const server=await mockFeatures(page,true);await page.goto('/owner/features');
 await page.getByRole('button', { name: `${initial[0].title}を編集`, exact: true }).click();
 const title=page.getByRole('textbox',{name:'タイトル',exact:true});await title.fill('失敗しても保持するタイトル');
 await page.route('**/rpc/publish_feature_article',route=>route.fulfill({status:409,json:{code:'40001',message:'記事が別の画面で変更されています。再読み込みしてください。'}}));
 await page.getByRole('button',{name:'公開する',exact:true}).click();await page.getByRole('button',{name:'この内容で公開',exact:true}).click();
 await expect(page.getByTestId('feature-editor-actions').getByRole('alert')).toContainText('別の画面で変更');await expect(title).toHaveValue('失敗しても保持するタイトル');expect(server.drafts()).toHaveLength(1);
 await page.unroute('**/rpc/publish_feature_article');await page.getByRole('button',{name:'公開する',exact:true}).click();await page.getByRole('button',{name:'この内容で公開',exact:true}).click();
 await expect(page.getByText('特集を公開しました。',{exact:true})).toBeVisible();expect(server.articles()[0].title).toBe('失敗しても保持するタイトル');
});

test('CMSは必須入力をその場で案内し、新規記事のURL名は省略して公開できる',async({page})=>{
 const server=await mockFeatures(page,true);await page.goto('/owner/features');
 await page.getByRole('button',{name:'＋ 記事を作成',exact:true}).click();
 await page.getByRole('button',{name:'公開する',exact:true}).click();await expect(page.getByRole('alert')).toContainText('タイトルと本文');await expect(page.getByTestId('feature-action-confirm')).toBeHidden();
 await page.getByRole('textbox',{name:'タイトル',exact:true}).fill('URLを自動発行する記事');await page.getByRole('textbox',{name:'本文',exact:true}).fill('## 本文\n\n公開できる記事です。');
 await page.getByRole('button',{name:'公開する',exact:true}).click();await page.getByRole('button',{name:'この内容で公開',exact:true}).click();
 await expect(page.getByText('特集を公開しました。',{exact:true})).toBeVisible();expect(server.articles().find((a:any)=>a.title==='URLを自動発行する記事').slug).toBe('new-article');
});

test('スマホの特集見出しは指定した語句の間で改行する', async ({ page }) => {
  const server = await mockFeatures(page);
  const first = '押さえておくべき5つの処世術';
  const second = 'ー分散戦略・反応の技術・可変性の自覚・';
  const third = '偶然の設計・本当の勇気ー';
  server.articles()[0].title = first + second + '/' + third;
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/features/five-guidelines');
  const title = page.getByTestId('feature-article').getByRole('heading', { level: 1 });
  await expect(title).toBeVisible();
  expect(await title.textContent()).toBe([first, second, third].join('\n'));
  const countFirstLineBoxes = await title.evaluate((element, count) => {
    const range = document.createRange();
    range.setStart(element.firstChild!, 0);
    range.setEnd(element.firstChild!, count);
    return range.getClientRects().length;
  }, first.length);
  expect(countFirstLineBoxes).toBe(1);
});

test('オーナー設定から特集と案内人を同じ階層で開く', async ({ page }) => {
  await mockFeatures(page, true);
  await page.route('**/functions/v1/access', route => route.fulfill({ json: { access: 'free' } }));
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: /^オーナープレビュー/ })).toBeVisible();
  await expect(page.getByText('運用ダッシュボード', { exact: true })).toHaveCount(0);
  await expect(page.getByText('編集案内人の管理', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'コンテンツ管理', exact: false }).click();
  const headings = ['処世術', '理論', '人気ランキング', '特集'];
  const sizes = [];
  for (const name of headings) {
    const button = page.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    sizes.push([box.width, box.height]);
  }
  expect(sizes.every(([w, h]) => w === sizes[0][0] && h === sizes[0][1])).toBe(true);
  await page.getByRole('button', { name: '特集', exact: true }).click();
  await expect(page.getByText('記事一覧', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '編集案内人の管理', exact: true }).click();
  await expect(page.getByTestId('editorial-character-editor')).toBeVisible();
  await page.getByRole('button', { name: /記事一覧に戻る/ }).click();
  await expect(page).toHaveURL(/\/owner\/features$/);
  await expect(page.getByText('記事一覧', { exact: true })).toBeVisible();
});
