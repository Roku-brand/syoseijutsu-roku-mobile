import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTheoryForPublish, theoryCategories } from '../../src/data/content-editor-schema.ts';
const valid = { tagId: 'test', title: '理論', summary: '概要', categoryId: 'psychology', categoryTitle: '心理学' };
test('blank summaries and titles cannot be published', () => {
 assert.equal(validateTheoryForPublish({ ...valid, title: ' ', summary: '\n' }).length, 2);
});
test('every available category satisfies the publish contract', () => {
 for (const [categoryId, categoryTitle] of theoryCategories) assert.deepEqual(validateTheoryForPublish({ ...valid, categoryId, categoryTitle }), []);
});
test('invalid categories, self references and incomplete sources are rejected', () => {
 assert.equal(validateTheoryForPublish({ ...valid, categoryId: 'unknown', relatedTheoryIds: ['test'], provenance: { status: '一部確認', sources: [{ title: '', url: 'javascript:alert(1)' }] } }).length, 3);
});
test('optional metadata is accepted and https sources are publishable', () => {
 assert.deepEqual(validateTheoryForPublish(valid), []);
 assert.deepEqual(validateTheoryForPublish({ ...valid, provenance: { status: '一部確認', sources: [{ title: '参考', url: 'https://example.com/paper' }] } }), []);
});
