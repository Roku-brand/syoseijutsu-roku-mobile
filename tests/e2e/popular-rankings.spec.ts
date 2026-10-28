import { expect, test, type Page } from '@playwright/test';
import defaults from '../../src/data/generated/popular-rankings.json';

async function signInAsOwner(page: Page) {
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'owner@example.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: 'authenticated', exp: 4102444800 })).toString('base64url');
  const session = { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.test`, refresh_token: 'test-refresh', token_type: 'bearer', expires_at: 4102444800, expires_in: 3600, user };
  const projectRef = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname.split('.')[0];
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: `sb-${projectRef}-auth-token`, value: session,
  });
}

test('人気ランキングは両部門トップ10で、CMSの順位とカテゴリ画像を表示する', async ({ page }) => {
  const ranks = defaults.map((item) => ({ ...item, rank: 11 - item.rank }));
  const categoryPhotos = new Map<string, string>();
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
    for (const image of images) {
      expect(image.image).toBeTruthy();
      for (const other of images.filter((item) => item.category === image.category)) expect(other).toEqual(image);
    }
    if (division === 'technique') for (const image of images) categoryPhotos.set(image.category!.replace('ranking-art-', ''), image.image!);
  }
  // The home deck now draws a five-card hand and has its own optimized photos.
  // Ranking artwork remains category-specific, independent of the current hand.
  expect([...categoryPhotos.keys()].sort()).toEqual(['interpersonal', 'life', 'work']);
  expect(new Set(categoryPhotos.values()).size).toBe(3);
});

test('一般ユーザーはランキング編集画面に入れない', async ({ page }) => {
  await page.goto('/owner/rankings');
  await expect(page.getByTestId('ranking-editor')).toHaveCount(0);
  await expect(page).toHaveURL(/auth/);
});

test('オーナーが両部門の編集を保持し、差し替えと順位変更を公開できる', async ({ page }) => {
  await signInAsOwner(page);
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

test('候補が1000件を超えても末尾の掲載記事を認識し、掲載不可の記事を差し替えて公開・再表示できる', async ({ page }) => {
  await signInAsOwner(page);
  const candidates = Array.from({ length: 1177 }, (_, index) => ({
    division: index < 356 ? 'technique' : 'theory', id: `candidate-${String(index).padStart(4, '0')}`,
    title: `公開中の記事${index}`, category: index < 356 ? '仕事術' : '心理学',
  }));
  let configs = [
    { division: 'technique', content_ids: candidates.slice(0, 10).map(item => item.id), updated_at: '2026-10-18T00:00:00Z' },
    { division: 'theory', content_ids: ['archived-id', ...candidates.slice(-9).map(item => item.id)], updated_at: '2026-10-18T00:00:00Z' },
  ];
  const offsets: number[] = [];
  let rejectLastPage = true;
  let rejectPublish = true;
  let publishAttempts = 0;
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/profiles')) return route.fulfill({ json: { role: 'owner', display_name: 'オーナー', avatar_url: null } });
    if (url.pathname.endsWith('/popular_rankings')) return route.fulfill({ json: configs });
    if (url.pathname.endsWith('/get_ranking_candidates')) {
      expect(url.searchParams.get('order')).toBe('division.asc,id.asc');
      const from = Number(url.searchParams.get('offset') ?? 0);
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 1000), 1000);
      offsets.push(from);
      if (from >= 1000 && rejectLastPage) return route.fulfill({ status: 503, json: { message: '候補の通信に失敗しました。再読み込みしてください。' } });
      return route.fulfill({ json: candidates.slice(from, from + limit) });
    }
    if (url.pathname.endsWith('/publish_popular_ranking')) {
      publishAttempts++;
      if (rejectPublish) return route.fulfill({ status: 400, json: { code: '40001', message: '別の画面でランキングが変更されています。再読み込みしてください。' } });
      const request = route.request().postDataJSON();
      expect(request.expected_updated_at).toBe('2026-10-18T00:00:00Z');
      expect(request.ordered_ids).toEqual([candidates[1167].id, ...candidates.slice(-9).map(item => item.id)]);
      const row = { division: request.target_division, content_ids: request.ordered_ids, updated_at: '2026-10-18T00:01:00Z' };
      configs = configs.map(item => item.division === row.division ? row : item);
      return route.fulfill({ json: row });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/owner/rankings');
  await expect(page.getByRole('alert')).toHaveText('候補の通信に失敗しました。再読み込みしてください。');
  await expect(page.getByTestId('ranking-editor-row')).toHaveCount(0);
  rejectLastPage = false;
  await page.getByRole('button', { name: '最新の設定を再読み込み', exact: true }).click();
  await expect(page.getByTestId('ranking-editor-row')).toHaveCount(10);
  expect(offsets).toEqual([0, 500, 1000, 0, 500, 1000]);
  await page.getByRole('button', { name: '理論部門', exact: true }).click();
  await expect(page.getByText('掲載できない記事', { exact: true })).toHaveCount(1);
  await expect(page.getByTestId('ranking-editor-row').last()).toContainText('公開中の記事1176');
  await expect(page.getByRole('button', { name: 'ランキングを公開', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '1位の記事を変更', exact: true }).click();
  await page.getByRole('textbox', { name: 'ランキング候補を検索' }).fill('公開中の記事1167');
  await page.getByRole('button', { name: '公開中の記事1167を選択', exact: true }).click();
  await expect(page.getByText('掲載できない記事', { exact: true })).toHaveCount(0);
  const publish = page.getByRole('button', { name: 'ランキングを公開', exact: true });
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(page.getByRole('alert')).toHaveText('別の画面でランキングが変更されています。再読み込みしてください。');
  await expect(page.getByTestId('ranking-editor-row').first()).toContainText('公開中の記事1167');
  // The test server accepts a retry; a real stale timestamp stays rejected until
  // the owner reloads. The draft must survive either kind of API failure.
  rejectPublish = false;
  await publish.click();
  await expect(page.getByText('理論部門のトップ10を公開しました。')).toBeVisible();
  expect(publishAttempts).toBe(2);
  await page.reload();
  await page.getByRole('button', { name: '理論部門', exact: true }).click();
  await expect(page.getByTestId('ranking-editor-row').first()).toContainText('公開中の記事1167');
  await expect(publish).toBeDisabled();
});
