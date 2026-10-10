import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

registerHooks({resolve(specifier,context,next){
  if(specifier==='@/lib/supabase') return {url:'data:text/javascript,'+encodeURIComponent('export const supabase={from:()=>({select:()=>({eq:()=>({abortSignal:()=>({single:()=>globalThis.__revisionTest.read()})})})})};'),shortCircuit:true};
  return next(specifier,context);
}});
let instance=0;
const load=()=>import(new URL(`../../src/lib/content-revision.ts?case=${++instance}`,import.meta.url));

test('unchanged checks share one small read and are throttled for 60 seconds',async()=>{
  const originalNow=Date.now;let now=100_000;Date.now=()=>now;
  let reads=0;let release;
  globalThis.__revisionTest={read:()=>{reads++;return new Promise(resolve=>{release=resolve;});}};
  try {
    const api=await load();
    const first=api.readContentRevision();const second=api.readContentRevision();
    release({data:{revision:1},error:null});
    assert.deepEqual(await Promise.all([first,second]),['1','1']);
    now+=59_999;
    assert.equal(await api.readContentRevision(),'1');assert.equal(reads,1);
    now++;
    globalThis.__revisionTest.read=async()=>{reads++;return {data:{revision:2},error:null};};
    assert.equal(await api.readContentRevision(),'2');assert.equal(reads,2);
    assert.equal(await api.readContentRevision(true),'2');assert.equal(reads,3);
  } finally {Date.now=originalNow;release?.({data:{revision:1}});}
});

test('network failures do not cause repeated revision requests on every focus',async()=>{
  const originalNow=Date.now;let now=100_000;Date.now=()=>now;
  let reads=0;
  globalThis.__revisionTest={read:async()=>{reads++;throw new Error('offline');}};
  try {
    const api=await load();
    assert.equal(await api.readContentRevision(),null);
    assert.equal(await api.readContentRevision(),null);assert.equal(reads,1);
    now+=60_000;
    globalThis.__revisionTest.read=async()=>{reads++;return {data:{revision:7},error:null};};
    assert.equal(await api.readContentRevision(),'7');assert.equal(reads,2);
  } finally {Date.now=originalNow;}
});
