import './register-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
const { makePersonalBackup, parsePersonalBackup, normalizePersonalData, mergePersonalData, personalStorageKey } = await import('../../src/state/personal-data.ts');
const defaults={learningCurriculumVersion:2,interests:['interpersonal','work','life'],savedIds:[],savedTheoryIds:[],savedFeatureIds:[],libraryFolders:[],libraryFolderByItem:{},historyIds:[],featureHistoryIds:[],notes:{},practiceRecords:{},personalPrinciple:'志は高く、腰は低く。',personalMemos:[],personalMemoFolders:[],learningRecords:{},learningUnlimited:false,reviewCaseIds:[]};
test('backups preserve unknown content IDs, notes, learning and folders without authentication fields',()=>{
 const original=normalizePersonalData({...defaults,savedIds:['future-1','future-1'],notes:{'future-1':'日本語のメモ'},personalMemos:['古い形式のメモ'],learningUnlimited:true,reviewCaseIds:['case-01'],access_token:'secret'},defaults);
 assert.deepEqual(parsePersonalBackup(makePersonalBackup(original),defaults),original);
 assert.equal(original.savedIds.length,1);assert.equal(original.personalMemos[0].text,'古い形式のメモ');
 assert.ok(!makePersonalBackup(original).includes('access_token'));
 assert.notEqual(personalStorageKey('a'),personalStorageKey('b'));assert.notEqual(personalStorageKey('a'),personalStorageKey());
});
test('restoration rejects invalid versions, unsupported fields and oversize Unicode without changing records',()=>{
 for(const value of ['not json',JSON.stringify({format:'shoseijutsuroku-personal-data',version:9,data:{}}),JSON.stringify({format:'shoseijutsuroku-personal-data',version:1,data:{access_token:'secret'}}),'あ'.repeat(1800000)])assert.throws(()=>parsePersonalBackup(value,defaults));
 assert.deepEqual(defaults.savedIds,[]);
});
test('merge retains conflicting memo IDs, folder links and both versions of notes',()=>{
 const current={...defaults,savedIds:['a'],notes:{a:'現在のメモ'},personalMemos:[{id:'m',text:'現在',folderId:'f',createdAt:'2026'}],personalMemoFolders:[{id:'f',name:'現在',createdAt:'2026'}]};
 const incoming={...defaults,savedIds:['b'],notes:{a:'取り込むメモ'},personalMemos:[{id:'m',text:'取込',folderId:'f',createdAt:'2025'}],personalMemoFolders:[{id:'f',name:'取込',createdAt:'2025'}]};
 const merged=mergePersonalData(incoming,current);
 assert.deepEqual(merged.savedIds,['a','b']);assert.equal(merged.personalMemos.length,2);assert.equal(merged.personalMemoFolders.length,2);
 assert.equal(merged.personalMemos.find(m=>m.text==='取込').folderId,'f-import');
 assert.match(merged.notes.a,/現在のメモ/);assert.match(merged.notes.a,/取り込むメモ/);
});
