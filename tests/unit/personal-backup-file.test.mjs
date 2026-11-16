import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('src/lib/personal-backup-file.native.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function picker(result,{size=20,text='{}',unreadable=false}={}){
 let reads=0,options;
 const module={exports:{}};
 new Function('require','exports','module',source)(name=>{
  if(name==='expo-document-picker')return {getDocumentAsync:async value=>{options=value;return result;}};
  if(name==='expo-file-system')return {File:class {size=size;async text(){reads++;if(unreadable)throw Error();return text;}}};
  if(name==='@/state/personal-data')return {MAX_BACKUP_BYTES:5*1024*1024};
  throw Error(name);
 },module.exports,module);
 return {pick:module.exports.pickPersonalBackupFile,reads:()=>reads,options:()=>options};
}
test('iOS file selection copies to cache, reads UTF-8 contents and allows cancellation',async()=>{
 const cancel=picker({canceled:true,assets:null});assert.equal(await cancel.pick(),null);assert.equal(cancel.reads(),0);
 const file=picker({canceled:false,assets:[{uri:'file:///backup.json',name:'記録.json',size:20}]},{text:'日本語の記録'});
 assert.deepEqual(await file.pick(),{name:'記録.json',text:'日本語の記録'});
 assert.deepEqual(file.options(),{type:'*/*',multiple:false,copyToCacheDirectory:true});assert.equal(file.reads(),1);
});
test('oversize files are rejected before reading, including missing picker sizes',async()=>{
 for(const asset of [{size:6*1024*1024},{}]){
  const file=picker({canceled:false,assets:[{uri:'file:///backup.json',name:'記録.json',...asset}]},{size:6*1024*1024});
  await assert.rejects(file.pick(),/5MB/);assert.equal(file.reads(),0);
 }
 const file=picker({canceled:false,assets:[{uri:'file:///backup.json',name:'記録.json',size:20}]},{unreadable:true});
 await assert.rejects(file.pick(),/読み込めませんでした/);
});
