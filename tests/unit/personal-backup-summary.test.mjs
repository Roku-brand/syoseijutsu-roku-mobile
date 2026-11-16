import './register-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizePersonalBackup } from '../../src/state/personal-backup-summary.ts';

test('backup preview reports recorded dates and each kind of personal record', () => {
 const data={savedIds:['a','b'],savedTheoryIds:['t'],savedFeatureIds:['f'],personalMemos:[{id:'m'}],learningRecords:{'case-01':{},'case-02':{}}};
 const text=JSON.stringify({format:'shoseijutsuroku-personal-data',version:1,exportedAt:'2026-11-16T00:00:00Z',data});
 assert.deepEqual(summarizePersonalBackup(text),{exportedAt:'2026-11-16T00:00:00Z',favorites:4,memos:1,learning:2});
 assert.deepEqual(JSON.parse(text).data,data);
});
test('legacy files without dates show unknown dates; invalid envelopes cannot be previewed',()=>{
 assert.deepEqual(summarizePersonalBackup(JSON.stringify({format:'shoseijutsuroku-personal-data',version:1,exportedAt:'invalid',data:{}})),{exportedAt:null,favorites:0,memos:0,learning:0});
 for(const text of ['null','[]','{}','{',JSON.stringify({format:'shoseijutsuroku-personal-data',version:2,data:{}})])assert.throws(()=>summarizePersonalBackup(text));
});
