import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

const mocks={
 '@/data/catalog': `export const categoryOrder=['work'];export const theories=[];export const techniqueById={get:id=>globalThis.__tagHydration.existing.get(id)};export const applyManagedCategories=()=>{};export const reconcilePublishedStructure=()=>{};export const hydratePaidCatalog=rows=>{globalThis.__tagHydration.applied=rows;};`,
 '@/access/access-config': 'export const hydrateContentAccessScope=()=>{};',
 '@/data/persona-presentation': 'export const hydratePersonaPresentations=()=>{};',
 '@/data/theory-taxonomy': 'export const applyTheorySubcategories=()=>{};',
 '@/data/theory-display': 'export const isLockedTheoryShell=t=>t.status==="locked";',
 '@/lib/supabase': `const response=table=>({data:globalThis.__tagHydration.tables[table]??[],error:null});export const supabase={from(table){const query={select:()=>query,eq:()=>query,order:()=>query,range:async()=>response(table),then:(resolve,reject)=>Promise.resolve(response(table)).then(resolve,reject)};return query;}};`,
};
registerHooks({resolve(specifier,context,next){if(mocks[specifier])return {url:'data:text/javascript,'+encodeURIComponent(mocks[specifier]),shortCircuit:true};return next(specifier,context);}});
const api=await import('../../src/lib/published-content.ts');

test('late public hydration retains entitled tags but honors explicit owner arrays',async()=>{
 globalThis.__tagHydration={existing:new Map([['paid',{id:'paid',explanation:'paid body',tags:['保持するタグ']}]]),tables:{public_techniques:[
  {id:'paid',title:'有料カード',access_tier:'complete',explanation:'',tags:null},
  {id:'free',title:'無料カード',access_tier:'free',explanation:'free body',tags:['編集されたタグ']},
  {id:'empty',title:'空タグ',access_tier:'free',explanation:'free body',tags:[]},
 ]}};
 assert.equal(await api.hydratePublishedContent(true),true);
 const rows=globalThis.__tagHydration.applied;
 assert.deepEqual(rows.find(t=>t.id==='paid').tags,['保持するタグ']);
 assert.deepEqual(rows.find(t=>t.id==='free').tags,['編集されたタグ']);
 assert.deepEqual(rows.find(t=>t.id==='empty').tags,[]);
});

test('an unentitled public shell never recovers a previous user tag',async()=>{
 globalThis.__tagHydration={existing:new Map(),tables:{public_techniques:[{id:'paid',title:'有料カード',access_tier:'complete',explanation:'',tags:null}]}};
 await api.hydratePublishedContent(true);
 assert.equal(globalThis.__tagHydration.applied[0].tags,undefined);
 assert.equal(globalThis.__tagHydration.applied[0].explanation,'');
});
