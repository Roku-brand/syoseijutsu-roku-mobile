import { expect, test } from '@playwright/test';
import fs from 'node:fs';

const storageKey = '@shoseijutsu-roku/discovery-deck/v1/free';
const source = JSON.parse(fs.readFileSync('src/data/generated/techniques.json', 'utf8'));
const techniques = source.categories.flatMap((category: any) => category.subcategories.flatMap((persona: any) => persona.items));
const selectedIds = ['master336-001', 'master336-006', 'master336-002', 'master336-010'];
const selected = selectedIds.map(id => techniques.find((card: any) => card.id === id));
const theory = JSON.parse(fs.readFileSync('src/data/generated/theories.json', 'utf8')).find((card: any) => card.tagId === 'kb_001');

for (const width of [320, 375, 390, 430, 1440]) {
  test(`デッキの題名は1行を優先し、長い場合も文字を欠かさず折り返す (${width}px)`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 950 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/rest/v1/**', async route => {
      const table = new URL(route.request().url()).pathname.split('/').at(-1);
      const rows = table === 'public_techniques' ? selected.map((card: any, index: number) => ({ id: card.id, title: card.title, essence: card.essence, explanation: card.explanation, category: 'interpersonal', persona_id: null, status: 'published', access_tier: 'free', display_order: index }))
        : table === 'public_theories' ? [{ id: theory.tagId, title: theory.title, summary: theory.summary, category_id: theory.categoryId, category_title: theory.categoryTitle, status: 'published', access_tier: 'free' }]
          : table === 'content_revision' ? { revision: 'deck-title-layout' } : [];
      await route.fulfill({ json: rows });
    });
    const order = [...selectedIds.map(id => `technique:${id}`), `theory:${theory.tagId}`];
    await page.addInitScript(({ key, order }) => {
      const day = Math.floor((Date.now() + 9 * 3600000) / 86400000);
      localStorage.setItem(key, JSON.stringify({ day, round: 0, order, cursor: 0, seen: [], filter: 'all' }));
    }, { key: storageKey, order });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    for (const [index, card] of [...selected, theory].entries()) {
      const title = page.getByTestId('home-deck-title');
      await expect(title).toHaveAttribute('aria-label', card.title);
      // Font measurement runs after layout and after the actual font is ready.
      await expect.poll(() => title.locator(':scope > span').count()).toBeGreaterThan(0);
      const text = await title.evaluate(node => {
        const style = getComputedStyle(node);
        const lines = Array.from(node.children).map(child => child.textContent ?? '');
        const context = document.createElement('canvas').getContext('2d')!;
        context.font = `${style.fontWeight} 16px ${style.fontFamily}`;
        const original = node.getAttribute('aria-label')!;
        const oneLineWidth = context.measureText(original).width + Math.max(0, [...original].length - 1) * parseFloat(style.letterSpacing);
        return { lines, size: parseFloat(style.fontSize), oneLineWidth, width: node.clientWidth,
          overflow: Array.from(node.children).some(child => child.scrollWidth > child.clientWidth + 1) };
      });
      expect(text.lines.join('')).toBe(card.title);
      expect(text.size).toBeGreaterThanOrEqual(16);
      expect(text.size).toBeLessThanOrEqual(24);
      expect(text.overflow).toBe(false);
      if (text.oneLineWidth <= text.width - 2) expect(text.lines).toHaveLength(1);
      if (text.lines.length > 1) {
        expect(text.lines.every(line => !/^[、。，．！？・）］｝」』]/.test(line))).toBe(true);
        expect(text.lines.at(-1)!.length).toBeGreaterThan(2);
      }
      if (index === 0 || index === 3) {
        await page.getByTestId('home-deck-next').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `release-evidence/home-title/${width}-${index === 0 ? 'single' : 'long'}.png` });
      }
      await page.getByTestId('home-deck-next').click();
      await expect(page.getByTestId('home-recommendation-deck')).toHaveAttribute('aria-busy', 'false');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
