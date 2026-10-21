import { isRetiredTheoryId, RETIRED_THEORY_TITLE } from '@/data/theory-knowledge';
import { FolderBack, FolderFronts, MoreCards } from './folder-fronts';
import { type PersonalContentRow } from './personal-content-card';
import { SavedKnowledgeCard } from './saved-knowledge-card';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, theoryById } from '@/data/catalog';
import { useAppState } from '@/state/app-state';
import { libraryItemKey } from '@/state/library-folders';
import { personalLibrary } from './personal-library-theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { AppText } from './ui';
import { useFeatures } from '@/data/features';
import { featureRoute } from '@/navigation/app-routes';
import { uniqueSavedIds } from '@/data/personal-dashboard';

type SavedItem = PersonalContentRow;

export function LibraryContent({ category, kind }: { category?: string; kind?: string } = {}) {
  'use no memo';
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const mobile = width < 768;
  useAccess();
  const { savedIds, savedTheoryIds, savedFeatureIds, libraryFolders, libraryFolderByItem, createLibraryFolder, renameLibraryFolder, deleteLibraryFolder, moveLibraryItem } = useAppState();
  const { articles: featureArticles } = useFeatures(savedFeatureIds.length > 0);
  const automatic = Boolean(category || kind);
  const [folder, setFolder] = useState<string | null>(automatic ? 'all' : null);
  const [limit, setLimit] = useState(20);
  const openFolder = (id: string | null) => { setFolder(id); setLimit(20); };
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [name, setName] = useState('');
  const [moving, setMoving] = useState<SavedItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Catalogue maps are hydrated in place: derive rows again after every revision.
  const items: SavedItem[] = [
    ...uniqueSavedIds(savedFeatureIds).map(id => { const article = featureArticles.find(item => item.id === id); return { kind: 'feature' as const, id, label: '特集', category: 'feature', article, title: article?.title ?? '保存した特集', description: article?.lead ?? '' }; }),
    ...uniqueSavedIds(savedIds).map(id => {
      const card = techniqueById.get(id);
      return { kind: 'technique' as const, id, label: card?.categoryName ?? '処世術', category: card?.categoryKey ?? 'interpersonal', title: card?.title ?? '保存済みの処世術', description: card?.subcategory ?? '保存したコンテンツ' };
    }),
    ...uniqueSavedIds(savedTheoryIds).map(id => {
      if (isRetiredTheoryId(id)) return {kind: 'theory' as const,id,label:'公開終了',category:'practical-wisdom',title:RETIRED_THEORY_TITLE,description:'保存の記録は保持されています。'};
      const theory = theoryById.get(id);
      return { kind: 'theory' as const, id, label: theory?.categoryTitle ?? '理論', category: theory?.categoryId ?? 'psychology', title: theory?.title ?? '保存済みの理論', description: [theory?.categoryTitle, theory?.subcategoryTitle].filter(Boolean).join(' > ') };
    }),
  ];
  const currentFolder = libraryFolders.find(value => value.id === folder);
  const assignedFolder = (item: SavedItem) => libraryFolderByItem[libraryItemKey(item.kind, item.id)];
  const visible = items.filter(item => (!category || (item.kind === 'technique' && techniqueById.get(item.id)?.categoryKey === category)) && (!kind || item.kind === kind) && (folder === 'all' || (folder === 'unfiled' ? !assignedFolder(item) : assignedFolder(item) === folder)));
  const counts = new Map<string, number>([['all', items.length]]);
  items.forEach(item => { const id = assignedFolder(item) ?? 'unfiled'; counts.set(id, (counts.get(id) ?? 0) + 1); });
  const folders = [{ id: 'all', name: 'すべて' }, { id: 'unfiled', name: '未整理' }, ...libraryFolders].map(value => ({ ...value, count: counts.get(value.id) ?? 0 }));
  useEffect(() => { if (folder !== null && folder !== 'all' && folder !== 'unfiled' && !currentFolder) setFolder('unfiled'); }, [folder, currentFolder]);
  const closeEditor = () => { setEditor(null); setDeleting(false); };
  const saveFolder = () => {
    if (!name.trim()) return;
    if (editor?.id) renameLibraryFolder(editor.id, name);
    else { const id = createLibraryFolder(name); if (id) openFolder(id); }
    closeEditor();
  };
  return <View testID="library-organizer" style={styles.content}>
    <View style={styles.heading}>
      <View style={styles.headingCopy}><AppText accessibilityRole="header" aria-level={2} style={[styles.title, mobile && personalLibrary.headingSmall]}>お気に入り</AppText><AppText style={[styles.lead, !mobile && styles.headingLead]}>保存した知恵を、わかりやすく整理する</AppText></View>
      <Action label="フォルダーを追加" onPress={() => { setName(''); setEditor({}); }} text="＋ フォルダー" />
    </View>
    {folder === null ? <FolderFronts folders={folders} label="蔵書" onOpen={openFolder} /> : <>
      {automatic ? <Action label="すべてのお気に入りとフォルダーを見る" text="‹ すべてのお気に入り・フォルダー" onPress={() => router.push('/library')} /> : <FolderBack onPress={() => openFolder(null)} />}
      <View style={styles.folderHeading}><AppText style={styles.folderName}>{automatic ? ({ interpersonal: '対人術', work: '仕事術', life: '人生術', theory: '理論', feature: '特集' }[category ?? kind ?? ''] ?? 'すべて') : folders.find(value => value.id === folder)?.name} · {visible.length}件</AppText>{currentFolder ? <Action label="蔵書フォルダーを編集" text="編集" onPress={() => { setName(currentFolder.name); setEditor({ id: currentFolder.id }); }} /> : null}</View>
      {visible.length ? visible.slice(0, limit).map(item => <SavedKnowledgeCard key={libraryItemKey(item.kind, item.id)} row={item}
        onPress={() => router.push(item.kind === 'feature' ? featureRoute(item.article?.slug ?? item.id) : item.kind === 'theory' ? { pathname: '/theory/[id]', params: { id: item.id } } : { pathname: '/card/[id]', params: { id: item.id } })}
        onOrganize={() => setMoving(item)} />)
        : <View style={styles.empty}><AppText style={styles.emptyTitle}>このフォルダーは空です</AppText><AppText style={styles.lead}>保存した知恵の「整理」から、ここへ移動できます。</AppText></View>}
      <MoreCards remaining={visible.length - limit} onPress={() => setLimit(value => value + 20)} />
    </>}
    <Modal transparent visible={editor !== null} animationType="none" onRequestClose={closeEditor}>
      <View style={styles.backdrop}><View role="dialog" aria-modal tabIndex={-1} accessibilityLabel="蔵書フォルダーの編集" style={styles.dialog}>
        <AppText accessibilityRole="header" style={styles.dialogTitle}>{editor?.id ? 'フォルダーを編集' : 'フォルダーを追加'}</AppText>
        {deleting ? <>
          <AppText style={styles.lead}>フォルダーを削除します。保存した処世術・理論・特集は「未整理」に戻ります。</AppText>
          <View style={styles.actions}><Action label="フォルダー削除を取り消す" text="取り消す" onPress={() => setDeleting(false)} /><Action label="フォルダーだけ削除" text="フォルダーだけ削除" onPress={() => { if (editor?.id) deleteLibraryFolder(editor.id); setFolder('unfiled'); closeEditor(); }} /></View>
        </> : <>
          <TextInput maxLength={32} value={name} onChangeText={setName} onSubmitEditing={saveFolder} accessibilityLabel="蔵書フォルダー名" placeholder="例：仕事で使う知恵" placeholderTextColor={colors.muted} style={styles.input} />
          <View style={styles.actions}><Action label="フォルダー編集を閉じる" text="閉じる" onPress={closeEditor} /><Pressable accessibilityRole="button" accessibilityLabel="蔵書フォルダーを保存" disabled={!name.trim()} onPress={saveFolder} style={[styles.primary, !name.trim() && styles.disabled]}><AppText style={styles.primaryText}>保存する</AppText></Pressable></View>
          {editor?.id ? <Action label="蔵書フォルダーを削除" text="フォルダーを削除" onPress={() => setDeleting(true)} /> : null}
        </>}
      </View></View>
    </Modal>
    <Modal transparent visible={moving !== null} animationType="none" onRequestClose={() => setMoving(null)}>
      <View style={styles.backdrop}><View role="dialog" aria-modal accessibilityLabel="蔵書の保存先" style={styles.dialog}>
        <AppText accessibilityRole="header" style={styles.dialogTitle}>保存先を変更</AppText>
        <AppText numberOfLines={2} style={styles.lead}>{moving?.title}</AppText>
        <ScrollView style={styles.destinations} keyboardShouldPersistTaps="handled">
          {[{ id: '', name: '未整理' }, ...libraryFolders].map(value => <Pressable key={value.id} accessibilityRole="button" accessibilityLabel={`保存先：${value.name}`} accessibilityState={{ selected: Boolean(moving && (assignedFolder(moving) ?? '') === value.id) }} onPress={() => { if (moving) moveLibraryItem(moving.kind, moving.id, value.id || null); setMoving(null); }} style={styles.destination}><AppText style={styles.chipText}>{value.name}</AppText></Pressable>)}
        </ScrollView>
        <Action label="保存先の変更を閉じる" text="閉じる" onPress={() => setMoving(null)} />
      </View></View>
    </Modal>
  </View>;
}

