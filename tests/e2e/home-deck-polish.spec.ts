import { expect, test, type Page } from '@playwright/test';

const storageKey = '@shoseijutsu-roku/discovery-deck/v1/free';
const ready = async (page: Page) => {
  await expect(page.getByTestId('home-recommendation-card')).toBeVisible();
  await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
};

test('入れ替えは5枚が左右へ出て、反対側から新しい5枚が入り、一度だけ交換する', async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await ready(page);
  const original = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
  const width = (await page.getByTestId('home-recommendation-card').boundingBox())!.width;
  await page.getByTestId('home-discovery-refresh').click();
  const outgoing = await page.evaluate(() => {
    const animations = document.getAnimations().filter(animation => (animation.effect as KeyframeEffect)?.target?.id?.startsWith('home-deck-slot-'));
    const paths = animations.map(animation => {
      const keys = (animation.effect as KeyframeEffect).getKeyframes();
      animation.pause();
      animation.currentTime = Number(animation.effect!.getTiming().delay) + 150;
      return { id: (animation.effect as KeyframeEffect).target!.id, end: new DOMMatrix(keys.at(-1)!.transform as string).m41 };
    });
    (window as any).__outgoing = animations;
    return paths;
  });
  expect(outgoing).toHaveLength(5);
  expect(outgoing.every(path => Math.abs(path.end) >= width * .9)).toBe(true);
  expect(outgoing.some(path => path.end < 0) && outgoing.some(path => path.end > 0)).toBe(true);
  await expect(page.getByTestId('home-deck-filter')).toBeDisabled();
  await page.screenshot({ path: 'release-evidence/home-polish/replacement-outgoing.png' });
  await page.evaluate(() => {
    const sample = () => {
      const outgoing = (window as any).__outgoing as Animation[];
      const incoming = document.getAnimations().filter(animation => !outgoing.includes(animation) && (animation.effect as KeyframeEffect)?.target?.id?.startsWith('home-deck-slot-'));
      if (incoming.length !== 5) { requestAnimationFrame(sample); return; }
      (window as any).__incoming = incoming.map(animation => {
        const keys = (animation.effect as KeyframeEffect).getKeyframes();
        animation.pause();
        animation.currentTime = Number(animation.effect!.getTiming().delay) + 100;
        return { id: (animation.effect as KeyframeEffect).target!.id, start: new DOMMatrix(keys[0].transform as string).m41 };
      });
    };
    requestAnimationFrame(sample);
    for (const animation of (window as any).__outgoing as Animation[]) animation.play();
  });
  await page.waitForFunction(() => (window as any).__incoming);
  const incoming = await page.evaluate(() => (window as any).__incoming as { id: string; start: number }[]);
  for (const path of incoming) expect(path.start).toBe(-(outgoing.find(item => item.id === path.id)!.end));
  await page.screenshot({ path: 'release-evidence/home-polish/replacement-incoming.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await expect(page.getByTestId('home-discovery-refresh')).toBeEnabled();
  await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).round, storageKey)).toBe(original.round + 1);
  const next = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).order as string[], storageKey);
  expect(next).toHaveLength(5);
  expect(next.filter(id => original.order.includes(id))).toEqual([]);
  await expect(page.getByTestId('home-deck-stage').locator('img')).toHaveCount(2);
});

test('ホームの準備ができたら、無関係な画像の完了を待たず起動画面を閉じる', async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/startup-probe.png', async route => {
    await held;
    await route.fulfill({ status: 204, body: '' }).catch(() => {});
  });
  await page.addInitScript(() => {
    (window as any).__homeReady = null;
    window.addEventListener('roku-home-ready', () => { (window as any).__homeReady = performance.now(); }, { once: true });
    document.addEventListener('DOMContentLoaded', () => {
      const image = document.createElement('img');
      image.src = '/startup-probe.png'; image.style.cssText = 'width:1px;height:1px;position:absolute;pointer-events:none';
      document.body.append(image);
    }, { once: true });
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => (window as any).__homeReady !== null);
    await expect(page.locator('#roku-launch')).toHaveClass(/hidden/);
    expect(await page.evaluate(() => document.readyState)).not.toBe('complete');
    await ready(page);
  } finally { release(); }
});

test('CMSの保存デッキ復元は起動時の公開カタログ取得を共有し、人物像名を表示する', async ({ page }) => {
  test.skip(!process.env.EXPO_PUBLIC_SUPABASE_URL, 'CMS connector is not configured in this build');
  const counts = new Map<string, number>();
  const rows = Array.from({ length: 5 }, (_, index) => ({ id: `cms-polish-${index}`, title: `起動時のカード ${index}`, essence: '保存したカードの位置を保つ。', explanation: '公開カタログの確認。', category: 'interpersonal', persona_id: '話を聞く人', status: 'published', access_tier: 'free', display_order: index }));
  const theoryRows = Array.from({ length: 5 }, (_, index) => ({ id: `cms-polish-theory-${index}`, title: `理論のカード ${index}`, summary: '理論の分類表示を検証する。', category_id: 'cognitive', category_title: '認知心理学', status: 'published', access_tier: 'free', display_order: index }));
  const categories = [{ kind: 'technique', id: 'interpersonal', title: '対人術', display_order: 0 }, { kind: 'theory', id: 'cognitive', title: '認知心理学', display_order: 0 }];
  await page.route('**/rest/v1/**', async route => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1)!;
    counts.set(table, (counts.get(table) ?? 0) + 1);
    await new Promise(resolve => { setTimeout(resolve, 700); });
    await route.fulfill({ json: table === 'public_techniques' ? rows : table === 'public_theories' ? theoryRows : table === 'content_categories' ? categories : table === 'personas' ? [{ name: '話を聞く人', category: 'interpersonal', status: 'published', access_tier: 'free' }] : table === 'content_revision' ? { revision: 'polish-v1' } : [] });
  });
  const order = rows.map(row => `technique:${row.id}`);
  await page.addInitScript(({ key, order }) => {
    const day = Math.floor((Date.now() + 9 * 60 * 60 * 1000) / 86400000);
    localStorage.setItem(key, JSON.stringify({ day, round: 4, order, cursor: 2, offset: 5, seen: order, filter: 'interpersonal' }));
  }, { key: storageKey, order });
  await page.goto('/');
  await ready(page);
  await expect(page.getByTestId('home-deck-context')).toHaveText('話を聞く人');
  await expect(page.getByTestId('home-deck-position')).toContainText('03');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).order, storageKey)).toEqual(order);
  for (const table of ['public_techniques', 'public_theories', 'personas', 'content_revision']) expect(counts.get(table), table).toBe(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('home-deck-filter').click();
  await page.getByTestId('home-deck-filter-theory').click();
  await ready(page);
  await expect(page.getByTestId('home-deck-context')).toHaveText('認知心理学');
  await expect(page.getByTestId('home-deck-context')).toHaveAttribute('aria-label', '理論分類：認知心理学');
});
