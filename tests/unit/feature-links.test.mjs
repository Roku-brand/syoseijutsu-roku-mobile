import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const mocks={
 react:'export const useEffect=()=>{};export const useSyncExternalStore=(_s,get)=>get();',
 '@/lib/supabase':'export const supabase={from:(table)=>{globalThis.__featureLinks.table=table;const q={select:(columns)=>{globalThis.__featureLinks.columns=columns;return q;},eq:(...args)=>{globalThis.__featureLinks.filters.push(args);return q;},order:()=>q,abortSignal:()=>globalThis.__featureLinks.read()};return q;}};',
};
registerHooks({resolve(specifier,context,next){if(mocks[specifier])return{url:'data:text/javascript,'+encodeURIComponent(mocks[specifier]),shortCircuit:true};return next(specifier,context);}});
let serial=0;
const load=()=>import(new URL(`../../src/data/feature-links.ts?test=${++serial}`,import.meta.url));
const article={id:'a',slug:'a',title:'公開記事',display_order:1,related_technique_ids:['master336-004'],related_theory_ids:['kb_402'],related_feature_ids:[],status:'published',show_in_list:true,body:'公開本文をこの索引へ保持しない',lead:'概要も転送不要'};
test('only publication-safe link metadata is fetched, stored and reverse-indexed',async()=>{
 globalThis.__featureLinks={filters:[],read:async()=>({data:[article,{...article,id:'draft',status:'draft'},{...article,id:'hidden',show_in_list:false}],error:null})};
 const api=await load();await api.refreshFeatureLinks();const rows=api.useFeatureLinks();
 assert.equal(rows.length,1);assert.equal(rows[0].body,undefined);assert.equal(rows[0].lead,undefined);
 assert.ok(!globalThis.__featureLinks.columns.includes('body'));assert.ok(!globalThis.__featureLinks.columns.includes('*'));
 assert.deepEqual(globalThis.__featureLinks.filters,[['status','published'],['show_in_list',true]]);
 assert.deepEqual(api.relatedFeatureLinks(rows,'technique','master336-004').map(x=>x.id),['a']);
 assert.deepEqual(api.relatedFeatureLinks(rows,'theory','kb_402').map(x=>x.id),['a']);
 assert.deepEqual(api.relatedFeatureLinks(rows,'theory','unrelated'),[]);
});
test('concurrent readers share a request and offline errors do not trigger a request on each card',async()=>{
 const original=Date.now;let now=100_000;Date.now=()=>now;let count=0,release;
 globalThis.__featureLinks={filters:[],read:()=>{count++;return new Promise(resolve=>{release=resolve;});}};
 try{const api=await load();const a=api.refreshFeatureLinks(),b=api.refreshFeatureLinks();assert.equal(count,1);release({data:null,error:{message:'offline'}});await Promise.all([a,b]);
 for(let i=0;i<5;i++)await api.refreshFeatureLinks();assert.equal(count,1);assert.deepEqual(api.useFeatureLinks(),[]);
 now+=60_000;globalThis.__featureLinks.read=async()=>{count++;return{data:[article],error:null};};await api.refreshFeatureLinks();assert.equal(count,2);assert.equal(api.useFeatureLinks().length,1);
 }finally{Date.now=original;}
});
test('a late metadata request cannot overwrite a newer CMS publication snapshot',async()=>{
 let release;globalThis.__featureLinks={filters:[],read:()=>new Promise(resolve=>{release=resolve;})};
 const api=await load(),request=api.refreshFeatureLinks();api.setFeatureLinks([{...article,title:'編集後の記事'}]);release({data:[article],error:null});await request;
 assert.equal(api.useFeatureLinks()[0].title,'編集後の記事');
});
