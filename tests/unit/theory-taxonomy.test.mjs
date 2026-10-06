import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
const {restoreLibraryFolders}=await import('../../src/state/library-folders.ts');
const {getHomeBrandContent}=await import('../../src/data/home-brand-content.ts');
const {getSearchResults}=await import('../../src/data/search-catalog.ts');
const before=JSON.parse(fs.readFileSync(path.join(root,'docs/content/theory-taxonomy-before.json'),'utf8'));
const after=JSON.parse(fs.readFileSync(path.join(root,'docs/content/theory-taxonomy-after.json'),'utf8'));
const scope=JSON.parse(fs.readFileSync(path.join(root,'src/data/content-scope.json'),'utf8'));
const current=JSON.parse(fs.readFileSync(path.join(root,'src/data/generated/theories.json'),'utf8'));

test('broad sections preserve all content and move techniques to their subject',()=>{
 const snapshot=JSON.parse(fs.readFileSync(path.join(root,'docs/content/theory-sections-20261007-before.json'),'utf8'));
 const text=[...current].sort((a,b)=>a.tagId.localeCompare(b.tagId,'en')).map(t=>`${t.tagId}:${t.title}:${t.summary}:${t.categoryId}`).join('|');
 assert.equal(createHash('md5').update(text).digest('hex'),snapshot.contentHash);
 assert.deepEqual(new Set(current.map(t=>t.tagId)),new Set(snapshot.assignments.map(t=>t.tagId)));
 assert.equal(taxonomy.theorySubcategories.length,33);
 assert.equal(catalog.theoryById.get('kb_024').subcategoryId,'psychology-i');
 assert.equal(catalog.theoryById.get('kb_901').subcategoryId,'psychology-e');
 assert.equal(taxonomy.resolveTheorySubcategoryId('psychology-d'),'psychology-s');
 assert.equal(taxonomy.resolveTheorySubcategoryId('behavioral-science-x'),'behavioral-science-d');
 assert.equal(taxonomy.resolveTheorySubcategoryId('future'),'future');
});

test('home counts canonical cards while legacy ID resolution remains available',()=>{
 assert.equal(getHomeBrandContent().counts.theories,catalog.theories.length);
 assert.ok(catalog.theoryById.size>catalog.theories.length);
});
test('library folder restoration canonicalizes legacy IDs and excludes invalid or unsaved links',()=>{
 const folders=[{id:'work',name:'  仕事  '},{id:'work',name:'重複'},{id:'empty',name:' '},null];
 const links={'theory:kb_392':'work','theory:kb_016':'work','technique:master336-001':'work','theory:unsaved':'work','theory:kb_001':'missing',invalid:'work'};
 const restored=restoreLibraryFolders(folders,links,['master336-001'],['kb_016','kb_001']);
 assert.deepEqual(restored.libraryFolders,[{id:'work',name:'仕事',createdAt:new Date(0).toISOString()}]);
 assert.deepEqual(restored.libraryFolderByItem,{'theory:kb_016':'work','technique:master336-001':'work'});
 assert.deepEqual(restoreLibraryFolders(undefined,undefined,[],[]),{libraryFolders:[],libraryFolderByItem:{}});
 assert.deepEqual(restoreLibraryFolders(restored.libraryFolders,restored.libraryFolderByItem,['master336-001'],['kb_016','kb_001']),restored);
});
test('all 759 historical IDs still resolve and both directions of links agree after additions',()=>{
 assert.equal(catalog.theories.length,scope.complete.theories);
 assert.ok(after.every(t=>catalog.theoryById.has(t.tagId)));
 for(const old of before)assert.equal(catalog.theoryById.get(old.id)?.tagId,taxonomy.resolveTheoryId(old.id));
 for(const theory of catalog.theories)for(const card of catalog.getTechniquesForTheory(theory.tagId))assert.ok(card.theoryTagIds.includes(theory.tagId));
});
test('saved IDs migrate once, deduplicate aliases, preserve unknown IDs and ignore malformed values',()=>{
 assert.deepEqual(taxonomy.resolveTheoryIds(['kb_418','kb_024','kb_001','kb_002','future',null,2]),['kb_024','kb_001','kb_002','future']);
 assert.deepEqual(taxonomy.resolveTheoryIds(taxonomy.resolveTheoryIds(['kb_418','kb_024'])),['kb_024']);
});
test('search covers all majors and aliases, with independent contrast and parent/child concepts',()=>{
 for(const id of ['kb_001','kb_002','kb_133','kb_134'])assert.ok(catalog.theoryById.get(id));
 for(const theory of current)assert.ok(getSearchResults(theory.title,true).theoryMatches.some(t=>t.tagId===theory.tagId),theory.title);
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
 assert.equal(catalog.theories.length,scope.complete.theories);
 assert.equal(catalog.theoryById.get('kb_016').subcategoryId,card.subcategoryId);
 assert.equal(catalog.theoryById.get('kb_016').title,card.title);
 assert.equal(catalog.theoryById.get('kb_016').status,'published');
 assert.equal(catalog.theoryById.get('kb_392').tagId,'kb_016');
 catalog.resetCatalog();
});
test('new complete-edition theories are searchable shells and hydrate without changing historical identities',()=>{
 const snapshot=JSON.parse(fs.readFileSync(path.join(root,'docs/content/theory-expansion-20261005-before.json'),'utf8'));
 const oldIds=new Set(snapshot.theories.map(t=>t.id));
 const additions=current.filter(t=>!oldIds.has(t.tagId));
 assert.equal(additions.length,40);
 for(const old of snapshot.theories.filter(t=>t.status==='published')) {
  const now=current.find(t=>t.tagId===old.id);
  for(const [sourceKey,cardKey] of [['title','title'],['summary','summary'],['display_id','displayId'],['category_id','categoryId'],['access_tier','accessTier']])assert.equal(now[cardKey],old[sourceKey],`${old.id}.${cardKey}`);
 }
 for(const t of additions) {
  const shell=catalog.theoryById.get(t.tagId);
  assert.equal(shell.summary,'');
  assert.equal(shell.provenance,undefined);
  assert.equal(shell.accessTier,'complete');
  assert.ok(t.provenance.sources.every(s=>s.url.startsWith('https://')));
  for(const alias of t.aliases)assert.ok(getSearchResults(alias,true).theoryMatches.some(x=>x.tagId===t.tagId),alias);
 }
 catalog.hydratePaidTheories(additions);
 for(const t of additions)assert.equal(catalog.theoryById.get(t.tagId).summary,t.summary);
 assert.equal(catalog.theories.length,scope.complete.theories);
 catalog.resetCatalog();
});
