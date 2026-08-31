import { StyleSheet, View } from 'react-native';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { OwnerPreviewPanel } from '@/components/owner-preview-panel';
import { colors, spacing } from '@/constants/theme';
import { useAccess } from '@/access/access-state';

export default function OwnerPreviewScreen() {
  const { isOwner } = useAccess();

  if (!isOwner) {
    return (
      <Screen>
        <EmptyState title="owner権限が必要です" description="この画面はコンテンツ管理者専用です。" />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <View style={styles.headingCopy}>
          <AppText variant="label" style={styles.eyebrow}>OWNER PREVIEW</AppText>
          <AppText variant="serif" style={styles.title}>オーナープレビュー</AppText>
          <AppText style={styles.description}>一般利用者に見える状態を切り替えて確認します。</AppText>
        </View>
      </View>
      <View testID="owner-preview-page">
        <OwnerPreviewPanel />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingTop: 8, paddingBottom: 28 },
  topBar: { marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headingCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.gold, letterSpacing: 1.5, fontSize: 11, fontWeight: '700' },
  title: { marginTop: 5, color: colors.ink, fontSize: 28, lineHeight: 38, fontWeight: '700' },
  description: { marginTop: 5, color: colors.muted, fontSize: 13, lineHeight: 21 },
});
