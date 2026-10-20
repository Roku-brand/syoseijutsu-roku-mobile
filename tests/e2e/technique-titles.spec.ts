import { expect, test, type Locator } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/**', route => route.fulfill({ status: 503, json: {} }));
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 503, json: {} }));
});

async function fittedLines(title: Locator) {
  await expect.poll(() => title.evaluate(el => el.childElementCount)).toBeGreaterThan(0);
  return title.evaluate(el => {
    const box = el.getBoundingClientRect();
    const children = Array.from(el.children);
    return {
      text: el.textContent,
      fontSize: Number.parseFloat(getComputedStyle(el).fontSize),
      lines: children.map(child => child.textContent ?? ''),
      fits: children.every(child => {
        const range = document.createRange();
        range.selectNodeContents(child);
        const rect = range.getBoundingClientRect();
        return rect.left >= box.left - 1 && rect.right <= box.right + 1;
      }),
    };
  });
}

for (const width of [320, 390, 768, 1440]) {
  test(`${width}pxの処世術カードは1行を優先し、長いタイトルも全文を自然に表示する`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const examples = [
      ['001', '清潔感を意識する'],
      ['002', '表情・視線・姿勢・声を安定させる'],
      ['010', '親しみやすさと馴れ馴れしさは違う'],
      ['177', '報告は事実だけでなく、意見・対処案まで入れる'],
      ['255', '大事なことから時間を使わないと取り返しがつかなくなる'],
    ];
    for (const [id, text] of examples) {
      await page.goto(`/card/master336-${id}`);
      const title = page.getByTestId('technique-detail-title');
      await expect(title).toHaveAccessibleName(text);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await expect(async () => {
        const result = await fittedLines(title);
        expect(result.text).toBe(text);
        expect(result.fits).toBe(true);
        expect(result.fontSize).toBeGreaterThanOrEqual(20);
        if (id === '001' || width === 1440) expect(result.lines).toHaveLength(1);
        if (result.lines.length > 1) expect([...result.lines.at(-1)!].length).toBeGreaterThanOrEqual(3);
      }).toPass();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (id === '010' || id === '255') await page.screenshot({ path: test.info().outputPath(`technique-${id}-${width}.png`) });
    }
  });
}

test('処世術一覧と人物像のカードも、語尾を切らずに全文を表示する', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/techniques');
  const indexTitle = page.getByTestId('technique-index-title').nth(1);
  await expect(async () => {
    const result = await fittedLines(indexTitle);
    expect(result.text).toBe('表情・視線・姿勢・声を安定させる');
    expect(result.fits).toBe(true);
    expect(result.lines.at(-1)).not.toBe('せる');
    expect(result.fontSize).toBeGreaterThanOrEqual(14);
  }).toPass();
  await page.screenshot({ path: test.info().outputPath('technique-index-title-390.png') });
  await page.goto('/subcategory/interpersonal/印象がいい人');
  const personaTitle = page.getByTestId('persona-technique-title-2');
  await expect(async () => {
    const result = await fittedLines(personaTitle);
    expect(result.text).toBe('表情・視線・姿勢・声を安定させる');
    expect(result.fits).toBe(true);
  }).toPass();
});
