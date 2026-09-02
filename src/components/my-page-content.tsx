import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Image, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, theoryById } from '@/data/catalog';
import { useAppState, type PersonalMemo } from '@/state/app-state';
import { useAuth } from '@/auth/auth-state';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { useAccess, type AccessState } from '@/access/access-state';
import { formatAccessDateTime, formatRemainingAccess, type VerifiedAccess } from '@/lib/purchase';
import { isLockedTheoryShell } from '@/data/theory-display';
import { APP_ROUTES, signInRoute, techniqueRoute, theoryRoute, upgradeRoute } from '@/navigation/app-routes';

type SavedPreview = { kind: '処世術' | '理論'; id: string; title: string; meta: string };
type MembershipCopy = { badge: string; plan: string; remaining: string; expiry: string; free: boolean };

export default function MyPageContent() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const mobile = width > 0 && width < 768;
  const tablet = width >= 768 && width < 1200;
  const profileStacked = width > 0 && width < 1000;
  const { user, profile, loading: authLoading } = useAuth();
  const { accessState, accessInfo, catalogRevision, isPaid } = useAccess();
  const { savedIds, savedTheoryIds, historyIds, personalPrinciple, updatePersonalPrinciple, personalMemos } = useAppState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(personalPrinciple);
  const profileDestination = user ? APP_ROUTES.profile : signInRoute();
  const displayName = authLoading ? 'プロフィールを確認中' : profile?.displayName ?? suggestedName(user?.email);
  const membership = useMemo(() => membershipCopy(accessState, accessInfo), [accessInfo, accessState]);
  const libraryCount = savedIds.length + savedTheoryIds.length;
  const recentSaved = useMemo(() => buildRecentSaved(savedIds, savedTheoryIds), [catalogRevision, savedIds, savedTheoryIds]);
  const recentHistory = useMemo(
    () => historyIds.slice(0, 3).map((id) => {
      const card = techniqueById.get(id);
      if (card) return { kind: '処世術' as const, id: card.id, title: card.title, meta: `${card.categoryName}・${card.subcategory}` };
      const theory = theoryById.get(id);
      return theory && !isLockedTheoryShell(theory) ? { kind: '理論' as const, id: theory.tagId, title: theory.title, meta: theory.categoryTitle } : null;
    }).filter((item): item is SavedPreview => Boolean(item)),
    [catalogRevision, historyIds],
  );
  const pendingSavedTheory = isPaid && savedTheoryIds.some((id) => {
    const theory = theoryById.get(id);
    return Boolean(theory && isLockedTheoryShell(theory));
  });
  const pendingHistoryTheory = isPaid && historyIds.some((id) => {
    const theory = theoryById.get(id);
    return Boolean(theory && isLockedTheoryShell(theory));
  });

  const openEditor = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    setDraft(personalPrinciple);
    setEditing(true);
  };

  return (
    <BookScreen contentContainerStyle={[styles.content, mobile && styles.contentMobile]}>
      <View testID="my-page-dashboard" style={styles.dashboard}>
        <View testID="profile-usage-bar" style={[styles.profileBar, profileStacked && styles.profileBarMobile]}>
          <Pressable
            testID="account-membership-card"
            accessibilityRole="button"
            accessibilityLabel={user ? 'プロフィールを編集' : 'ログインしてプロフィールを設定'}
            onPress={() => router.push(profileDestination)}
            style={({ pressed }) => [styles.identityBlock, profileStacked && styles.identityBlockMobile, pressed && styles.pressed]}
          >
            <ProfileMark avatarUrl={profile?.avatarUrl} />
            <View style={styles.identityCopy}>
              <AppText numberOfLines={2} style={[styles.profileName, mobile && styles.profileNameMobile]}>{displayName}</AppText>
              <View style={styles.membershipBadge}><AppText style={styles.membershipBadgeText}>{membership.badge}</AppText></View>
            </View>
          </Pressable>

          <View style={[styles.membershipDetails, profileStacked && styles.membershipDetailsMobile]}>
            <View style={styles.planBlock}>
              <AppText style={styles.detailEyebrow}>プラン</AppText>
              <AppText testID="membership-plan" style={styles.planName}>{membership.plan}</AppText>
            </View>
            <View style={styles.detailDivider} />
            <View style={[styles.remainingBlock, profileStacked && styles.remainingBlockMobile]}>
              <AppText testID="membership-remaining" style={styles.remainingText}>{membership.remaining}</AppText>
              <AppText numberOfLines={2} style={styles.expiryText}>{membership.expiry}</AppText>
            </View>
            {membership.free ? (
              <Pressable accessibilityRole="button" accessibilityLabel="完全版を見る" onPress={() => router.push(upgradeRoute('my-page-profile'))} style={({ pressed }) => [styles.upgradeLink, pressed && styles.pressed]}>
                <AppText style={styles.upgradeLinkText}>完全版を見る</AppText>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={user ? 'プロフィールを編集' : 'ログインしてプロフィールを設定'}
            onPress={() => router.push(profileDestination)}
            style={({ pressed }) => [styles.profileEdit, profileStacked && styles.profileEditMobile, pressed && styles.pressed]}
          >
            <AppText style={styles.profileEditText}>編集　›</AppText>
          </Pressable>
        </View>

        <View testID="personal-principle-card" style={[styles.principleCard, mobile && styles.principleCardMobile]}>
          <View accessibilityElementsHidden style={styles.principleAccentTop} />
          <View accessibilityElementsHidden style={styles.principleAccentBottom} />
          <View style={styles.principleCopy}>
            <AppText style={styles.principleLabel}>いまの座右の銘</AppText>
            <AppText style={[styles.principle, mobile && styles.principleMobile]}>{personalPrinciple || 'まだ座右の銘は設定されていません'}</AppText>
          </View>
          <Pressable testID="personal-principle-edit" accessibilityRole="button" accessibilityLabel="座右の銘を編集" onPress={openEditor} style={({ pressed }) => [styles.editPrinciple, mobile && styles.editPrincipleMobile, pressed && styles.pressed]}>
            <AppText style={styles.editIcon}>✎</AppText><AppText style={styles.editText}>編集</AppText>
          </Pressable>
        </View>

        <View testID="my-page-summary-grid" style={[styles.destinationGrid, tablet && styles.wrappedGrid, mobile && styles.stack]}>
          <DestinationCard mark="冊" title="蔵書" count={libraryCount} detail="保存した処世術・理論" onPress={() => router.push(APP_ROUTES.library)} tablet={tablet} />
          <DestinationCard mark="筆" title="マイ処世術" count={personalMemos.length} detail="自分の言葉でつくった処世術" onPress={() => router.push(APP_ROUTES.myTechniques)} tablet={tablet} />
          <DestinationCard mark="時" title="履歴" count={historyIds.length} detail="これまでに見た処世術・理論" onPress={() => router.push(APP_ROUTES.history)} tablet={tablet} last />
        </View>

        <View testID="my-page-recent-grid" style={[styles.recentGrid, tablet && styles.wrappedGrid, mobile && styles.stack]}>
          <PreviewColumn title="最近保存したもの" actionLabel="すべての蔵書を見る" onAction={() => router.push(APP_ROUTES.library)} tablet={tablet}>
            {recentSaved.length ? recentSaved.map((item) => <PreviewRow key={`${item.kind}-${item.id}`} label={item.kind} title={item.title} meta={item.meta} onPress={() => item.kind === '処世術' ? router.push(techniqueRoute(item.id)) : router.push(theoryRoute(item.id))} />) : <QuietEmpty>{pendingSavedTheory ? '完全版データを確認中' : 'まだ保存したものはありません'}</QuietEmpty>}
          </PreviewColumn>
          <PreviewColumn title="マイ処世術" actionLabel="すべてのマイ処世術を見る" onAction={() => router.push(APP_ROUTES.myTechniques)} tablet={tablet}>
            {personalMemos.length ? personalMemos.slice(0, 3).map((memo) => <MemoPreview key={memo.id} memo={memo} onPress={() => router.push(APP_ROUTES.myTechniques)} />) : <QuietEmpty>まだマイ処世術はありません</QuietEmpty>}
          </PreviewColumn>
          <PreviewColumn title="最近の履歴" actionLabel="すべての履歴を見る" onAction={() => router.push(APP_ROUTES.history)} tablet={tablet} last>
            {recentHistory.length ? recentHistory.map((item) => <PreviewRow key={`${item.kind}-${item.id}`} label={item.kind} title={item.title} meta={item.meta} onPress={() => item.kind === '処世術' ? router.push(techniqueRoute(item.id)) : router.push(theoryRoute(item.id))} />) : <QuietEmpty>{pendingHistoryTheory ? '完全版データを確認中' : 'まだ履歴はありません'}</QuietEmpty>}
          </PreviewColumn>
        </View>
      </View>

      <Modal transparent visible={editing} animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <AppText style={styles.modalTitle}>座右の銘を編集</AppText>
          <AppText style={styles.modalLead}>自分が大切にしたい言葉を、一文で書き留めます。</AppText>
          <TextInput autoFocus multiline maxLength={100} value={draft} onChangeText={setDraft} accessibilityLabel="座右の銘" style={styles.input} />
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { updatePersonalPrinciple(draft); setEditing(false); }} style={styles.save}><AppText style={styles.saveText}>保存する</AppText></Pressable>
          </View>
        </View></View>
      </Modal>
    </BookScreen>
  );
}

