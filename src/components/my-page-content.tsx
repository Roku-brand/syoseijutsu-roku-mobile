import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, theoryById } from '@/data/catalog';
import { isLockedTheoryShell } from '@/data/theory-display';
import { useAppState, type PersonalMemo } from '@/state/app-state';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { APP_ROUTES, signInRoute, techniqueRoute, theoryRoute, upgradeRoute } from '@/navigation/app-routes';
import { formatRemainingAccess } from '@/lib/purchase';

const principleScrollArtwork = require('../../assets/my-page/personal-principle-scroll-refined.png');

type Tab = 'history' | 'library' | 'mine';
type ContentRow = { kind: 'technique' | 'theory'; id: string; label: string; title: string; description: string };
type FolderFilter = 'all' | 'unfiled' | string;

export default function MyPageContent() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const mobile = width > 0 && width < 768;
  const { user, profile, loading: authLoading } = useAuth();
  const { accessState, accessInfo, catalogRevision, isPaid } = useAccess();
  const {
    savedIds, savedTheoryIds, historyIds, personalPrinciple, updatePersonalPrinciple,
    personalMemos, personalMemoFolders, addPersonalMemo, updatePersonalMemo,
    removePersonalMemo, movePersonalMemo, createPersonalMemoFolder, deletePersonalMemoFolder,
  } = useAppState();
  const [tab, setTab] = useState<Tab>('history');
  const [principleEditing, setPrincipleEditing] = useState(false);
  const [principleDraft, setPrincipleDraft] = useState(personalPrinciple);
  const [memoEditing, setMemoEditing] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [memoFolderId, setMemoFolderId] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [folderEditing, setFolderEditing] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const displayName = authLoading ? 'プロフィールを確認中' : profile?.displayName ?? suggestedName(user?.email);
  const badge = accessState === 'checking' ? '利用状態を確認中'
    : accessState === 'error' ? '利用状態を確認できません'
    : accessInfo.status === 'expired' ? '利用期間終了'
    : accessState === 'paid' ? `完全版を利用中${accessInfo.accessType === 'thirty_day' && accessInfo.accessExpiresAt ? `・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : ''}` : '無料版を利用中';

  const historyRows = useMemo(
    () => historyIds.map(resolveRow).filter((row): row is ContentRow => Boolean(row)),
    [catalogRevision, historyIds],
  );
  const libraryRows = useMemo(
    () => [...savedIds.map(resolveTechnique), ...savedTheoryIds.map(resolveTheory)]
      .filter((row): row is ContentRow => Boolean(row)),
    [catalogRevision, savedIds, savedTheoryIds],
  );
  const pendingHistory = isPaid && historyIds.some((id) => {
    const theory = theoryById.get(id);
    return Boolean(theory && isLockedTheoryShell(theory));
  });
  const unresolvedSavedCount = savedIds.length + savedTheoryIds.length - libraryRows.length;
  const visibleMemos = personalMemos.filter((memo) =>
    folderFilter === 'all' || (folderFilter === 'unfiled' ? !memo.folderId : memo.folderId === folderFilter));

  const openPrincipleEditor = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    setPrincipleDraft(personalPrinciple);
    setPrincipleEditing(true);
  };
  const openMemoEditor = (memo?: PersonalMemo) => {
    setEditingMemoId(memo?.id ?? null);
    setMemoDraft(memo?.text ?? '');
    setMemoFolderId(memo?.folderId ?? (folderFilter !== 'all' && folderFilter !== 'unfiled' ? folderFilter : null));
    setMemoEditing(true);
  };
  const saveMemo = () => {
    if (!memoDraft.trim()) return;
    if (editingMemoId) updatePersonalMemo(editingMemoId, memoDraft, memoFolderId);
    else addPersonalMemo(memoDraft, memoFolderId);
    setMemoEditing(false);
  };
  const selectTab = (next: Tab) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setTab(next);
  };
  const openRow = (row: ContentRow) => router.push(row.kind === 'technique' ? techniqueRoute(row.id) : theoryRoute(row.id));

  return (
    <BookScreen contentContainerStyle={[styles.content, mobile && styles.contentMobile]}>
      <View testID="my-page-dashboard" style={styles.dashboard}>
        <View testID="profile-principle-card" style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Pressable
              testID="account-membership-card"
              accessibilityRole="button"
              accessibilityLabel={user ? 'プロフィールを編集' : 'ログインしてプロフィールを設定'}
              onPress={() => router.push(user ? APP_ROUTES.profile : signInRoute())}
              style={({ pressed }) => [styles.identity, pressed && styles.pressed]}
            >
              <ProfileMark avatarUrl={profile?.avatarUrl} />
              <View style={styles.identityCopy}>
                <AppText numberOfLines={2} style={[styles.profileName, mobile && styles.profileNameMobile]}>{displayName}</AppText>
                <View style={styles.membershipBadge}><AppText style={styles.membershipBadgeText}>{badge}</AppText></View>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={user ? 'プロフィールを編集' : 'ログインしてプロフィールを設定'}
              onPress={() => router.push(user ? APP_ROUTES.profile : signInRoute())}
              style={({ pressed }) => [styles.profileEdit, pressed && styles.pressed]}
            ><AppText style={styles.profileEditText}>編集  ›</AppText></Pressable>
          </View>
          <View style={styles.profileDivider} />
          <View
            testID="personal-principle-card"
            style={[styles.scrollWrap, mobile && styles.scrollWrapMobile]}
          >
            <View pointerEvents="none" style={styles.scrollArtwork}>
              <Image source={principleScrollArtwork} resizeMode="stretch" style={styles.scrollImage} />
            </View>
            <View style={[styles.scrollContent, mobile && styles.scrollContentMobile]}>
              <View style={styles.principleHeading}>
                <AppText style={styles.principleLabel}>いまの座右の銘</AppText>
                <Pressable
                  testID="personal-principle-edit"
                  accessibilityRole="button"
                  accessibilityLabel="座右の銘を編集"
                  onPress={openPrincipleEditor}
                  style={({ pressed }) => [styles.editPrinciple, pressed && styles.pressed]}
                ><AppText style={styles.editIcon}>✎</AppText><AppText style={styles.editText}>編集</AppText></Pressable>
              </View>
              {personalPrinciple ? <AppText style={[styles.principle, mobile && styles.principleMobile]}>{personalPrinciple}</AppText>
                : <Pressable accessibilityRole="button" accessibilityLabel="座右の銘を設定" onPress={openPrincipleEditor}><AppText style={[styles.principle, mobile && styles.principleMobile]}>座右の銘を設定　›</AppText></Pressable>}
            </View>
          </View>
        </View>

        <View testID="my-page-tabs" accessibilityRole="tablist" style={styles.tabs}>
          <TabButton label="閲覧履歴" icon="◷" selected={tab === 'history'} onPress={() => selectTab('history')} />
          <TabButton label="蔵書" icon="▥" selected={tab === 'library'} onPress={() => selectTab('library')} />
          <TabButton label="マイ処世術" icon="✎" selected={tab === 'mine'} onPress={() => selectTab('mine')} />
        </View>

        <View testID="my-page-tab-content" style={styles.tabContent}>
          {tab === 'history' ? (
            <>
              <SectionHeading title="閲覧履歴" subtitle="最近見た処世術・理論" />
              {historyRows.length ? historyRows.map((row) => <ContentListRow key={`${row.kind}-${row.id}`} row={row} onPress={() => openRow(row)} />)
                : <QuietEmpty>{pendingHistory ? '完全版データを確認中' : 'まだ閲覧履歴はありません'}</QuietEmpty>}
              {pendingHistory && historyRows.length ? <QuietEmpty>完全版データを確認中</QuietEmpty> : null}
            </>
          ) : tab === 'library' ? (
            <>
              <SectionHeading title="蔵書" subtitle="保存した処世術・理論" />
              {libraryRows.length ? libraryRows.map((row) => <ContentListRow key={`${row.kind}-${row.id}`} row={row} onPress={() => openRow(row)} />)
                : unresolvedSavedCount === 0 ? <QuietEmpty>まだ保存した処世術・理論はありません</QuietEmpty> : null}
              {unresolvedSavedCount > 0 ? <Pressable accessibilityRole="button" onPress={() => { if (!isPaid) router.push(upgradeRoute('my-page-library')); }} style={styles.unresolvedRow}><AppText style={styles.unresolvedText}>{isPaid ? '保存した完全版データを確認中' : '保存した完全版コンテンツがあります'}</AppText>{!isPaid ? <AppText style={styles.rowArrow}>›</AppText> : null}</Pressable> : null}
            </>
          ) : (
            <>
              <SectionHeading title="マイ処世術" subtitle="自分の言葉で残した処世術" actionLabel="＋ 作る" onAction={() => openMemoEditor()} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderTabs}>
                <FolderButton label="すべて" selected={folderFilter === 'all'} onPress={() => setFolderFilter('all')} />
                <FolderButton label="未整理" selected={folderFilter === 'unfiled'} onPress={() => setFolderFilter('unfiled')} />
                {personalMemoFolders.map((folder) => <FolderButton key={folder.id} label={folder.name} selected={folderFilter === folder.id} onPress={() => setFolderFilter(folder.id)} />)}
                <Pressable accessibilityRole="button" accessibilityLabel="フォルダーを追加" onPress={() => { setFolderDraft(''); setFolderEditing(true); }} style={styles.folderAdd}><AppText style={styles.folderAddText}>＋ フォルダー</AppText></Pressable>
                {folderFilter !== 'all' && folderFilter !== 'unfiled' ? <Pressable accessibilityRole="button" accessibilityLabel="選択中のフォルダーを削除" onPress={() => { deletePersonalMemoFolder(folderFilter); setFolderFilter('unfiled'); }} style={styles.folderAdd}><AppText style={styles.folderDeleteText}>フォルダーを削除</AppText></Pressable> : null}
              </ScrollView>
              {visibleMemos.length ? visibleMemos.map((memo) => (
                <Pressable key={memo.id} accessibilityRole="button" accessibilityLabel={`${memo.text}を編集`} onPress={() => openMemoEditor(memo)} style={({ pressed }) => [styles.listRow, pressed && styles.rowPressed]}>
                  <View style={styles.rowCopy}>
                    <AppText style={styles.memoMeta}>{formatMemoDate(memo.createdAt)}　{personalMemoFolders.find((folder) => folder.id === memo.folderId)?.name ?? '未整理'}</AppText>
                    <AppText numberOfLines={2} style={styles.rowTitle}>{memo.text}</AppText>
                  </View>
                  <AppText style={styles.rowArrow}>›</AppText>
                </Pressable>
              )) : <QuietEmpty>まだマイ処世術はありません</QuietEmpty>}
            </>
          )}
        </View>
      </View>

      <Modal transparent visible={principleEditing} animationType="fade" onRequestClose={() => setPrincipleEditing(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <AppText style={styles.modalTitle}>座右の銘を編集</AppText>
          <AppText style={styles.modalLead}>自分が大切にしたい言葉を、一文で書き留めます。</AppText>
          <TextInput autoFocus multiline maxLength={100} value={principleDraft} onChangeText={setPrincipleDraft} accessibilityLabel="座右の銘" style={styles.input} />
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={() => setPrincipleEditing(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { updatePersonalPrinciple(principleDraft); setPrincipleEditing(false); }} style={styles.save}><AppText style={styles.saveText}>保存する</AppText></Pressable>
          </View>
        </View></View>
      </Modal>

      <Modal transparent visible={memoEditing} animationType="fade" onRequestClose={() => setMemoEditing(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <AppText style={styles.modalTitle}>{editingMemoId ? 'マイ処世術を編集' : 'マイ処世術を作る'}</AppText>
          <TextInput autoFocus multiline maxLength={140} value={memoDraft} onChangeText={setMemoDraft} placeholder="自分の言葉を記してください" placeholderTextColor={colors.muted} accessibilityLabel="マイ処世術" style={styles.input} />
          <AppText style={styles.folderLabel}>保存先</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalFolderTabs}>
            <FolderButton label="未整理" selected={!memoFolderId} onPress={() => setMemoFolderId(null)} />
            {personalMemoFolders.map((folder) => <FolderButton key={folder.id} label={folder.name} selected={memoFolderId === folder.id} onPress={() => setMemoFolderId(folder.id)} />)}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={() => setMemoEditing(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable>
            <Pressable accessibilityRole="button" disabled={!memoDraft.trim()} onPress={saveMemo} style={[styles.save, !memoDraft.trim() && styles.saveDisabled]}><AppText style={styles.saveText}>保存する</AppText></Pressable>
          </View>
          {editingMemoId ? <Pressable accessibilityRole="button" accessibilityLabel="このマイ処世術を削除" onPress={() => { removePersonalMemo(editingMemoId); setMemoEditing(false); }} style={styles.deleteMemo}><AppText style={styles.deleteMemoText}>このマイ処世術を削除</AppText></Pressable> : null}
        </View></View>
      </Modal>

      <Modal transparent visible={folderEditing} animationType="fade" onRequestClose={() => setFolderEditing(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <AppText style={styles.modalTitle}>フォルダーを作成</AppText>
          <TextInput autoFocus maxLength={32} value={folderDraft} onChangeText={setFolderDraft} accessibilityLabel="フォルダー名" style={styles.folderInput} />
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={() => setFolderEditing(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable>
            <Pressable accessibilityRole="button" disabled={!folderDraft.trim()} onPress={() => { const id = createPersonalMemoFolder(folderDraft); if (id) { setFolderFilter(id); setFolderEditing(false); } }} style={[styles.save, !folderDraft.trim() && styles.saveDisabled]}><AppText style={styles.saveText}>作成する</AppText></Pressable>
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

function resolveTechnique(id: string): ContentRow | null {
  const card = techniqueById.get(id);
  return card ? { kind: 'technique', id: card.id, label: card.categoryName, title: card.title, description: card.essence || card.subtitle || card.subcategory } : null;
}

function resolveTheory(id: string): ContentRow | null {
  const theory = theoryById.get(id);
  return theory && !isLockedTheoryShell(theory)
    ? { kind: 'theory', id: theory.tagId, label: '理論', title: theory.title, description: theory.summary || theory.categoryTitle }
    : null;
}

function resolveRow(id: string): ContentRow | null {
  return resolveTechnique(id) ?? resolveTheory(id);
}

function ProfileMark({ avatarUrl }: { avatarUrl?: string | null }) {
  return <View accessibilityElementsHidden style={styles.profileMark}>{avatarUrl ? <Image source={{ uri: avatarUrl }} resizeMode="cover" style={styles.profileImage} /> : <View style={styles.profileGlyph}><View style={styles.profileHead} /><View style={styles.profileShoulders} /></View>}</View>;
}

function TabButton({ label, icon, selected, onPress }: { label: string; icon: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} aria-selected={selected} onPress={onPress} style={({ pressed }) => [styles.tab, selected && styles.tabSelected, pressed && styles.pressed]}><AppText style={[styles.tabIcon, selected && styles.tabIconSelected]}>{icon}</AppText><AppText numberOfLines={1} style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{label}</AppText></Pressable>;
}

function SectionHeading({ title, subtitle, actionLabel, onAction }: { title: string; subtitle: string; actionLabel?: string; onAction?: () => void }) {
  return <View style={styles.sectionHeading}><View style={styles.sectionCopy}><AppText style={styles.sectionTitle}>{title}</AppText><AppText style={styles.sectionSubtitle}>{subtitle}</AppText></View>{actionLabel && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}><AppText style={styles.sectionActionText}>{actionLabel}</AppText></Pressable> : null}</View>;
}

function ContentListRow({ row, onPress }: { row: ContentRow; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}を開く`} onPress={onPress} style={({ pressed }) => [styles.listRow, pressed && styles.rowPressed]}><View style={styles.rowCopy}><AppText style={[styles.categoryLabel, row.kind === 'theory' && styles.theoryLabel]}>{row.label}</AppText><AppText numberOfLines={2} style={styles.rowTitle}>{row.title}</AppText><AppText numberOfLines={1} style={styles.rowDescription}>{row.description}</AppText></View><AppText style={styles.rowArrow}>›</AppText></Pressable>;
}

function FolderButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[styles.folderButton, selected && styles.folderButtonSelected]}><AppText style={[styles.folderButtonText, selected && styles.folderButtonTextSelected]}>{label}</AppText></Pressable>;
}

function QuietEmpty({ children }: { children: string }) {
  return <View style={styles.quietEmpty}><AppText style={styles.quietEmptyText}>{children}</AppText></View>;
}

function formatMemoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return '作成日未記録';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  content: { maxWidth: 860, paddingBottom: spacing.xl * 2 },
  contentMobile: { paddingTop: spacing.md, paddingHorizontal: spacing.md },
  dashboard: { width: '100%' },
  profileCard: { backgroundColor: colors.paper },
  profileRow: { minHeight: 105, paddingHorizontal: spacing.xs, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  profileMark: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#121A22', borderWidth: 1, borderColor: '#302B20', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  profileGlyph: { width: 29, height: 32, alignItems: 'center', justifyContent: 'center' },
  profileHead: { width: 11, height: 11, borderWidth: 1.4, borderColor: '#D3A849', borderRadius: 6, marginBottom: 4 },
  profileShoulders: { width: 25, height: 14, borderTopWidth: 1.4, borderLeftWidth: 1.4, borderRightWidth: 1.4, borderColor: '#D3A849', borderTopLeftRadius: 13, borderTopRightRadius: 13 },
  profileName: { maxWidth: '100%', color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: 0.5 },
  profileNameMobile: { fontSize: 22, lineHeight: 31 },
  membershipBadge: { marginTop: 4, paddingHorizontal: 9, paddingVertical: 2, borderWidth: 1, borderColor: '#D7C39C', borderRadius: radius.pill, backgroundColor: colors.surface },
  membershipBadgeText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 10, lineHeight: 15, fontWeight: '600' },
  profileEdit: { minHeight: 44, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  profileEditText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  profileDivider: { height: 1, marginHorizontal: spacing.xs, backgroundColor: colors.line },
  scrollWrap: { minHeight: 158, marginHorizontal: spacing.xs, marginTop: spacing.xs, marginBottom: spacing.sm, justifyContent: 'center' },
  scrollWrapMobile: { minHeight: 140, marginHorizontal: -spacing.md, marginTop: spacing.md },
  scrollArtwork: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  scrollImage: { width: '100%', height: '100%' },
  scrollContent: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl * 2, paddingVertical: spacing.lg },
  scrollContentMobile: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  principleHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  principleLabel: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 1 },
  principle: { maxWidth: '84%', marginTop: spacing.xs, color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 35, fontWeight: '600', letterSpacing: 1 },
  principleMobile: { maxWidth: '100%', fontSize: 23, lineHeight: 34, letterSpacing: 0.2 },
  editPrinciple: { minHeight: 34, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#CEB583', borderRadius: radius.pill, backgroundColor: colors.surface },
  editIcon: { color: colors.gold, fontSize: 14, lineHeight: 18 },
  editText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  tabs: { marginTop: spacing.md, paddingVertical: 6, minHeight: 62, flexDirection: 'row', gap: 3, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  tab: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 4, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  tabSelected: { borderBottomWidth: 2, borderBottomColor: colors.gold, backgroundColor: '#182027' },
  tabIcon: { color: colors.ink, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  tabIconSelected: { color: colors.goldLight },
  tabLabel: { color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  tabLabelSelected: { color: colors.white },
  tabContent: { marginTop: spacing.lg },
  sectionHeading: { minHeight: 62, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 34, fontWeight: '700', letterSpacing: 0.4 },
  sectionSubtitle: { marginTop: 1, color: colors.muted, fontFamily: fonts.serif, fontSize: 12, lineHeight: 19 },
  sectionAction: { minHeight: 38, paddingHorizontal: 13, borderWidth: 1, borderColor: '#D2B77F', borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  sectionActionText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  listRow: { minHeight: 90, marginBottom: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowPressed: { backgroundColor: colors.paperDeep },
  rowCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  categoryLabel: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: '#F5ECDc', color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 10, lineHeight: 15, fontWeight: '600' },
  theoryLabel: { backgroundColor: '#E8EDF0', color: '#536879' },
  rowTitle: { marginTop: 5, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, fontWeight: '600' },
  rowDescription: { marginTop: 4, color: colors.muted, fontFamily: fonts.serif, fontSize: 12, lineHeight: 19 },
  rowArrow: { color: colors.gold, fontSize: 26, lineHeight: 30 },
  quietEmpty: { minHeight: 74, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, justifyContent: 'center' },
  quietEmptyText: { color: colors.muted, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20 },
  unresolvedRow: { minHeight: 66, marginBottom: spacing.sm, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  unresolvedText: { color: colors.muted, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20 },
  folderTabs: { paddingBottom: spacing.md, gap: 7, alignItems: 'center' },
  folderButton: { minHeight: 34, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  folderButtonSelected: { borderColor: colors.gold, backgroundColor: '#F4ECDD' },
  folderButtonText: { color: colors.inkSoft, fontSize: 11, lineHeight: 16 },
  folderButtonTextSelected: { color: colors.goldDeep, fontWeight: '700' },
  folderAdd: { minHeight: 34, paddingHorizontal: 10, justifyContent: 'center' },
  folderAddText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  folderDeleteText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  memoMeta: { color: colors.goldDeep, fontSize: 10, lineHeight: 16 },
  modalBackdrop: { flex: 1, padding: spacing.lg, backgroundColor: 'rgba(17,18,17,0.58)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 520, padding: spacing.xl, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.lg, backgroundColor: colors.surface },
  modalTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 23, lineHeight: 32, fontWeight: '600' },
  modalLead: { marginTop: spacing.sm, color: colors.muted },
  input: { minHeight: 130, marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 30, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancel: { minHeight: 50, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontWeight: '700' },
  save: { flex: 1, minHeight: 50, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  folderLabel: { marginTop: spacing.md, color: colors.muted, fontSize: 11, lineHeight: 17 },
  modalFolderTabs: { paddingTop: spacing.sm, gap: 7 },
  folderInput: { minHeight: 48, marginTop: spacing.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, color: colors.ink },
  deleteMemo: { minHeight: 42, marginTop: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  deleteMemoText: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.7 },
});
