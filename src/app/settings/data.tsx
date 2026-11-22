import { useRouter } from 'expo-router';
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
import { syncIdentity, type RecoveryEntry } from '@/state/personal-sync-model';

const syncLabels = {
  notice: '個人データの同期を開始できます。',
  local: '端末に保存中',
  waiting: '同期を待っています',
  syncing: '同期中',
  synced: '同期済み',
  offline: '端末に保存しています。通信が回復するとクラウドへの保存を再試行します。',
  reset: 'アカウントのデータが削除されました。',
};
const recoveryLabels = { conflict: '別端末との競合', delete_conflict: '削除と編集の競合', deleted: '削除前', edited: '編集前' };
const fieldLabels: Partial<Record<ReturnType<typeof syncIdentity>[0], string>> = {
  savedIds: '保存した処世術', savedTheoryIds: '保存した理論', savedFeatureIds: '保存した特集',
  personalMemos: 'マイ処世術', personalMemoFolders: 'マイ処世術のフォルダー',
  libraryFolders: '蔵書フォルダー', libraryFolderByItem: '保存先', personalPrinciple: '座右の銘',
  notes: 'メモ', learningRecords: '学習記録', practiceRecords: '実践記録', reviewCaseIds: '復習',
  historyIds: '閲覧履歴', featureHistoryIds: '特集の閲覧履歴', interests: '関心カテゴリ',
};

