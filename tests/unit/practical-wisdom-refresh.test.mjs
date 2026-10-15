import './register-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditTheoryRights } from '../../scripts/theory-rights-contract.mjs';
const {validateTheoryForPublish}=await import('../../src/data/content-editor-schema.ts');
const catalog=await import('../../src/data/catalog.ts');
const {relationLabel}=await import('../../src/data/theory-knowledge.ts');
const {theoryNetworkPoints}=await import('../../src/data/theory-network-layout.ts');
const load=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url),'utf8'));
const retired=load('docs/content/retired-original-maxims-20261015.json');
const complete=load('src/data/generated/theories.json');
const shells=load('src/data/generated/theories.public.json');
const audit=load('docs/content/historical-maxims-audit-20261015.json');
const cards=load('src/data/generated/techniques.json').categories.flatMap(c=>c.subcategories.flatMap(p=>p.items));
const retiredIds=new Set(load('src/data/generated/retired-theory-ids.json'));
test('39 originals disappear without reusing stable IDs or leaving references',()=>{
 assert.equal(retired.length,39);assert.equal(retiredIds.size,39);assert.equal(complete.length,821);
 for(const t of [...complete,...shells]){
  assert.ok(!retiredIds.has(t.tagId));assert.notEqual(t.provenance?.status,'オリジナル');
  assert.ok(!(t.relatedTheoryIds??[]).some(id=>retiredIds.has(id)));
 }
 for(const t of cards)assert.ok(![...t.relatedTheoryIds,...t.primaryTheoryIds].some(id=>retiredIds.has(id)));
 assert.deepEqual(auditTheoryRights({theories:complete,techniques:cards,retiredIds:[...retiredIds]}),[]);
});
test('all fifty candidates have individual decisions and uncertain entries stay unpublished',()=>{
 assert.deepEqual(audit.map(a=>a.candidateId),Array.from({length:50},(_,i)=>String(i+1).padStart(2,'0')));
 assert.equal(audit.filter(a=>a.decision==='hold').length,31);
 for(const a of audit){
  for(const k of ['collectionUrl','author','reason','rightsReview','originalVerification','translationReview','duplicateReview'])assert.ok(a[k],a.candidateId+'/'+k);
  if(a.decision==='hold'){assert.equal(a.theoryId,null);continue;}
  const t=complete.find(t=>t.tagId===a.theoryId);assert.ok(t);
  assert.equal(t.quotation.originalText,a.originalText);assert.equal(t.quotation.translationText,a.displayText);
  assert.deepEqual(validateTheoryForPublish(t),[]);assert.match(t.summary,/—/);
 }
});
test('public shells never contain protected quotation bodies or private relation rationales',()=>{
 assert.deepEqual(shells.map(t=>t.tagId),complete.map(t=>t.tagId));
 for(const t of complete.filter(t=>t.accessTier==='complete')){
  const shell=shells.find(s=>s.tagId===t.tagId);assert.equal(shell.summary,'');assert.equal(shell.quotation,undefined);assert.equal(shell.provenance,undefined);
  if(t.quotation){assert.equal(shell.title,'「'+t.quotation.translationText+'」');assert.equal(t.subcategoryId,'classics-thought-f');}
 }
 const free=new Set(complete.filter(t=>t.accessTier==='free').map(t=>t.tagId));
 for(const r of load('src/data/generated/theory-relations.public.json'))assert.ok(free.has(r.sourceId)&&free.has(r.targetId));
});
test('stale paid hydration cannot resurrect archived IDs',()=>{
 const id=[...retiredIds][0];catalog.hydratePaidTheories([{tagId:id,title:'stale',summary:'stale'}]);
 assert.equal(catalog.theoryById.has(id),false);catalog.resetCatalog();
});

test('old offline quotation snapshots cannot restore paraphrased titles or the mixed proverb section',()=>{
 const t=complete.find(t=>t.tagId==='kb_595');
 try{catalog.hydratePaidTheories([{...t,title:'準備された心',subcategoryId:'classics-thought-p',subcategoryTitle:'ことわざ・格言',sortOrder:20}]);
 const restored=catalog.theoryById.get(t.tagId);assert.equal(restored.title,t.title);assert.equal(restored.subcategoryId,'classics-thought-f');assert.equal(restored.subcategoryTitle,'格言');assert.equal(restored.sortOrder,t.sortOrder);
 }finally{catalog.resetCatalog();}
});

test('CMS publishes the actual approved quotation headline and rejects invented paraphrases',()=>{
 const t=complete.find(t=>t.quotation);
 assert.deepEqual(validateTheoryForPublish(t),[]);
 assert.ok(validateTheoryForPublish({...t,title:'準備された心'}).some(e=>e.includes('見出し')));
});
test('all 803 retained theories have an editorial record and taxonomy remains six by thirty-six',()=>{
 assert.equal(load('docs/content/theory-editorial-review-20261015.json').length,803);
 assert.equal(new Set(complete.map(t=>t.categoryId)).size,6);
 assert.equal(load('src/data/generated/theory-subcategories.json').length,36);
 assert.equal(new Set(complete.map(t=>t.tagId)).size,821);
});
test('directed relationship labels reverse without implying evidentiary support for sayings',()=>{
 assert.equal(relationLabel({sourceId:'a',targetId:'b',type:'contains'},'a'),'構成要素');
 assert.equal(relationLabel({sourceId:'a',targetId:'b',type:'contains'},'b'),'上位の知識');
 const rows=load('src/data/generated/theory-relations.json');assert.equal(rows.length,574);
 assert.equal(rows.filter(r=>r.reviewStatus==='confirmed').length,128);
 assert.equal(rows.filter(r=>r.reviewStatus==='legacy').length,446);
 for(const r of rows){assert.notEqual(r.sourceId,r.targetId);assert.ok(complete.some(t=>t.tagId===r.sourceId));assert.ok(complete.some(t=>t.tagId===r.targetId));}
});
test('one through six graph nodes never overlap each other or the current theory at mobile widths',()=>{
 for(const width of [272,296,320,360,560])for(let count=1;count<=6;count++){
  const boxes=[{x:width/2-55,y:205,w:110,h:90},...theoryNetworkPoints(width,count).map(p=>({x:p.x-50,y:p.y-36,w:100,h:72}))];
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`${width}px / ${count} / ${i},${j}`);
  }
 }
});
