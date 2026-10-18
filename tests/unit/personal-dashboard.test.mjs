import test from 'node:test';
import assert from 'node:assert/strict';
import { latestPersonalMemos, personalMemoCopy, uniqueSavedIds } from '../../src/data/personal-dashboard.ts';

test('saved counts deduplicate IDs without modifying persisted records', () => {
  const ids = ['first', 'first', 'old-id', 'second'];
  assert.deepEqual(uniqueSavedIds(ids), ['first', 'old-id', 'second']);
  assert.equal(ids.length, 4);
});
test('latest memos use actual dates and retain every original record', () => {
  const memos = [{ id: 'old', createdAt: '1970-01-01T00:00:00Z' }, { id: 'recent', createdAt: '2026-10-18T00:00:00Z' }, { id: 'middle', createdAt: '2026-10-15T00:00:00Z' }];
  assert.deepEqual(latestPersonalMemos(memos).map(item => item.id), ['recent', 'middle', 'old']);
  assert.equal(memos[0].id, 'old');
});
test('titles and excerpts come only from the existing memo text', () => {
  assert.deepEqual(personalMemoCopy('一度立ち止まる\n焦ったときほど、確認する。'), { title: '一度立ち止まる', excerpt: '焦ったときほど、確認する。' });
  assert.deepEqual(personalMemoCopy('まず聞く。答えを急がない。'), { title: 'まず聞く。', excerpt: '答えを急がない。' });
  assert.deepEqual(personalMemoCopy('一呼吸おく'), { title: '一呼吸おく', excerpt: '' });
});