function suggestedName(email?: string | null) {
  if (!email) return 'プロフィールを設定';
  return email.split('@')[0] || 'ユーザー';
}

function membershipCopy(accessState: AccessState, accessInfo: VerifiedAccess): MembershipCopy {
  if (accessState === 'checking') return { badge: '利用状態を確認中', plan: '確認中', remaining: '確認しています', expiry: '少々お待ちください', free: false };
  if (accessState === 'error') return { badge: '利用状態を確認できません', plan: '確認が必要', remaining: '再確認してください', expiry: '通信状況をご確認ください', free: false };
  if (accessInfo.status === 'expired') return { badge: '利用期間終了', plan: '完全版', remaining: '利用期間終了', expiry: accessInfo.accessExpiresAt ? `${safeFormatAccessDate(accessInfo.accessExpiresAt)}まで` : '期限を確認できません', free: true };
  if (accessState === 'paid') {
    if (accessInfo.accessType === 'thirty_day' && accessInfo.accessExpiresAt) {
      const now = accessInfo.serverNow ? new Date(accessInfo.serverNow) : new Date();
      return { badge: '完全版を利用中', plan: '完全版', remaining: formatRemainingAccess(accessInfo.accessExpiresAt, now), expiry: `${safeFormatAccessDate(accessInfo.accessExpiresAt)}まで`, free: false };
    }
    return { badge: '完全版を利用中', plan: '完全版', remaining: '期限なし', expiry: '買い切りで利用中', free: false };
  }
  return { badge: '無料版を利用中', plan: '無料版', remaining: '無料公開分', expiry: 'いつでも利用できます', free: true };
}

