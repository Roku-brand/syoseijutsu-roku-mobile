import { expect, test } from '@playwright/test';
import { THEORY_CATEGORIES } from '../../src/data/theory-categories';
import source from '../../src/data/generated/techniques.public.json';

const techniqueCategories = [ ['interpersonal', '対人術'], ['work', '仕事術'], ['life', '人生術'] ];

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

for (const width of [320, 390, 768, 1440]) test(`探すの二本柱・画像・余白は${width}pxで崩れない`, async ({ page }) => {
  await page.setViewportSize({ width, height: 960 });
  await page.goto('/discover');
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['処世術を探す', '理論を探す']);
  await expect(page.getByTestId('discover-techniques-section').getByRole('heading', { level: 3 })).toHaveText('人物像から探す');
  await expect(page.getByTestId('discover-destinations')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'カテゴリから探す' })).toHaveCount(0);
  const search = page.getByTestId('discover-search');
  const grid = page.getByTestId('discover-technique-grid');
  const theoryGrid = page.getByTestId('discover-theory-grid');
  await expect(page.getByTestId('discover-technique-index')).toHaveCount(0);
  await expect(page.getByRole('link', { name: '全処世術一覧', exact: true })).toHaveCount(0);
  const [searchBox, gridBox, theoryBox] = await Promise.all([search.boundingBox(), grid.boundingBox(), theoryGrid.boundingBox()]);
  expect(searchBox!.height).toBe(width < 700 ? 56 : 62);
  for (const box of [gridBox!, theoryBox!]) {
    expect(Math.abs(box.x - searchBox!.x)).toBeLessThan(1);
    expect(Math.abs(box.width - searchBox!.width)).toBeLessThan(1);
  }
  const personaBoxes = await grid.getByRole('link').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
  expect(personaBoxes).toHaveLength(3);
  expect(new Set(personaBoxes.map(box => Math.round(box.y))).size).toBe(1);
  expect(personaBoxes.every(box => box.x >= gridBox!.x - 1 && box.x + box.width <= gridBox!.x + gridBox!.width + 1)).toBe(true);
  expect(await grid.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await theoryGrid.getByRole('link').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')))).toEqual(THEORY_CATEGORIES.map(category => `${category.label}から探す`));
  await expect.poll(() => page.getByTestId('discover-categories').locator('img').evaluateAll(nodes => nodes.filter(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0).length)).toBe(9);
  if (width >= 700) {
    const boxes = await grid.getByRole('link').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
    expect(new Set(boxes.map(box => box.y)).size).toBe(1);
    expect(boxes.every(box => box.height === 150)).toBe(true);
    const theoryBoxes = await theoryGrid.getByRole('link').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().toJSON()));
    expect(new Set(theoryBoxes.map(box => box.y)).size).toBe(2);
  } else {
    const labelsFit = await theoryGrid.getByRole('link').evaluateAll(nodes => nodes.every(node => {
      const caption = node.lastElementChild!;
      const title = caption.firstElementChild!;
      const arrow = caption.lastElementChild!.getBoundingClientRect();
      return [...title.children].every(word => word.getBoundingClientRect().right <= arrow.left - 3);
    }));
    expect(labelsFit).toBe(true);
    for (const [,label] of techniqueCategories) {
      const title = grid.getByRole('link', { name: `${label}から探す` }).getByText(label, { exact: true });
      const fits = await title.evaluate(node => {
        const range = document.createRange(); range.selectNodeContents(node);
        const text = range.getBoundingClientRect(), box = node.getBoundingClientRect();
        return text.width <= box.width + 1 && box.height <= parseFloat(getComputedStyle(node).lineHeight) + 1;
      });
      expect(fits).toBe(true);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath(`discover-${width}.png`), fullPage: true });
});

