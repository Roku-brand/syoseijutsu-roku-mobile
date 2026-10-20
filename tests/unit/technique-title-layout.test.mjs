import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { layoutTechniqueTitle } from '../../src/lib/technique-title-layout.ts';

const measure = (text, size) => [...text].reduce((sum, char) => sum + (/^[\x20-\x7e]$/.test(char) ? 0.6 : 1), 0) * size;

test('short titles fit one line without reducing the base size; moderate titles fit above the minimum', () => {
  assert.deepEqual(layoutTechniqueTitle('清潔感を意識する', 276, 34, 20, measure), { fontSize: 34, lines: ['清潔感を意識する'] });
  const title = '自分より相手に意識を向ける';
  const result = layoutTechniqueTitle(title, 276, 34, 20, measure);
  assert.deepEqual(result.lines, [title]);
  assert.ok(result.fontSize >= 20 && result.fontSize < 34);
  assert.ok(measure(title, result.fontSize) <= 274);
});

test('long titles use phrase boundaries rather than stranding verb endings or splitting a repeated word', () => {
  const result = layoutTechniqueTitle('親しみやすさと馴れ馴れしさは違う', 276, 34, 20, measure);
  assert.deepEqual(result.lines, ['親しみやすさと', '馴れ馴れしさは違う']);
  const list = layoutTechniqueTitle('表情・視線・姿勢・声を安定させる', 156, 17, 14, measure);
  assert.deepEqual(list.lines, ['表情・視線・姿勢・', '声を安定させる']);
});

test('all technique titles retain every character and fit each planned line at narrow and wide widths', () => {
  const source = JSON.parse(fs.readFileSync(new URL('../../src/data/generated/techniques.json', import.meta.url), 'utf8'));
  const titles = source.categories.flatMap(c => c.subcategories.flatMap(p => p.items));
  for (const { id, title } of titles) {
    for (const width of [156, 276, 346, 1226]) {
      const result = layoutTechniqueTitle(title, width, 34, 20, measure);
      assert.equal(result.lines.join(''), title, id);
      assert.ok(result.fontSize >= 20 && result.fontSize <= 34, id);
      for (const line of result.lines) {
        assert.ok(measure(line, result.fontSize) <= width - 2, `${id}: line exceeds ${width}px`);
        assert.ok(!/^[、。，．！？・）］｝」』]/.test(line), id);
      }
    }
  }
});

test('fallback segmentation preserves Unicode titles and still wraps without clipping', () => {
  const segmenter = Intl.Segmenter;
  try {
    Intl.Segmenter = undefined;
    const title = '小さな頼み事で相手を巻き込む';
    const result = layoutTechniqueTitle(title, 156, 21, 14, measure);
    assert.equal(result.lines.join(''), title);
    for (const line of result.lines) assert.ok(measure(line, result.fontSize) <= 154);
  } finally { Intl.Segmenter = segmenter; }
});
