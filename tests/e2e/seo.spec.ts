import { expect, test } from '@playwright/test';

test('top page exposes the requested search and social metadata', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('処世術禄｜処世術を人生・仕事・人間関係に使える体系へ');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', '処世術を、人間関係・仕事・人生で使える知恵へ。心理学・行動科学などの理論と結びつけ、流れていく知恵を何度でも使える体系として届けます。');
  await expect(page.getByRole('heading', { name: /流れていく知恵を、.*ここで使える.*体系にする。/ })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://app.shoseijutsuroku.com/');
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', '処世術禄');
  const jsonLd = await page.locator('script[data-seo-jsonld]').evaluate((element) => element.textContent ?? '');
  expect(jsonLd).toContain('BreadcrumbList');
});

test('detail metadata changes on SPA navigation and returns with browser back', async ({ page }) => {
  await page.goto('/subcategory/interpersonal/印象がいい人');
  await expect(page).toHaveTitle(/印象がいい人になるための処世術/);
  const firstTechnique = page.getByRole('link', { name: /清潔感で足切りを超えるを開く/ });
  await expect(firstTechnique).toHaveAttribute('href', /\/card\/master336-001/);
  await firstTechnique.click();
  await expect(page).toHaveTitle('清潔感で足切りを超える｜印象がいい人の処世術｜処世術禄');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://app.shoseijutsuroku.com/card/master336-001');
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await page.goBack();
  await expect(page).toHaveTitle(/印象がいい人になるための処世術/);
});

test('private and interactive utility pages remain noindex', async ({ page }) => {
  for (const route of ['/auth', '/settings', '/learn/case-01']) {
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
  }
});

test('the shoseijutsu about page is an indexable standalone article', async ({ page }) => {
  await page.goto('/about/shoseijutsu');
  await expect(page).toHaveTitle('処世術とは｜意味・必要性・身につけ方をわかりやすく解説｜処世術禄');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /処世術とは、社会の中で人や状況とうまく関わり/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://app.shoseijutsuroku.com/about/shoseijutsu');
  await expect(page.getByRole('heading', { name: '処世術とは' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '処世術禄の五大原則' })).toBeVisible();
  await expect(page.getByText('語るな ／ 信じるな ／ 同一化するな')).toBeVisible();
  const jsonLd = await page.locator('script[data-seo-jsonld]').evaluate((element) => element.textContent ?? '');
  expect(jsonLd).toContain('BreadcrumbList');
  expect(jsonLd).toContain('Article');
  expect(jsonLd).toContain('DefinedTerm');
  await expect(page.getByRole('link', { name: /人間関係の処世術/ })).toHaveAttribute('href', '/interpersonal');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMetrics = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(mobileMetrics.scrollWidth).toBeLessThanOrEqual(mobileMetrics.innerWidth);
});

test('the retired legal about route redirects to the standalone article', async ({ page }) => {
  await page.goto('/legal/about');
  await expect(page).toHaveURL(/\/about\/shoseijutsu$/);
});

test('the retired catalog URL resolves to the canonical discover page', async ({ page }) => {
  await page.goto('/catalog');
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://app.shoseijutsuroku.com/discover');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index,follow/);
});

test('short numeric technique URLs redirect to their canonical detail page without hydration errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/card/master336-1');
  await expect(page).toHaveURL(/\/card\/master336-001$/);
  await expect(page.getByText('清潔感で足切りを超える', { exact: true }).first()).toBeVisible();

  await page.goto('/card/master336-999');
  await expect(page).toHaveURL(/\/\+not-found$/);
  await expect(page.getByText('ページが見つかりません', { exact: true }).first()).toBeVisible();
  expect(errors).not.toContainEqual(expect.stringContaining('Minified React error #418'));
});