test('カテゴリ画像は軽く拡大し、動きを減らす設定では拡大しない', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/discover');
    const card = page.getByRole('link', { name: '対人術から探す' });
    await card.hover();
    await expect.poll(() => card.evaluate(node => {
      const transform = getComputedStyle(node.firstElementChild!).transform;
      return transform === 'none' ? 1 : new DOMMatrixReadOnly(transform).a;
    })).toBeCloseTo(reducedMotion === 'reduce' ? 1 : 1.035, 3);
    await page.mouse.move(0, 0);
  }
});

for (const [id, label] of techniqueCategories) test(`人物像カテゴリ ${label} の遷移先を保つ`, async ({ page }) => {
  await page.goto('/discover');
  await page.getByRole('link', { name: `${label}から探す` }).click();
  await expect(page).toHaveURL(new RegExp(`/personas\\?category=${id}`));
});
for (const {id, label} of THEORY_CATEGORIES) test(`理論分類 ${label} の遷移先を保つ`, async ({ page }) => {
  await page.goto('/discover');
  await page.getByRole('link', { name: `${label}から探す` }).click();
  await expect(page).toHaveURL(new RegExp(`/theories\\?category=${id}`));
});

test('各一覧入口と検索の対象・クエリを保つ', async ({ page }) => {
  for (const [name, path] of [['すべての処世術を見る', '/techniques'], ['すべての理論を見る', '/theories']]) {
    await page.goto('/discover');
    await page.getByRole('link', { name, exact: true }).click();
    expect(new URL(page.url()).pathname).toBe(path);
  }
  await page.goto('/discover');
  await page.getByTestId('discover-search-input').fill('聞き上手');
  await page.getByTestId('discover-search-submit').click();
  await expect(page).toHaveURL(/\/search\?/);
  expect(new URL(page.url()).searchParams.get('q')).toBe('聞き上手');
  await expect(page.getByRole('textbox', { name: 'キーワードを検索' })).toHaveValue('聞き上手');
});

test('公開データの人物像未所属と同名別IDの処世術を一覧・詳細に反映する', async ({ page }) => {
  const rows = source.categories.flatMap(category => category.subcategories.flatMap(persona => persona.items.map(item => ({ ...item, category: category.key, persona_id: persona.name, status: 'published', access_tier: item.status === 'locked' ? 'complete' : 'free' }))));
  const extras = ['', null].map((persona_id, i) => ({ ...rows[0], id: `independent-${i}`, persona_id, title: '同じタイトルの処世術', essence: '独立した処世術の公開内容', explanation: '独立した処世術の解説', access_tier: 'free' }));
  const personas = source.categories.flatMap(category => category.subcategories.map(persona => ({ name: persona.name, category: category.key, access_tier: 'free' })));
  const categories = [...techniqueCategories.map(([id, title], display_order) => ({ kind: 'technique', id, title, display_order })), ...THEORY_CATEGORIES.map(({ id, label: title }, display_order) => ({ kind: 'theory', id, title, display_order }))];
  await page.route('**/rest/v1/**', route => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    const data = table === 'public_techniques' ? [...rows, ...extras] : table === 'personas' ? personas : table === 'content_categories' ? categories : [];
    return route.fulfill({ status: 200, json: data });
  });
  await page.goto('/techniques?page=4');
  await expect(page.getByTestId('technique-index-count')).toHaveText('358件');
  await expect(page.getByTestId('technique-index-row')).toHaveCount(58);
  const independent = page.getByTestId('technique-index-row').filter({ hasText: '独立した処世術' });
  await expect(independent).toHaveCount(2);
  await expect(independent.getByTestId('technique-index-id')).toHaveText(['No.357', 'No.358']);
  await expect(independent.getByTestId('technique-index-title')).toHaveText(['同じタイトルの処世術', '同じタイトルの処世術']);
  await independent.first().click();
  await expect(page).toHaveURL(/\/card\/independent-0$/);
  await expect(page.getByTestId('technique-essence')).toContainText('独立した処世術の公開内容');
  await expect(page.getByRole('link', { name: '人物像', exact: true })).toHaveCount(0);
});
