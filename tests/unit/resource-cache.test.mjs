import test from 'node:test';
import assert from 'node:assert/strict';
import { createResourceCache, isFreshTimestamp } from '../../src/lib/resource-cache.ts';
import { createEventDeduplicator } from '../../src/lib/event-deduplication.ts';

function setup() {
  const disk = new Map();
  let time = 100, calls = 0;
  const storage = { getItem: async (key) => disk.get(key) ?? null, setItem: async (key, value) => { disk.set(key, value); } };
  const options = { key: 'catalog', storage, maxAgeMs: 60, now: () => time, validate: Array.isArray, fetch: async () => [++calls] };
  return { disk, options, advance: (value) => { time += value; }, calls: () => calls };
}

test('concurrent callers and reloads share one fetch, expiry and owner refresh obtain new data', async () => {
  const s = setup(), cache = createResourceCache(s.options);
  assert.deepEqual(await Promise.all([cache.get(), cache.get(), cache.get()]), [[1], [1], [1]]);
  assert.equal(s.calls(), 1);
  const reloaded = createResourceCache(s.options);
  assert.deepEqual(await reloaded.get(), [1]);
  assert.equal(s.calls(), 1);
  s.advance(60);
  assert.deepEqual(await reloaded.get(), [2]);
  assert.deepEqual(await reloaded.get(true), [3]);
  reloaded.invalidate();
  assert.deepEqual(await reloaded.get(), [4]);
});

test('a publish during an outstanding read fetches again after the old response', async () => {
  const s = setup();
  let resolve;
  const old = new Promise((yes) => { resolve = yes; });
  let calls = 0;
  const cache = createResourceCache({ ...s.options, fetch: async () => ++calls === 1 ? old : ['new'] });
  const initial = cache.get();
  const published = cache.get(true);
  await Promise.resolve();
  resolve(['old']);
  assert.deepEqual(await initial, ['old']);
  assert.deepEqual(await published, ['new']);
  assert.equal(calls, 2);
});

test('corrupt cache and network failures allow retry, storage errors do not lose fresh data', async () => {
  const s = setup();
  s.disk.set('catalog', '{broken');
  let fail = true;
  const cache = createResourceCache({ ...s.options, fetch: async () => { if (fail) throw new Error('offline'); return ['fresh']; } });
  await assert.rejects(cache.get(), /offline/);
  fail = false;
  assert.deepEqual(await cache.get(), ['fresh']);
  const blocked = createResourceCache({ ...s.options, storage: { getItem: async () => { throw new Error('blocked'); }, setItem: async () => { throw new Error('full'); } } });
  assert.deepEqual(await blocked.get(), [1]);
  assert.deepEqual(await blocked.get(), [1]);
  assert.equal(isFreshTimestamp(101, 60, 100), false);
  assert.equal(isFreshTimestamp(NaN, 60, 100), false);
});

test('view events deduplicate concurrently until the next UTC day; saves use 24 hours', async () => {
  let now = Date.parse('2026-10-01T23:59:59Z'), sends = 0;
  const record = createEventDeduplicator(async () => { sends++; }, () => now);
  await Promise.all([record('view/a', 'view'), record('view/a', 'view')]);
  await record('view/a', 'view');
  await record('save/a', 'save');
  assert.equal(sends, 2);
  now += 1000;
  await record('view/a', 'view');
  await record('save/a', 'save');
  assert.equal(sends, 3);
  now += 86_400_000;
  await record('save/a', 'save');
  assert.equal(sends, 4);
});

test('failed analytics can retry and different content has independent counters', async () => {
  let fail = true, sends = 0;
  const record = createEventDeduplicator(async () => { sends++; if (fail) throw new Error('offline'); });
  await assert.rejects(record('a', 'view'));
  fail = false;
  await record('a', 'view');
  await record('b', 'view');
  assert.equal(sends, 3);
});
