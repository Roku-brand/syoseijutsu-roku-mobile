import type { PersistedState, PersonalMemo, PersonalMemoFolder } from './app-state';
import { resolveTheoryIds } from '@/data/theory-taxonomy';
import { restoreLibraryFolders } from './library-folders';

export const LEGACY_PERSONAL_KEY = '@shoseijutsu-roku/state/v1';
export const personalStorageKey = (userId?: string | null) => userId ? '@shoseijutsu-roku/state/v2/user/' + userId : LEGACY_PERSONAL_KEY;
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const strings = (value: unknown, limit = 20000): string[] => Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string' && v.length <= 500))].slice(0, limit) : [];
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const dictionary = <T>(value: unknown, valid: (v: unknown) => v is T): Record<string, T> => Object.fromEntries(Object.entries(object(value)).filter(([key, v]) => !['__proto__','constructor','prototype'].includes(key) && valid(v)).slice(0,20000)) as Record<string,T>;
export function normalizePersonalData(raw: unknown, defaults: PersistedState): PersistedState {
 const p = object(raw), savedIds = strings(p.savedIds), savedTheoryIds = resolveTheoryIds(strings(p.savedTheoryIds)), savedFeatureIds = strings(p.savedFeatureIds);
 const memos = (Array.isArray(p.personalMemos) ? p.personalMemos : []).slice(0,5000).map((entry,index): PersonalMemo | null => {
  const v = typeof entry === 'string' ? {text:entry} : object(entry);
  if(typeof v.text!=='string'||!v.text.trim()||v.text.length>100000)return null;
  return {id:typeof v.id==='string'?v.id:'legacy-memo-'+index+'-'+v.text.slice(0,12),text:v.text.trim(),folderId:typeof v.folderId==='string'?v.folderId:null,createdAt:typeof v.createdAt==='string'?v.createdAt:new Date(0).toISOString()};
 }).filter((m): m is PersonalMemo => m!==null);
 const folders = (Array.isArray(p.personalMemoFolders)?p.personalMemoFolders:[]).slice(0,5000).map((entry): PersonalMemoFolder | null=>{
  const v=object(entry);return typeof v.id==='string'&&typeof v.name==='string'?{id:v.id,name:v.name.trim()||'無題のフォルダー',createdAt:typeof v.createdAt==='string'?v.createdAt:new Date(0).toISOString()}:null;
 }).filter((f): f is PersonalMemoFolder=>f!==null);
 const learningRecords = p.learningCurriculumVersion===defaults.learningCurriculumVersion ? dictionary(p.learningRecords,(v):v is PersistedState['learningRecords'][string]=>{
  const x=object(v);return typeof x.caseId==='string'&&['a','b','c'].includes(String(x.choiceId))&&typeof x.answeredAt==='string';
 }) : {};
 const interests=strings(p.interests).filter(k=>['interpersonal','work','life'].includes(k));
 return {
  ...defaults, savedIds,savedTheoryIds,savedFeatureIds,interests:interests.length?interests:defaults.interests,
  historyIds:resolveTheoryIds(strings(p.historyIds)).slice(0,100),featureHistoryIds:strings(p.featureHistoryIds).slice(0,100),
  notes:dictionary(p.notes,(v):v is string=>typeof v==='string'&&v.length<=100000),
  practiceRecords:dictionary(p.practiceRecords,(v):v is PersistedState['practiceRecords'][string]=>{const x=object(v);return typeof x.cardId==='string'&&['planned','tried'].includes(String(x.status))&&typeof x.plannedAt==='string';}),
  personalPrinciple:typeof p.personalPrinciple==='string'?p.personalPrinciple.slice(0,2000):defaults.personalPrinciple,
  personalMemos:memos,personalMemoFolders:folders,learningRecords,
  learningUnlimited:p.learningUnlimited===true,reviewCaseIds:strings(p.reviewCaseIds,5000),
  ...restoreLibraryFolders(p.libraryFolders,p.libraryFolderByItem,savedIds,savedTheoryIds,savedFeatureIds),
 };
}
export function hasPersonalRecords(data: PersistedState) {
 return Boolean(data.savedIds.length||data.savedTheoryIds.length||data.savedFeatureIds.length||data.personalMemos.length||data.personalMemoFolders.length||data.libraryFolders.length||Object.keys(data.notes).length||Object.keys(data.practiceRecords).length||Object.keys(data.learningRecords).length||data.historyIds.length||data.featureHistoryIds.length||data.reviewCaseIds.length||data.personalPrinciple!=='志は高く、腰は低く。');
}
export function makePersonalBackup(data: PersistedState) {
 return JSON.stringify({format:'shoseijutsuroku-personal-data',version:1,exportedAt:new Date().toISOString(),data},null,2);
}
export function parsePersonalBackup(json: string,defaults: PersistedState) {
 // Count UTF-8 bytes without relying on TextEncoder (not present on every native runtime).
 let bytes=0; for(const char of json){const code=char.codePointAt(0)!;bytes+=code<128?1:code<2048?2:code<65536?3:4;if(bytes>MAX_BACKUP_BYTES)throw new Error('バックアップは5MB以内にしてください。');}
 let value;try{value=JSON.parse(json);}catch{throw new Error('JSONの形式を確認してください。');}
 if(value?.format!=='shoseijutsuroku-personal-data'||value.version!==1||!value.data||typeof value.data!=='object'||Array.isArray(value.data))throw new Error('処世術禄の対応するバックアップを選んでください。');
 const allowed=new Set(Object.keys(defaults));
 if(Object.keys(value.data).some(k=>!allowed.has(k)))throw new Error('このバックアップには対応していない項目が含まれています。');
 return normalizePersonalData(value.data,defaults);
}
export function mergePersonalData(incoming: PersistedState,current: PersistedState): PersistedState {
 const union=(a:string[],b:string[])=>[...new Set([...b,...a])];
 // Distinct imported entries may have the same ID on two devices. Keep both.
 const combine=<T extends {id:string}>(a:T[],b:T[])=>{
  const result=[...b],ids=new Set(b.map(x=>x.id)),remap=new Map<string,string>();
  for(const item of a){const existing=b.find(x=>x.id===item.id);if(existing&&JSON.stringify(existing)===JSON.stringify(item))continue;
   let id=item.id;while(ids.has(id))id+='-import';ids.add(id);remap.set(item.id,id);result.push({...item,id});}
  return {items:result,remap};
 };
 const memoFolders=combine(incoming.personalMemoFolders,current.personalMemoFolders),libraryFolders=combine(incoming.libraryFolders,current.libraryFolders);
 const memos=incoming.personalMemos.map(m=>({...m,folderId:m.folderId?(memoFolders.remap.get(m.folderId)??m.folderId):null}));
 const notes={...current.notes};for(const [id,text] of Object.entries(incoming.notes)){if(!notes[id])notes[id]=text;else if(notes[id]!==text&&!notes[id].includes(text))notes[id]+='\n\n【バックアップから追加】\n'+text;}
 return {...incoming,...current,
  savedIds:union(incoming.savedIds,current.savedIds),savedTheoryIds:union(incoming.savedTheoryIds,current.savedTheoryIds),savedFeatureIds:union(incoming.savedFeatureIds,current.savedFeatureIds),
  historyIds:union(incoming.historyIds,current.historyIds).slice(0,100),featureHistoryIds:union(incoming.featureHistoryIds,current.featureHistoryIds).slice(0,100),
  personalMemos:combine(memos,current.personalMemos).items,personalMemoFolders:memoFolders.items,
  libraryFolders:libraryFolders.items,libraryFolderByItem:{...Object.fromEntries(Object.entries(incoming.libraryFolderByItem).map(([key,id])=>[key,libraryFolders.remap.get(id)??id])),...current.libraryFolderByItem},
  notes,practiceRecords:{...incoming.practiceRecords,...current.practiceRecords},learningRecords:{...incoming.learningRecords,...current.learningRecords},
  reviewCaseIds:union(incoming.reviewCaseIds,current.reviewCaseIds),
  personalPrinciple:current.personalPrinciple==='志は高く、腰は低く。'?incoming.personalPrinciple:current.personalPrinciple,
 };
}

