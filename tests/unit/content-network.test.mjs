import './register-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const review=read('docs/content/content-network-review-20261016.json');
const theories=read('src/data/generated/theories.json');
const cards=read('src/data/generated/techniques.json').categories.flatMap(c=>c.subcategories.flatMap(p=>p.items));
const sha=s=>createHash('sha256').update(s).digest('hex');

test('all 356 reviewed mechanisms match canonical text, stable IDs and exact grouped links',()=>{
 assert.equal(review.techniques.length,356);assert.equal(new Set(review.techniques.map(t=>t.id)).size,356);
 for(const r of review.techniques){const t=cards.find(t=>t.id===r.id);assert.ok(t);assert.equal(r.core,t.essence);assert.equal(sha(t.title+'|'+t.essence+'|'+t.explanation),review.sourceHashes.techniques[t.id]);assert.deepEqual(t.primaryTheoryIds,r.primary);assert.deepEqual(t.relatedTheoryIds,[...r.primary,...r.supplementary,...read('docs/content/theory-release-20261018-changes.json').techniqueChanges.filter(x=>x.techniqueId===t.id).map(x=>x.theoryId)]);assert.equal(new Set(t.relatedTheoryIds).size,t.relatedTheoryIds.length);assert.ok(r.rationale);for(const id of t.relatedTheoryIds)assert.ok(theories.some(t=>t.tagId===id));for(const id of r.primary)assert.ok(!theories.find(t=>t.tagId===id).quotation);}
});
test('known mismatches are replaced by the actual mechanism, not a thematic keyword',()=>{
 const ids=n=>cards.find(t=>t.id==='master336-'+n).relatedTheoryIds;
 assert.ok(ids('079').includes('kb_856'));assert.ok(!ids('079').includes('kb_246'));
 assert.ok(ids('310').includes('kb_709'));assert.ok(!ids('310').includes('kb_951'));
 assert.ok(!ids('068').includes('kb_917'));assert.ok(!ids('205').includes('kb_857'));assert.ok(ids('205').length<=4);
 assert.deepEqual(cards.find(t=>t.id==='master336-334').primaryTheoryIds,['kb_519','kb_571']);
});
test('six features have explicit valid links and five intentionally reciprocal article pairs',()=>{
 assert.equal(review.features.length,6);assert.equal(review.featurePairs.length,5);
 const existing=read('tests/fixtures/content-network-features.json');
 for(const f of review.features){const source=existing.find(x=>x.id===f.id);assert.equal(sha(source.title+'|'+source.lead+'|'+source.body),review.sourceHashes.features[f.id]);assert.ok(f.rationale);assert.ok(f.techniqueIds.length);assert.ok(f.theoryIds.length);for(const id of f.techniqueIds)assert.ok(cards.some(t=>t.id===id));for(const id of f.theoryIds)assert.ok(theories.some(t=>t.tagId===id));for(const id of f.featureIds){assert.notEqual(id,f.id);assert.ok(review.features.find(x=>x.id===id).featureIds.includes(f.id));}}
 assert.ok(review.features.find(f=>f.title.includes('年齢')).theoryIds.includes('kb_909'));
 assert.ok(!review.features.find(f=>f.title.includes('ティルト')).theoryIds.includes('kb_205'));
});
test('related techniques require an actual shared knowledge link, never category alone',async()=>{
 const catalog=await import('../../src/data/catalog.ts');
 const source=catalog.techniqueById.get('master336-001');
 const related=catalog.getRelatedCards(source,20);assert.ok(related.length);
 for(const t of related){assert.notEqual(t.id,source.id);assert.notEqual(t.status,'locked');assert.ok(t.theoryTagIds.some(id=>source.theoryTagIds.includes(id)));}
 assert.deepEqual(catalog.getRelatedCards({...source,theoryTagIds:[],primaryTheoryIds:[]},20),[]);
});
