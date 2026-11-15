import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppState } from '@/state/app-state';
import { colors } from '@/constants/theme';
import { AppText } from './ui';

export function DataStatusBanner() {
  const { storageError, retrySave, guestImportAvailable, importGuestRecords, dismissGuestImport } = useAppState();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const act = async (task: () => Promise<unknown>) => { setBusy(true); setMessage(''); try { await task(); } catch { setMessage('操作を完了できませんでした。内容は保持されています。'); } finally { setBusy(false); } };
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