function safeFormatAccessDate(value: string) {
  try { return formatAccessDateTime(value, false); } catch { return '期限未設定'; }
}

function buildRecentSaved(savedIds: string[], savedTheoryIds: string[]) {
  const rows: SavedPreview[] = [];
  const maxLength = Math.max(savedIds.length, savedTheoryIds.length);
  for (let index = 0; index < maxLength && rows.length < 3; index += 1) {
    const card = techniqueById.get(savedIds[index]);
    if (card) rows.push({ kind: '処世術', id: card.id, title: card.title, meta: `${card.categoryName}・${card.subcategory}` });
    if (rows.length >= 3) break;
    const theory = theoryById.get(savedTheoryIds[index]);
    if (theory && !isLockedTheoryShell(theory)) rows.push({ kind: '理論', id: theory.tagId, title: theory.title, meta: theory.categoryTitle });
  }
  return rows;
}

function ProfileMark({ avatarUrl }: { avatarUrl?: string | null }) {
  return <View accessibilityElementsHidden style={styles.profileMark}>{avatarUrl ? <Image source={{ uri: avatarUrl }} resizeMode="cover" style={styles.profileImage} /> : <View style={styles.profileGlyph}><View style={styles.profileHead} /><View style={styles.profileShoulders} /></View>}</View>;
}

