import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personalSyncItems, personalSyncChanges, newSyncJournal, queueSyncChanges, startSyncBatch, readSyncPage, applySyncPage, projectSyncState } from '../../src/state/personal-sync-model.ts';

const state = () => ({
  savedIds: [], savedTheoryIds: [], savedFeatureIds: [], reviewCaseIds: [],
  notes: {}, practiceRecords: {}, learningRecords: {}, libraryFolderByItem: {},
  personalMemos: [], personalMemoFolders: [], libraryFolders: [],
  personalPrinciple: '', learningUnlimited: false, interests: [], historyIds: [],
  featureHistoryIds: [], learningCurriculumVersion: 2,
});

test('a deletion is represented by a tombstone and unrelated items are not resent', () => {
  const before = state();
  before.savedIds = ['one', 'two'];
  before.notes = { one: 'private text' };
  const after = { ...before, savedIds: ['two'] };
  assert.deepEqual(personalSyncChanges(before, after), [
    { key: JSON.stringify(['savedIds', 'one']), value: null, deleted: true },
  ]);
});

test('keys remain distinct even when record identifiers contain delimiters', () => {
  const data = state();
  data.savedIds = ['a:b', 'a', '"b"'];
  const keys = personalSyncItems(data).map(item => item.key);
  assert.equal(keys.length, new Set(keys).size);
});

const key = (field, id) => JSON.stringify([field, id]);
const now = '2026-11-22T00:00:00.000Z';
const blankPage = { epoch: 1, cursor: 0, more: false, ack: 0, reset: false, items: [] };

test('the first login keeps legacy account edits offline, and a later epoch invalidates stale queues', () => {
  const old = { ...state(), savedIds: ['private'] };
  const journal = queueSyncChanges(newSyncJournal('a-device-id'), personalSyncChanges(state(), old));
  assert.equal(startSyncBatch(journal).flight, null);
  assert.deepEqual(projectSyncState(journal, state()).savedIds, ['private']);
  const initialized = applySyncPage(journal, { ...blankPage, reset: true }, now);
  assert.equal(startSyncBatch(initialized).flight.changes.length, 1);
  const reset = applySyncPage(initialized, { ...blankPage, epoch: 2, reset: true }, now);
  assert.deepEqual(reset.pending, {});
  assert.equal(reset.flight, null);
  assert.deepEqual(projectSyncState(reset, state()).savedIds, []);
  assert.throws(() => readSyncPage({}, initialized), /Invalid sync response/);
  assert.throws(() => readSyncPage({ ...blankPage, cursor: 3 }, initialized), /Incomplete sync response/);
});

test('an unacknowledged batch survives a process restart with its exact sequence and payload', () => {
  const previous = { ...newSyncJournal('a-device-id'), epoch: 1 };
  const entries = personalSyncChanges(state(), { ...state(), notes: { card: '端末に保存中' } });
  const sent = startSyncBatch(queueSyncChanges(previous, entries));
  const restored = JSON.parse(JSON.stringify(sent));
  assert.deepEqual(startSyncBatch(restored).flight, sent.flight);
  assert.throws(() => readSyncPage(blankPage, restored), /receipt/);
  const ack = readSyncPage({ ...blankPage, ack: 1, cursor: 1,
    items: [{ key: '[ "notes", "card" ]', value: '端末に保存中', revision: 1 }] }, restored);
  const newer = queueSyncChanges(restored, [{ key: key('notes', 'card'), value: '追加編集', deleted: false }]);
  const next = applySyncPage(newer, ack, now);
  assert.equal(next.sequence, 1);
  assert.equal(next.pending[key('notes', 'card')].base, 1);
  assert.equal(projectSyncState(next, state()).notes.card, '追加編集');
});

test('a new history entry sends one difference and merges another device’s history', () => {
  const previous = { ...state(), historyIds: ['older'] };
  const next = { ...previous, historyIds: ['new', 'older'] };
  assert.deepEqual(personalSyncChanges(previous, next, 10), [
    { key: key('historyIds', 'new'), value: 10000, deleted: false },
  ]);
  const journal = queueSyncChanges({ ...newSyncJournal('another-device'), epoch: 1 }, personalSyncChanges(state(), next, 10));
  const pulled = applySyncPage(journal, { ...blankPage, cursor: 1, items: [
    { key: key('historyIds', 'another'), revision: 1, value: 20000 },
  ] }, now);
  assert.deepEqual(projectSyncState(pulled, state()).historyIds, ['another', 'new', 'older']);
});
