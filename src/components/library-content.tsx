import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, theoryById } from '@/data/catalog';
import { useAppState } from '@/state/app-state';
import { libraryItemKey, type LibraryItemKind } from '@/state/library-folders';
import { AppText } from './ui';

type SavedItem = { kind: LibraryItemKind; id: string; title: string; description: string };

export function LibraryContent() {
  'use no memo';
  const router = useRouter();
  useAccess();
  const { savedIds, savedTheoryIds, libraryFolders, libraryFolderByItem, createLibraryFolder, renameLibraryFolder, deleteLibraryFolder, moveLibraryItem } = useAppState();
  const [folder, setFolder] = useState('all');
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [name, setName] = useState('');
  const [moving, setMoving] = useState<SavedItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Catalogue maps are hydrated in place: derive rows again after every revision.
  const items: SavedItem[] = [
    ...savedIds.map(id => {
      const card = techniqueById.get(id);
      return { kind: 'technique' as const, id, title: card?.title ?? '保存済みの処世術', description: card?.subcategory ?? '保存したコンテンツ' };
    }),
    ...savedTheoryIds.map(id => {
      const theory = theoryById.get(id);
      return { kind: 'theory' as const, id, title: theory?.title ?? '保存済みの理論', description: [theory?.categoryTitle, theory?.subcategoryTitle].filter(Boolean).join(' > ') };
    }),
  ];
  const currentFolder = libraryFolders.find(value => value.id === folder);
  const assignedFolder = (item: SavedItem) => libraryFolderByItem[libraryItemKey(item.kind, item.id)];
  const visible = items.filter(item => folder === 'all' || (folder === 'unfiled' ? !assignedFolder(item) : assignedFolder(item) === folder));
  const count = (id: string) => items.filter(item => id === 'all' || (id === 'unfiled' ? !assignedFolder(item) : assignedFolder(item) === id)).length;
  useEffect(() => { if (folder !== 'all' && folder !== 'unfiled' && !currentFolder) setFolder('unfiled'); }, [folder, currentFolder]);
  const closeEditor = () => { setEditor(null); setDeleting(false); };
  const saveFolder = () => {
    if (!name.trim()) return;
    if (editor?.id) renameLibraryFolder(editor.id, name);
    else { const id = createLibraryFolder(name); if (id) setFolder(id); }
    closeEditor();
  };
  return <View testID="library-organizer" style={styles.content}>
    <View style={styles.heading}>
      <View style={styles.headingCopy}><AppText accessibilityRole="header" aria-level={2} style={styles.title}>蔵書</AppText><AppText style={styles.lead}>保存した処世術・理論 {items.length}件</AppText></View>
      <Action label="フォルダーを追加" onPress={() => { setName(''); setEditor({}); }} text="＋ フォルダー" />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {[{ id: 'all', name: 'すべて' }, { id: 'unfiled', name: '未整理' }, ...libraryFolders].map(value => <Pressable key={value.id} accessibilityRole="button" accessibilityLabel={`蔵書：${value.name}`} accessibilityState={{ selected: folder === value.id }} onPress={() => setFolder(value.id)} style={[styles.chip, folder === value.id && styles.chipActive]}><AppText style={[styles.chipText, folder === value.id && styles.chipTextActive]}>{value.name} {count(value.id)}</AppText></Pressable>)}
    </ScrollView>
    {currentFolder ? <View style={styles.folderHeading}><AppText style={styles.folderName}>{currentFolder.name}</AppText><Action label="蔵書フォルダーを編集" text="編集" onPress={() => { setName(currentFolder.name); setEditor({ id: currentFolder.id }); }} /></View> : null}
    {visible.length ? visible.map(item => <View key={libraryItemKey(item.kind, item.id)} style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}を開く`} onPress={() => router.push(item.kind === 'theory' ? { pathname: '/theory/[id]', params: { id: item.id } } : { pathname: '/card/[id]', params: { id: item.id } })} style={styles.rowCopy}>
        <AppText style={styles.meta}>{item.kind === 'theory' ? '理論' : '処世術'} · {libraryFolders.find(value => value.id === assignedFolder(item))?.name ?? '未整理'}</AppText>
        <AppText numberOfLines={2} style={styles.rowTitle}>{item.title}</AppText>
        {item.description ? <AppText numberOfLines={2} style={styles.description}>{item.description}</AppText> : null}
      </Pressable>
      <Action label={`${item.title}の保存先を変更`} text="整理" onPress={() => setMoving(item)} />
    </View>) : <View style={styles.empty}><AppText style={styles.emptyTitle}>{items.length ? 'このフォルダーは空です' : '蔵書はまだ空です'}</AppText><AppText style={styles.lead}>{items.length ? '「すべて」で知識を選び、「整理」から保存先を変更できます。' : '処世術や理論の「保存」から、知恵を集められます。'}</AppText></View>}
    <Modal transparent visible={editor !== null} animationType="fade" onRequestClose={closeEditor}>
      <View style={styles.backdrop}><View role="dialog" aria-modal accessibilityLabel="蔵書フォルダーの編集" style={styles.dialog}>
        <AppText accessibilityRole="header" style={styles.dialogTitle}>{editor?.id ? 'フォルダーを編集' : 'フォルダーを追加'}</AppText>
        {deleting ? <>
          <AppText style={styles.lead}>フォルダーを削除します。保存した処世術・理論は「未整理」に戻ります。</AppText>
          <View style={styles.actions}><Action label="フォルダー削除を取り消す" text="取り消す" onPress={() => setDeleting(false)} /><Action label="フォルダーだけ削除" text="フォルダーだけ削除" onPress={() => { if (editor?.id) deleteLibraryFolder(editor.id); setFolder('unfiled'); closeEditor(); }} /></View>
        </> : <>
          <TextInput autoFocus maxLength={32} value={name} onChangeText={setName} onSubmitEditing={saveFolder} accessibilityLabel="蔵書フォルダー名" placeholder="例：仕事で使う知恵" placeholderTextColor={colors.muted} style={styles.input} />
          <View style={styles.actions}><Action label="フォルダー編集を閉じる" text="閉じる" onPress={closeEditor} /><Pressable accessibilityRole="button" accessibilityLabel="蔵書フォルダーを保存" disabled={!name.trim()} onPress={saveFolder} style={[styles.primary, !name.trim() && styles.disabled]}><AppText style={styles.primaryText}>保存する</AppText></Pressable></View>
          {editor?.id ? <Action label="蔵書フォルダーを削除" text="フォルダーを削除" onPress={() => setDeleting(true)} /> : null}
        </>}
      </View></View>
    </Modal>
    <Modal transparent visible={moving !== null} animationType="fade" onRequestClose={() => setMoving(null)}>
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
  title: { fontFamily: fonts.serif, fontSize: 25, lineHeight: 36, fontWeight: '700' },
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
  action: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line },
  actionText: { color: colors.goldDeep, fontSize: 13, lineHeight: 20, fontWeight: '600' },
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
