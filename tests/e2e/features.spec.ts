import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

const initial = JSON.parse(fs.readFileSync('content/features/manifest.json', 'utf8')).map((row: any) => {
  const source = fs.readFileSync(`content/features/${row.slug}.md`, 'utf8').trim();
  const split = source.indexOf('\n\n');
  return { ...row, lead: source.slice(0, split), body: source.slice(split + 2), related_technique_ids: [], related_theory_ids: [], status: 'published', updated_at: '2026-10-13T00:00:00Z' };
});
async function mockFeatures(page: Page, owner = false) {
  let articles = structuredClone(initial);
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
    if (path.endsWith('/profiles')) return route.fulfill({ json: { role: owner ? 'owner' : 'user', display_name: '検証利用者' } });
    if (path.endsWith('/feature_articles')) return route.fulfill({ json: url.searchParams.has('status') ? articles.filter((row: any) => row.status === 'published') : articles });
    if (path.endsWith('/feature_article_drafts')) return route.fulfill({ json: drafts });
    if (path.endsWith('/save_feature_article_draft')) {
      const params = route.request().postDataJSON();
      const id = params.target_id ?? 'new-article';
      const row = articles.find((article: any) => article.id === id);
      const change = drafts.find(draft => draft.article_id === id);
      if (row && (params.expected_updated_at !== row.updated_at || params.expected_revision !== (change?.revision ?? null))) return route.fulfill({ status: 409, json: { message: '下書きが別の画面で変更されています。' } });
      if (!row) articles.push({ ...params.content, id, status: 'draft', updated_at: initial[0].updated_at });
      const next = { article_id: id, payload: params.content, base_updated_at: row?.updated_at ?? initial[0].updated_at, revision: (change?.revision ?? 0) + 1 };
      drafts = [...drafts.filter(draft => draft.article_id !== id), next];
      return route.fulfill({ json: { id, revision: next.revision, base_updated_at: next.base_updated_at } });
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
    return route.fulfill({ json: [] });
  });
  return { articles: () => articles, drafts: () => drafts };
}

test('ホームから無料の特集に入り、指針と3記事を日付なしで読める', async ({ page }) => {
  await mockFeatures(page);
  await page.goto('/');
  await page.getByTestId('home-shortcut-features').click();
  await expect(page).toHaveURL(/\/features$/);
  await expect(page.getByTestId('features-hero').getByRole('heading', { name: initial[0].title, exact: true })).toBeVisible();
  await expect(page.getByTestId('feature-card')).toHaveCount(3);
  await expect(page.getByTestId('features-page')).not.toContainText(/新着|特集記事|\d+分前|\d+時間前|読了|2026年/);
  await page.getByRole('link', { name: 'メタ発言はなぜ気分を害するのかを読む', exact: true }).click();
  await expect(page.getByTestId('feature-body')).toContainText(initial[2].body.split('\n\n')[1]);
  await expect(page.getByRole('heading', { name: initial[2].title, exact: true })).toBeVisible();
  await expect(page).toHaveTitle(`${initial[2].title}｜処世術禄`);
  await page.getByTestId('feature-article').getByTestId('feature-save-meta-comments').click();
  await page.reload();
  await expect(page.getByTestId('feature-save-meta-comments')).toContainText('保存済み');
  await page.goto('/library');
  await expect(page.getByText(initial[2].title, { exact: true })).toBeVisible();
  await page.getByText(initial[2].title, { exact: true }).click();
  await expect(page.getByTestId('feature-body')).toBeVisible();
});

test('320pxからデスクトップまで記事とヒーローが収まり、写真が表示される', async ({ page }) => {
  await mockFeatures(page);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto('/features');
    await expect(page.getByTestId('feature-card')).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await expect(page.getByTestId('features-hero').locator('img')).toHaveJSProperty('complete', true);
    const read = page.getByTestId('features-hero').getByRole('link', { name: `${initial[0].title}を読む`, exact: true });
    await expect(read).toBeVisible();
    if (width < 700) {
      const button = await read.boundingBox();
      const photo = await page.getByTestId('features-hero').locator('img').boundingBox();
      expect(button!.y + button!.height).toBeLessThanOrEqual(photo!.y);
    }
    await page.screenshot({ path: test.info().outputPath(`features-${width}.png`), fullPage: true });
    await page.goto('/features/five-guidelines');
    await expect(page.getByTestId('feature-body')).toBeVisible();
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
  await expect(title).toHaveValue(initial[0].title);
  await page.getByRole('button', { name: `${initial[1].title}を編集`, exact: true }).click();
  await title.fill('ティルトと向き合う');
  await page.getByRole('textbox', { name: '本文', exact: true }).fill('## 感情を手がかりにする\n\n初稿をCMSで編集した本文です。');
  await page.getByRole('button', { name: '下書きを保存', exact: true }).click();
  await expect(page.getByText('下書きを保存しました。公開中の内容は変わりません。')).toBeVisible();
  expect(server.articles()[1].title).toBe(initial[1].title);
  expect(server.drafts()[0].payload.title).toBe('ティルトと向き合う');
  await page.getByRole('button', { name: 'プレビュー', exact: true }).click();
  await expect(page.getByTestId('feature-article')).toContainText('感情を手がかりにする');
  await page.getByRole('button', { name: '公開する', exact: true }).click();
  await page.getByRole('button', { name: 'この内容で公開', exact: true }).click();
  await expect(page.getByText('特集を公開しました。')).toBeVisible();
  expect(server.articles()[1].title).toBe('ティルトと向き合う');
  expect(server.drafts()).toHaveLength(0);
  await page.getByRole('button', { name: '公開画面を見る', exact: true }).click();
  await expect(page.getByTestId('features-grid')).toContainText('ティルトと向き合う');
  await page.setViewportSize({ width: 390, height: 950 });
  await page.goto('/owner/features');
  await page.getByRole('button', { name: 'ティルトと向き合うを編集', exact: true }).click();
  await expect(title).toHaveValue('ティルトと向き合う');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: '非公開にする', exact: true }).click();
  await page.getByRole('button', { name: 'この特集を非公開にする', exact: true }).click();
  await expect(page.getByText('記事を非公開にしました。本文と下書きは保持されています。')).toBeVisible();
  expect(server.articles()[1].body).toContain('CMSで編集した本文');
  expect(server.articles()[1].status).toBe('archived');
  await page.getByRole('button', { name: '公開画面を見る', exact: true }).click();
  await expect(page.getByTestId('feature-card')).toHaveCount(2);
  await expect(page.getByTestId('features-grid')).not.toContainText('ティルトと向き合う');
});
