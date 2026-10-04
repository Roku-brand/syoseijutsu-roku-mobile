import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { AppText, SecondaryButton } from './ui';
import type { TheoryCard } from '@/data/types';
import { subcategoryChoices, saveTheorySubcategory, deleteTheorySubcategory } from '@/data/owner-theory-taxonomy';
import type { TheorySubcategory } from '@/data/theory-taxonomy';
import { colors } from '@/constants/theme';
const input={minHeight:44,borderWidth:1,borderColor:colors.line,padding:10,color:colors.ink};
export function TheorySubcategoryFields({value,onChange}:{value:Omit<TheoryCard,'status'>;onChange:(patch:Partial<TheoryCard>)=>void}) {
 return <View style={{gap:8}}><AppText variant="label">内部分類（必須）</AppText><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{subcategoryChoices(value.categoryId).map(s=><Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`内部分類：${s.title}`} aria-pressed={value.subcategoryId===s.id} accessibilityState={{selected:value.subcategoryId===s.id}} onPress={()=>onChange({subcategoryId:s.id,subcategoryTitle:s.title,sortOrder:1})} style={[input,value.subcategoryId===s.id && {backgroundColor:colors.paperDeep}]}><AppText>{s.title}</AppText></Pressable>)}</View><AppText variant="label">内部分類内の並び順</AppText><TextInput accessibilityLabel="内部分類内の並び順" keyboardType="number-pad" style={input} value={String(value.sortOrder??1)} onChangeText={s=>onChange({sortOrder:Number(s)})} /></View>;
}
export function TheorySubcategoryManager({categoryId,onSaved}:{categoryId:string;onSaved:()=>Promise<void>}) {
 const [open,setOpen]=useState(false);const [draft,setDraft]=useState<TheorySubcategory|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const run=async(task:()=>Promise<void>)=>{setBusy(true);setError('');try{await task();await onSaved();setDraft(null);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 return <View style={{gap:6,padding:8}}><SecondaryButton disabled={busy} onPress={()=>setOpen(!open)}>内部分類を管理</SecondaryButton>{open?<><View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{subcategoryChoices(categoryId).map(s=><SecondaryButton key={s.id} disabled={busy} onPress={()=>setDraft({...s})}>{s.title}</SecondaryButton>)}</View><SecondaryButton disabled={busy} onPress={()=>setDraft({id:`sub-${Date.now()}`,categoryId,title:'',displayOrder:subcategoryChoices(categoryId).length+1})}>＋ 内部分類</SecondaryButton>{draft?<><TextInput accessibilityLabel="内部分類名" value={draft.title} onChangeText={title=>setDraft({...draft,title})} style={input} /><TextInput accessibilityLabel="内部分類の並び順" value={String(draft.displayOrder)} onChangeText={s=>setDraft({...draft,displayOrder:Number(s)})} style={input} keyboardType="number-pad" /><SecondaryButton disabled={busy || !draft.title.trim()} onPress={()=>void run(()=>saveTheorySubcategory(draft))}>保存</SecondaryButton><SecondaryButton disabled={busy} onPress={()=>void run(()=>deleteTheorySubcategory(draft.id))}>削除（所属理論があれば拒否）</SecondaryButton></>:null}</>:null}{error?<AppText>{error}</AppText>:null}</View>;
}
