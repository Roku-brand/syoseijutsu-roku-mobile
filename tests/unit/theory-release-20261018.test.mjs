import './register-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {additions} from '../../scripts/theory-release-20261018-data.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const full=read('src/data/generated/theories.json');
const shells=read('src/data/generated/theories.public.json');
const release=read('docs/content/theory-release-20261018-changes.json');
const byId=new Map(full.map(t=>[t.tagId,t]));
const {validateTheoryForPublish}=await import('../../src/data/content-editor-schema.ts');
const {normalizeSearchText,scoreSearchDocument}=await import('../../src/data/search-ranking.ts');
const {getSearchResults}=await import('../../src/data/search-catalog.ts');
const catalog=await import('../../src/data/catalog.ts');

test('821 stable identities and original bodies survive, with only reviewed field changes',()=>{
  const before=read('docs/content/theory-release-20261018-snapshot.json')['src/data/generated/theories.json'];
  assert.equal(before.length,821);
  for(const old of before){const now=byId.get(old.tagId);assert.ok(now,old.tagId);
    for(const key of Object.keys(old).filter(k=>!['aliases','relatedTheoryIds','displayId','displayOrder','sortOrder'].includes(k)))assert.deepEqual(now[key],old[key],old.tagId+'/'+key);
    for(const id of old.relatedTheoryIds??[])assert.ok(now.relatedTheoryIds.includes(id));
  }
});

test('dated generator is reproducible, idempotent and refuses later CMS data edits',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'roku945-'));
  try{
    const files=['scripts/build-theory-release-20261018.mjs','scripts/theory-release-20261018-data.mjs','scripts/public-content-portfolio.mjs','src/data/content-scope.json','src/data/generated/theories.json','src/data/generated/theory-subcategories.json',...['snapshot','baseline','alias-review','changes'].map(name=>`docs/content/theory-release-20261018-${name}.json`)];
    for(const file of files){fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.copyFileSync(file,path.join(dir,file));}
    const snapshot=read('docs/content/theory-release-20261018-snapshot.json');
    for(const [file,value]of Object.entries(snapshot)){fs.mkdirSync(path.dirname(path.join(dir,file)),{recursive:true});fs.writeFileSync(path.join(dir,file),JSON.stringify(value));}
    const run=()=>execFileSync(process.execPath,['scripts/build-theory-release-20261018.mjs'],{cwd:dir,stdio:'pipe'});
    run();
    const after=JSON.parse(fs.readFileSync(path.join(dir,'docs/content/theory-release-20261018-changes.json'),'utf8'));
    const first=Object.fromEntries(Object.keys(after.artifactFingerprints).map(file=>[file,fs.readFileSync(path.join(dir,file),'utf8')]));
    run();for(const [file,value]of Object.entries(first))assert.equal(fs.readFileSync(path.join(dir,file),'utf8'),value);
    const file='src/data/generated/techniques.json',modified=JSON.parse(first[file]);modified.categories[0].subcategories[0].items[0].title+=' CMS edit';fs.writeFileSync(path.join(dir,file),JSON.stringify(modified));
    assert.throws(run,/Later editorial change/);
  }finally{
    assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('roku945-'));
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('release has exactly 124 distinct, sourced, editable cards in the six existing categories',()=>{
  assert.equal(full.length,945);assert.equal(byId.size,945);assert.equal(additions.length,124);
  assert.deepEqual(Object.fromEntries(Object.keys(release.categories).map(id=>[id,full.filter(t=>t.categoryId===id).length])),release.categories);
  const sections=read('src/data/generated/theory-subcategories.json');assert.equal(sections.length,36);
  const retired=new Set(read('src/data/generated/retired-theory-ids.json'));
  for(const row of release.additions){
    const t=byId.get(row.id);assert.ok(!retired.has(t.tagId));assert.ok(t.summary.length>=150,t.title);
    assert.deepEqual(validateTheoryForPublish(t),[],t.title);
    assert.ok(t.aliases.length && t.relatedTheoryIds.length && t.provenance.note,t.title);
    assert.ok(t.provenance.attribution && t.provenance.works.length);
    for(const source of t.provenance.sources)assert.equal(new URL(source.url).protocol,'https:');
    const shell=shells.find(x=>x.tagId===t.tagId);assert.equal(shell.status,'locked');assert.equal(shell.summary,'');assert.equal(shell.provenance,undefined);assert.equal(shell.quotation,undefined);
  }
  for(const t of full)for(const id of t.relatedTheoryIds??[])assert.ok(byId.has(id)&&id!==t.tagId,`${t.tagId}/${id}`);
  for(const category of Object.keys(release.categories))assert.deepEqual(full.filter(t=>t.categoryId===category).map(t=>t.displayId),Array.from({length:release.categories[category]},(_,i)=>i+1));
  for(const section of sections)assert.deepEqual(full.filter(t=>t.subcategoryId===section.id).map(t=>t.sortOrder),Array.from({length:full.filter(t=>t.subcategoryId===section.id).length},(_,i)=>i+1));
});

