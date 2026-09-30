import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialAppState, restoreAppState, reduceAppState, LEARNING_CURRICULUM_VERSION } from '../../src/state/app-state-model.ts';

const restore = (value) => restoreAppState(value, (id) => id === 'known');

test('invalid storage fields cannot escape into the application state', () => {
  for (const value of [null, [], false, 'text', 5]) assert.deepEqual(restore(value), createInitialAppState());
  const state = restore({ interests: {}, savedIds: [1, 'a', 'a', null], historyIds: 'bad', notes: { a: 'note', b: 3 }, practiceRecords: { a: null }, personalPrinciple: {}, learningRecords: [], contentActivity: 'retired', futureField: 'unknown' });
  assert.deepEqual(state.savedIds, ['a']);
  assert.deepEqual(state.historyIds, []);
  assert.deepEqual(state.notes, { a: 'note' });
  assert.deepEqual(state.practiceRecords, {});
  assert.equal(state.personalPrinciple, createInitialAppState().personalPrinciple);
  assert.equal('contentActivity' in state, false);
  assert.equal('futureField' in state, false);
});

test('legacy memos migrate without losing text and orphaned folders are detached', () => {
  const state = restore({
    interests: ['owner-category'], savedTheoryIds: ['known', 'removed', 'known'],
    personalMemos: ['  legacy  ', '', { id: 'a', text: 'current', folderId: 'folder' }, { id: 'b', text: 'orphan', folderId: 'missing' }, { id: 'a', text: 'duplicate' }, null],
    personalMemoFolders: [{ id: 'folder', name: ' ' }, { id: 'folder', name: 'duplicate' }, null],
  });
  assert.deepEqual(state.interests, ['owner-category']);
  assert.deepEqual(state.savedTheoryIds, ['known']);
  assert.equal(state.personalMemos.length, 3);
  assert.equal(state.personalMemos[0].text, 'legacy');
  assert.equal(state.personalMemos[1].folderId, 'folder');
  assert.equal(state.personalMemos[2].folderId, null);
  assert.equal(state.personalMemoFolders.length, 1);
  assert.equal(state.personalMemoFolders[0].name, '無題のフォルダー');
});

test('learning version changes reset only learning records', () => {
  const payload = { savedIds: ['a'], personalPrinciple: '', learningRecords: { c: { choiceId: 'a', answeredAt: 'date' }, invalid: { choiceId: 'z' } } };
  assert.deepEqual(restore(payload).learningRecords, {});
  const state = restore({ ...payload, learningCurriculumVersion: LEARNING_CURRICULUM_VERSION });
  assert.deepEqual(state.savedIds, ['a']);
  assert.equal(state.personalPrinciple, '');
  assert.deepEqual(state.learningRecords, { c: { caseId: 'c', choiceId: 'a', answeredAt: 'date' } });
});

test('folder removal preserves memos and practice completion preserves the original plan date', () => {
  let state = createInitialAppState();
  for (const action of [
    { type: 'folder/add', id: 'f', name: 'folder', at: '1' },
    { type: 'memo/add', id: 'm', text: ' memo ', folderId: 'f', at: '2' },
    { type: 'practice/plan', cardId: 'a', at: '3' },
    { type: 'practice/complete', cardId: 'a', at: '4' },
    { type: 'folder/remove', id: 'f' },
  ]) state = reduceAppState(state, action);
  assert.deepEqual(state.personalMemoFolders, []);
  assert.deepEqual(state.personalMemos, [{ id: 'm', text: 'memo', folderId: null, createdAt: '2' }]);
  assert.deepEqual(state.practiceRecords.a, { cardId: 'a', status: 'tried', plannedAt: '3', triedAt: '4' });
});

test('history remains unique and bounded, interests cannot become empty', () => {
  let state = createInitialAppState();
  for (let i = 0; i < 110; i++) state = reduceAppState(state, { type: 'history/add', id: String(i) });
  state = reduceAppState(state, { type: 'history/add', id: '109' });
  assert.equal(state.historyIds.length, 100);
  assert.equal(new Set(state.historyIds).size, 100);
  state = reduceAppState(state, { type: 'interests/set', interests: ['work'] });
  state = reduceAppState(state, { type: 'interests/toggle', category: 'work' });
  assert.deepEqual(state.interests, ['work']);
});
