import { expect, test } from '@playwright/test';

test('販売ページは同期した公開数と購入条件を表示する', async ({ page }) => {
  const rows: Record<string, unknown[]> = {
    content_categories: [
      { kind: 'technique', id: 'interpersonal', title: '対人術', display_order: 0 },
      { kind: 'technique', id: 'work', title: '仕事術', display_order: 1 },
      { kind: 'technique', id: 'life', title: '人生術', display_order: 2 },
      { kind: 'theory', id: 'psychology', title: '心理学', display_order: 0 },
    ],
    public_techniques: [
      { id: 'master336-001', category: 'interpersonal', persona_id: '印象がいい人', title: '清潔感を意識する', explanation: '検証用', access_tier: 'free' },
      { id: 'master336-172', category: 'work', persona_id: '仕事ができる人', title: '締切より早く期限を持つ', access_tier: 'complete' },
      { id: 'master336-266', category: 'life', persona_id: '自分らしく生きられる人', title: '他人の正解は、自分の正解ではない', access_tier: 'complete' },
    ],
    public_theories: [
      { id: 'kb_001', title: '印象形成理論', summary: '検証用。', category_id: 'psychology', access_tier: 'free' },
      { id: 'kb_190', title: '計画錯誤', category_id: 'psychology', access_tier: 'complete' },
      { id: 'old-alias', canonical_id: 'kb_001', access_tier: 'free' },
    ],
    personas: [
      { name: '印象がいい人', category: 'interpersonal', access_tier: 'free' },
      { name: '仕事ができる人', category: 'work', access_tier: 'free' },
      { name: '自分らしく生きられる人', category: 'life', access_tier: 'complete' },
    ],
  };
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    return route.fulfill({ json: rows[table] ?? [] });
  });
  await page.goto('/upgrade');
  const free = page.getByTestId('upgrade-free-card');
  const complete = page.getByTestId('upgrade-complete-card');
  for (const label of ['2つの人物像', '1件の処世術', '1件の理論', '7ケース']) await expect(free).toContainText(label);
  for (const label of ['3つの人物像', '3件の処世術', '2件の理論', '21ケース']) await expect(complete).toContainText(label);
  await expect(page.getByTestId('upgrade-comparison-copy')).toContainText('お気に入り・マイ処世術・座右の銘は両方の版で使えます。');
  await expect(page.getByTestId('upgrade-price')).toHaveText('¥320');
  await page.getByTestId('upgrade-purchase-cta').click();
  await expect(page.getByText('決済成功から30日間', { exact: true })).toBeVisible();
  await expect(page.getByText('¥320（税込）', { exact: true })).toBeVisible();
  await expect(page.getByText('なし', { exact: true })).toBeVisible();
});
