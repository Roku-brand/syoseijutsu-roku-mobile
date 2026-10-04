import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
registerHooks({resolve(specifier,context,next){
 if(specifier==='@/data/persona-presentation') return {url:'data:text/javascript,export const getPersonaPresentation=()=>undefined;',shortCircuit:true};
 let url;
 if(specifier.startsWith('@/')) url=pathToFileURL(path.join(root,'src',specifier.slice(2)));
 else if(specifier.startsWith('./') || specifier.startsWith('../')) url=new URL(specifier,context.parentURL);
 if(url?.protocol==='file:'){
  let p=fileURLToPath(url);
  if(!path.extname(p)&&fs.existsSync(p+'.ts')){p+='.ts';url=pathToFileURL(p);}
  if(p.endsWith('.json'))return {url:'data:text/javascript,'+encodeURIComponent('export default '+fs.readFileSync(p,'utf8')),shortCircuit:true};
  if(fs.existsSync(p))return {url:url.href,shortCircuit:true};
 }
 return next(specifier,context);
}});
const taxonomy=await import('../../src/data/theory-taxonomy.ts');
const catalog=await import('../../src/data/catalog.ts');
const {getSearchResults}=await import('../../src/data/search-catalog.ts');
const before=JSON.parse(fs.readFileSync(path.join(root,'docs/content/theory-taxonomy-before.json'),'utf8'));
const after=JSON.parse(fs.readFileSync(path.join(root,'docs/content/theory-taxonomy-after.json'),'utf8'));
test('all 759 previous IDs resolve to 754 canonical cards and both directions of links agree',()=>{
 assert.equal(catalog.theories.length,754);
 for(const old of before)assert.equal(catalog.theoryById.get(old.id)?.tagId,taxonomy.resolveTheoryId(old.id));
 for(const theory of catalog.theories)for(const card of catalog.getTechniquesForTheory(theory.tagId))assert.ok(card.theoryTagIds.includes(theory.tagId));
});
test('saved IDs migrate once, deduplicate aliases, preserve unknown IDs and ignore malformed values',()=>{
 assert.deepEqual(taxonomy.resolveTheoryIds(['kb_418','kb_024','kb_001','kb_002','future',null,2]),['kb_024','kb_001','kb_002','future']);
 assert.deepEqual(taxonomy.resolveTheoryIds(taxonomy.resolveTheoryIds(['kb_418','kb_024'])),['kb_024']);
});
test('search covers all majors and aliases, with independent contrast and parent/child concepts',()=>{
 for(const id of ['kb_001','kb_002','kb_133','kb_134'])assert.ok(catalog.theoryById.get(id));
 for(const theory of after)assert.ok(getSearchResults(theory.title,true).theoryMatches.some(t=>t.tagId===theory.tagId),theory.title);
 for(const [alias,id] of [['能動的・建設的反応','kb_024'],['相対的剝奪','kb_566'],['HSM','kb_785']])assert.ok(getSearchResults(alias,true).theoryMatches.some(t=>t.tagId===id));
});
test('every card has one matching major and section, with dense pedagogical ordering',()=>{
 for(const s of taxonomy.theorySubcategories){
  const rows=catalog.theories.filter(t=>t.subcategoryId===s.id);
  assert.ok(rows.length>0);
  assert.ok(rows.every(t=>t.categoryId===s.categoryId));
  assert.deepEqual(rows.map(t=>t.sortOrder),rows.map((_,i)=>i+1));
 }
 assert.equal(catalog.theoryById.get('kb_001').subcategoryId,catalog.theoryById.get('kb_002').subcategoryId);
});
test('old paid cache cannot restore duplicate cards or overwrite revised classification',()=>{
 const card=catalog.theoryById.get('kb_016');
 catalog.hydratePaidTheories([{...card,status:undefined,subcategoryId:undefined,categoryId:'psychology',title:'old title',summary:'cached paid text'}, {...card,tagId:'kb_392',title:'duplicate'}]);
 assert.equal(catalog.theories.length,754);
 assert.equal(catalog.theoryById.get('kb_016').subcategoryId,card.subcategoryId);
 assert.equal(catalog.theoryById.get('kb_016').title,card.title);
 assert.equal(catalog.theoryById.get('kb_016').status,'published');
 assert.equal(catalog.theoryById.get('kb_392').tagId,'kb_016');
 catalog.resetCatalog();
});
