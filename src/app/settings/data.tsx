import { pickPersonalBackupFile } from '@/lib/personal-backup-file';
import { summarizePersonalBackup, type BackupSummary } from '@/state/personal-backup-summary';
import { useLayoutEffect, useRef, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Switch, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { MAX_BACKUP_BYTES, parsePersonalBackup, personalStorageKey } from '@/state/personal-data';
import { useAuth } from '@/auth/auth-state';
import { supabase } from '@/lib/supabase';

export default function PersonalBackupScreen() {
 const { exportPersonalData, restorePersonalData, hydrated, storageError } = useAppState();
 const { user } = useAuth();
 const [lastExport, setLastExport] = useState<string | null>(null);
 const [manual, setManual] = useState(false);
 const [preview, setPreview] = useState<BackupSummary | null>(null);
 const [cloudReadError, setCloudReadError] = useState(false);
 const currentSummary = hydrated ? summarizePersonalBackup(exportPersonalData()) : null;
 const dateLabel = (date: string | null) => date ? new Date(date).toLocaleString('ja-JP') : 'まだありません';
 const previewImport = (text: string) => { parsePersonalBackup(text, JSON.parse(exportPersonalData()).data); setPreview(summarizePersonalBackup(text)); setJson(text); };
 const rememberExport = async (expected: string | undefined) => {
  const stamp = new Date().toISOString();
  try { await AsyncStorage.setItem(personalStorageKey(expected) + '/last-backup-export', stamp); }
  catch { checkUser(expected); return false; }
  checkUser(expected); setLastExport(stamp); return true;
 };
 const activeUser=useRef(user?.id);activeUser.current=user?.id;
 const busyRef=useRef(false);
 const checkUser=(expected:string|undefined)=>{if(activeUser.current!==expected)throw new Error('アカウントが変わりました。もう一度操作してください。');};
 const [json,setJson]=useState(''),[replace,setReplace]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[cloudDate,setCloudDate]=useState<string|null>(null),[confirmCloud,setConfirmCloud]=useState<'save'|'delete'|null>(null);
 useLayoutEffect(()=>{let active=true;setCloudDate(null);setJson('');setMessage('');setConfirmCloud(null);setPreview(null);setManual(false);setLastExport(null);setCloudReadError(false);
  void AsyncStorage.getItem(personalStorageKey(user?.id) + '/last-backup-export').then(date => { if(active && date && Number.isFinite(Date.parse(date))) setLastExport(date); }).catch(() => undefined);
  if(user&&supabase)void supabase.from('personal_backups').select('updated_at').eq('user_id',user.id).maybeSingle().then(({data,error})=>{if(active){setCloudDate(data?.updated_at??null);setCloudReadError(Boolean(error));}},()=>{if(active)setCloudReadError(true);});
  return()=>{active=false;};
 },[user?.id]);
 const run=async(task:()=>Promise<void>)=>{if(busyRef.current)return;const expected=activeUser.current;busyRef.current=true;setBusy(true);setMessage('');try{await task();}catch(error){if(activeUser.current===expected)setMessage(error instanceof Error?error.message:'操作を完了できませんでした。記録は保持されています。');}finally{busyRef.current=false;setBusy(false);}};
 const download=async()=>{const expected=activeUser.current;const text=exportPersonalData();
  if(Platform.OS==='web'){const blob=new Blob([text],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='処世術禄-記録-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  else { const result=await Share.share({title:'処世術禄の記録バックアップ',message:text}); if(result.action===Share.dismissedAction)return; }
  checkUser(expected);const remembered=await rememberExport(expected);
  setMessage(remembered?'バックアップを出力しました。':'バックアップを出力しました。書き出し日時を端末に記録できませんでした。');
 };
 const selectFile=async()=>{const expected=activeUser.current;
  if(Platform.OS!=='web'){const picked=await pickPersonalBackupFile();if(!picked)return;checkUser(expected);previewImport(picked.text);setMessage('ファイルを読み込みました。内容と復元方法を確認してください。');return;}
  const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.onchange=()=>{const file=input.files?.[0];if(!file)return;if(file.size>MAX_BACKUP_BYTES){setMessage('ファイルは5MB以内にしてください。');return;}void run(async()=>{const text=await file.text();checkUser(expected);previewImport(text);setMessage('ファイルを読み込みました。内容と復元方法を確認してください。');});};input.click();
 };
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
  setCloudReadError(false);setCloudDate(result.data.updated_at);setConfirmCloud(null);setMessage('クラウドにバックアップしました。別の端末でも同じアカウントで取り出せます。');
 };
 const loadCloud=async()=>{if(!user||!supabase)return;const result=await supabase.from('personal_backups').select('data,updated_at').eq('user_id',user.id).maybeSingle();
  checkUser(user.id);
  if(result.error)throw new Error('クラウドから取得できませんでした。');
  if(!result.data)throw new Error('クラウドのバックアップはまだありません。');
  previewImport(JSON.stringify(result.data.data,null,2));setManual(true);setCloudReadError(false);setCloudDate(result.data.updated_at);setMessage('クラウドのバックアップを読み込みました。下の復元操作で反映できます。');
 };
 const removeCloud=async()=>{if(!user||!supabase)return;const result=await supabase.from('personal_backups').delete().eq('user_id',user.id).eq('updated_at',cloudDate??'').select('user_id');
  checkUser(user.id);
  if(result.error||!result.data?.length)throw new Error('削除できませんでした。更新日時を確認してやり直してください。');
  setCloudReadError(false);setCloudDate(null);setConfirmCloud(null);setMessage('クラウドのバックアップを削除しました。端末内の記録は保持されています。');
 };
 const button=(label:string,task:()=>Promise<void>|void,secondary=false)=><Pressable disabled={busy||!hydrated} accessibilityRole="button" accessibilityLabel={label} onPress={()=>void run(async()=>{await task();})} style={[styles.button,secondary&&styles.secondary,(busy||!hydrated)&&styles.disabled]}><AppText style={secondary?styles.secondaryText:styles.buttonText}>{label}</AppText></Pressable>;
 return <BookScreen contentContainerStyle={styles.content}>
  <View testID="personal-backup-status" style={styles.status}>
   <AppText accessibilityRole="header" aria-level={2} style={styles.heading}>記録の保存状況</AppText>
   <AppText style={styles.copy}>{!hydrated ? '記録を読み込んでいます。' : storageError || (user ? 'ログイン中のアカウント用の記録を、この端末に自動保存しています。' : '現在の記録は、この端末に自動保存しています。')}</AppText>
   <AppText style={styles.copy}>端末への最終書き出し：{dateLabel(lastExport)}</AppText>
   <AppText style={styles.copy}>アカウントへの最終保存：{!user ? 'ログインすると利用できます' : cloudReadError ? '日時を確認できませんでした' : dateLabel(cloudDate)}</AppText>
   {currentSummary ? <AppText style={styles.counts}>お気に入り {currentSummary.favorites}件・マイ処世術 {currentSummary.memos}件・学習記録 {currentSummary.learning}件</AppText> : null}
  </View>
  <AppText accessibilityRole="header" aria-level={2} style={styles.heading}>記録を手元に残す</AppText>
  <AppText style={styles.copy}>お気に入り、履歴、メモ、座右の銘、フォルダー、学習記録をまとめて保存できます。ログイン中はアカウントごとに端末内の記録を分けています。</AppText>
  {button(Platform.OS==='web'?'バックアップをダウンロード':'バックアップを共有・保存',download)}
  <View style={styles.section}><AppText accessibilityRole="header" aria-level={2} style={styles.heading}>バックアップから復元</AppText>
   {button('バックアップファイルを選ぶ',selectFile,true)}
   <AppText style={styles.copy}>ファイルを選んでも、復元を実行するまでは現在の記録を変更しません。追加する方法では、現在の記録も残します。</AppText>
   {preview ? <View testID="personal-backup-preview" style={styles.status}><AppText style={styles.copy}>バックアップの作成日時：{dateLabel(preview.exportedAt)}</AppText><AppText style={styles.counts}>お気に入り {preview.favorites}件・マイ処世術 {preview.memos}件・学習記録 {preview.learning}件</AppText></View> : null}
   {button(manual?'テキスト入力を閉じる':'テキストから復元する',()=>setManual(value=>!value),true)}
   {manual ? <><AppText style={styles.copy}>以前のバックアップをテキストで保存している場合は、ここに貼り付けて復元できます。</AppText>
   <TextInput accessibilityLabel="バックアップのJSON" testID="personal-backup-input" multiline value={json} onChangeText={value=>{setJson(value);setPreview(null);}} autoCapitalize="none" autoCorrect={false} placeholder="ここにバックアップのJSONを貼り付け" style={styles.input}/>{button('バックアップの内容を確認',()=>previewImport(json),true)}</> : null}
   <View style={styles.option}><AppText style={styles.optionText}>現在の記録を置き換える</AppText><Switch accessibilityLabel="現在の記録を置き換える" {...(Platform.OS==='web'?{activeThumbColor:colors.surface}:{})} trackColor={{false:colors.line,true:colors.gold}} thumbColor={colors.surface} value={replace} onValueChange={setReplace}/></View>
   {replace?<AppText style={styles.copy}>復元前の記録は端末内に1回分保存され、「復元前に戻す」で戻せます。</AppText>:null}
   {button('記録を復元する',async()=>{await restorePersonalData(json,replace?'replace':'merge');setMessage('記録を復元しました。');})}
   {button('復元前に戻す',async()=>{const old=await AsyncStorage.getItem(personalStorageKey(user?.id)+'/before-restore');if(!old)throw new Error('復元前の記録はまだありません。');await restorePersonalData(old,'replace');setMessage('復元前の記録に戻しました。');},true)}
  </View>
  <View style={styles.section}><AppText accessibilityRole="header" aria-level={2} style={styles.heading}>自分のアカウントへ保管</AppText>
   <AppText style={styles.copy}>記録をアカウントに手動でバックアップできます。同じアカウントでログインした端末から取り出せます。自動同期は行いません。</AppText>
   {user?<>{cloudReadError?<AppText style={styles.copy}>保存状況を取得できませんでした。通信を確認して、読み込みをお試しください。</AppText>:cloudDate?<AppText style={styles.copy}>更新日時：{new Date(cloudDate).toLocaleString('ja-JP')}</AppText>:<AppText style={styles.copy}>クラウドのバックアップはまだありません。</AppText>}
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
 status:{padding:16,gap:8,borderRadius:14,borderWidth:1,borderColor:colors.goldSoft,backgroundColor:colors.surface},counts:{fontSize:13,lineHeight:22,color:colors.goldDeep},
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