export default function PersonalDataScreen() {
 const {
  exportPersonalData, restorePersonalData, hydrated, storageError, retrySave,
  syncStatus, lastSyncedAt, hasUnsyncedRecords, syncNow, guestImportAvailable, clearPersonalData,
  clearCloudPersonalData, listPersonalRecovery, restorePersonalRecovery,
 } = useAppState();
 const { user } = useAuth();
 const router = useRouter();
 const [showFiles, setShowFiles] = useState(false);
 const [manual, setManual] = useState(false);
 const [preview, setPreview] = useState<BackupSummary | null>(null);
 const [recovery, setRecovery] = useState<RecoveryEntry[] | null>(null);
 const [hasMore, setHasMore] = useState(false);
 const [confirm, setConfirm] = useState<'device' | 'cloud' | RecoveryEntry | null>(null);
 const [json, setJson] = useState('');
 const [replace, setReplace] = useState(false);
 const [busy, setBusy] = useState(false);
 const [message, setMessage] = useState('');
 const currentSummary = hydrated ? summarizePersonalBackup(exportPersonalData()) : null;
 const previewImport = (text: string) => {
  setPreview(null); setJson(text);
  parsePersonalBackup(text, JSON.parse(exportPersonalData()).data);
  setPreview(summarizePersonalBackup(text));
 };
 const activeUser = useRef(user?.id);
 activeUser.current = user?.id;
 const busyRef = useRef(false);
 const checkUser = (expected: string | undefined) => {
  if (activeUser.current !== expected) throw new Error('アカウントが変わりました。もう一度操作してください。');
 };
 useLayoutEffect(() => {
  setShowFiles(false); setManual(false); setPreview(null); setRecovery(null);
  setHasMore(false); setConfirm(null); setJson(''); setReplace(false); setMessage('');
 }, [user?.id]);
 const run = async (task: () => Promise<void>) => {
  if (busyRef.current) return;
  const expected = activeUser.current;
  busyRef.current = true; setBusy(true); setMessage('');
  try { await task(); }
  catch (error) {
   if (activeUser.current === expected) setMessage(error instanceof Error ? error.message : '操作を完了できませんでした。');
  } finally { busyRef.current = false; setBusy(false); }
 };
 const download = async () => {
  const expected = activeUser.current, text = exportPersonalData();
  if (Platform.OS === 'web') {
   const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
   const link = document.createElement('a');
   link.href = url; link.download = '処世術禄-データ-' + new Date().toISOString().slice(0, 10) + '.json';
   link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
   const result = await Share.share({ title: '処世術禄のデータバックアップ', message: text });
   if (result.action === Share.dismissedAction) return;
  }
  checkUser(expected);
  setMessage('データを書き出しました。');
 };
 const selectFile = async () => {
  const expected = activeUser.current;
  if (Platform.OS !== 'web') {
   const picked = await pickPersonalBackupFile();
   if (!picked) return;
   checkUser(expected); previewImport(picked.text); return;
  }
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = () => {
   const file = input.files?.[0];
   if (!file || activeUser.current !== expected) return;
   void run(async () => {
    setPreview(null); setJson('');
    if (file.size > MAX_BACKUP_BYTES) throw new Error('ファイルは5MB以内にしてください。');
    const text = await file.text();
    checkUser(expected); previewImport(text);
   });
  };
  input.click();
 };
 const loadRecovery = async (more = false) => {
  const expected = activeUser.current;
  const rows = await listPersonalRecovery(more ? recovery?.at(-1)?.id : undefined);
  checkUser(expected);
  setRecovery(more ? [...(recovery ?? []), ...rows] : rows);
  setHasMore(rows.length === 20);
 };
 const performDelete = async () => {
  const action = confirm;
  setConfirm(null);
  if (action === 'device') {
   await clearPersonalData();
   setMessage('この端末のデータを削除しました。');
  } else if (action === 'cloud') {
   await clearCloudPersonalData();
   setRecovery(null);
   setMessage('アカウントのデータと復旧履歴を削除しました。');
  } else if (action !== null) {
   await restorePersonalRecovery(action.id);
   setMessage('選んだデータを復旧しました。');
   await loadRecovery();
  }
 };
 const button=(label:string,task:()=>Promise<void>|void,secondary=false)=><Pressable disabled={busy||!hydrated} accessibilityRole="button" accessibilityLabel={label} onPress={()=>void run(async()=>{await task();})} style={[styles.button,secondary&&styles.secondary,(busy||!hydrated)&&styles.disabled]}><AppText style={secondary?styles.secondaryText:styles.buttonText}>{label}</AppText></Pressable>;
 return <BookScreen contentContainerStyle={styles.content}>
  <View testID="personal-backup-status" style={styles.status}>
   <AppText accessibilityRole="header" style={styles.heading}>データの保存状況</AppText>
   <AppText style={styles.copy}>{!hydrated ? 'データを読み込んでいます。' : storageError || (user ? syncLabels[syncStatus] : 'この端末に自動保存しています。ログインすると、同じアカウントの端末でデータを使えます。')}</AppText>
   {user && hydrated && syncStatus !== 'notice' ? <AppText style={styles.copy}>同じアカウントの端末にデータを自動同期します。</AppText> : null}
   {user && lastSyncedAt ? <AppText style={styles.copy}>最終同期 {new Date(lastSyncedAt).toLocaleString('ja-JP')}</AppText> : null}
   {user && hasUnsyncedRecords ? <AppText style={styles.copy}>この端末に未同期の変更があります。</AppText> : null}
   {currentSummary ? <AppText style={styles.counts}>お気に入り {currentSummary.favorites}件・マイ処世術 {currentSummary.memos}件・学習記録 {currentSummary.learning}件</AppText> : null}
   {storageError ? button('端末への保存を再試行', retrySave, true) : user && syncStatus !== 'notice' ? button('同期を確認する', syncNow, true) : null}
   {!storageError && user && hydrated && syncStatus === 'notice' ? button('同期の案内を確認する', () => router.setParams({ dataPrompt: 'sync' }), true) : null}
   {!storageError && guestImportAvailable && syncStatus !== 'notice' ? button('端末のデータを引き継ぐ', () => router.setParams({ dataPrompt: 'import' }), true) : null}
  </View>
  {user && syncStatus !== 'notice' ? <View style={styles.section}>
   <AppText accessibilityRole="header" style={styles.heading}>最近のデータを復旧</AppText>
   <AppText style={styles.copy}>削除や競合があったデータを、過去30日分の履歴から探せます。</AppText>
   {button(recovery === null ? '復旧履歴を表示' : '復旧履歴を更新', () => loadRecovery(), true)}
   {recovery?.length === 0 ? <AppText style={styles.copy}>復旧できる履歴はありません。</AppText> : null}
   {recovery?.map(entry => <View key={entry.id} style={styles.status}>
    <AppText style={styles.counts}>{fieldLabels[syncIdentity(entry.key)[0]] ?? '個人データ'}・{recoveryLabels[entry.reason]}</AppText>
    {entry.preview ? <AppText style={styles.copy}>{entry.preview}</AppText> : null}
    <AppText style={styles.copy}>{new Date(entry.created_at).toLocaleString('ja-JP')}</AppText>
    {confirm === entry ? <View style={styles.confirm} accessibilityLiveRegion="polite">
     <AppText style={styles.copy}>選んだデータを復旧し、同じアカウントの端末にも同期します。</AppText>
     {button('復旧を確定する', performDelete)}
     {button('キャンセル', () => setConfirm(null), true)}
    </View> : button('このデータを復旧する', () => setConfirm(entry), true)}
   </View>)}
   {hasMore ? button('さらに表示', () => loadRecovery(true), true) : null}
  </View> : null}
  <View style={styles.section}>
   <AppText accessibilityRole="header" style={styles.heading}>データを削除</AppText>
   <View style={styles.deleteScope}>
    <AppText accessibilityRole="header" style={styles.scopeTitle}>この端末のデータ</AppText>
    <AppText style={styles.copy}>{user ? 'この端末のデータを削除してログアウトします。同期済みデータはアカウントに残ります。' : 'ログインせずに、この端末に保存したデータが対象です。'}</AppText>
    {confirm === 'device' ? <View style={styles.confirm} accessibilityLiveRegion="polite">
     <AppText style={styles.copy}>{user ? '未同期の変更は失われます。同期済みデータは再ログインすると取得できます。' : '削除したデータは元に戻せません。'}</AppText>
     {button('端末の削除を確定する', performDelete)}
     {button('キャンセル', () => setConfirm(null), true)}
    </View> : button('この端末のデータを削除', () => setConfirm('device'), true)}
   </View>
   {user ? <View style={styles.deleteScope}>
    <AppText accessibilityRole="header" style={styles.scopeTitle}>アカウントのデータ</AppText>
    <AppText style={styles.copy}>同期済みのデータを削除します。同じアカウントの他の端末にも反映されます。</AppText>
    {confirm === 'cloud' ? <View style={styles.confirm} accessibilityLiveRegion="polite">
     <AppText style={styles.copy}>復旧履歴とクラウドのバックアップも削除されます。他の端末の未同期の変更は、次回の同期時に破棄されます。アカウントと完全版の利用権は残ります。</AppText>
     {button('アカウントのデータ削除を確定する', performDelete)}
     {button('キャンセル', () => setConfirm(null), true)}
    </View> : button('アカウントのデータを削除', () => setConfirm('cloud'), true)}
   </View> : null}
  </View>
  <View style={styles.section}>
   {button(showFiles ? 'ファイルの操作を閉じる' : 'ファイルの書き出し・読み込み', () => setShowFiles(!showFiles), true)}
   {showFiles ? <>
    <AppText style={styles.copy}>データをファイルに保存できます。</AppText>
    {button(Platform.OS === 'web' ? 'バックアップをダウンロード' : 'バックアップを共有・保存', download, true)}
  <View style={styles.section}><AppText accessibilityRole="header" aria-level={2} style={styles.heading}>バックアップから復元</AppText>
   {button('バックアップファイルを選ぶ',selectFile,true)}
   <AppText style={styles.copy}>ファイルを選ぶと内容を確認できます。通常は現在のデータに追加します。</AppText>
   {preview ? <View testID="personal-backup-preview" style={styles.status}><AppText style={styles.copy}>バックアップの作成日時：{preview.exportedAt ? new Date(preview.exportedAt).toLocaleString('ja-JP') : '不明'}</AppText><AppText style={styles.counts}>お気に入り {preview.favorites}件・マイ処世術 {preview.memos}件・学習記録 {preview.learning}件</AppText></View> : null}
   {button(manual?'テキスト入力を閉じる':'テキストから復元する',()=>setManual(value=>!value),true)}
   {manual ? <><AppText style={styles.copy}>以前のバックアップをテキストで保存している場合は、ここに貼り付けて復元できます。</AppText>
   <TextInput accessibilityLabel="バックアップのJSON" testID="personal-backup-input" multiline value={json} onChangeText={value=>{setJson(value);setPreview(null);}} autoCapitalize="none" autoCorrect={false} placeholder="ここにバックアップのJSONを貼り付け" style={styles.input}/>{button('バックアップの内容を確認',()=>previewImport(json),true)}</> : null}
   <View style={styles.option}><AppText style={styles.optionText}>現在のデータを置き換える</AppText><Switch accessibilityLabel="現在のデータを置き換える" {...(Platform.OS==='web'?{activeThumbColor:colors.surface}:{})} trackColor={{false:colors.line,true:colors.gold}} thumbColor={colors.surface} value={replace} onValueChange={setReplace}/></View>
   {replace?<AppText style={styles.copy}>置き換え前のデータは端末に1回分保存されます。</AppText>:null}
   {button('データを復元する',async()=>{await restorePersonalData(json,replace?'replace':'merge');setMessage('データを復元しました。');})}
   {button('復元前に戻す',async()=>{const old=await AsyncStorage.getItem(personalStorageKey(user?.id)+'/before-restore');if(!old)throw new Error('復元前のデータはまだありません。');await restorePersonalData(old,'replace');setMessage('復元前のデータに戻しました。');},true)}
  </View>
   </> : null}
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
 deleteScope:{padding:14,gap:8,borderWidth:1,borderColor:colors.line,borderRadius:12,backgroundColor:colors.surface},
 scopeTitle:{fontFamily:fonts.serif,fontSize:17,lineHeight:24,fontWeight:'600',color:colors.ink},
 confirm:{padding:14,gap:10,backgroundColor:colors.paperDeep,borderRadius:12},message:{fontSize:14,lineHeight:24,color:colors.goldDeep,paddingVertical:16},
});

