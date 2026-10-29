import { useLayoutEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Switch, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { MAX_BACKUP_BYTES, personalStorageKey } from '@/state/personal-data';
import { useAuth } from '@/auth/auth-state';
import { supabase } from '@/lib/supabase';

export default function PersonalBackupScreen() {
 const { exportPersonalData, restorePersonalData, hydrated } = useAppState();
 const { user } = useAuth();
 const activeUser=useRef(user?.id);activeUser.current=user?.id;
 const checkUser=(expected:string|undefined)=>{if(activeUser.current!==expected)throw new Error('アカウントが変わりました。もう一度操作してください。');};
 const [json,setJson]=useState(''),[replace,setReplace]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[cloudDate,setCloudDate]=useState<string|null>(null),[confirmCloud,setConfirmCloud]=useState<'save'|'delete'|null>(null);
 useLayoutEffect(()=>{let active=true;setCloudDate(null);setJson('');setMessage('');setConfirmCloud(null);
  if(user&&supabase)void supabase.from('personal_backups').select('updated_at').eq('user_id',user.id).maybeSingle().then(({data})=>{if(active)setCloudDate(data?.updated_at??null);});
  return()=>{active=false;};
 },[user?.id]);
 const run=async(task:()=>Promise<void>)=>{const expected=activeUser.current;setBusy(true);setMessage('');try{await task();}catch(error){if(activeUser.current===expected)setMessage(error instanceof Error?error.message:'操作を完了できませんでした。記録は保持されています。');}finally{setBusy(false);}};
 const download=async()=>{const text=exportPersonalData();
  if(Platform.OS==='web'){const blob=new Blob([text],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='処世術禄-記録-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  else await Share.share({title:'処世術禄の記録バックアップ',message:text});
  setMessage('バックアップを出力しました。');
 };
 const selectFile=()=>{if(Platform.OS!=='web')return;const expected=activeUser.current;const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=()=>{const f=input.files?.[0];if(!f)return;if(f.size>MAX_BACKUP_BYTES){setMessage('ファイルは5MB以内にしてください。');return;}void run(async()=>{const text=await f.text();checkUser(expected);setJson(text);setMessage('ファイルを読み込みました。復元方法を確認してください。');});};input.click();};
 const saveCloud=async()=>{if(!user||!supabase)throw new Error('ログイン後に利用できます。');
  const expectedUser=user.id;const data=JSON.parse(exportPersonalData());
  const old=await supabase.from('personal_backups').select('data,updated_at').eq('user_id',expectedUser).maybeSingle();
  checkUser(expectedUser);
  if(old.error)throw new Error('クラウドの記録を確認できませんでした。通信を確認してください。');
  if((old.data?.updated_at??null)!==cloudDate) {setCloudDate(old.data?.updated_at??null);throw new Error('別の端末で更新されています。更新日時を確認して、もう一度保存してください。');}
  if(old.data)await AsyncStorage.setItem(personalStorageKey(expectedUser)+'/cloud-before-overwrite',JSON.stringify(old.data.data));
  checkUser(expectedUser);
  const body={schema_version:1,data};
  const result=old.data
   ? await supabase.from('personal_backups').update(body).eq('user_id',expectedUser).eq('updated_at',old.data.updated_at).select('updated_at').single()
   : await supabase.from('personal_backups').insert({...body,user_id:expectedUser}).select('updated_at').single();
  if(result.error||!result.data)throw new Error('保存できませんでした。他の端末で更新された可能性があります。現在の記録は保持されています。');
  checkUser(expectedUser);
  setCloudDate(result.data.updated_at);setConfirmCloud(null);setMessage('クラウドにバックアップしました。別の端末でも同じアカウントで取り出せます。');
 };
 const loadCloud=async()=>{if(!user||!supabase)return;const result=await supabase.from('personal_backups').select('data,updated_at').eq('user_id',user.id).maybeSingle();
  checkUser(user.id);
  if(result.error)throw new Error('クラウドから取得できませんでした。');
  if(!result.data)throw new Error('クラウドのバックアップはまだありません。');
  setJson(JSON.stringify(result.data.data,null,2));setCloudDate(result.data.updated_at);setMessage('クラウドのバックアップを読み込みました。下の復元操作で反映できます。');
 };
 const removeCloud=async()=>{if(!user||!supabase)return;const result=await supabase.from('personal_backups').delete().eq('user_id',user.id).eq('updated_at',cloudDate??'').select('user_id');
  checkUser(user.id);
  if(result.error||!result.data?.length)throw new Error('削除できませんでした。更新日時を確認してやり直してください。');
  setCloudDate(null);setConfirmCloud(null);setMessage('クラウドのバックアップを削除しました。端末内の記録は保持されています。');
 };
 const button=(label:string,task:()=>Promise<void>|void,secondary=false)=><Pressable disabled={busy||!hydrated} accessibilityRole="button" accessibilityLabel={label} onPress={()=>void run(async()=>{await task();})} style={[styles.button,secondary&&styles.secondary,(busy||!hydrated)&&styles.disabled]}><AppText style={secondary?styles.secondaryText:styles.buttonText}>{label}</AppText></Pressable>;
 return <BookScreen contentContainerStyle={styles.content}>
  <AppText accessibilityRole="header" aria-level={2} style={styles.heading}>記録を手元に残す</AppText>
  <AppText style={styles.copy}>お気に入り、履歴、メモ、座右の銘、フォルダー、学習記録をまとめて保存できます。ログイン中はアカウントごとに端末内の記録を分けています。</AppText>
  {button(Platform.OS==='web'?'バックアップをダウンロード':'バックアップを共有・保存',download)}
  <View style={styles.section}><AppText accessibilityRole="header" aria-level={2} style={styles.heading}>バックアップから復元</AppText>
   {Platform.OS==='web'?button('バックアップファイルを選ぶ',selectFile,true):null}
   <AppText style={styles.copy}>バックアップのJSONを貼り付けても復元できます。追加する方法では、現在の記録も残します。</AppText>
   <TextInput accessibilityLabel="バックアップのJSON" testID="personal-backup-input" multiline value={json} onChangeText={setJson} autoCapitalize="none" autoCorrect={false} placeholder="ここにバックアップのJSONを貼り付け" style={styles.input}/>
   <View style={styles.option}><AppText style={styles.optionText}>現在の記録を置き換える</AppText><Switch accessibilityLabel="現在の記録を置き換える" {...(Platform.OS==='web'?{activeThumbColor:colors.surface}:{})} trackColor={{false:colors.line,true:colors.gold}} thumbColor={colors.surface} value={replace} onValueChange={setReplace}/></View>
   {replace?<AppText style={styles.copy}>復元前の記録は端末内に1回分保存され、「復元前に戻す」で戻せます。</AppText>:null}
   {button('記録を復元する',async()=>{await restorePersonalData(json,replace?'replace':'merge');setMessage('記録を復元しました。');})}
   {button('復元前に戻す',async()=>{const old=await AsyncStorage.getItem(personalStorageKey(user?.id)+'/before-restore');if(!old)throw new Error('復元前の記録はまだありません。');await restorePersonalData(old,'replace');setMessage('復元前の記録に戻しました。');},true)}
  </View>
  <View style={styles.section}><AppText accessibilityRole="header" aria-level={2} style={styles.heading}>自分のアカウントへ保管</AppText>
   <AppText style={styles.copy}>希望するときだけ、個人の記録をSupabaseの非公開領域へ送信します。同じアカウントでログインした端末から取得できます。自動同期は行いません。</AppText>
   {user?<>{cloudDate?<AppText style={styles.copy}>更新日時：{new Date(cloudDate).toLocaleString('ja-JP')}</AppText>:<AppText style={styles.copy}>クラウドのバックアップはまだありません。</AppText>}
    {button('クラウドへバックアップ',()=>setConfirmCloud('save'))}
    {button('クラウドから読み込む',loadCloud,true)}
    {cloudDate?button('クラウドのバックアップを削除',()=>setConfirmCloud('delete'),true):null}
    {confirmCloud?<View style={styles.confirm} accessibilityLiveRegion="polite"><AppText style={styles.copy}>{confirmCloud==='save'?'現在の記録をクラウドへ送信し、保存済みのバックアップがあれば更新します。':'クラウドのバックアップを削除します。端末内の記録は保持されます。'}</AppText>{button(confirmCloud==='save'?'送信して保存する':'削除を確定する',confirmCloud==='save'?saveCloud:removeCloud)}{button('キャンセル',()=>setConfirmCloud(null),true)}</View>:null}
   </>:<AppText style={styles.copy}>アカウントでログインすると利用できます。端末へのバックアップはログインせずに利用できます。</AppText>}
  </View>
  {message?<AppText accessibilityRole="alert" testID="personal-backup-message" style={styles.message}>{message}</AppText>:null}
 </BookScreen>;
}
const styles=StyleSheet.create({
 content:{width:'100%',maxWidth:760,alignSelf:'center',padding:20,gap:12,paddingBottom:100},
 heading:{fontFamily:fonts.serif,fontSize:23,lineHeight:34,color:colors.ink,fontWeight:'600'},
 copy:{fontSize:14,lineHeight:24,color:colors.inkSoft},
 section:{marginTop:24,gap:12,borderTopWidth:1,borderColor:colors.line,paddingTop:24},
 button:{minHeight:48,paddingHorizontal:18,paddingVertical:12,backgroundColor:colors.goldDeep,borderRadius:radius.sm,alignItems:'center',justifyContent:'center'},
 buttonText:{color:colors.white,fontSize:14,fontWeight:'600'},secondary:{backgroundColor:colors.surface,borderWidth:1,borderColor:colors.line},secondaryText:{color:colors.goldDeep,fontSize:14,fontWeight:'600'},
 disabled:{opacity:.6},input:{minHeight:150,maxHeight:300,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:12,color:colors.ink,backgroundColor:colors.surface,fontSize:13,textAlignVertical:'top'},
 option:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,minHeight:48},optionText:{flex:1,color:colors.ink,fontSize:14},
 confirm:{padding:14,gap:10,backgroundColor:colors.paperDeep,borderRadius:12},message:{fontSize:14,lineHeight:24,color:colors.goldDeep,paddingVertical:16},
});

