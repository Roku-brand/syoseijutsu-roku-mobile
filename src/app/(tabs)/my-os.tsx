import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BookScreen, OrnamentHeading, bookCardShadow } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, techniqueCards } from '@/data/catalog';
import { useAppState } from '@/state/app-state';
import { OwnerPreviewPanel } from '@/components/owner-preview-panel';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { formatRemainingAccess } from '@/lib/purchase';

export default function MyOsScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { isPaid, accessInfo, accessStatus } = useAccess();
  const {
    savedIds,
    savedTheoryIds,
    historyIds,
    personalPrinciple,
    updatePersonalPrinciple,
    personalMemos,
    addPersonalMemo,
    removePersonalMemo,
  } = useAppState();
  const [editing, setEditing] = useState(false);
  const [memosOpen, setMemosOpen] = useState(false);
  const [draft, setDraft] = useState(personalPrinciple);
  const [memoDraft, setMemoDraft] = useState('');
  const recentCard =
    techniqueById.get(historyIds[0] ?? '') ??
    techniqueById.get(savedIds[0] ?? '') ??
    techniqueCards[0];
  const profileName = profile?.displayName?.trim() || user?.email?.split('@')[0] || 'ユーザー';
  const profileBadge = !user ? 'ゲスト' : isPaid ? '完全版' : accessStatus === 'expired' ? '期限終了' : '無料版';
  const profileDescription = !user
    ? 'ログインすると、保存した蔵書を端末をまたいで引き継げます。'
    : isPaid
      ? accessInfo.accessType === 'thirty_day' ? `完全版を利用中・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : '完全版を利用中'
      : accessStatus === 'expired' ? '利用期間が終了しました。設定から再開できます。' : '無料版を利用中・設定から完全版を利用できます。';
  const profileDestination = user ? '/settings/profile' : '/auth?mode=signin';

  const openEditor = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    setDraft(personalPrinciple);
    setEditing(true);
  };

  return (
    <BookScreen>
      <OwnerPreviewPanel />
      <Pressable testID="account-membership-card" onPress={() => router.push(profileDestination as never)} style={({ pressed }) => [styles.accountCard, pressed && styles.pressed]}>
        <View style={styles.avatar}>{profile?.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} accessibilityLabel="プロフィール画像" /> : <AppText style={styles.avatarText}>{profileName.slice(0, 1)}</AppText>}</View>
        <View style={styles.profileCopy}>
          <View style={styles.profileNameRow}>
            <AppText style={styles.profileName}>{user ? profileName : 'ログインしていません'}</AppText>
            <View testID="account-plan-badge" style={styles.planBadge}>
              <AppText style={styles.planBadgeText}>{profileBadge}</AppText>
            </View>
          </View>
          <AppText style={styles.profilePlan}>{profileDescription}</AppText>
        </View>
        <AppText style={styles.profileChevron}>›</AppText>
      </Pressable>

      <View style={styles.summaryCard}>
        {[
          ['蔵書', savedIds.length + savedTheoryIds.length],
          ['マイ処世術', personalMemos.length],
          ['閲覧履歴', historyIds.length],
        ].map(([label, value], index) => (
          <View key={String(label)} style={[styles.summaryItem, index > 0 && styles.summaryDivider]}>
            <AppText style={styles.summaryLabel}>{label}</AppText>
            <AppText style={styles.summaryValue}>{value}</AppText>
          </View>
        ))}
      </View>
      <View testID="personal-principle-card" style={styles.principleCard}>
        <View style={styles.principleLabelRow}>
          <View style={styles.principleLabelCopy}>
            <AppText style={styles.principleLabel}>いまの判断原則</AppText>
          </View>
          <Pressable
            testID="personal-principle-edit"
            accessibilityRole="button"
            accessibilityLabel="判断原則を編集"
            onPress={openEditor}
            style={({ pressed }) => [styles.editPrinciple, pressed && styles.pressed]}
          >
            <AppText style={styles.editIcon}>✎</AppText>
            <AppText style={styles.editText}>編集</AppText>
          </Pressable>
        </View>
        <AppText style={styles.principle}>{personalPrinciple}</AppText>
      </View>

      <View style={styles.osActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="蔵書を開く"
          onPress={() => router.push('/library')}
          style={({ pressed }) => [
            styles.osActionCard,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.actionMark}>冊</AppText>
          <AppText style={styles.actionTitle}>蔵書</AppText>
          <AppText style={styles.savedCount}>{savedIds.length + savedTheoryIds.length}</AppText>
          <AppText style={styles.actionSubtitle}>保存した処世術・理論</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="マイ処世術を開く"
          onPress={() => router.push('/my-techniques')}
          style={({ pressed }) => [
            styles.osActionCard,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.actionMark}>記</AppText>
          <AppText style={styles.actionTitle}>マイ処世術</AppText>
          <AppText style={styles.savedCount}>{personalMemos.length}</AppText>
          <AppText style={styles.actionSubtitle}>自分の言葉を残す</AppText>
        </Pressable>
      </View>

      <OrnamentHeading>最近の振り返り</OrnamentHeading>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${recentCard.title}を開く`}
        onPress={() =>
          router.push({ pathname: '/card/[id]', params: { id: recentCard.id } })
        }
        style={({ pressed }) => [
          styles.recentCard,
          pressed && styles.pressed,
        ]}
      >
        <AppText style={styles.recentTitle}>{recentCard.title}</AppText>
        <AppText style={styles.recentDate}>
          {new Intl.DateTimeFormat('ja-JP', {
            month: 'numeric',
            day: 'numeric',
          }).format(new Date())}
        </AppText>
        <AppText style={styles.chevron}>›</AppText>
      </Pressable>

      <Modal
        transparent
        visible={editing}
        animationType="fade"
        onRequestClose={() => setEditing(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>判断原則を整える</AppText>
            <AppText style={styles.modalLead}>
              いまの自分が、迷ったときに戻れる一文を書き留めます。
            </AppText>
            <TextInput
              autoFocus
              multiline
              maxLength={100}
              value={draft}
              onChangeText={setDraft}
              accessibilityLabel="判断原則"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditing(false)} style={styles.cancel}>
                <AppText style={styles.cancelText}>閉じる</AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  updatePersonalPrinciple(draft);
                  setEditing(false);
                }}
                style={styles.save}
              >
                <AppText style={styles.saveText}>保存する</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={memosOpen} animationType="fade" onRequestClose={() => setMemosOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>マイ処世術</AppText>
            <AppText style={styles.modalLead}>自分の言葉で、何度でも使える判断を残します。</AppText>
            {personalMemos.length > 0 ? <View style={styles.memoList}>{personalMemos.map((memo, index) => (
              <View key={`${memo}-${index}`} style={styles.memoRow}>
                <View style={styles.memoBullet} />
                <AppText style={styles.memoText}>{memo}</AppText>
                <Pressable accessibilityRole="button" accessibilityLabel="メモを削除" onPress={() => removePersonalMemo(index)} hitSlop={10} style={styles.memoDelete}><AppText style={styles.memoDeleteText}>×</AppText></Pressable>
              </View>
            ))}</View> : <AppText style={styles.memoEmpty}>まだマイ処世術はありません。</AppText>}
            <View style={styles.memoComposer}>
              <TextInput value={memoDraft} onChangeText={setMemoDraft} maxLength={140} placeholder="例：迷ったら、その場で返事をしない" placeholderTextColor={colors.muted} accessibilityLabel="マイ処世術" style={styles.memoInput} />
              <Pressable accessibilityRole="button" accessibilityLabel="マイ処世術を追加" onPress={() => { addPersonalMemo(memoDraft); setMemoDraft(''); }} style={({ pressed }) => [styles.memoAdd, pressed && styles.pressed]}><AppText style={styles.memoAddText}>追加</AppText></Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={() => setMemosOpen(false)} style={({ pressed }) => [styles.closeMemos, pressed && styles.pressed]}><AppText style={styles.closeMemosText}>閉じる</AppText></Pressable>
          </View>
        </View>
      </Modal>
    </BookScreen>
  );
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
  summaryDivider: { borderLeftWidth: 1, borderLeftColor: colors.line },
  summaryLabel: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  summaryValue: { marginTop: 2, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  principleCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...bookCardShadow,
  },
  principleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  principleLabelCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  principleLabel: {
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  principle: {
    marginTop: spacing.md,
    fontFamily: fonts.serif,
    fontSize: 25,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  editPrinciple: {
    minHeight: 36,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#D7C6AB',
    borderRadius: radius.pill,
    backgroundColor: '#FCFAF6',
  },
  editIcon: { color: colors.gold, fontSize: 17, lineHeight: 20 },
  editText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  chevron: { color: colors.gold, fontSize: 31, lineHeight: 34 },
  osActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  memoCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...bookCardShadow,
  },
  memoHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  memoTitle: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: 1.2 },
  memoLead: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 19 },
  memoCount: { color: colors.gold, fontFamily: fonts.serif, fontSize: 24, lineHeight: 28 },
  memoList: { marginTop: spacing.lg, gap: 2 },
  memoRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: '#E5DDCF' },
  memoBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  memoText: { flex: 1, fontFamily: fonts.serif, fontSize: 15, lineHeight: 23 },
  memoDelete: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  memoDeleteText: { color: colors.muted, fontSize: 22, lineHeight: 26 },
  memoEmpty: { marginTop: spacing.lg, color: colors.muted, fontSize: 13, lineHeight: 21 },
  memoComposer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  memoInput: { flex: 1, minHeight: 46, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.white, color: colors.ink, fontSize: 14 },
  memoAdd: { minWidth: 66, minHeight: 46, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  memoAddText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  osActionCard: {
    flex: 1,
    minHeight: 220,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMark: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 27,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 22,
    width: 44,
    height: 44,
    textAlign: 'center',
    paddingTop: 8,
  },
  actionTitle: {
    marginTop: spacing.md,
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  savedCount: {
    marginTop: spacing.sm,
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 42,
    lineHeight: 50,
  },
  shortRule: {
    width: '72%',
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.lg,
  },
  actionSubtitle: {
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  recentCard: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  practiceList: { gap: spacing.sm },
  practiceRow: {
    minHeight: 82,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#89745B',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  practiceStatus: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  practiceStatusComplete: { backgroundColor: colors.moss },
  practiceStatusText: {
    color: colors.surface,
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  practiceRowCopy: { flex: 1 },
  practiceRowTitle: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  practiceRowMeta: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
  practiceEmpty: {
    minHeight: 86,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.46)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceEmptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 22,
    textAlign: 'center',
  },
  recentTitle: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  recentDate: {
    color: colors.inkSoft,
    fontFamily: fonts.serif,
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: 'rgba(17,18,17,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontFamily: fonts.serif,
    fontSize: 23,
    lineHeight: 32,
    fontWeight: '600',
  },
  modalLead: { marginTop: spacing.sm, color: colors.muted },
  input: {
    minHeight: 130,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 30,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancel: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: colors.muted, fontWeight: '700' },
  save: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  closeMemos: { minHeight: 46, marginTop: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  closeMemosText: { color: colors.inkSoft, fontWeight: '700' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.992 }] },
});