function DestinationCard({ mark, title, count, detail, onPress, tablet, last = false }: { mark: string; title: string; count: number; detail: string; onPress: () => void; tablet: boolean; last?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}を開く`} onPress={onPress} style={({ pressed }) => [styles.destinationCard, tablet && styles.gridCardTablet, tablet && last && styles.gridCardTabletLast, pressed && styles.pressed]}>
    <View style={styles.destinationMark}><AppText style={styles.destinationMarkText}>{mark}</AppText></View>
    <View style={styles.destinationCopy}><AppText style={styles.destinationTitle}>{title}</AppText><AppText style={styles.destinationCount}>{count}</AppText><AppText style={styles.destinationDetail}>{detail}</AppText></View>
    <AppText style={styles.destinationArrow}>›</AppText>
  </Pressable>;
}

function PreviewColumn({ title, actionLabel, onAction, children, tablet, last = false }: { title: string; actionLabel: string; onAction: () => void; children: ReactNode; tablet: boolean; last?: boolean }) {
  return <View testID="my-page-preview-section" style={[styles.previewColumn, tablet && styles.gridCardTablet, tablet && last && styles.gridCardTabletLast]}>
    <View style={styles.previewHeader}><AppText style={styles.previewTitle}>{title}</AppText><Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={({ pressed }) => [styles.previewAction, pressed && styles.pressed]}><AppText style={styles.previewLink}>すべて見る　›</AppText></Pressable></View>
    <View style={styles.previewBody}>{children}</View>
  </View>;
}

function PreviewRow({ label, title, meta, onPress }: { label: string; title: string; meta: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}を開く`} onPress={onPress} style={({ pressed }) => [styles.previewRow, pressed && styles.previewRowPressed]}>
    <View style={styles.previewCopy}><View style={styles.previewMetaLine}><AppText style={styles.kindLabel}>{label}</AppText><AppText numberOfLines={2} style={styles.previewMeta}>{meta}</AppText></View><AppText numberOfLines={2} style={styles.previewRowTitle}>{title}</AppText></View><AppText style={styles.previewArrow}>›</AppText>
  </Pressable>;
}

