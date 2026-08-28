import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { OwnerPreviewPanel } from '@/components/owner-preview-panel';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { formatRemainingAccess } from '@/lib/purchase';

export default function MyOsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { isPaid, accessInfo, accessStatus } = useAccess();
  const { savedIds, savedTheoryIds, personalMemos, personalMemoFolders } = useAppState();
  const profileName = profile?.displayName?.trim() || user?.email?.split('@')[0] || 'ユーザー';
  const profileBadge = !user ? 'ゲスト' : isPaid ? '完全版' : accessStatus === 'expired' ? '期限終了' : '無料版';
  const profileDescription = !user
    ? 'ログインすると、保存した蔵書を端末をまたいで引き継げます。'
    : isPaid
      ? accessInfo.accessType === 'thirty_day' ? `完全版を利用中・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : '完全版を利用中'
      : accessStatus === 'expired' ? '利用期間が終了しました。設定から再開できます。' : '無料版を利用中・設定から完全版を利用できます。';
  const profileDestination = user ? '/settings/profile' : '/auth?mode=signin';
  const libraryCount = savedIds.length + savedTheoryIds.length;

  return <BookScreen>
    <OwnerPreviewPanel />
    <Pressable testID="account-membership-card" onPress={() => router.push(profileDestination as never)} style={({ pressed }) => [styles.accountCard, pressed && styles.pressed]}>
      <View style={styles.avatar}>{profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} accessibilityLabel="プロフィール画像" /> : <AppText style={styles.avatarText}>{profileName.slice(0, 1)}</AppText>}</View>
      <View style={styles.profileCopy}>
        <View style={styles.profileNameRow}><AppText style={styles.profileName}>{user ? profileName : 'ログインしていません'}</AppText><View testID="account-plan-badge" style={styles.planBadge}><AppText style={styles.planBadgeText}>{profileBadge}</AppText></View></View>
        <AppText style={styles.profilePlan}>{profileDescription}</AppText>
      </View>
      <AppText style={styles.profileChevron}>›</AppText>
    </Pressable>

    <View style={styles.summaryCard}>
      <Summary label="蔵書" value={libraryCount} />
      <View style={styles.summaryDivider} />
      <Summary label="マイ処世術" value={personalMemos.length} />
    </View>

    <View style={styles.destinationList}>
      <DestinationRow mark="冊" title="蔵書" detail="保存した処世術・理論を読み返す" count={libraryCount} onPress={() => router.push('/library')} />
      <DestinationRow mark="＋" title="マイ処世術" detail={personalMemoFolders.length ? `${personalMemoFolders.length}フォルダーで整理中` : '自分の言葉で作り、整理する'} count={personalMemos.length} onPress={() => router.push('/my-techniques')} />
    </View>
  </BookScreen>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <View style={styles.summaryItem}><AppText style={styles.summaryLabel}>{label}</AppText><AppText style={styles.summaryValue}>{value}</AppText></View>;
}

function DestinationRow({ mark, title, detail, count, onPress }: { mark: string; title: string; detail: string; count: number; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}を開く`} onPress={onPress} style={({ pressed }) => [styles.destinationRow, pressed && styles.pressed]}>
    <View style={styles.destinationMark}><AppText style={styles.destinationMarkText}>{mark}</AppText></View>
    <View style={styles.destinationCopy}><AppText variant="serif" style={styles.destinationTitle}>{title}</AppText><AppText style={styles.destinationDetail}>{detail}</AppText></View>
    <AppText variant="serif" style={styles.destinationCount}>{count}</AppText><AppText style={styles.destinationChevron}>›</AppText>
  </Pressable>;
}

const styles = StyleSheet.create({
  accountCard: { minHeight: 82, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 13, overflow: 'hidden', borderWidth: 1, borderColor: '#D8CBB8', borderRadius: radius.lg, backgroundColor: '#F8F4EC', ...bookCardShadow },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23 },
  profileCopy: { flex: 1, minWidth: 0 },
  profileNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  profileName: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  planBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: '#D7C6AB', backgroundColor: '#FCFAF6' },
  planBadgeText: { color: '#81622A', fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 0.4 },
  profilePlan: { marginTop: 3, color: colors.muted, fontSize: 11, lineHeight: 17 },
  profileChevron: { color: colors.gold, fontSize: 27, lineHeight: 30, fontWeight: '300' },
  summaryCard: { minHeight: 70, marginTop: spacing.sm, paddingVertical: 10, flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  summaryItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  summaryDivider: { width: 1, backgroundColor: colors.line, marginVertical: 6 },
  summaryLabel: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  summaryValue: { marginTop: 2, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  destinationList: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.line },
  destinationRow: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  destinationMark: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold },
  destinationMarkText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 18, lineHeight: 23 },
  destinationCopy: { flex: 1, minWidth: 0 },
  destinationTitle: { color: colors.ink, fontSize: 19, lineHeight: 27, fontWeight: '600', letterSpacing: 1.2 },
  destinationDetail: { marginTop: 2, color: colors.muted, fontSize: 12, lineHeight: 19 },
  destinationCount: { color: colors.gold, fontSize: 23, lineHeight: 30 },
  destinationChevron: { color: colors.gold, fontSize: 28, lineHeight: 31, fontWeight: '300' },
  pressed: { opacity: 0.66 },
});