test('formal aliases are unique after normalization and unrelated concepts remain separate',()=>{
  const names=new Map();
  for(const t of full)for(const name of [t.title,...t.aliases??[]]){
    const key=normalizeSearchText(name);assert.ok(!names.has(key)||names.get(key)===t.tagId,`${name}/${t.tagId}`);names.set(key,t.tagId);
  }
  assert.ok(!byId.get('kb_003').aliases.some(a=>/horn|devil|ホーン/i.test(a)));
  for(const a of ['SDT','CLT','SIT','SCT'])assert.ok(!full.some(t=>t.aliases?.includes(a)));
  assert.ok(!byId.get('kb_134').aliases.includes('リスク回避'));
  assert.ok(!byId.get('kb_179').aliases.includes('選択アーキテクチャ'));
});

test('name and alias partial matches outrank related terms, with ambiguous abbreviations returning all candidates',()=>{
  assert.ok(scoreSearchDocument({knowledgeId:'a',title:'検証名'},'検証名')>scoreSearchDocument({knowledgeId:'b',title:'別の名',aliases:['検証名']},'検証名'));
  assert.ok(scoreSearchDocument({knowledgeId:'a',title:'検証名の説明'},'検証名')>scoreSearchDocument({knowledgeId:'b',title:'別の名',keywords:['検証名']},'検証名'));
  assert.equal(normalizeSearchText('Ｐｏｍｏｄｏｒｏ　Ｔｅｃｈｎｉｑｕｅ'),normalizeSearchText('pomodoro technique'));
  assert.equal(normalizeSearchText('クローズド・ループ'),normalizeSearchText('クローズドループ'));
  for(const [query,ids]of Object.entries(read('docs/content/theory-release-20261018-alias-review.json').ambiguous)){
    const results=getSearchResults(query,false).theoryMatches.map(t=>t.tagId);for(const id of ids)assert.ok(results.includes(id),query+'/'+id);
  }
});

test('every new public name and alias is findable, paid hydration supplies the same IDs and reset restores protection',()=>{
  for(const row of release.additions){const t=byId.get(row.id);for(const query of [t.title,...t.aliases])assert.equal(getSearchResults(query,false).theoryMatches[0]?.tagId,t.tagId,query);}
  try{
    catalog.hydratePaidTheories(full);
    for(const row of release.additions)assert.equal(catalog.theoryById.get(row.id).summary,byId.get(row.id).summary);
    assert.equal(catalog.theoryById.get('kb_392').tagId,'kb_016');
  }finally{catalog.resetCatalog();}
  for(const row of release.additions)assert.equal(catalog.theoryById.get(row.id).summary,'');
});

test('all source candidate rows have a decision and sparse applied links have an explicit review',()=>{
  const candidates=read('docs/content/theory-release-20261018-candidate-review.json');assert.equal(candidates.rows.length,180);assert.equal(candidates.additional.length,20);
  const aliases=read('docs/content/theory-release-20261018-alias-review.json');assert.equal(aliases.rows.length,535);
  assert.ok(aliases.rows.every(r=>r.decision&&r.reason));
  assert.equal(candidates.rows.filter(r=>r.decision==='replace').length,1);
  for(const link of release.techniqueChanges){assert.ok(link.reason);assert.ok(byId.has(link.theoryId));}
});
