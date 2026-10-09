import test from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { createStatePersistence } from '../../src/state/state-persistence.ts';
import { createInitialAppState, restoreAppState, reduceAppState } from '../../src/state/app-state-model.ts';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup(overrides = {}) {
  const writes = [], errors = [];
  const storage = {
    getItem: async () => null,
    setItem: async (_, value) => { writes.push(JSON.parse(value)); },
    removeItem: async () => { writes.push('removed'); },
    ...overrides,
  };
  const controller = createStatePersistence({ storage, key: 'test', initialState: createInitialAppState, restore: (value) => restoreAppState(value, () => true), reduce: reduceAppState, onError: (operation) => errors.push(operation) });
  return { controller, writes, errors };
}

test('slow storage releases the UI without overwriting saved data, then replays edits', async () => {
  const read = deferred();
  const { controller, writes } = setup({ getItem: () => read.promise });
  controller.start(1);
  await delay(10);
  assert.equal(controller.getSnapshot().hydrated, true);
  controller.dispatch({ type: 'memo/add', id: 'new', text: 'new memo', folderId: null, at: 'today' });
  controller.dispatch({ type: 'note/save', id: 'new-note', note: 'edited during load' });
  assert.deepEqual(writes, []);
  read.resolve(JSON.stringify({ savedIds: ['saved'], notes: { old: 'old note' }, personalMemos: ['old memo'] }));
  await delay(0);
  await controller.flush();
  const state = controller.getSnapshot().state;
  assert.deepEqual(state.savedIds, ['saved']);
  assert.deepEqual(state.notes, { old: 'old note', 'new-note': 'edited during load' });
  assert.deepEqual(state.personalMemos.map((memo) => memo.text), ['new memo', 'old memo']);
  assert.deepEqual(writes, [state]);
});

test('normalized restoration is saved only after a successful read and not rewritten on the next load', async () => {
  const read = deferred(), writes = [];
  const storage = { getItem: () => read.promise, setItem: async (_, value) => { writes.push(value); }, removeItem: async () => {} };
  const options = { storage, key: 'migration', initialState: createInitialAppState, restore: value => restoreAppState(value, () => true), reduce: reduceAppState, persistRestoredState: true, onError: () => {} };
  const controller = createStatePersistence(options);
  controller.start(1);
  await delay(10);
  assert.deepEqual(writes, []);
  read.resolve(JSON.stringify({ savedIds: ['keep'], notes: { keep: 'preserved' } }));
  await delay(0);
  await controller.flush();
  assert.equal(writes.length, 1);
  assert.deepEqual(JSON.parse(writes[0]).savedIds, ['keep']);
  assert.deepEqual(JSON.parse(writes[0]).notes, { keep: 'preserved' });
  storage.getItem = async () => writes[0];
  const reloaded = createStatePersistence(options);
  reloaded.start();
  await delay(0);
  await reloaded.flush();
  assert.equal(writes.length, 1);
});

test('corrupt JSON and read failures preserve the original storage until explicit clear', async () => {
  for (const getItem of [async () => '{broken', async () => { throw new Error('storage blocked'); }]) {
    const { controller, writes, errors } = setup({ getItem });
    controller.start();
    await delay(0);
    controller.dispatch({ type: 'note/save', id: 'a', note: 'session only' });
    await controller.flush();
    assert.equal(controller.getSnapshot().hydrated, true);
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, ['read']);
    await controller.clear();
    controller.dispatch({ type: 'note/save', id: 'b', note: 'after clear' });
    await controller.flush();
    assert.equal(writes[0], 'removed');
    assert.deepEqual(writes[1].notes, { b: 'after clear' });
  }
});

test('saving during hydration does not unsave an item already present in storage', async () => {
  const read = deferred();
  const { controller } = setup({ getItem: () => read.promise });
  controller.start();
  controller.dispatch({ type: 'saved/set', id: 'a', saved: true });
  read.resolve(JSON.stringify({ savedIds: ['a', 'b'] }));
  await delay(0);
  await controller.flush();
  assert.deepEqual(controller.getSnapshot().state.savedIds, ['a', 'b']);
});

test('clear supersedes a pending read and does not resurrect personal data', async () => {
  const read = deferred();
  const { controller, writes } = setup({ getItem: () => read.promise });
  controller.start();
  controller.dispatch({ type: 'note/save', id: 'a', note: 'before clear' });
  await controller.clear();
  controller.dispatch({ type: 'note/save', id: 'b', note: 'after clear' });
  read.resolve(JSON.stringify({ savedIds: ['old'], notes: { old: 'old note' } }));
  await delay(0);
  await controller.flush();
  assert.deepEqual(controller.getSnapshot().state.savedIds, []);
  assert.deepEqual(controller.getSnapshot().state.notes, { b: 'after clear' });
  assert.equal(writes[0], 'removed');
});

test('writes and clear execute in order, failed writes do not block subsequent writes', async () => {
  const first = deferred();
  const operations = [];
  let calls = 0;
  const { controller, errors } = setup({
    setItem: async (_, value) => {
      operations.push(JSON.parse(value).personalPrinciple);
      if (++calls === 1) await first.promise;
    },
    removeItem: async () => { operations.push('removed'); },
  });
  controller.start();
  await delay(0);
  controller.dispatch({ type: 'principle/set', text: 'first' });
  controller.dispatch({ type: 'principle/set', text: 'second' });
  const clearing = controller.clear();
  controller.dispatch({ type: 'principle/set', text: 'third' });
  await delay(0);
  assert.deepEqual(operations, ['first']);
  first.reject(new Error('quota exceeded'));
  await clearing;
  await controller.flush();
  assert.deepEqual(operations, ['first', 'second', 'removed', 'third']);
  assert.deepEqual(errors, ['write']);
});

test('subscriptions can detach and restart without duplicate reads', async () => {
  let reads = 0, updates = 0;
  const { controller } = setup({ getItem: async () => { reads++; return null; } });
  const unsubscribe = controller.subscribe(() => updates++);
  controller.start();
  unsubscribe();
  controller.start();
  await delay(0);
  assert.equal(reads, 1);
  assert.equal(updates, 0);
  const detach = controller.subscribe(() => updates++);
  controller.dispatch({ type: 'principle/set', text: 'updated' });
  assert.equal(updates, 1);
  detach();
  await controller.flush();
});

test('clear failures are surfaced to callers without an unhandled rejection', async () => {
  const { controller, errors } = setup({ removeItem: async () => { throw new Error('blocked'); } });
  await assert.rejects(controller.clear(), /blocked/);
  await controller.flush();
  assert.deepEqual(errors, ['clear']);
});
