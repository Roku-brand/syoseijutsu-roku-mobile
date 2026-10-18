import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from './ui';
import { FolderBack, FolderFronts, MoreCards } from './folder-fronts';
import { PersonalSectionHeading } from './personal-section-heading';
import { useAppState, type PersonalMemo } from '@/state/app-state';
import { latestPersonalMemos, personalMemoCopy } from '@/data/personal-dashboard';
import { colors, fonts } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function PersonalMemosContent({ preview = false, initialFolder = null, initialCompose = false }: { preview?: boolean; initialFolder?: string | null; initialCompose?: boolean }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { personalMemos, personalMemoFolders, addPersonalMemo, updatePersonalMemo, removePersonalMemo, movePersonalMemo, createPersonalMemoFolder, renamePersonalMemoFolder, deletePersonalMemoFolder } = useAppState();
  const [folder, setFolder] = useState<string | null>(initialFolder);
  const [limit, setLimit] = useState(20);
  const [editor, setEditor] = useState<{ id?: string } | null>(initialCompose ? {} : null);
  const [text, setText] = useState('');
  const [destination, setDestination] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ memo: PersonalMemo; mode: 'actions' | 'move' | 'delete' } | null>(null);
  const [folderEditor, setFolderEditor] = useState<{ id?: string; deleting?: boolean } | null>(null);
  const [folderName, setFolderName] = useState('');
  const all = latestPersonalMemos(personalMemos);
  const visible = preview ? all.slice(0, 3) : all.filter(memo => folder === 'all' || (folder === 'unfiled' ? !memo.folderId : memo.folderId === folder));
  const folders = [{ id: 'all', name: 'すべて' }, { id: 'unfiled', name: '未整理' }, ...personalMemoFolders].map(item => ({ ...item, count: all.filter(memo => item.id === 'all' || (item.id === 'unfiled' ? !memo.folderId : memo.folderId === item.id)).length }));
  useEffect(() => { if (folder && folder !== 'all' && folder !== 'unfiled' && !personalMemoFolders.some(item => item.id === folder)) setFolder('unfiled'); }, [folder, personalMemoFolders]);
  const openFolder = (id: string | null) => { setFolder(id); setLimit(20); };
  const compose = (memo?: PersonalMemo) => {
    setEditor(memo ? { id: memo.id } : {}); setText(memo?.text ?? '');
    setDestination(memo?.folderId ?? (!preview && folder && folder !== 'all' && folder !== 'unfiled' ? folder : null)); setMenu(null);
  };
  const save = () => {
    if (!text.trim()) return;
    if (editor?.id) updatePersonalMemo(editor.id, text, destination); else addPersonalMemo(text, destination);
    setEditor(null); if (!preview) openFolder(destination ?? 'unfiled');
  };
  const saveFolder = () => {
    if (!folderName.trim()) return;
    if (folderEditor?.id) renamePersonalMemoFolder(folderEditor.id, folderName);
    else { const id = createPersonalMemoFolder(folderName); if (id) openFolder(id); }
    setFolderEditor(null);
  };
  return <View testID={preview ? 'personal-memos-preview' : 'personal-memos-organizer'}>
    <PersonalSectionHeading title="マイ処世術" subtitle="自分の言葉で残した処世術" action="＋ 作る" actionLabel="＋ 作る" onAction={() => compose()} />
    {!preview ? <>
      <Action label="フォルダーを追加" onPress={() => { setFolderName(''); setFolderEditor({}); }} />
      {folder === null ? <FolderFronts folders={folders} label="マイ処世術" onOpen={openFolder} /> : <>
        <FolderBack onPress={() => openFolder(null)} />
        <View style={styles.folderHeading}><AppText style={styles.folderTitle}>{folders.find(item => item.id === folder)?.name} · {visible.length}件</AppText>{personalMemoFolders.some(item => item.id === folder) ? <Action label="マイ処世術フォルダーを編集" text="編集" onPress={() => { setFolderName(personalMemoFolders.find(item => item.id === folder)?.name ?? ''); setFolderEditor({ id: folder! }); }} /> : null}</View>
      </>}
    </> : null}
    {preview || folder !== null ? <View style={styles.list}>
      {visible.length ? visible.slice(0, preview ? 3 : limit).map(memo => {
        const copy = personalMemoCopy(memo.text);
        return <View key={memo.id} testID="personal-memo-card" style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${memo.text}を編集`} onPress={() => compose(memo)} style={styles.copy}>
            <AppText numberOfLines={2} style={styles.title}>{copy.title}</AppText>
            {copy.excerpt ? <AppText numberOfLines={3} style={styles.excerpt}>{copy.excerpt}</AppText> : null}
            <AppText style={styles.meta}>{personalMemoFolders.find(item => item.id === memo.folderId)?.name ?? '未整理'}</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${memo.text}のメニュー`} onPress={() => setMenu({ memo, mode: 'actions' })} style={styles.more}><AppText style={styles.moreText}>⋯</AppText></Pressable>
        </View>;
      }) : <View testID="personal-memos-empty" style={styles.empty}><AppText style={styles.emptyTitle}>{preview ? '自分の言葉を、ここに。' : 'このフォルダーはまだ空です'}</AppText><AppText style={styles.excerpt}>日々の気づきや、大切にしたい処世術を残せます。</AppText><Action label="最初のマイ処世術を作る" text="＋ 新しく作る" onPress={() => compose()} /></View>}
      {!preview ? <MoreCards remaining={visible.length - limit} onPress={() => setLimit(value => value + 20)} /> : <Action label="マイ処世術をすべて見る" text="すべて見る ＞" onPress={() => router.push({ pathname: '/my-techniques', params: { folder: 'all' } })} />}
    </View> : null}
    <Modal transparent visible={editor !== null} animationType="fade" onRequestClose={() => setEditor(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.modalScroll, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}>
          <View role="dialog" aria-modal accessibilityLabel="マイ処世術の編集" tabIndex={-1} style={[styles.dialog, styles.composerDialog]}>
            <AppText style={styles.dialogTitle}>{editor?.id ? 'マイ処世術を編集' : 'マイ処世術を作る'}</AppText>
            <AppText style={styles.excerpt}>1行目に見出し、続けて本文を書けます。</AppText>
            <TextInput accessibilityLabel="マイ処世術" multiline maxLength={140} value={text} onChangeText={setText} placeholder="自分の言葉を記してください" placeholderTextColor={colors.muted} style={styles.input} />
            <AppText style={styles.meta}>保存先</AppText>
            <View style={styles.destinations}>{[{ id: '', name: '未整理' }, ...personalMemoFolders].map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: (destination ?? '') === item.id }} onPress={() => setDestination(item.id || null)} style={[styles.destination, (destination ?? '') === item.id && styles.chosen]}><AppText style={styles.actionText}>{item.name}</AppText></Pressable>)}</View>
            <View style={styles.actions}><Action label="作成を閉じる" text="閉じる" onPress={() => setEditor(null)} /><Action label={!preview && !editor?.id ? 'マイ処世術を追加' : '保存する'} text="保存する" primary disabled={!text.trim()} onPress={save} /></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
    <Modal transparent visible={menu !== null} animationType="fade" onRequestClose={() => setMenu(null)}><View style={[styles.backdrop, styles.center]}><View role="dialog" aria-modal accessibilityLabel="マイ処世術の操作" style={styles.dialog}>
      <AppText numberOfLines={2} style={styles.dialogTitle}>{menu ? personalMemoCopy(menu.memo.text).title : ''}</AppText>
      {menu?.mode === 'actions' ? <><Action label="編集" onPress={() => compose(menu.memo)} /><Action label="フォルダーへ整理・移動" onPress={() => setMenu({ ...menu, mode: 'move' })} /><Action label="削除" onPress={() => setMenu({ ...menu, mode: 'delete' })} /></> : menu?.mode === 'move' ? <ScrollView style={styles.folderList}>{[{ id: '', name: '未整理' }, ...personalMemoFolders].map(item => <Action key={item.id} label={`保存先：${item.name}`} text={item.name} onPress={() => { movePersonalMemo(menu.memo.id, item.id || null); setMenu(null); }} />)}</ScrollView> : menu ? <><AppText style={styles.excerpt}>このマイ処世術を削除しますか？</AppText><Action label="このマイ処世術を削除" onPress={() => { removePersonalMemo(menu.memo.id); setMenu(null); }} /></> : null}
      <Action label="操作を閉じる" text="閉じる" onPress={() => setMenu(null)} />
    </View></View></Modal>
    <Modal transparent visible={folderEditor !== null} animationType="fade" onRequestClose={() => setFolderEditor(null)}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.backdrop, styles.center]}><View role="dialog" aria-modal accessibilityLabel="マイ処世術フォルダーの編集" tabIndex={-1} style={styles.dialog}>
      <AppText style={styles.dialogTitle}>{folderEditor?.id ? 'フォルダーを編集' : 'フォルダーを作成'}</AppText>
      {folderEditor?.deleting ? <><AppText style={styles.excerpt}>フォルダーだけを削除します。中のマイ処世術は「未整理」に戻ります。</AppText><Action label="フォルダーだけ削除" onPress={() => { deletePersonalMemoFolder(folderEditor.id!); setFolderEditor(null); openFolder('unfiled'); }} /></> : <>
        <TextInput accessibilityLabel="フォルダー名" maxLength={32} value={folderName} onChangeText={setFolderName} style={styles.folderInput} />
        <Action label={folderEditor?.id ? 'フォルダーを保存する' : '作成する'} text={folderEditor?.id ? '保存する' : '作成する'} primary disabled={!folderName.trim()} onPress={saveFolder} />
        {folderEditor?.id ? <Action label="フォルダーを削除" onPress={() => setFolderEditor({ ...folderEditor, deleting: true })} /> : null}
      </>}
      <Action label="フォルダー編集を閉じる" text="閉じる" onPress={() => setFolderEditor(null)} />
    </View></KeyboardAvoidingView></Modal>
  </View>;
}

