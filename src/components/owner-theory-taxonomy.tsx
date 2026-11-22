import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppText, SecondaryButton } from './ui';
import { CmsWheel } from './owner-cms-wheel';
import type { TheoryCard } from '@/data/types';
import { subcategoryChoices, saveTheorySubcategory } from '@/data/owner-theory-taxonomy';
import type { TheorySubcategory } from '@/data/theory-taxonomy';
import { colors } from '@/constants/theme';
const input={minHeight:44,borderWidth:1,borderColor:colors.line,padding:10,color:colors.ink};
export function TheorySubcategoryFields({value,onChange}:{value:Omit<TheoryCard,'status'>;onChange:(patch:Partial<TheoryCard>)=>void}) {
 const choices = subcategoryChoices(value.categoryId);
 return <CmsWheel label="内部分類" value={value.subcategoryId ?? ''} options={choices.map(({ id, title }) => [id, title])}
   onChange={(id) => onChange({ subcategoryId: id, subcategoryTitle: choices.find((item) => item.id === id)?.title, sortOrder: undefined })} />;
}
export function TheorySubcategoryManager({categoryId,onSaved}:{categoryId:string;onSaved:()=>Promise<void>}) {
 const [open,setOpen]=useState(false);const [draft,setDraft]=useState<TheorySubcategory|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const run=async(task:()=>Promise<void>)=>{setBusy(true);setError('');try{await task();await onSaved();setDraft(null);}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 const choices = subcategoryChoices(categoryId);
 const index = choices.findIndex((item) => item.id === draft?.id);
 const move = (offset: -1 | 1) => {
   const item = choices[index];
   if (item && choices[index + offset]) void run(() => saveTheorySubcategory({ ...item, displayOrder: index + offset + 1 }));
 };
 return <View style={{ gap: 6, padding: 8 }}>
   <SecondaryButton disabled={busy} onPress={() => setOpen(!open)}>内部分類を管理</SecondaryButton>
   {open ? <>
     <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
       {choices.map((item) => <SecondaryButton key={item.id} disabled={busy} onPress={() => setDraft({ ...item })}>{item.title}</SecondaryButton>)}
     </View>
     {draft ? <>
       <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
         <SecondaryButton disabled={busy || index <= 0} onPress={() => move(-1)}>上へ移動</SecondaryButton>
         <SecondaryButton disabled={busy || index >= choices.length - 1} onPress={() => move(1)}>下へ移動</SecondaryButton>
       </View>
       <TextInput accessibilityLabel="内部分類名" value={draft.title} onChangeText={(title) => setDraft({ ...draft, title })} style={input} />
       <SecondaryButton disabled={busy || !draft.title.trim()} onPress={() => void run(() => saveTheorySubcategory(draft))}>保存</SecondaryButton>
     </> : null}
   </> : null}
   {error ? <AppText>{error}</AppText> : null}
 </View>;
}