function MemoPreview({ memo, onPress }: { memo: PersonalMemo; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${memo.text}を開く`} onPress={onPress} style={({ pressed }) => [styles.previewRow, pressed && styles.previewRowPressed]}><View style={styles.previewCopy}><AppText numberOfLines={2} style={styles.memoTitle}>{memo.text}</AppText><AppText style={styles.memoDate}>{formatMemoDate(memo.createdAt)}</AppText></View><AppText style={styles.previewArrow}>›</AppText></Pressable>;
}

function QuietEmpty({ children }: { children: ReactNode }) { return <View style={styles.quietEmpty}><AppText style={styles.quietEmptyText}>{children}</AppText></View>; }

function formatMemoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return '作成日未記録';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  content: { maxWidth: 1240, paddingBottom: spacing.xl * 2 },
  contentMobile: { paddingTop: spacing.md },
  dashboard: { width: '100%' },
  profileBar: { minHeight: 82, paddingHorizontal: 22, paddingVertical: 13, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.74)', flexDirection: 'row', alignItems: 'center', ...bookCardShadow },
  profileBarMobile: { minHeight: 158, padding: spacing.md, alignItems: 'stretch', flexDirection: 'column', position: 'relative' },
  identityBlock: { width: '34%', minWidth: 250, minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 13, paddingRight: spacing.md },
  identityBlockMobile: { width: '100%', minWidth: 0, paddingRight: 72 },
  identityCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  profileMark: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#121A22', borderWidth: 1, borderColor: '#302B20', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  profileGlyph: { width: 25, height: 28, alignItems: 'center', justifyContent: 'center' },
  profileHead: { width: 9, height: 9, borderWidth: 1.4, borderColor: '#D3A849', borderRadius: 5, marginBottom: 4 },
  profileShoulders: { width: 22, height: 12, borderTopWidth: 1.4, borderLeftWidth: 1.4, borderRightWidth: 1.4, borderColor: '#D3A849', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  profileName: { maxWidth: '100%', color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 25, fontWeight: '600', letterSpacing: 0.6 },
  profileNameMobile: { fontSize: 17, lineHeight: 23 },
  membershipBadge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#D7C39C', borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.72)' },
  membershipBadgeText: { color: '#9A6A18', fontFamily: fonts.serif, fontSize: 9, lineHeight: 13, fontWeight: '600' },
  membershipDetails: { flex: 1, minWidth: 0, minHeight: 52, paddingHorizontal: 23, borderLeftWidth: 1, borderLeftColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 22 },
  membershipDetailsMobile: { width: '100%', minHeight: 60, marginTop: 10, paddingHorizontal: 4, paddingTop: 10, borderLeftWidth: 0, borderTopWidth: 1, borderTopColor: colors.line, gap: 10 },
  planBlock: { minWidth: 78 },
  detailEyebrow: { color: colors.muted, fontSize: 8, lineHeight: 12, letterSpacing: 0.8 },
  planName: { marginTop: 2, color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  detailDivider: { width: 1, alignSelf: 'stretch', maxHeight: 36, backgroundColor: colors.line },
  remainingBlock: { flex: 1, minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: 16 },
  remainingBlockMobile: { minWidth: 0, alignItems: 'flex-start', flexDirection: 'column', gap: 0 },
  remainingText: { color: '#A66F17', fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, fontWeight: '600' },
  expiryText: { flexShrink: 1, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 11, lineHeight: 17 },
  upgradeLink: { minHeight: 38, paddingHorizontal: 11, borderWidth: 1, borderColor: '#D7C39C', borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  upgradeLinkText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 10, lineHeight: 15, fontWeight: '600' },
  profileEdit: { minHeight: 44, paddingLeft: 17, alignItems: 'center', justifyContent: 'center' },
  profileEditMobile: { position: 'absolute', right: spacing.md, top: spacing.md, paddingLeft: 0 },
  profileEditText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  principleCard: { minHeight: 172, marginTop: spacing.md, paddingHorizontal: 72, paddingVertical: 30, borderWidth: 1, borderColor: '#D8C8AD', borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.82)', flexDirection: 'row', alignItems: 'center', gap: spacing.xl, overflow: 'hidden', ...bookCardShadow },
  principleCardMobile: { minHeight: 184, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: 68, alignItems: 'flex-start', flexDirection: 'column', gap: spacing.md },
  principleAccentTop: { position: 'absolute', width: 130, height: 130, left: -78, top: -82, borderWidth: 1, borderColor: 'rgba(184,138,42,0.14)', borderRadius: 65 },
  principleAccentBottom: { position: 'absolute', width: 170, height: 170, right: -108, bottom: -118, borderWidth: 1, borderColor: 'rgba(184,138,42,0.16)', borderRadius: 85 },
  principleCopy: { flex: 1, minWidth: 0 },
  principleLabel: { color: '#A66F17', fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, fontWeight: '600', letterSpacing: 1.4 },
  principle: { marginTop: 18, color: colors.ink, fontFamily: fonts.serif, fontSize: 32, lineHeight: 47, fontWeight: '600', letterSpacing: 1.8 },
  principleMobile: { marginTop: spacing.md, fontSize: 22, lineHeight: 34, letterSpacing: 0.8 },
  editPrinciple: { minHeight: 44, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#D2B77F', borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.9)' },
  editPrincipleMobile: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
  editIcon: { color: colors.gold, fontSize: 16, lineHeight: 19 },
  editText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  destinationGrid: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  recentGrid: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md, marginTop: spacing.md },
  wrappedGrid: { flexWrap: 'wrap' },
  stack: { flexDirection: 'column' },
  destinationCard: { position: 'relative', flex: 1, minWidth: 0, minHeight: 132, paddingHorizontal: 21, paddingVertical: 18, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.66)', flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  gridCardTablet: { flexBasis: '47%', flexGrow: 1 },
  gridCardTabletLast: { flexBasis: '100%' },
  destinationMark: { width: 55, height: 55, borderRadius: 28, backgroundColor: '#151A1C', borderWidth: 1, borderColor: '#2D2A22', alignItems: 'center', justifyContent: 'center' },
  destinationMarkText: { color: '#D3A849', fontFamily: fonts.serif, fontSize: 20, lineHeight: 27 },
  destinationCopy: { flex: 1, minWidth: 0 },
  destinationTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, fontWeight: '600', letterSpacing: 0.8 },
  destinationCount: { marginTop: 1, color: '#AA741C', fontFamily: fonts.serif, fontSize: 30, lineHeight: 36 },
  destinationDetail: { color: colors.muted, fontFamily: fonts.serif, fontSize: 10, lineHeight: 16 },
  destinationArrow: { color: colors.gold, fontSize: 26, lineHeight: 28 },
  previewColumn: { flex: 1, minWidth: 0, minHeight: 306, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.58)', overflow: 'hidden' },
  previewHeader: { minHeight: 52, paddingLeft: spacing.lg, paddingRight: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  previewTitle: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  previewAction: { minHeight: 44, minWidth: 84, paddingHorizontal: spacing.sm, alignItems: 'flex-end', justifyContent: 'center' },
  previewLink: { color: colors.gold, fontSize: 10, lineHeight: 16, fontWeight: '700' },
  previewBody: { flex: 1 },
  previewRow: { minHeight: 82, paddingHorizontal: spacing.lg, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  previewRowPressed: { backgroundColor: colors.paperDeep },
  previewCopy: { flex: 1, minWidth: 0 },
  previewMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindLabel: { paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#D7C6AB', borderRadius: radius.pill, color: colors.gold, fontSize: 8, lineHeight: 12, fontWeight: '700' },
  previewMeta: { flex: 1, color: colors.muted, fontSize: 9, lineHeight: 14 },
  previewRowTitle: { marginTop: 4, color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  previewArrow: { color: colors.gold, fontSize: 24, lineHeight: 26 },
  memoTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  memoDate: { marginTop: 5, color: colors.muted, fontSize: 9, lineHeight: 14 },
  quietEmpty: { minHeight: 210, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  quietEmptyText: { color: colors.muted, fontFamily: fonts.serif, fontSize: 12, lineHeight: 20, textAlign: 'center' },
  modalBackdrop: { flex: 1, padding: spacing.lg, backgroundColor: 'rgba(17,18,17,0.58)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 520, padding: spacing.xl, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.lg, backgroundColor: colors.surface },
  modalTitle: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 32, fontWeight: '600' },
  modalLead: { marginTop: spacing.sm, color: colors.muted },
  input: { minHeight: 130, marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 30, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancel: { minHeight: 50, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontWeight: '700' },
  save: { flex: 1, minHeight: 50, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
