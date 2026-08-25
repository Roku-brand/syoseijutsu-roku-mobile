import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
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
import { COMPLETE_EDITION_PRICE_JPY, formatAccessDateTime, formatRemainingAccess, getAccessExpiryNotice } from '@/lib/purchase';

export default function MyOsScreen() {
  const router = useRouter();
  const { user } = useAuth();
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
  const [accessDetailsOpen, setAccessDetailsOpen] = useState(false);
  const [draft, setDraft] = useState(personalPrinciple);
  const [memoDraft, setMemoDraft] = useState('');
  const recentCard =
    techniqueById.get(historyIds[0] ?? '') ??
    techniqueById.get(savedIds[0] ?? '') ??
    techniqueCards[0];

  const openEditor = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    setDraft(personalPrinciple);
    setEditing(true);
  };

  return (
    <BookScreen>
      <OwnerPreviewPanel />
      <View testID="account-membership-card" style={styles.accountCard}>
      <Pressable onPress={() => router.push('/auth')} style={({ pressed }) => [styles.profileRow, pressed && styles.pressed]}>
        <View style={styles.avatar}><AppText style={styles.avatarText}>人</AppText></View>
        <View style={styles.profileCopy}>
          <View style={styles.profileNameRow}>
            <AppText style={styles.profileName}>{user?.email ?? 'ユーザー'}</AppText>
            <View testID="account-plan-badge" style={styles.planBadge}>
              <AppText style={styles.planBadgeText}>{isPaid ? '完全版' : accessStatus === 'expired' ? '期限終了' : '無料版'}</AppText>
            </View>
          </View>
          <AppText style={styles.profilePlan}>{isPaid ? 'あなたの蔵書と学びを管理する' : 'あなたの人生に、いつでも一冊の知恵を。'}</AppText>
        </View>
        <AppText style={styles.profileChevron}>›</AppText>
      </Pressable>

      <View style={styles.accountRule} />
      <View style={styles.membershipArea}>
        <View style={styles.accessCardHeader}>
          <View style={styles.accessCopy}>
            <AppText style={styles.accessEyebrow}>{isPaid ? 'COMPLETE EDITION' : 'YOUR LIBRARY'}</AppText>
            <AppText variant="serif" style={styles.accessTitle}>{isPaid ? '完全版を利用中' : accessStatus === 'expired' ? 'もう一度、知恵をひらく' : '知恵の蔵書を、もっと深く'}</AppText>
          </View>
          {isPaid && accessInfo.accessType === 'thirty_day' ? <View style={styles.remainingBadge}><AppText style={styles.remainingText}>{formatRemainingAccess(accessInfo.accessExpiresAt)}</AppText></View> : null}
        </View>
        {isPaid && accessInfo.accessType === 'thirty_day' ? <AppText style={styles.accessExpiry}>{formatAccessDateTime(accessInfo.accessExpiresAt, false)}まで利用できます</AppText> : null}
        {isPaid && accessInfo.accessType === 'thirty_day' && getAccessExpiryNotice(accessInfo.accessExpiresAt) ? <AppText style={styles.expiryNotice}>{getAccessExpiryNotice(accessInfo.accessExpiresAt)}</AppText> : null}
        {isPaid && accessInfo.accessType === 'legacy_lifetime' ? <AppText style={styles.accessExpiry}>旧買い切り版の利用権は、そのまま維持されています。</AppText> : null}
        {accessStatus === 'expired' ? <AppText style={styles.accessExpiry}>30日間アクセスが終了しました。保存データは保持されています。</AppText> : null}
        {!isPaid && accessStatus !== 'expired' ? <AppText style={styles.accessLead}>全336の処世術と541の理論を、必要なときに蔵書から読み返せます。</AppText> : null}
        <Pressable
          testID="account-complete-cta"
          accessibilityRole="button"
          onPress={() => isPaid ? setAccessDetailsOpen(true) : router.push('/upgrade')}
          style={({ pressed }) => [styles.accessAction, pressed && styles.pressed]}
        >
          <AppText style={styles.accessActionText}>{isPaid ? '利用情報を見る' : accessStatus === 'expired' ? 'もう一度30日間利用する' : `完全版を30日間利用する　¥${COMPLETE_EDITION_PRICE_JPY}`}</AppText>
          <AppText style={styles.accessActionChevron}>›</AppText>
        </Pressable>
      </View>
      </View>

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
      <View style={styles.principleCard}>
        <View style={styles.principleLabelRow}>
          <View style={styles.diamond} />
          <AppText style={styles.principleLabel}>いまの判断原則</AppText>
        </View>
        <AppText style={styles.principle}>{personalPrinciple}</AppText>
        <View style={styles.rule} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="判断原則を編集"
          onPress={openEditor}
          style={({ pressed }) => [
            styles.editPrinciple,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.editIcon}>✎</AppText>
          <AppText style={styles.editText}>原則を整える</AppText>
          <AppText style={styles.chevron}>›</AppText>
        </Pressable>
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
          onPress={() => setMemosOpen(true)}
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
      <Modal transparent visible={accessDetailsOpen} animationType="fade" onRequestClose={() => setAccessDetailsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>完全版の利用情報</AppText>
            {[
              ['プラン', accessInfo.accessType === 'legacy_lifetime' ? '旧買い切り版' : '完全版｜30日間アクセス'],
              ['購入価格', accessInfo.purchaseAmount ? `${accessInfo.purchaseAmount}円` : accessInfo.accessType === 'legacy_lifetime' ? '購入時の条件' : '280円'],
              ['利用開始', formatAccessDateTime(accessInfo.accessStartedAt)],
              ['利用期限', accessInfo.accessType === 'legacy_lifetime' ? '期限なし' : formatAccessDateTime(accessInfo.accessExpiresAt)],
              ['自動更新', 'なし'],
            ].map(([label, value]) => <View key={label} style={styles.accessDetailRow}><AppText style={styles.accessDetailLabel}>{label}</AppText><AppText style={styles.accessDetailValue}>{value}</AppText></View>)}
            <Pressable accessibilityRole="button" onPress={() => setAccessDetailsOpen(false)} style={({ pressed }) => [styles.closeMemos, pressed && styles.pressed]}><AppText style={styles.closeMemosText}>閉じる</AppText></Pressable>
          </View>
        </View>
      </Modal>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  accountCard: { overflow: 'hidden', borderWidth: 1, borderColor: '#D8CBB8', borderRadius: radius.lg, backgroundColor: '#F8F4EC', ...bookCardShadow },
  profileRow: { minHeight: 82, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23 },
  profileCopy: { flex: 1, minWidth: 0 },
  profileNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  profileName: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  planBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1, borderColor: '#D7C6AB', backgroundColor: '#FCFAF6' },
  planBadgeText: { color: '#81622A', fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 0.4 },
  profilePlan: { marginTop: 3, color: colors.muted, fontSize: 11, lineHeight: 17 },
  profileChevron: { color: colors.gold, fontSize: 27, lineHeight: 30, fontWeight: '300' },
  accountRule: { height: 1, marginHorizontal: spacing.lg, backgroundColor: '#DED3C3' },
  membershipArea: { padding: spacing.lg, paddingTop: spacing.md },
  accessCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  accessCopy: { flex: 1, minWidth: 0 },
  accessEyebrow: { color: '#896422', fontSize: 10, lineHeight: 15, fontWeight: '700', letterSpacing: 1.3 },
  accessTitle: { marginTop: 3, color: colors.ink, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  remainingBadge: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.charcoal },
  remainingText: { color: '#E8C976', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  accessExpiry: { marginTop: 8, color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  expiryNotice: { marginTop: 5, color: '#8A6527', fontSize: 11, lineHeight: 17, fontWeight: '700' },
  accessLead: { marginTop: 12, color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  accessAction: { minHeight: 48, marginTop: 16, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radius.sm, backgroundColor: colors.gold },
  accessActionText: { flex: 1, color: '#FFFDF8', fontSize: 13, lineHeight: 20, fontWeight: '700' },
  accessActionChevron: { marginLeft: spacing.sm, color: '#FFFDF8', fontSize: 25, lineHeight: 27, fontWeight: '300' },
  accessDetailRow: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  accessDetailLabel: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  accessDetailValue: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'right' },
  summaryCard: { minHeight: 70, marginTop: spacing.sm, paddingVertical: 10, flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  summaryItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  summaryDivider: { borderLeftWidth: 1, borderLeftColor: colors.line },
  summaryLabel: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  summaryValue: { marginTop: 2, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, fontWeight: '700' },
  principleCard: {
    minHeight: 270,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...bookCardShadow,
  },
  principleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  diamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  principleLabel: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  principle: {
    marginTop: spacing.xl,
    fontFamily: fonts.serif,
    fontSize: 29,
    lineHeight: 50,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  rule: {
    height: 1,
    backgroundColor: colors.line,
    marginTop: spacing.xl,
  },
  editPrinciple: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: spacing.md,
  },
  editIcon: { color: colors.gold, fontSize: 23, lineHeight: 28 },
  editText: {
    flex: 1,
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 23,
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