function Action({ label, text, onPress }: { label: string; text: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}><AppText style={styles.actionText}>{text}</AppText></Pressable>;
}
const styles = StyleSheet.create({
  content: { width: '100%', gap: 12 },
  heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  headingCopy: { flex: 1, minWidth: 150 },
  title: personalLibrary.heading,
  headingLead: { fontSize: 18, lineHeight: 28 },
  lead: { marginTop: 4, color: colors.inkSoft, fontSize: 13, lineHeight: 22 },
  filters: { gap: 8, paddingVertical: 4 },
  chip: { minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.goldDeep, borderColor: colors.goldDeep },
  chipText: { color: colors.goldDeep, fontSize: 13, lineHeight: 20 },
  chipTextActive: { color: colors.white },
  folderHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  folderName: { flex: 1, fontFamily: fonts.serif, fontSize: 19, lineHeight: 28 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  rowCopy: { flex: 1, minWidth: 0 },
  meta: { color: colors.goldDeep, fontSize: 12, lineHeight: 19 },
  rowTitle: { marginTop: 4, fontFamily: fonts.serif, fontSize: 17, lineHeight: 26, fontWeight: '600' },
  description: { marginTop: 4, color: colors.inkSoft, fontSize: 13, lineHeight: 21 },
  action: { minHeight: 48, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  actionText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 16, lineHeight: 20, fontWeight: '600' },
  empty: { minHeight: 140, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 28 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', padding: 16, alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 460, maxHeight: '85%', padding: 22, gap: 14, backgroundColor: colors.surface, borderRadius: radius.lg },
  dialogTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, fontWeight: '600' },
  input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, color: colors.ink, fontSize: 16 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  primary: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.goldDeep },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  destinations: { maxHeight: 320, flexShrink: 1 },
  destination: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
});
