import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

globalThis.__secureTheoryTest = {};
const mocks = {
  '@react-native-async-storage/async-storage': 'export default {getItem:async()=>globalThis.__secureTheoryTest.cache??null,setItem:async(_key,value)=>{globalThis.__secureTheoryTest.cache=value;},removeItem:async()=>{globalThis.__secureTheoryTest.cache=null;}};',
  '@/data/catalog': 'export const hydratePaidTheories=(rows)=>globalThis.__secureTheoryTest.applied.push(rows);export const overlayPaidCatalog=(techniques,theories)=>globalThis.__secureTheoryTest.overlays?.push({techniques,theories});export const resetCatalog=()=>{};',
  '@/data/learning': 'export const learningCases=[];export const replaceLearningCases=()=>{};export const resetLearningCases=()=>{};',
  './supabase': 'export const supabase={auth:{getSession:async()=>({data:{session:{user:{id:"user"},access_token:"token"}}})}};export const supabaseUrl="https://example.invalid";export const supabasePublishableKey="public";',
};
registerHooks({ resolve(specifier, context, next) {
  if (mocks[specifier]) return { url:`data:text/javascript,${encodeURIComponent(mocks[specifier])}`,shortCircuit:true };
  return next(specifier,context);
} });
let instance = 0;
const load = () => import(new URL(`../../src/lib/secure-content.ts?case=${++instance}`,import.meta.url));
const theory = {tagId:'new',title:'「原文。」',summary:'完全版本文。'};
test('theory hydration notifies readers before secondary content succeeds', async () => {
  globalThis.__secureTheoryTest = {applied:[]};
  const originalFetch = globalThis.fetch;
  let releaseSecondary; let secondaryStarted;
  const secondaryGate = new Promise(resolve => { releaseSecondary = resolve; });
  const secondaryRequest = new Promise(resolve => { secondaryStarted = resolve; });
  globalThis.fetch = async url => {
    if (String(url).includes('type=theory')) return new Response(JSON.stringify({items:[{payload:theory}]}));
    secondaryStarted(); await secondaryGate;
    return new Response(JSON.stringify({items:[{payload:{id:'secondary'}}]}));
  };
  try {
    const api = await load(); let notifications=0;
    const hydration = api.hydrateSecureContent(()=>notifications++);
    await secondaryRequest;
    assert.equal(notifications,1);
    assert.deepEqual(globalThis.__secureTheoryTest.applied,[[theory]]);
    assert.equal(api.hasHydratedSecureContent('user'),false);
    releaseSecondary(); await hydration;
    assert.equal(notifications,2);
    assert.equal(api.hasHydratedSecureContent('user'),true);
  } finally {releaseSecondary();globalThis.fetch=originalFetch;}
});

test('incomplete secondary content reports failure and can be retried without hiding arrived theories', async () => {
  globalThis.__secureTheoryTest = {applied:[]};
  const originalFetch = globalThis.fetch; let complete = false;
  globalThis.fetch = async url => new Response(JSON.stringify({items:String(url).includes('type=theory') ? [{payload:theory}] : complete ? [{payload:{id:'secondary'}}] : []}));
  try {
    const api = await load();
    await assert.rejects(api.hydrateSecureContent(), /完全版データが不足/);
    assert.deepEqual(globalThis.__secureTheoryTest.applied,[[theory]]);
    assert.equal(api.hasHydratedSecureContent('user'),false);
    complete = true; await api.hydrateSecureContent();
    assert.equal(api.hasHydratedSecureContent('user'),true);
  } finally {globalThis.fetch=originalFetch;}
});
test('a response received after sign-out cannot hydrate the previous user', async () => {
  globalThis.__secureTheoryTest = {applied:[]};
  const originalFetch=globalThis.fetch; let respond; let started;
  const requestStarted=new Promise(resolve=>{started=resolve;});
  globalThis.fetch = async () => {started();return new Promise(resolve=>{respond=resolve;});};
  try {
    const api=await load(); let notifications=0;
    const hydration=api.hydrateSecureContent(()=>notifications++);
    await requestStarted; api.purgeSecureContent();
    respond(new Response(JSON.stringify({items:[{payload:theory}]}),{status:200}));
    await hydration;
    assert.equal(notifications,0);
    assert.deepEqual(globalThis.__secureTheoryTest.applied,[]);
    assert.equal(api.hasHydratedSecureContent('user'),false);
  } finally {globalThis.fetch=originalFetch;}
});

test('refresh replaces bodies and cache only on success; offline failure can be retried', async () => {
  globalThis.__secureTheoryTest = {applied:[],overlays:[]};
  const originalFetch=globalThis.fetch;
  let revision=1; let offline=false;
  globalThis.fetch=async url=>{
    if(offline) throw new Error('offline');
    const payload=String(url).includes('type=theory') ? {...theory,summary:`概要${revision}`} : {id:'secondary',explanation:`本文${revision}`};
    return new Response(JSON.stringify({items:[{payload}]}));
  };
  try {
    const api=await load();
    await api.hydrateSecureContent();
    const saved=globalThis.__secureTheoryTest.cache;
    offline=true;
    assert.equal(await api.refreshSecureContent(),false);
    assert.equal(api.hasHydratedSecureContent('user'),true);
    assert.equal(globalThis.__secureTheoryTest.cache,saved);
    assert.equal(globalThis.__secureTheoryTest.overlays.length,1);
    offline=false; revision=2;
    assert.equal(await api.refreshSecureContent(),true);
    assert.equal(globalThis.__secureTheoryTest.overlays.at(-1).techniques[0].explanation,'本文2');
    assert.equal(JSON.parse(globalThis.__secureTheoryTest.cache).theories[0].summary,'概要2');
    assert.equal(api.hasHydratedSecureContent('user'),true);
  } finally {globalThis.fetch=originalFetch;}
});

test('concurrent refreshes share requests and sign-out invalidates their response', async () => {
  globalThis.__secureTheoryTest = {applied:[],overlays:[]};
  const originalFetch=globalThis.fetch;
  const response=()=>new Response(JSON.stringify({items:[{payload:theory}]}));
  globalThis.fetch=async()=>response();
  let release;
  try {
    const api=await load();
    await api.hydrateSecureContent();
    const saved=globalThis.__secureTheoryTest.cache;
    let requests=0; let started;
    const gate=new Promise(resolve=>{release=resolve;});
    const allStarted=new Promise(resolve=>{started=resolve;});
    globalThis.fetch=async()=>{requests++;if(requests===3)started();await gate;return response();};
    const first=api.refreshSecureContent();
    const second=api.refreshSecureContent();
    await allStarted;
    api.purgeSecureContent();release();
    assert.deepEqual(await Promise.all([first,second]),[false,false]);
    assert.equal(requests,3);
    assert.equal(globalThis.__secureTheoryTest.overlays.length,1);
    assert.equal(globalThis.__secureTheoryTest.cache,saved);
    assert.equal(api.hasHydratedSecureContent('user'),false);
  } finally {release?.();globalThis.fetch=originalFetch;}
});
