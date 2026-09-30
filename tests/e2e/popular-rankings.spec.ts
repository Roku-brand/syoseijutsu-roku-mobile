import { expect, test } from '@playwright/test';
import defaults from '../../src/data/generated/popular-rankings.json';

test('人気ランキングは両部門トップ10で、CMSの順位とカテゴリ画像を表示する', async ({ page }) => {
  const ranks = defaults.map((item) => ({ ...item, rank: 11 - item.rank }));
  await page.route('**/rest/v1/rpc/get_popular_rankings', (route) => route.fulfill({ json: ranks }));
  await page.goto('/popular');
  await expect(page.getByTestId('popular-hero')).toBeVisible();
  await expect(page.getByTestId('book-header')).toContainText('人気ランキング');
  for (const division of ['technique', 'theory']) {
    await page.getByTestId(`ranking-tab-${division}`).click();
    const cards = page.getByTestId('ranking-list-' + division).getByTestId('ranking-card');
    await expect(cards).toHaveCount(10);
    const first = ranks.find((item) => item.division === division && item.rank === 1)!;
    await expect(cards.first()).toContainText(first.title);
    await expect(cards.first()).toContainText(first.category_title);
    const top = await cards.first().boundingBox();
    const fourth = await cards.nth(3).boundingBox();
    expect(top!.height).toBeGreaterThan(fourth!.height);
    expect(top!.x + top!.width).toBeLessThanOrEqual(393);
    const artwork = cards.locator('[data-testid^="ranking-art-"]');
    await expect(artwork).toHaveCount(10);
    const images = await artwork.evaluateAll((elements) => elements.map((el) => ({ category: el.getAttribute('data-testid'), image: el.querySelector('img')?.getAttribute('src'), position: el.firstElementChild?.getAttribute('style') })));
    for (const image of images) for (const other of images.filter((item) => item.category === image.category)) expect(other).toEqual(image);
  }
});

test('一般ユーザーはランキング編集画面に入れない', async ({ page }) => {
  await page.goto('/owner/rankings');
  await expect(page.getByTestId('ranking-editor')).toHaveCount(0);
  await expect(page).toHaveURL(/auth/);
});

test('オーナーが両部門の編集を保持し、差し替えと順位変更を公開できる', async ({ page }) => {
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'owner@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: 4102444800 })).toString('base64url');
  const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  const projectRef = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname.split('.')[0];
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: `sb-${projectRef}-auth-token`, value: session,
  });
  let configs = ['technique', 'theory'].map((division) => ({ division, content_ids: defaults.filter((item) => item.division === division).map((item) => item.content_id), updated_at: '2026-09-30T00:00:00+00:00' }));
  const candidates = defaults.map((item) => ({ division: item.division, id: item.content_id, title: item.title, category: item.category_title }));
  candidates.push({ division: 'technique', id: 'candidate-new', title: '新しく選ぶ処世術', category: '仕事術' });
  let published: { target_division: string; ordered_ids: string[]; expected_updated_at: string } | null = null;
  await page.route('**/rest/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/profiles')) return route.fulfill({ json: { role: 'owner', display_name: 'オーナー', avatar_url: null } });
    if (path.endsWith('/popular_rankings')) return route.fulfill({ json: configs });
    if (path.endsWith('/get_ranking_candidates')) return route.fulfill({ json: candidates });
    if (path.endsWith('/publish_popular_ranking')) {
      published = route.request().postDataJSON();
      const row = { division: published!.target_division, content_ids: published!.ordered_ids, updated_at: '2026-09-30T00:01:00+00:00' };
      configs = configs.map((item) => item.division === row.division ? row : item);
      return route.fulfill({ json: row });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/owner/rankings');
  await expect(page.getByTestId('ranking-editor-row')).toHaveCount(10);
  const original = defaults.find((item) => item.division === 'technique' && item.rank === 2)!;
  await page.getByRole('button', { name: '1位を下へ移動', exact: true }).click();
  await expect(page.getByTestId('ranking-editor-row').first()).toContainText(original.title);
  await page.getByRole('button', { name: '理論部門', exact: true }).click();
  await page.getByRole('button', { name: '1位を下へ移動', exact: true }).click();
  await page.getByRole('button', { name: '処世術部門', exact: true }).click();
  await expect(page.getByTestId('ranking-editor-row').first()).toContainText(original.title);
  await page.getByRole('button', { name: '1位の記事を変更', exact: true }).click();
  await page.getByRole('textbox', { name: 'ランキング候補を検索' }).fill('新しく');
  await page.getByRole('button', { name: '新しく選ぶ処世術を選択' }).click();
  await page.getByRole('button', { name: 'ランキングを公開', exact: true }).click();
  await expect(page.getByText('処世術部門のトップ10を公開しました。')).toBeVisible();
  expect(published).toMatchObject({ target_division: 'technique', expected_updated_at: '2026-09-30T00:00:00+00:00' });
  expect(published!['ordered_ids'][0]).toBe('candidate-new');
  expect(new Set(published!['ordered_ids']).size).toBe(10);
  await page.getByRole('button', { name: '理論部門', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ランキングを公開', exact: true })).toBeEnabled();
});
