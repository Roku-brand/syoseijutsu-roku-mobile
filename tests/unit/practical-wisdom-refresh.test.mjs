import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditTheoryRights } from '../../scripts/theory-rights-contract.mjs';
import { originalPracticalWisdomProvenance } from '../../src/data/original-practical-wisdom.ts';
import { validateTheoryForPublish } from '../../src/data/content-editor-schema.ts';
import { isPublicCatalogIdentityField } from '../../scripts/public-catalog-identity.mjs';

const load = (path) => JSON.parse(fs.readFileSync(new URL('../../' + path, import.meta.url), 'utf8'));
const originals = load('docs/content/practical-wisdom-originals.json');
const old = load('docs/content/practical-wisdom-retired-20261002.json');
const complete = load('src/data/generated/theories.json');
const shells = load('src/data/generated/theories.public.json');
const requestedTitles = fs.readFileSync(new URL('../../docs/content/practical-wisdom-requested-titles.txt', import.meta.url), 'utf8').trim().split(/\r?\n/);

test('public UUID relation fields are metadata; summaries, titles and source text remain protected', () => {
  for (const field of ['id','tagId','relatedTheoryIds[2]','primaryTheoryIds[0]','theoryTagIds[3]']) assert.equal(isPublicCatalogIdentityField(`technique:test.${field}`),true);
  for (const field of ['summary','title','explanation','memo','provenance.note','provenance.sources[0].url','relatedTheoryIdsExtra']) assert.equal(isPublicCatalogIdentityField(`theory:test.${field}`),false);
});

test('replacement is exactly the 39 requested titles and new stable identities', () => {
  const practical = complete.filter((item) => item.provenance?.status === 'オリジナル').sort((a,b) => a.displayId-b.displayId);
  assert.equal(practical.length, 39);
  assert.deepEqual(practical.map((item) => item.title), requestedTitles);
  assert.deepEqual(practical.map((item) => item.displayId), Array.from({ length: 39 }, (_,i) => i+1));
  for (const item of practical) {
    assert.ok(!old.some((retired) => retired.tagId === item.tagId));
    assert.deepEqual(item.provenance, originalPracticalWisdomProvenance());
    assert.equal(item.summary.split('。').filter(Boolean).length <= 3, true);
    assert.deepEqual(validateTheoryForPublish(item), []);
  }
});

test('public identities match complete edition without exposing paid summaries', () => {
  assert.deepEqual(shells.map(({tagId,title,categoryId,displayId}) => ({tagId,title,categoryId,displayId})), complete.map(({tagId,title,categoryId,displayId}) => ({tagId,title,categoryId,displayId})));
  for (const item of originals) {
    const shell = shells.find((row) => row.tagId === item.tagId);
    assert.deepEqual(shell.provenance, item.provenance);
    assert.equal(shell.summary, item.accessTier === 'free' ? item.summary : '');
  }
});

test('rights contract accepts a future 40th item and rejects provenance, sequence, identity, or dead-link errors', () => {
  const base = originals.map(({relatedTechniqueIds, ...item}) => item);
  const forty = [...base, {...base[0],tagId:'future-original',displayId:40,title:'「明日には、明日の風がある。」'}];
  assert.deepEqual(auditTheoryRights({theories:forty}), []);
  for (const patch of [{title:'引用'}, {displayId:41}, {tagId:base[0].tagId}, {provenance:{status:'書誌確認済み'}}, {relatedTheoryIds:['deleted']}]) {
    assert.ok(auditTheoryRights({theories:[...base,{...forty[39],...patch}]}).length > 0);
  }
  assert.ok(validateTheoryForPublish({...base[0],provenance:{...base[0].provenance,sources:[{title:'引用',url:'https://example.com'}]}}).length > 0);
});

test('every technique link is alive and the new semantic choices are exact, including intentionally unlinked originals', () => {
  const catalog = load('src/data/generated/techniques.json');
  const cards = catalog.categories.flatMap((c) => c.subcategories.flatMap((p) => p.items));
  assert.deepEqual(auditTheoryRights({theories:complete,techniques:cards,retiredIds:old.map((item) => item.tagId)}), []);
  for (const original of originals) {
    assert.deepEqual(cards.filter((card) => card.relatedTheoryIds?.includes(original.tagId)).map((card) => card.id).sort(), original.relatedTechniqueIds.slice().sort());
  }
  assert.ok(originals.some((item) => !item.relatedTechniqueIds.length));
});
