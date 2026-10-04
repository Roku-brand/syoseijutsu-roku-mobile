import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTheoryForPublish } from '../../src/data/content-editor-schema.ts';
import { THEORY_CATEGORIES } from '../../src/data/theory-categories.ts';
import { originalPracticalWisdomProvenance } from '../../src/data/original-practical-wisdom.ts';
const valid = { tagId: 'test', title: '理論', summary: '概要', categoryId: 'psychology', categoryTitle: '心理学', subcategoryId: 'psychology-c', sortOrder: 1 };
test('blank summaries and titles cannot be published', () => {
 assert.equal(validateTheoryForPublish({ ...valid, title: ' ', summary: '\n' }).length, 2);
});
test('every available category satisfies the publish contract', () => {
 for (const { id: categoryId, label: categoryTitle } of THEORY_CATEGORIES) assert.deepEqual(validateTheoryForPublish({ ...valid, categoryId, categoryTitle, ...(categoryId === 'practical-wisdom' ? { title:'「今日から、また始めよう。」', provenance: originalPracticalWisdomProvenance() } : {}) }), []);
});
test('invalid categories, self references and incomplete sources are rejected', () => {
 assert.equal(validateTheoryForPublish({ ...valid, categoryId: '', relatedTheoryIds: ['test'], provenance: { status: '一部確認', sources: [{ title: '', url: 'javascript:alert(1)' }] } }).length, 3);
});
test('optional metadata is accepted and https sources are publishable', () => {
 assert.deepEqual(validateTheoryForPublish(valid), []);
 assert.deepEqual(validateTheoryForPublish({ ...valid, provenance: { status: '一部確認', sources: [{ title: '参考', url: 'https://example.com/paper' }] } }), []);
});
