import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen, OrnamentHeading, bookCardShadow } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, techniqueCards } from '@/data/catalog';
import { useAppState } from '@/state/app-state';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { formatRemainingAccess } from '@/lib/purchase';

export default function MyOsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { isPaid, accessInfo, accessStatus } = useAccess();
  const { savedIds, savedTheoryIds, historyIds, personalPrinciple, updatePersonalPrinciple, personalMemos } = useAppState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(personalPrinciple);
  const recentCard = techniqueById.get(historyIds[0] ?? '') ?? techniqueById.get(savedIds[0] ?? '') ?? techniqueCards[0];
  const profileName = profile?.displayName?.trim() || user?.email?.split('@')[0] || 'ユーザー';
  const profileBadge = !user ? 'ゲスト' : isPaid ? '完全版' : accessStatus === 'expired' ? '期限終了' : '無料版';
  const profileDescription = !user
    ? 'ログインすると、保存した蔵書を端末をまたいで引き継げます。'
    : isPaid
      ? accessInfo.accessType === 'thirty_day' ? `完全版を利用中・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : '完全版を利用中'
      : accessStatus === 'expired' ? '利用期間が終了しました。設定から再開できます。' : '無料版を利用中・設定から完全版を利用できます。';
  const profileDestination = user ? '/settings/profile' : '/auth?mode=signin';
  const libraryCount = savedIds.length + savedTheoryIds.length;

  const openEditor = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    setDraft(personalPrinciple);
    setEditing(true);
  };

  return <BookScreen>
    <Pressable testID="account-membership-card" accessibilityRole="button" accessibilityLabel={user ? 'プロフィールを開く' : 'ログイン / アカウントを作成'} onPress={() => router.push(profileDestination as never)} style={({ pressed }) => [styles.accountCard, pressed && styles.pressed]}>
      <View style={styles.avatar}>{profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} accessibilityLabel="プロフィール画像" /> : <AppText style={styles.avatarText}>{profileName.slice(0, 1)}</AppText>}</View>
      <View style={styles.profileCopy}><View style={styles.profileNameRow}><AppText style={styles.profileName}>{user ? profileName : 'ログインしていません'}</AppText><View testID="account-plan-badge" style={styles.planBadge}><AppText style={styles.planBadgeText}>{profileBadge}</AppText></View></View><AppText style={styles.profilePlan}>{profileDescription}</AppText><AppText style={styles.profileAction}>{user ? 'プロフィールを設定 ›' : 'ログイン / アカウントを作成 ›'}</AppText></View>
      <AppText style={styles.profileChevron}>›</AppText>
    </Pressable>

    <View style={styles.summaryCard}>
      <Summary label="蔵書" value={libraryCount} />
      <Summary label="マイ処世術" value={personalMemos.length} divided />
      <Summary label="履歴" value={historyIds.length} divided />
    </View>

    <View testID="personal-principle-card" style={styles.principleCard}>
      <View style={styles.principleLabelRow}><AppText style={styles.principleLabel}>いまの判断原則</AppText><Pressable testID="personal-principle-edit" accessibilityRole="button" accessibilityLabel="判断原則を編集" onPress={openEditor} style={({ pressed }) => [styles.editPrinciple, pressed && styles.pressed]}><AppText style={styles.editIcon}>✎</AppText><AppText style={styles.editText}>編集</AppText></Pressable></View>
      <AppText style={styles.principle}>{personalPrinciple}</AppText>
    </View>

    <View style={styles.osActions}>
      <DestinationCard mark="冊" title="蔵書" count={libraryCount} detail="保存した処世術・理論" onPress={() => router.push('/library')} />
      <DestinationCard mark="記" title="マイ処世術" count={personalMemos.length} detail="自分の言葉を残す" onPress={() => router.push('/my-techniques')} />
    </View>

    <View style={styles.historyHeading}><OrnamentHeading>履歴</OrnamentHeading><Pressable accessibilityRole="button" accessibilityLabel="すべての履歴を見る" onPress={() => router.push('/history')} style={styles.historyLink}><AppText style={styles.historyLinkText}>すべて見る ›</AppText></Pressable></View>
    <Pressable accessibilityRole="button" accessibilityLabel={`${recentCard.title}を開く`} onPress={() => router.push({ pathname: '/card/[id]', params: { id: recentCard.id } })} style={({ pressed }) => [styles.recentCard, pressed && styles.pressed]}>
      <View style={styles.recentCopy}><AppText style={styles.recentEyebrow}>{historyIds.length ? '最新の閲覧' : 'おすすめの一枚'}</AppText><AppText style={styles.recentTitle}>{recentCard.title}</AppText><AppText style={styles.recentMeta}>{recentCard.categoryName} · {recentCard.subcategory}</AppText></View><AppText style={styles.chevron}>›</AppText>
    </Pressable>

    <Modal transparent visible={editing} animationType="fade" onRequestClose={() => setEditing(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><AppText style={styles.modalTitle}>判断原則を整える</AppText><AppText style={styles.modalLead}>迷ったときに戻れる一文を書き留めます。</AppText><TextInput autoFocus multiline maxLength={100} value={draft} onChangeText={setDraft} accessibilityLabel="判断原則" style={styles.input} /><View style={styles.modalActions}><Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => { updatePersonalPrinciple(draft); setEditing(false); }} style={styles.save}><AppText style={styles.saveText}>保存する</AppText></Pressable></View></View></View></Modal>
  </BookScreen>;
}

function Summary({ label, value, divided = false }: { label: string; value: number; divided?: boolean }) {
  return <View style={[styles.summaryItem, divided && styles.summaryDivider]}><AppText style={styles.summaryLabel}>{label}</AppText><AppText style={styles.summaryValue}>{value}</AppText></View>;
}

function DestinationCard({ mark, title, count, detail, onPress }: { mark: string; title: string; count: number; detail: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}を開く`} onPress={onPress} style={({ pressed }) => [styles.osActionCard, pressed && styles.pressed]}><AppText style={styles.actionMark}>{mark}</AppText><AppText style={styles.actionTitle}>{title}</AppText><AppText style={styles.savedCount}>{count}</AppText><AppText style={styles.actionSubtitle}>{detail}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  accountCard: { minHeight: 82, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 13, overflow: 'hidden', borderWidth: 1, borderColor: '#D8CBB8', borderRadius: radius.lg, backgroundColor: '#F8F4EC', ...bookCardShadow },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' }, avatarImage: { width: '100%', height: '100%' }, avatarText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23 }, profileCopy: { flex: 1, minWidth: 0 }, profileNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, profileName: { fontSize: 15, lineHeight: 22, fontWeight: '700' }, planBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: '#D7C6AB', backgroundColor: '#FCFAF6' }, planBadgeText: { color: '#81622A', fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 0.4 }, profilePlan: { marginTop: 3, color: colors.muted, fontSize: 11, lineHeight: 17 }, profileAction: { marginTop: 4, color: colors.gold, fontSize: 11, lineHeight: 16, fontWeight: '700' }, profileChevron: { color: colors.gold, fontSize: 27, lineHeight: 30, fontWeight: '300' },
  summaryCard: { minHeight: 70, marginTop: spacing.sm, paddingVertical: 10, flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface }, summaryItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' }, summaryDivider: { borderLeftWidth: 1, borderLeftColor: colors.line }, summaryLabel: { color: colors.muted, fontSize: 10, lineHeight: 15 }, summaryValue: { marginTop: 2, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  principleCard: { marginTop: spacing.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...bookCardShadow }, principleLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, principleLabel: { flex: 1, fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, fontWeight: '600', letterSpacing: 1.5 }, principle: { marginTop: spacing.md, fontFamily: fonts.serif, fontSize: 25, lineHeight: 40, fontWeight: '600', letterSpacing: 1.5 }, editPrinciple: { minHeight: 36, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#D7C6AB', borderRadius: radius.pill, backgroundColor: '#FCFAF6' }, editIcon: { color: colors.gold, fontSize: 17, lineHeight: 20 }, editText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  osActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }, osActionCard: { flex: 1, minHeight: 196, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.48)', alignItems: 'center', justifyContent: 'center' }, actionMark: { color: colors.gold, fontFamily: fonts.serif, fontSize: 20, lineHeight: 27, borderWidth: 1, borderColor: colors.gold, borderRadius: 22, width: 44, height: 44, textAlign: 'center', paddingTop: 8 }, actionTitle: { marginTop: spacing.md, fontFamily: fonts.serif, fontSize: 19, lineHeight: 26, fontWeight: '600', letterSpacing: 1.5 }, savedCount: { marginTop: spacing.sm, color: colors.gold, fontFamily: fonts.serif, fontSize: 38, lineHeight: 46 }, actionSubtitle: { marginTop: 2, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, color: colors.inkSoft },
  historyHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, historyLink: { minHeight: 34, marginTop: spacing.xl, paddingHorizontal: 3, justifyContent: 'center' }, historyLinkText: { color: colors.gold, fontSize: 12, lineHeight: 18, fontWeight: '700' }, recentCard: { minHeight: 86, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface }, recentCopy: { flex: 1, minWidth: 0 }, recentEyebrow: { color: colors.gold, fontSize: 10, lineHeight: 15, fontWeight: '700', letterSpacing: .5 }, recentTitle: { marginTop: 2, fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, fontWeight: '600' }, recentMeta: { marginTop: 2, color: colors.muted, fontSize: 11, lineHeight: 16 }, chevron: { color: colors.gold, fontSize: 31, lineHeight: 34 },
  modalBackdrop: { flex: 1, padding: spacing.lg, backgroundColor: 'rgba(17,18,17,0.58)', alignItems: 'center', justifyContent: 'center' }, modalCard: { width: '100%', maxWidth: 520, padding: spacing.xl, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.lg, backgroundColor: colors.surface }, modalTitle: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 32, fontWeight: '600' }, modalLead: { marginTop: spacing.sm, color: colors.muted }, input: { minHeight: 130, marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 30, textAlignVertical: 'top' }, modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }, cancel: { minHeight: 50, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: colors.muted, fontWeight: '700' }, save: { flex: 1, minHeight: 50, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }, saveText: { color: '#FFFFFF', fontWeight: '700' }, pressed: { opacity: 0.7 },
});
