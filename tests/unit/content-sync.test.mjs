import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Resolve only the app's platform dependencies. The hydration modules under
// test are loaded unchanged, including their storage and request ordering.
let fixture;
globalThis.__contentSync = {};
const modules = {
  '@react-native-async-storage/async-storage': 'export default {getItem:(...args)=>globalThis.__contentSync.storage.getItem(...args),setItem:(...args)=>globalThis.__contentSync.storage.setItem(...args),removeItem:(...args)=>globalThis.__contentSync.storage.removeItem(...args)};',
  '@/lib/supabase': 'export const supabase={auth:{getSession:(...args)=>globalThis.__contentSync.supabase.auth.getSession(...args)},from:(...args)=>globalThis.__contentSync.supabase.from(...args)}; export const supabaseUrl="https://example.test"; export const supabasePublishableKey="public-key";',
  '@/data/catalog': ['applyManagedCategories','hydratePaidCatalog','reconcilePublishedStructure','hydratePaidTheories','overlayPaidCatalog','resetCatalog'].map((name) => `export const ${name}=(...args)=>globalThis.__contentSync.${name}(...args);`).join('') + 'export const categoryOrder=[]; export const theories=globalThis.__contentSync.theories; export const techniqueById=globalThis.__contentSync.techniqueById;',
  '@/access/access-config': 'export const hydrateContentAccessScope=()=>{};',
  '@/data/persona-presentation': 'export const hydratePersonaPresentations=()=>{};',
  '@/data/theory-display': 'export const isLockedTheoryShell=(item)=>item.status==="locked";',
  '@/data/theory-taxonomy': 'export const applyTheorySubcategories=(rows)=>{globalThis.__contentSync.subcategories=rows;};',
  '@/data/learning': 'export const learningCases=[]; export const replaceLearningCases=()=>{}; export const resetLearningCases=()=>{};',
};
registerHooks({ resolve(specifier, context, next) {
  const mapped = specifier === './supabase' ? '@/lib/supabase' : specifier;
  if (modules[mapped]) return { url: `data:text/javascript,${encodeURIComponent(modules[mapped])}`, shortCircuit: true };
  if (specifier === './resource-cache') return next(new URL('../../src/lib/resource-cache.ts', import.meta.url).href, context);
  return next(specifier, context);
} });

function setup() {
  const disk = new Map(), queries = [], applied = [];
  const tables = {
    techniques: [{ id:'free', access_tier:'free', title:'無料', explanation:'無料本文', persona_id:'p', category:'c' }, { id:'paid', access_tier:'complete', title:'有料', explanation:'PRIVATE', persona_id:'p', category:'c' }],
    theories: [{ id:'theory', access_tier:'complete', title:'理論名', summary:'PRIVATE', category_id:'c', category_title:'カテゴリ' }],
    personas: [{ name:'p', category:'c', access_tier:'free' }], content_categories: [], theory_subcategories: [{id:'section',category_id:'c',title:'分類',display_order:1}],
  };
  fixture = {
    disk, queries, applied, theories:[], techniqueById:new Map(),
    storage: { getItem:async (key)=>disk.get(key)??null, setItem:async(key,value)=>{disk.set(key,value);}, removeItem:async(key)=>{disk.delete(key);} },
    supabase: { auth:{getSession:async()=>({data:{session:{user:{id:'user'}, access_token:'token'}}})}, from(table) {
      let columns, tier;
      const query = { select(value){columns=value;return query;}, eq(key,value){if(key==='access_tier') tier=value;return query;}, order(){return query;}, range(){return Promise.resolve(query);}, then(resolve,reject) {
        queries.push({table:table.replace(/^public_/,''),columns,tier});
        const data = tables[table.replace(/^public_/,'')].filter(row=>!tier||row.access_tier===tier).map(row=>Object.fromEntries(columns.split(',').map(key=>[key,row[key]])));
        return Promise.resolve({data,error:null}).then(resolve,reject);
      } }; return query;
    } },
    applyManagedCategories(){}, reconcilePublishedStructure(){},
    hydratePaidCatalog(techniques,theories){fixture.applied.push({techniques,theories});},
    hydratePaidTheories(){}, overlayPaidCatalog(techniques,theories){fixture.applied.push({techniques,theories});}, resetCatalog(){},
  };
  globalThis.__contentSync = fixture;
  return fixture;
}
let moduleId = 0;
const load = (name) => import(new URL(`../../src/lib/${name}.ts?case=${++moduleId}`, import.meta.url));

