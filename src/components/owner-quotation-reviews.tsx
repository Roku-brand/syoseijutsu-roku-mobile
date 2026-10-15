import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { TextInput, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';
import { AppText, SecondaryButton } from './ui';

type Review = { candidateId: string; author: string; candidateText: string; decision: string; reason: string; originalVerification: string; rightsReview: string; primaryUrl?: string | null; collectionUrl: string };
export function OwnerQuotationReviews() {
  const [open,setOpen]=useState(false);
  const [rows,setRows]=useState<Review[]>([]);
  const [query,setQuery]=useState('');
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!open||!supabase)return;
    let active=true;
    void supabase.from('theory_quote_reviews').select('audit').order('candidate_id').then(({data,error})=>{
      if(active){setError(error?'監査記録を読み込めませんでした。':'');setRows((data??[]).map(r=>r.audit as Review));}
    });
    return()=>{active=false;};
  },[open]);
  return <View style={{gap:12,paddingTop:18,borderTopWidth:1,borderColor:colors.line}}>
    <SecondaryButton onPress={()=>setOpen(v=>!v)}>{open?'候補監査を閉じる':'今回の格言候補50件の監査を見る'}</SecondaryButton>
    {open?<>
      <AppText style={{fontSize:12,lineHeight:20,color:colors.muted}}>保留候補を公開するには、新しい下書きで原典・権利の確認を完了してください。監査番号を理論IDへ転用しません。</AppText>
      <TextInput accessibilityLabel="格言候補の監査を検索" value={query} onChangeText={setQuery} placeholder="人物・候補番号で検索" style={{fontSize:16,minHeight:46,padding:12,borderWidth:1,borderColor:colors.line,color:colors.ink}} />
      {error?<AppText>{error}</AppText>:null}
      {rows.filter(r=>(r.candidateId+' '+r.author+' '+r.candidateText).includes(query.trim())).map(r=><View key={r.candidateId} style={{gap:6,padding:12,borderWidth:1,borderColor:colors.line}}>
        <AppText variant="label">候補{r.candidateId} · {r.author} · {r.decision==='hold'?'採用保留':r.decision==='update_existing'?'既存カード更新':'採用'}</AppText>
        <AppText>{r.candidateText}</AppText><AppText style={{fontSize:12,lineHeight:20}}>{r.reason}</AppText><AppText style={{fontSize:12,lineHeight:20}}>{r.rightsReview}</AppText>
        <Link href={(r.primaryUrl??r.collectionUrl) as `https://${string}`} target="_blank" rel="noopener noreferrer">確認資料を開く ↗</Link>
      </View>)}
    </>:null}
  </View>;
}
