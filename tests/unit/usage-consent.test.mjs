import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function fixture(root = '.') {
  const disk = new Map(), sent = [];
  const storage = { getItem: async key => disk.get(key) ?? null, setItem: async (key, value) => { disk.set(key, value); }, removeItem: async key => { disk.delete(key); } };
  const cache = new Map();
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const source = fs.readFileSync(`${root}/src/lib/${name}.ts`, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    vm.runInNewContext(code, { exports, Date, Math, Map, Promise, JSON, crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' }, require(specifier) {
      if (specifier === '@react-native-async-storage/async-storage') return { __esModule: true, default: storage };
      if (specifier === './supabase') return { supabase: { rpc: async (...args) => { sent.push(args); return { error: null }; } } };
      return load(specifier.replace('./', ''));
    } });
    cache.set(name, exports); return exports;
  }
  return { disk, sent, storage, consent: load('usage-consent'), events: load('content-events') };
}

test('missing or malformed consent never creates an identifier or sends an event', async () => {
  const s = fixture();
  await s.events.recordContentEvent('technique', 'case', 'view');
  s.disk.set(s.consent.USAGE_CONSENT_KEY, 'true');
  await s.events.recordContentEvent('theory', 'theory', 'save');
  assert.equal(s.sent.length, 0); assert.equal(s.disk.has(s.consent.ANALYTICS_ACTOR_KEY), false);
});
test('explicit consent sends actual item identifiers; withdrawal stops new events and erases the local identifier', async () => {
  const s = fixture(); await s.consent.setUsageSharingEnabled(true);
  await s.events.recordContentEvent('technique', 'actual-card', 'view');
  assert.equal(s.sent.length, 1); assert.equal(s.sent[0][1].p_content_id, 'actual-card');
  await s.consent.setUsageSharingEnabled(false);
  await s.events.recordContentEvent('theory', 'another-card', 'view');
  assert.equal(s.sent.length, 1); assert.equal(s.disk.has(s.consent.ANALYTICS_ACTOR_KEY), false);
});
test('unavailable local storage fails closed without blocking reading', async () => {
  const s = fixture(); s.storage.getItem = async () => { throw new Error('storage denied'); };
  assert.equal(await s.consent.isUsageSharingEnabled(), false);
  await s.events.recordContentEvent('technique', 'actual-card', 'view');
  assert.equal(s.sent.length, 0);
});
test('withdrawal during identifier retrieval is respected before sending', async () => {
  const s = fixture(); await s.consent.setUsageSharingEnabled(true);
  const original = s.storage.getItem;
  s.storage.getItem = async key => { if (key === s.consent.ANALYTICS_ACTOR_KEY) await s.consent.setUsageSharingEnabled(false); return original(key); };
  await s.events.recordContentEvent('technique', 'actual-card', 'view');
  assert.equal(s.sent.length, 0); assert.equal(s.disk.has(s.consent.ANALYTICS_ACTOR_KEY), false);
});