function Action({ label, text, onPress, disabled = false, primary = false }: { label: string; text?: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.action, primary && styles.primary, disabled && styles.disabled]}><AppText style={[styles.actionText, primary && styles.primaryText]}>{text ?? label}</AppText></Pressable>;
}
const styles = StyleSheet.create({
  list: { gap: 12 }, card: { flexDirection: 'row', alignItems: 'flex-start', padding: 18, gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10 },
  copy: { flex: 1, minWidth: 0 }, title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 29, fontWeight: '600' }, excerpt: { marginTop: 7, color: colors.inkSoft, fontSize: 13, lineHeight: 23 }, meta: { marginTop: 10, color: colors.muted, fontSize: 11, lineHeight: 18 },
  more: { minWidth: 44, minHeight: 44, marginRight: -10, marginTop: -8, alignItems: 'center', justifyContent: 'center' }, moreText: { color: colors.goldDeep, fontSize: 27, lineHeight: 32 },
  empty: { paddingVertical: 20, paddingHorizontal: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10 }, emptyTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30 },
  action: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' }, actionText: { color: colors.goldDeep, fontSize: 13, lineHeight: 22, fontWeight: '600' }, primary: { backgroundColor: colors.goldDeep, borderRadius: 8, alignItems: 'center' }, primaryText: { color: colors.white }, disabled: { opacity: 0.4 },
  folderHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }, folderTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)' }, center: { padding: 16, alignItems: 'center', justifyContent: 'center' }, modalScroll: { flexGrow: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 500, maxHeight: '95%', backgroundColor: colors.surface, padding: 22, borderRadius: 14, gap: 10 }, composerDialog: { maxHeight: undefined }, dialogTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, fontWeight: '600' },
  input: { minHeight: 140, maxHeight: 240, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 27, textAlignVertical: 'top' },
  folderInput: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, color: colors.ink, fontSize: 16 }, destinations: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, destination: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 8 }, chosen: { backgroundColor: colors.goldSoft, borderColor: colors.gold }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14 }, folderList: { maxHeight: 300 },
});
