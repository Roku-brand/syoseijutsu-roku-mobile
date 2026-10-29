import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { AppText } from './ui';
import { readContentRevision } from '@/lib/content-revision';
import { colors } from '@/constants/theme';

export function OwnerPublicationStatus(){
 const [status,setStatus]=useState('公開版の更新時点を確認できます。');
 const check=async()=>{
  try{
   const [response,revision]=await Promise.all([fetch('/content-build.json',{cache:'no-store'}),readContentRevision(true)]);
   if(!response.ok||!revision)throw new Error();
   const build=await response.json();
   setStatus(build.catalogRevision===revision?`公開版の生成日時：${new Date(build.builtAt).toLocaleString('ja-JP')}。生成後のCMS変更はありません。`:'公開版の生成後にCMSが更新されています。アプリ内の内容は随時反映されます。検索向けHTMLとサイトマップはWeb版の再公開で更新してください。');
  }catch{setStatus('公開版との比較ができませんでした。通信を確認して再試行してください。');}
 };
 useEffect(()=>{if(Platform.OS==='web')void check();},[]);
 if(Platform.OS!=='web')return null;
 return <View style={{padding:12,gap:6,borderWidth:1,borderColor:colors.line,borderRadius:10}} testID="owner-publication-status"><AppText style={{color:colors.inkSoft,fontSize:13,lineHeight:22}}>{status}</AppText><Pressable accessibilityRole="button" accessibilityLabel="公開版の反映状況を再確認" onPress={()=>void check()} style={{minHeight:44,justifyContent:'center'}}><AppText style={{color:colors.goldDeep}}>反映状況を再確認</AppText></Pressable></View>;
}
