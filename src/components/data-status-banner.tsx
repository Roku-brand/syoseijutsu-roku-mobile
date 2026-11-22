import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { colors, fonts, radius } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useAppState } from '@/state/app-state';
import { AppText } from './ui';

export function DataStatusBanner() {
  const { user } = useAuth();
  return <DataStatus key={user?.id ?? 'guest'} />;
}

function DataStatus() {
  const router = useRouter();
  const { importLocalData } = useGlobalSearchParams<{ importLocalData?: string }>();
  const requested = importLocalData === '1';
  const reduced = useReducedMotion();
  const { storageError, retrySave, guestImportAvailable, importGuestRecords, dismissGuestImport, syncStatus } = useAppState();
  const [deferred, setDeferred] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const running = useRef(false);
  const act = async (task: () => Promise<unknown>, onSuccess?: () => void) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setMessage('');
    try {
      await task();
      onSuccess?.();
    } catch {
      setMessage('操作を完了できませんでした。データは保持されています。');
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const clearRequest = () => { if (requested) router.setParams({ importLocalData: undefined }); };
  const later = () => {
    if (running.current) return;
    setDeferred(true);
    setMessage('');
    clearRequest();
  };

  return <>
    {storageError ? (
      <View style={styles.banner} accessibilityLiveRegion="polite" testID="data-status-banner">
        <AppText style={styles.bannerCopy}>{message || storageError}</AppText>
        <Pressable disabled={busy} accessibilityRole="button" onPress={() => void act(retrySave)} style={styles.retry}>
          <AppText style={styles.retryText}>{busy ? '確認中…' : '保存を再試行'}</AppText>
        </Pressable>
      </View>
    ) : null}
    <Modal transparent animationType={reduced ? 'none' : 'fade'} visible={!storageError && syncStatus !== 'notice' && guestImportAvailable && (!deferred || requested)}
      onRequestClose={later}>
      <View style={styles.overlay}>
        <View role="dialog" aria-modal accessibilityViewIsModal accessibilityLabel="端末のデータを引き継ぐ"
          testID="guest-data-import-popup" style={styles.popup}>
          <ScrollView bounces={false} contentContainerStyle={styles.inner}>
            <AppText accessibilityRole="header" style={styles.title}>端末のデータを引き継ぐ</AppText>
            <AppText style={styles.copy}>ログイン前の端末内のデータを、このアカウントへ追加できます。</AppText>
            {message ? <AppText accessibilityRole="alert" style={styles.error}>{message}</AppText> : null}
            <View style={styles.actions}>
              <Pressable disabled={busy} accessibilityRole="button" onPress={() => void act(importGuestRecords, clearRequest)} style={[styles.button, styles.primary]}>
                <AppText style={styles.primaryLabel}>{busy ? '引き継ぎ中…' : 'データを引き継ぐ'}</AppText>
              </Pressable>
              <Pressable disabled={busy} accessibilityRole="button" onPress={() => { dismissGuestImport(); clearRequest(); }} style={[styles.button, styles.secondary]}>
                <AppText style={styles.secondaryLabel}>引き継がない</AppText>
              </Pressable>
              <Pressable disabled={busy} accessibilityRole="button" onPress={later} style={styles.button}>
                <AppText style={styles.secondaryLabel}>あとで</AppText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.paperDeep, borderBottomWidth: 1, borderColor: colors.line },
  bannerCopy: { flex: 1, fontSize: 12, lineHeight: 19, color: colors.inkSoft },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  retryText: { fontSize: 12, color: colors.goldDeep, fontWeight: '700' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(22,20,16,0.42)' },
  popup: { width: '100%', maxWidth: 420, maxHeight: '86%', backgroundColor: '#FFFFFF', borderRadius: radius.lg, overflow: 'hidden' },
  inner: { gap: 12, padding: 22 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30, fontWeight: '700' },
  copy: { color: colors.inkSoft, fontSize: 14, lineHeight: 23 },
  error: { color: colors.goldDeep, fontSize: 13, lineHeight: 21 },
  actions: { gap: 8, marginTop: 4 },
  button: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  primary: { backgroundColor: colors.goldDeep },
  primaryLabel: { color: colors.white, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  secondary: { borderWidth: 1, borderColor: colors.line },
  secondaryLabel: { color: colors.goldDeep, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