test('public sync omits paid bodies, shares requests, survives reload and preserves resolved paid cards', async () => {
  const s=setup(), api=await load('published-content');
  assert.deepEqual(await Promise.all([api.hydratePublishedContent(),api.hydratePublishedContent()]),[true,true]);
  assert.equal(s.queries.length,7);
  assert.deepEqual(s.subcategories,[{id:'section',categoryId:'c',title:'分類',displayOrder:1}]);
  for(const query of s.queries.filter(item=>item.tier==='complete')) assert.doesNotMatch(query.columns,/explanation|summary|provenance/);
  const saved=[...s.disk.values()].join('');
  assert.doesNotMatch(saved,/PRIVATE/);
  assert.equal(s.applied.at(-1).theories[0].status,'locked');
  assert.equal(s.applied.at(-1).techniques.find(item=>item.id==='paid').status,'locked');
  assert.equal(s.applied.at(-1).techniques.find(item=>item.id==='paid').explanation,'');
  // The authenticated paid-content payload contains the body but no status.
  // A later public metadata refresh must not turn it back into a locked shell.
  s.techniqueById.set('paid',{id:'paid',title:'有料',explanation:'resolved technique'});
  s.theories.push({tagId:'theory',title:'理論名',summary:'resolved theory',status:'published'});
  const reloaded=await load('published-content');
  await reloaded.hydratePublishedContent();
  assert.equal(s.queries.length,7);
  assert.equal(s.applied.at(-1).techniques.find(item=>item.id==='paid').explanation,'resolved technique');
  assert.equal(s.applied.at(-1).techniques.find(item=>item.id==='paid').status,'published');
  assert.equal(s.applied.at(-1).theories[0].summary,'resolved theory');
  await reloaded.hydratePublishedContent(true);
  assert.equal(s.queries.length,14);
  s.techniqueById.set('paid',{id:'paid',title:'有料',explanation:'locked shell',status:'locked'});
  await reloaded.hydratePublishedContent(true);
  assert.equal(s.applied.at(-1).techniques.find(item=>item.id==='paid').status,'locked');
  assert.equal(s.applied.at(-1).techniques.find(item=>item.id==='paid').explanation,'');
});

test('secure cache restores only matching users and fresh data; purge wins over a slow storage read', async () => {
  const s=setup(), api=await load('secure-content');
  const key='@shoseijutsu-roku/paid-content/v13';
  const snapshot={version:9,userId:'user',savedAt:new Date().toISOString(),techniques:[{id:'paid'}],theories:[{tagId:'theory'}],learning:[{id:'case'}]};
  s.disk.set(key,JSON.stringify(snapshot));
  assert.equal(await api.restoreCachedSecureContent('different',true),false);
  await api.hydrateSecureContent();
  assert.equal(api.hasHydratedSecureContent('user',true),true);
  assert.equal(s.applied.length,1);
  api.purgeSecureContent();
  s.disk.set(key,JSON.stringify({...snapshot,savedAt:'2000-01-01T00:00:00Z'}));
  assert.equal(await api.restoreCachedSecureContent('user',true),false);
  let resolve;
  s.storage.getItem=()=>new Promise(yes=>{resolve=yes;});
  const pending=api.restoreCachedSecureContent('user');
  api.purgeSecureContent();
  resolve(JSON.stringify(snapshot));
  assert.equal(await pending,false);
  assert.equal(api.hasHydratedSecureContent('user'),false);
  assert.equal(s.applied.length,1);
});

test('expired secure cache fetches each domain once, waits for all bodies and then caches the complete snapshot', async () => {
  const s=setup(), api=await load('secure-content'), originalFetch=globalThis.fetch;
  const requests=[];
  globalThis.fetch=async(url)=>{
    const type=new URL(url).searchParams.get('type');
    requests.push(type);
    return new Response(JSON.stringify({items:[{payload:type==='theory'?{tagId:'theory',title:'理論',summary:'本文'}:{id:type==='technique'?'paid':'case',number:1}}]}));
  };
  try {
    await Promise.all([api.hydrateSecureContent(),api.hydrateSecureContent()]);
    assert.deepEqual(requests.sort(),['learning','technique','theory']);
    assert.equal(api.hasHydratedSecureContent('user',true),true);
    const saved=JSON.parse(s.disk.get('@shoseijutsu-roku/paid-content/v13'));
    assert.equal(saved.techniques.length,1);
    assert.equal(saved.theories.length,1);
    assert.equal(saved.learning.length,1);
  } finally {globalThis.fetch=originalFetch;}
});

test('a secondary content failure allows retry instead of marking a partial catalogue fresh', async () => {
  const s=setup(), api=await load('secure-content'), originalFetch=globalThis.fetch;
  globalThis.fetch=async(url)=>new URL(url).searchParams.get('type')==='technique'
    ? new Response('{}',{status:503}) : new Response(JSON.stringify({items:[{payload:{id:'case',tagId:'theory',number:1}}]}));
  try {
    await assert.rejects(api.hydrateSecureContent(),/完全版データ/);
    assert.equal(api.hasHydratedSecureContent('user',true),false);
    assert.equal(s.disk.has('@shoseijutsu-roku/paid-content/v13'),false);
  } finally {globalThis.fetch=originalFetch;}
});

test('signing out during a theory request cannot revive secure content', async () => {
  const s=setup(), api=await load('secure-content'), originalFetch=globalThis.fetch;
  let finish, started;
  const waiting=new Promise(resolve=>{started=resolve;});
  globalThis.fetch=()=>{started();return new Promise(resolve=>{finish=resolve;});};
  try {
    const request=api.hydrateSecureContent();
    await waiting;
    api.purgeSecureContent();
    finish(new Response(JSON.stringify({items:[{payload:{tagId:'theory'}}]})));
    await request;
    assert.equal(api.hasHydratedSecureContent('user'),false);
    assert.equal(s.applied.length,0);
  } finally {globalThis.fetch=originalFetch;}
});
