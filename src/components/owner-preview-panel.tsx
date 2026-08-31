import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAccess, type PreviewMode } from '@/access/access-state';

const modes: { value: PreviewMode; label: string }[] = [
  { value: 'actual', label: '実際の権限' },
  { value: 'paid', label: '完全版' },
  { value: 'free', label: '無料版' },
  { value: 'guest', label: '未ログイン' },
  { value: 'checking', label: '確認中' },
  { value: 'error', label: '認証エラー' },
];

export function OwnerPreviewPanel() {
  const { isOwner, previewMode, setPreviewMode } = useAccess();
  if (!isOwner) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headingRow}>
        <AppText style={styles.mark}>主</AppText>
        <View style={styles.copy}>
          <AppText style={styles.title}>オーナープレビュー</AppText>
          <AppText style={styles.lead}>一般利用者に見える状態を、その場で確認できます。</AppText>
        </View>
      </View>
      <View style={styles.modes}>
        {modes.map((mode) => {
          const active = previewMode === mode.value;
          return (
            <Pressable
              key={mode.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => void setPreviewMode(mode.value)}
              style={[styles.mode, active && styles.modeActive]}
            >
              <View style={[styles.radio, active && styles.radioActive]} />
              <AppText style={[styles.modeText, active && styles.modeTextActive]}>{mode.label}</AppText>
            </Pressable>
          );
        })}
      </View>
      {previewMode === 'checking' ? (
        <View testID="owner-preview-checking" style={styles.statusPreview}>
          <AppText style={styles.statusTitle}>利用状態を確認しています</AppText>
          <AppText style={styles.statusBody}>一般利用者には確認中の画面が表示されます。</AppText>
        </View>
      ) : null}
      {previewMode === 'error' ? (
        <View testID="owner-preview-error" style={styles.statusPreview}>
          <AppText style={styles.statusTitle}>利用状態を確認できませんでした</AppText>
          <AppText style={styles.statusBody}>一般利用者には認証エラー画面が表示されます。</AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, backgroundColor: '#F5EFE3' },
  headingRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  mark: { width: 42, height: 42, paddingTop: 8, textAlign: 'center', borderRadius: 21, backgroundColor: colors.charcoal, color: colors.goldLight, fontFamily: fonts.serif, fontSize: 18 },
  copy: { flex: 1 },
  title: { fontFamily: fonts.serif, fontSize: 18, fontWeight: '700' },
  lead: { marginTop: 3, color: colors.muted, fontSize: 12, lineHeight: 18 },
  modes: { marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mode: { minHeight: 42, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  modeActive: { borderColor: colors.gold, backgroundColor: colors.charcoal },
  radio: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: colors.muted },
  radioActive: { backgroundColor: colors.goldLight, borderColor: colors.goldLight },
  modeText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  modeTextActive: { color: colors.goldLight },
  statusPreview: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  statusTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 16, fontWeight: '700' },
  statusBody: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 18 },
});
