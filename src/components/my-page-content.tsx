import { isRetiredTheoryId, RETIRED_THEORY_TITLE } from '@/data/theory-knowledge';
'use no memo';

import { FolderBack, FolderFronts, MoreCards } from './folder-fronts';
import { PersonalContentCard, type PersonalContentRow } from './personal-content-card';
import { useFeatures } from '@/data/features';


// Catalogue maps are hydrated in place; retain the explicit revision dependency.
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { LibraryContent } from '@/components/library-content';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, theoryById } from '@/data/catalog';
import { isLockedTheoryShell } from '@/data/theory-display';
import { useAppState, type PersonalMemo } from '@/state/app-state';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { APP_ROUTES, featureRoute, signInRoute, techniqueRoute, theoryRoute, upgradeRoute } from '@/navigation/app-routes';
import { personalLibrary } from './personal-library-theme';
import { formatRemainingAccess } from '@/lib/purchase';

const principleScrollArtwork = require('../../assets/my-page/personal-principle-scroll-refined.webp');

type Tab = 'history' | 'library' | 'mine';
type ContentRow = PersonalContentRow;
type FolderFilter = string | null;

export default function MyPageContent() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const mobile = width > 0 && width < 768;
  const { user, profile, loading: authLoading } = useAuth();
  const { accessState, accessInfo, catalogRevision, isPaid } = useAccess();
  const {
    historyIds, featureHistoryIds, personalPrinciple, updatePersonalPrinciple,
    personalMemos, personalMemoFolders, addPersonalMemo, updatePersonalMemo,
    removePersonalMemo, movePersonalMemo, createPersonalMemoFolder, deletePersonalMemoFolder,
  } = useAppState();
  const [tab, setTab] = useState<Tab>('history');
  const [historyKind, setHistoryKind] = useState<ContentRow['kind']>('technique');
  const [historyLimit, setHistoryLimit] = useState(20);
  const [memoLimit, setMemoLimit] = useState(20);
  const { articles: featureArticles, loading: featuresLoading, error: featuresError } = useFeatures(tab === 'history' && historyKind === 'feature' && featureHistoryIds.length > 0);
  const [principleEditing, setPrincipleEditing] = useState(false);
  const [principleDraft, setPrincipleDraft] = useState(personalPrinciple);
  const [memoEditing, setMemoEditing] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [memoFolderId, setMemoFolderId] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>(null);
  const [folderEditing, setFolderEditing] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');
  const displayName = authLoading ? 'プロフィールを確認中' : profile?.displayName ?? suggestedName(user?.email);
  const badge = accessState === 'checking' ? '利用状態を確認中'
    : accessState === 'error' ? '利用状態を確認できません'
    : accessInfo.status === 'expired' ? '利用期間終了'
    : accessState === 'paid' ? `完全版を利用中${accessInfo.accessType === 'thirty_day' && accessInfo.accessExpiresAt ? `・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : ''}` : '無料版を利用中';

  const historyRows = useMemo(() => historyKind === 'feature'
    ? featureHistoryIds.map(id => featureArticles.find(article => article.id === id)).filter(article => Boolean(article)).map(article => ({ kind: 'feature' as const, id: article!.id, title: article!.title, label: '特集', description: article!.lead, category: 'feature', article: article! }))
    : historyIds.map(resolveRow).filter((row): row is ContentRow => Boolean(row && row.kind === historyKind)),
    [catalogRevision, historyIds, historyKind, featureHistoryIds, featureArticles]);
  const pendingHistory = historyKind === 'theory' && isPaid && historyIds.some((id) => {
    const theory = theoryById.get(id);
    return Boolean(theory && isLockedTheoryShell(theory));
  });
  const visibleMemos = personalMemos.filter((memo) =>
    folderFilter === 'all' || (folderFilter === 'unfiled' ? !memo.folderId : memo.folderId === folderFilter));

  const memoCounts = new Map<string, number>([['all', personalMemos.length]]);
  personalMemos.forEach(memo => { const id = memo.folderId ?? 'unfiled'; memoCounts.set(id, (memoCounts.get(id) ?? 0) + 1); });
  const memoFolders = [{ id: 'all', name: 'すべて' }, { id: 'unfiled', name: '未整理' }, ...personalMemoFolders].map(folder => ({ ...folder, count: memoCounts.get(folder.id) ?? 0 }));
  const openMemoFolder = (id: string | null) => { setFolderFilter(id); setMemoLimit(20); };
  useEffect(() => {
    if (folderFilter && folderFilter !== 'all' && folderFilter !== 'unfiled' && !personalMemoFolders.some(folder => folder.id === folderFilter)) setFolderFilter('unfiled');
  }, [folderFilter, personalMemoFolders]);

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
    openMemoFolder(memoFolderId ?? 'unfiled');
  };
  const selectTab = (next: Tab) => {
    setTab(next);
    if (next === 'mine' && tab !== 'mine') openMemoFolder(null);
  };
  const openRow = (row: ContentRow) => router.push(row.kind === 'feature' ? featureRoute(row.article?.slug ?? row.id) : row.kind === 'technique' ? techniqueRoute(row.id) : theoryRoute(row.id));

  return (
    <BookScreen contentContainerStyle={[styles.content, mobile && styles.contentMobile]}>
      <View testID="my-page-dashboard" style={styles.dashboard}>
        <View testID="profile-principle-card" style={styles.profileCard}>
          <View style={[styles.profileRow, mobile && styles.profileRowMobile]}>
            <Pressable
              testID="account-membership-card"
              accessibilityRole="button"
              accessibilityLabel={user ? 'プロフィールを編集' : 'ログインしてプロフィールを設定'}
              onPress={() => router.push(user ? APP_ROUTES.profile : signInRoute())}
              style={({ pressed }) => [styles.identity, mobile && styles.identityMobile, pressed && styles.pressed]}
            >
              <ProfileMark avatarUrl={profile?.avatarUrl} />
              <View style={[styles.identityCopy, mobile && styles.identityCopyMobile]}>
                <AppText numberOfLines={2} style={[styles.profileName, mobile && styles.profileNameMobile]}>{displayName}</AppText>
                <View style={[styles.membershipBadge, mobile && styles.membershipBadgeMobile]}>{isPaid ? <AppText accessibilityElementsHidden style={styles.crown}>♛</AppText> : null}<AppText style={[styles.membershipBadgeText, mobile && styles.membershipBadgeTextMobile]}>{badge}</AppText></View>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={user ? 'プロフィールを編集' : 'ログインしてプロフィールを設定'}
              onPress={() => router.push(user ? APP_ROUTES.profile : signInRoute())}
              style={({ pressed }) => [styles.profileEdit, mobile && styles.profileEditMobile, pressed && styles.pressed]}
            ><AppText style={[styles.profileEditText, mobile && styles.profileEditTextMobile]}>{mobile ? '編集 ›' : '✎　編集　›'}</AppText></Pressable>
          </View>
          <View style={styles.profileDivider} />
          <View
            testID="personal-principle-card"
            style={[styles.scrollWrap, mobile && styles.scrollWrapMobile]}
          >
            <View pointerEvents="none" style={styles.scrollArtwork}>
              <Image source={principleScrollArtwork} resizeMode="stretch" style={styles.scrollImage} />
              <View style={styles.scrollLandscape}><Image source={require('../../assets/my-page/folder-sage.webp')} resizeMode="cover" style={styles.scrollImage} /></View>
            </View>
            <View style={[styles.scrollContent, mobile && styles.scrollContentMobile]}>
              <View style={styles.principleHeading}>
                <AppText style={styles.principleLabel}>いまの座右の銘</AppText><View style={styles.principleRule} />
                <Pressable
                  testID="personal-principle-edit"
                  accessibilityRole="button"
                  accessibilityLabel="座右の銘を編集"
                  onPress={openPrincipleEditor}
                  style={({ pressed }) => [styles.editPrinciple, pressed && styles.pressed]}
                ><AppText style={styles.editIcon}>✎</AppText></Pressable>
              </View>
              {personalPrinciple ? <AppText style={[styles.principle, mobile && styles.principleMobile]}>{personalPrinciple}</AppText>
                : <Pressable accessibilityRole="button" accessibilityLabel="座右の銘を設定" onPress={openPrincipleEditor}><AppText style={[styles.principle, mobile && styles.principleMobile]}>座右の銘を設定　›</AppText></Pressable>}
            </View>
          </View>
        </View>

        <View testID="my-page-tabs" accessibilityRole="tablist" style={[styles.tabs, mobile && styles.tabsMobile]}>
          <TabButton label="閲覧履歴" icon="◷" selected={tab === 'history'} onPress={() => selectTab('history')} />
          <TabButton label="蔵書" icon="▥" selected={tab === 'library'} onPress={() => selectTab('library')} />
          <TabButton label="マイ処世術" icon="✎" selected={tab === 'mine'} onPress={() => selectTab('mine')} />
        </View>

        <View testID="my-page-tab-content" style={styles.tabContent}>
          {tab === 'history' ? (
            <>
              <SectionHeading title="閲覧履歴" subtitle="読んだ知恵を、種類ごとに振り返る" />
              <View accessibilityRole="tablist" accessibilityLabel="閲覧履歴の種類" style={[styles.historyTabs, mobile && styles.historyTabsMobile]}>{([{ kind: 'technique', name: '処世術' }, { kind: 'theory', name: '理論' }, { kind: 'feature', name: '特集' }] as const).map(item => <Pressable key={item.kind} accessibilityRole="tab" accessibilityLabel={item.name} aria-selected={historyKind === item.kind} accessibilityState={{ selected: historyKind === item.kind }} onPress={() => { setHistoryKind(item.kind); setHistoryLimit(20); }} style={[styles.historyTab, historyKind === item.kind && styles.historyTabSelected]}><AppText style={[styles.historyTabText, historyKind === item.kind && styles.historyTabTextSelected]}>{item.name}</AppText></Pressable>)}</View>
              {historyRows.length ? historyRows.slice(0, historyLimit).map(row => <PersonalContentCard key={row.kind + row.id} row={row} onPress={() => openRow(row)} />)
                : <QuietEmpty>{pendingHistory ? '完全版データを確認中' : historyKind === 'feature' && featureHistoryIds.length > 0 ? featuresLoading ? '特集を確認中' : featuresError ? '特集を読み込めませんでした。通信環境をご確認ください。' : '閲覧した特集は現在公開されていません' : 'まだ閲覧履歴はありません'}</QuietEmpty>}
              <MoreCards remaining={historyRows.length - historyLimit} onPress={() => setHistoryLimit(value => value + 20)} />
            </>
          ) : tab === 'library' ? (
            <LibraryContent />
          ) : (
            <>
              <SectionHeading title="マイ処世術" subtitle="自分の言葉で残した処世術" actionLabel="＋ 作る" onAction={() => openMemoEditor()} />
              <Pressable accessibilityRole="button" accessibilityLabel="フォルダーを追加" onPress={() => { setFolderDraft(''); setFolderEditing(true); }} style={styles.folderAdd}><AppText style={styles.folderAddText}>＋ フォルダー</AppText></Pressable>
              {folderFilter === null ? <FolderFronts folders={memoFolders} label="マイ処世術" onOpen={openMemoFolder} /> : <>
                <FolderBack onPress={() => openMemoFolder(null)} />
                <View style={styles.sectionHeading}><AppText style={styles.sectionTitle}>{memoFolders.find(folder => folder.id === folderFilter)?.name} · {visibleMemos.length}件</AppText>{folderFilter !== 'all' && folderFilter !== 'unfiled' ? <Pressable accessibilityRole="button" accessibilityLabel="選択中のフォルダーを削除" onPress={() => { deletePersonalMemoFolder(folderFilter); openMemoFolder('unfiled'); }} style={styles.folderAdd}><AppText style={styles.folderDeleteText}>削除</AppText></Pressable> : null}</View>
                {visibleMemos.length ? visibleMemos.slice(0, memoLimit).map(memo => <Pressable key={memo.id} accessibilityRole="button" accessibilityLabel={memo.text + 'を編集'} onPress={() => openMemoEditor(memo)} style={({ pressed }) => [styles.listRow, pressed && styles.rowPressed]}><View style={styles.memoAccent}><AppText style={styles.memoAccentText}>✎</AppText></View><View style={styles.rowCopy}><AppText style={styles.memoMeta}>{formatMemoDate(memo.createdAt)}　{personalMemoFolders.find(folder => folder.id === memo.folderId)?.name ?? '未整理'}</AppText><AppText numberOfLines={2} style={styles.rowTitle}>{memo.text}</AppText></View><AppText style={styles.rowArrow}>›</AppText></Pressable>) : <QuietEmpty>このフォルダーはまだ空です</QuietEmpty>}
                <MoreCards remaining={visibleMemos.length - memoLimit} onPress={() => setMemoLimit(value => value + 20)} />
              </>}
            </>
          )}
        </View>
      </View>

      <Modal transparent visible={principleEditing} animationType="fade" onRequestClose={() => setPrincipleEditing(false)}>
        <View style={styles.modalBackdrop}><View tabIndex={-1} style={styles.modalCard}>
          <AppText style={styles.modalTitle}>座右の銘を編集</AppText>
          <AppText style={styles.modalLead}>自分が大切にしたい言葉を、一文で書き留めます。</AppText>
          <TextInput multiline maxLength={100} value={principleDraft} onChangeText={setPrincipleDraft} accessibilityLabel="座右の銘" style={styles.input} />
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={() => setPrincipleEditing(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { updatePersonalPrinciple(principleDraft); setPrincipleEditing(false); }} style={styles.save}><AppText style={styles.saveText}>保存する</AppText></Pressable>
          </View>
        </View></View>
      </Modal>

      <Modal transparent visible={memoEditing} animationType="fade" onRequestClose={() => setMemoEditing(false)}>
        <View style={styles.modalBackdrop}><View tabIndex={-1} style={styles.modalCard}>
          <AppText style={styles.modalTitle}>{editingMemoId ? 'マイ処世術を編集' : 'マイ処世術を作る'}</AppText>
          <TextInput multiline maxLength={140} value={memoDraft} onChangeText={setMemoDraft} placeholder="自分の言葉を記してください" placeholderTextColor={colors.muted} accessibilityLabel="マイ処世術" style={styles.input} />
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
        <View style={styles.modalBackdrop}><View tabIndex={-1} style={styles.modalCard}>
          <AppText style={styles.modalTitle}>フォルダーを作成</AppText>
          <TextInput maxLength={32} value={folderDraft} onChangeText={setFolderDraft} accessibilityLabel="フォルダー名" style={styles.folderInput} />
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={() => setFolderEditing(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable>
            <Pressable accessibilityRole="button" disabled={!folderDraft.trim()} onPress={() => { const id = createPersonalMemoFolder(folderDraft); if (id) { openMemoFolder(id); setFolderEditing(false); } }} style={[styles.save, !folderDraft.trim() && styles.saveDisabled]}><AppText style={styles.saveText}>作成する</AppText></Pressable>
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
  return card ? { kind: 'technique', id: card.id, category: card.categoryKey, label: card.categoryName, title: card.title, description: card.essence || card.subtitle || card.subcategory } : null;
}

function resolveTheory(id: string): ContentRow | null {
  if (isRetiredTheoryId(id)) return {kind:'theory',id,category:'practical-wisdom',label:'公開終了',title:RETIRED_THEORY_TITLE,description:'閲覧履歴の記録は保持されています。'};
  const theory = theoryById.get(id);
  return theory && !isLockedTheoryShell(theory)
    ? { kind: 'theory', id: theory.tagId, category: theory.categoryId, label: theory.categoryTitle, title: theory.title, description: theory.summary || theory.categoryTitle }
    : null;
}

function resolveRow(id: string): ContentRow | null {
  return resolveTechnique(id) ?? resolveTheory(id);
}

function ProfileMark({ avatarUrl }: { avatarUrl?: string | null }) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 768;
  return <View accessibilityElementsHidden style={[styles.profileMark, compact && styles.profileMarkMobile]}>{avatarUrl ? <Image source={{ uri: avatarUrl }} resizeMode="cover" style={styles.profileImage} /> : <View style={styles.compassGlyph}><View style={styles.compassRing} /><View style={styles.compassHorizontal} /><View style={styles.compassVertical} /><View style={styles.compassCenter} /></View>}</View>;
}

function TabButton({ label, icon, selected, onPress }: { label: string; icon: string; selected: boolean; onPress: () => void }) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 768;
  const color = selected ? '#E1C572' : colors.goldDeep;
  return <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} aria-selected={selected} onPress={onPress} style={({ pressed }) => [styles.tab, compact && styles.tabMobile, selected && styles.tabSelected, pressed && styles.pressed]}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.tabMark}>
      {icon === '◷' ? <View style={[styles.clockMark, { borderColor: color }]}><View style={[styles.clockHand, { backgroundColor: color }]} /><View style={[styles.clockMinute, { backgroundColor: color }]} /></View>
        : icon === '▥' ? <View style={styles.bookMark}>{[0, 1, 2, 3].map(page => <View key={page} style={[styles.bookSpine, { borderColor: color }]} />)}</View>
          : <View style={[styles.pencilMark, { backgroundColor: color }]}><View style={styles.pencilBand} /></View>}
    </View>
    <AppText numberOfLines={1} style={[styles.tabLabel, compact && styles.tabLabelMobile, selected && styles.tabLabelSelected]}>{label}</AppText>
    {selected ? <View pointerEvents="none" style={styles.tabUnderline} /> : null}
  </Pressable>;
}

function SectionHeading({ title, subtitle, actionLabel, onAction }: { title: string; subtitle: string; actionLabel?: string; onAction?: () => void }) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 768;
  return <View style={styles.sectionHeading}><View style={styles.sectionCopy}><AppText style={[styles.sectionTitle, compact && styles.sectionTitleMobile]}>{title}</AppText><AppText style={[styles.sectionSubtitle, compact && styles.sectionSubtitleMobile]}>{subtitle}</AppText></View>{actionLabel && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}><AppText style={styles.sectionActionText}>{actionLabel}</AppText></Pressable> : null}</View>;
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
  content: { maxWidth: 1238, paddingHorizontal: 24, paddingTop: 26, paddingBottom: spacing.xl * 2 },
  contentMobile: { paddingTop: spacing.md, paddingHorizontal: spacing.md },
  profileRowMobile: { minHeight: 94, paddingHorizontal: 0, gap: 6 },
  identityMobile: { gap: 12 },
  membershipBadgeMobile: { paddingHorizontal: 7, paddingVertical: 2, marginTop: 4 },
  membershipBadgeTextMobile: { fontSize: 10, lineHeight: 16 },
  profileEditTextMobile: { fontSize: 13, lineHeight: 20 },
  tabMark: { width: 22, height: 24, alignItems: 'center', justifyContent: 'center' },
  clockMark: { width: 21, height: 21, borderWidth: 2, borderRadius: 11 },
  clockHand: { position: 'absolute', width: 2, height: 7, left: 8, top: 3, borderRadius: 1 },
  clockMinute: { position: 'absolute', width: 6, height: 2, left: 8, top: 9, borderRadius: 1 },
  bookMark: { flexDirection: 'row', gap: 1 },
  bookSpine: { width: 4, height: 20, borderWidth: 1 },
  pencilMark: { width: 8, height: 22, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, transform: [{ rotate: '45deg' }] },
  pencilBand: { position: 'absolute', top: 5, width: 8, height: 1, backgroundColor: '#FFFDF9' },
  tabUnderline: { position: 'absolute', height: 1, left: 0, right: 0, bottom: -9, backgroundColor: '#B58A43' },
  identityCopyMobile: { flexDirection: 'column', alignItems: 'flex-start', gap: 0 },
  profileMarkMobile: { width: 60, height: 60, borderRadius: 30 },
  profileEditMobile: { minHeight: 44, paddingHorizontal: 8 },
  tabMobile: { minHeight: 48, gap: 5, paddingHorizontal: 3 },
  tabsMobile: { marginTop: 16 },
  tabLabelMobile: { fontSize: 12, lineHeight: 21, letterSpacing: 0 },
  sectionTitleMobile: personalLibrary.headingSmall,
  sectionSubtitleMobile: { fontSize: 12, lineHeight: 21 },
  historyTabsMobile: { gap: 6, marginTop: 0 },
  principleRule: { width: 30, height: 1, backgroundColor: '#B78C48' },
  scrollLandscape: { position: 'absolute', top: '21%', bottom: '20%', right: '3%', width: '55%', opacity: 0.24, overflow: 'hidden' },
  crown: { color: colors.gold, fontSize: 20, lineHeight: 22 },
  compassGlyph: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  compassRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#A92835' },
  compassHorizontal: { position: 'absolute', width: 62, height: 2, backgroundColor: '#A92835' },
  compassVertical: { position: 'absolute', height: 62, width: 2, backgroundColor: '#A92835' },
  compassCenter: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: '#A92835', borderWidth: 2, borderColor: '#FFFDFC' },
  dashboard: { width: '100%' },
  profileCard: { backgroundColor: colors.paper },
  profileRow: { minHeight: 130, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  identity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 26 },
  identityCopy: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 28 },
  profileMark: { width: 94, height: 94, borderRadius: 47, backgroundColor: '#FFFDFC', borderWidth: 1.5, borderColor: '#252A29', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileImage: { width: '100%', height: '100%' },
  profileName: { maxWidth: '100%', color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 42, fontWeight: '600', letterSpacing: 3 },
  profileNameMobile: { fontSize: 22, lineHeight: 31 },
  membershipBadge: { paddingHorizontal: 13, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#C9974A', borderRadius: radius.pill, backgroundColor: '#FFFDF9' },
  membershipBadgeText: { color: colors.goldDeep, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  profileEdit: { minHeight: 54, paddingHorizontal: 24, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  profileEditText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  profileDivider: { height: 1, backgroundColor: colors.line },
  scrollWrap: { minHeight: 184, marginHorizontal: -4, marginTop: 10, marginBottom: 8, justifyContent: 'center' },
  scrollWrapMobile: { minHeight: 140, marginHorizontal: -spacing.md, marginTop: spacing.md },
  scrollArtwork: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  scrollImage: { width: '100%', height: '100%' },
  scrollContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 72, paddingVertical: 40 },
  scrollContentMobile: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  principleHeading: { flexDirection: 'row', alignItems: 'center', gap: 22 },
  principleLabel: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, fontWeight: '600', letterSpacing: 1 },
  principle: { marginTop: 9, color: colors.ink, fontFamily: fonts.serif, fontSize: 36, lineHeight: 50, fontWeight: '600', letterSpacing: 2 },
  principleMobile: { maxWidth: '100%', fontSize: 23, lineHeight: 34, letterSpacing: 0.2 },
  editPrinciple: { minHeight: 32, width: 32, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  editIcon: { color: colors.goldDeep, fontSize: 20, lineHeight: 26 },
  tabs: { marginTop: 22, paddingBottom: 8, minHeight: 68, flexDirection: 'row', gap: 3, borderBottomWidth: 1, borderColor: colors.line },
  tab: { flex: 1, minWidth: 0, minHeight: 60, paddingHorizontal: 8, borderRadius: radius.pill, backgroundColor: '#F1EEE7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 },
  tabSelected: { backgroundColor: personalLibrary.green, boxShadow: 'inset 0 0 18px rgba(0,0,0,0.08)', borderWidth: 1, borderColor: '#367667' },
  tabLabel: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: 2 },
  tabLabelSelected: { color: colors.white },
  historyTabs: { flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 22, paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.line },
  historyTab: { width: 185, maxWidth: '32%', minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: '#D9E2DC', backgroundColor: '#F2F3ED' },
  historyTabSelected: { backgroundColor: personalLibrary.green, borderColor: '#367667' },
  historyTabText: { color: personalLibrary.green, fontFamily: fonts.serif, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  historyTabTextSelected: { color: colors.white },
  memoAccent: { width: 38, height: 48, borderRadius: 9, backgroundColor: '#F9DDCE', alignItems: 'center', justifyContent: 'center' }, memoAccentText: { color: '#B35A38', fontSize: 24 },
  tabContent: { marginTop: 30 },
  sectionHeading: { minHeight: 62, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { ...personalLibrary.heading, color: colors.ink },
  sectionSubtitle: { marginTop: 2, color: '#68716F', fontSize: 18, lineHeight: 28 },
  sectionAction: { minHeight: 38, paddingHorizontal: 13, borderWidth: 1, borderColor: '#D2B77F', borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  sectionActionText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  listRow: { minHeight: 90, marginBottom: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowPressed: { backgroundColor: colors.paperDeep },
  rowCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  categoryLabel: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: '#F5ECDc', color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 10, lineHeight: 15, fontWeight: '600' },
  theoryLabel: { backgroundColor: '#E8EDF0', color: '#536879' },
  rowTitle: { marginTop: 5, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, fontWeight: '600' },
  rowDescription: { marginTop: 4, color: colors.muted, fontFamily: fonts.serif, fontSize: 12, lineHeight: 19 },
  rowArrow: { color: colors.goldDeep, fontSize: 26, lineHeight: 30 },
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
  folderAddText: { color: colors.goldDeep, fontSize: 11, fontWeight: '700' },
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
