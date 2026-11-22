import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppState } from '@/state/app-state';
import { colors } from '@/constants/theme';
import { AppText } from './ui';

export function DataStatusBanner() {
  const router = useRouter();
  const { storageError, retrySave, guestImportAvailable, importGuestRecords, dismissGuestImport, syncStatus, acceptSyncNotice } = useAppState();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const act = async (task: () => Promise<unknown>) => { setBusy(true); setMessage(''); try { await task(); } catch { setMessage('操作を完了できませんでした。内容は保持されています。'); } finally { setBusy(false); } };
  if (syncStatus === 'notice' && !storageError) return <View style={styles.banner} accessibilityLiveRegion="polite">
    <AppText style={styles.copy}>{message || '利用規約とプライバシーポリシーを更新します。同じアカウントの端末で使えるよう、個人記録をSupabaseに保存します。内容を確認して同期を始められます。'}</AppText>
    <View style={styles.actions}>
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/terms')} style={styles.button}><AppText style={styles.action}>利用規約</AppText></Pressable>
      <Pressable accessibilityRole="link" onPress={() => router.push('/legal/privacy')} style={styles.button}><AppText style={styles.action}>プライバシーポリシー</AppText></Pressable>
      <Pressable disabled={busy} accessibilityRole="button" onPress={() => void act(acceptSyncNotice)} style={styles.button}>
        <AppText style={styles.action}>{busy ? '確認中…' : '確認して同期を始める'}</AppText>
      </Pressable>
    </View>
  </View>;
  if (!storageError && !guestImportAvailable && !message) return null;
  return <View style={[styles.banner, !guestImportAvailable && styles.compact]} accessibilityLiveRegion="polite" testID="data-status-banner">
    <AppText style={[styles.copy, !guestImportAvailable && styles.compactCopy]}>{message || storageError || 'ログイン前の端末内の記録を、このアカウントへ追加できます。'}</AppText>
    <View style={styles.actions}>
      <Pressable disabled={busy} accessibilityRole="button" onPress={() => void act(storageError ? retrySave : importGuestRecords)} style={styles.button}><AppText style={styles.action}>{busy ? '確認中…' : storageError ? '保存を再試行' : '記録を引き継ぐ'}</AppText></Pressable>
      {guestImportAvailable ? <Pressable disabled={busy} accessibilityRole="button" onPress={dismissGuestImport} style={styles.button}><AppText style={styles.action}>引き継がない</AppText></Pressable> : null}
    </View>
  </View>;
}
const styles = StyleSheet.create({
  banner: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.paperDeep, borderBottomWidth: 1, borderColor: colors.line, gap: 2 },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  compactCopy: { flex: 1 },
  copy: { fontSize: 12, lineHeight: 19, color: colors.inkSoft },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  action: { fontSize: 12, color: colors.goldDeep, fontWeight: '700' },
});
