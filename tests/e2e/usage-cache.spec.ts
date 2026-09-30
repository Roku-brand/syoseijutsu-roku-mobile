import { expect, test } from '@playwright/test';
import defaults from '../../src/data/generated/popular-rankings.json';

test('公開カタログとランキングを再読み込みで再利用し、期限後だけ再取得する', async ({ page }) => {
  let catalogueRequests = 0, rankingRequests = 0;
  await page.route('**/rest/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').at(-1);
    if (table === 'get_popular_rankings') {
      rankingRequests++;
      return route.fulfill({ json: defaults });
    }
    if (['techniques', 'theories', 'personas', 'content_categories'].includes(table!)) {
      catalogueRequests++;
      const tier = url.searchParams.get('access_tier');
      const select = url.searchParams.get('select') ?? '';
      if (tier === 'eq.complete') expect(select).not.toMatch(/explanation|summary|provenance/);
      if (table === 'techniques') return route.fulfill({ json: tier === 'eq.free'
        ? [{ id:'free-test', persona_id:'p', category:'work', title:'無料本文', explanation:'無料本文', access_tier:'free' }]
        : [{ id:'paid-test', persona_id:'p', category:'work', access_tier:'complete' }] });
      if (table === 'theories') return route.fulfill({ json: tier === 'eq.free' ? []
        : [{ id:'kb_test', title:'一覧の理論名', category_id:'psychology', category_title:'心理学', access_tier:'complete' }] });
      if (table === 'personas') return route.fulfill({ json:[{name:'p',category:'work',access_tier:'free'}] });
    }
    return route.fulfill({ json:[] });
  });
  await page.goto('/popular');
  await expect(page.getByTestId('ranking-list-technique').getByTestId('ranking-card')).toHaveCount(10);
  await expect.poll(() => catalogueRequests).toBe(6);
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('@shoseijutsu-roku/published-content/v1')))).toBe(true);
  await page.reload();
  await expect(page.getByTestId('ranking-list-technique').getByTestId('ranking-card')).toHaveCount(10);
  expect(catalogueRequests).toBe(6);
  expect(rankingRequests).toBe(1);
  await page.evaluate(() => {
    const key = '@shoseijutsu-roku/published-content/v1';
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    snapshot.fetchedAt = Date.now() - 60 * 60 * 1000;
    localStorage.setItem(key, JSON.stringify(snapshot));
  });
  await page.reload();
  await expect.poll(() => catalogueRequests).toBe(12);
  expect(rankingRequests).toBe(1);
});
