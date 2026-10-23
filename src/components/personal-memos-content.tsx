import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from './ui';
import { FolderBack, FolderFronts, MoreCards } from './folder-fronts';
import { PersonalSectionHeading } from './personal-section-heading';
import { useAppState, type PersonalMemo } from '@/state/app-state';
import { latestPersonalMemos, personalMemoCopy } from '@/data/personal-dashboard';
import { colors, fonts } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NEW_FOLDER = 'new-folder';

export function PersonalMemosContent({ preview = false, initialFolder = null, composeRequested = false, onComposeHandled }: { preview?: boolean; initialFolder?: string | null; composeRequested?: boolean; onComposeHandled?: () => void }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { hydrated, personalMemos, personalMemoFolders, addPersonalMemo, updatePersonalMemo, removePersonalMemo, movePersonalMemo, createPersonalMemoFolder, renamePersonalMemoFolder, deletePersonalMemoFolder } = useAppState();
  const [folder, setFolder] = useState<string | null>(initialFolder === 'all' ? null : initialFolder);
  const [limit, setLimit] = useState(20);
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const [text, setText] = useState('');
  const [destination, setDestination] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ memo: PersonalMemo; mode: 'actions' | 'move' | 'delete' } | null>(null);
  const [folderManagerVisible, setFolderManagerVisible] = useState(false);
  const [folderEditor, setFolderEditor] = useState<{ id?: string; deleting?: boolean } | null>(null);
  const [folderName, setFolderName] = useState('');
  const [composerFolderName, setComposerFolderName] = useState('');
  const composeHandled = useRef(false);
  const all = latestPersonalMemos(personalMemos);
  const visible = folder === 'all' ? all : folder === 'unfiled' ? all.filter(memo => !memo.folderId) : all.filter(memo => memo.folderId === folder);
  const folders = [{ id: 'all', name: 'すべて' }, { id: 'unfiled', name: '未整理' }, ...personalMemoFolders].map(item => ({ ...item, count: all.filter(memo => item.id === 'all' || (item.id === 'unfiled' ? !memo.folderId : memo.folderId === item.id)).length }));
  const folderTiles = [
    ...personalMemoFolders.map(item => ({ ...item, count: all.filter(memo => memo.folderId === item.id).length })),
    ...(all.some(memo => !memo.folderId) ? [{ id: 'unfiled', name: '未整理', count: all.filter(memo => !memo.folderId).length }] : []),
  ];
  useEffect(() => { setFolder(initialFolder === 'all' ? null : initialFolder); }, [initialFolder]);
  useEffect(() => { if (folder && folder !== 'all' && folder !== 'unfiled' && !personalMemoFolders.some(item => item.id === folder)) setFolder(null); }, [folder, personalMemoFolders]);
  const openFolder = (id: string | null) => { setFolder(id); setLimit(20); };
  const compose = useCallback((memo?: PersonalMemo) => {
    const selectedFolder = memo ? memo.folderId : !preview && folder && folder !== 'all' ? folder === 'unfiled' ? null : folder : NEW_FOLDER;
    setEditor(memo ? { id: memo.id } : {});
    setText(memo?.text ?? '');
    setDestination(selectedFolder);
    setComposerFolderName(personalMemoFolders.find(item => item.id === selectedFolder)?.name ?? '');
    setMenu(null);
  }, [folder, personalMemoFolders, preview]);
  useEffect(() => {
    if (!composeRequested) { composeHandled.current = false; return; }
    if (!hydrated || composeHandled.current) return;
    composeHandled.current = true;
    compose();
    onComposeHandled?.();
  }, [composeRequested, hydrated, compose, onComposeHandled]);
  const needsFolderName = !editor?.id && (destination === NEW_FOLDER || Boolean(destination && !personalMemos.some(memo => memo.folderId === destination)));
  const canSave = Boolean(text.trim() && (!needsFolderName || composerFolderName.trim()));
  const save = () => {
    if (!canSave) return;
    let savedFolder = destination;
    if (editor?.id) updatePersonalMemo(editor.id, text, destination);
    else if (destination === NEW_FOLDER) savedFolder = addPersonalMemo(text, null, composerFolderName);
    else {
      if (needsFolderName && destination) renamePersonalMemoFolder(destination, composerFolderName);
      addPersonalMemo(text, destination);
    }
    setEditor(null);
    if (!preview) openFolder(savedFolder ?? 'unfiled');
  };
  const saveFolder = () => {
    if (!folderName.trim()) return;
    if (folderEditor?.id) renamePersonalMemoFolder(folderEditor.id, folderName);
    else { const id = createPersonalMemoFolder(folderName); if (id && !preview) openFolder(id); }
    setFolderEditor(null);
  };
  const manageFolders = () => setFolderManagerVisible(true);
  const startFolderEditor = (id?: string) => {
    setFolderName(id ? personalMemoFolders.find(item => item.id === id)?.name ?? '' : '');
    setFolderManagerVisible(false);
    setFolderEditor(id ? { id } : {});
  };
  const openTile = (id: string) => {
    if (preview) router.push({ pathname: '/my-techniques', params: { folder: id } });
    else openFolder(id);
  };
  const folderAction = <Pressable testID="personal-folder-manager-open" accessibilityRole="button" accessibilityLabel="フォルダーを管理" onPress={manageFolders} style={styles.ellipsis}><AppText style={styles.ellipsisText}>…</AppText></Pressable>;

  return <View testID={preview ? 'personal-memos-preview' : 'personal-memos-organizer'}>
    <PersonalSectionHeading title="マイ処世術" subtitle="自分の言葉で残した処世術"
      leadingAction={folderAction}
      action={preview ? 'すべて見る ＞' : undefined}
      actionLabel={preview ? 'マイ処世術をすべて見る' : undefined}
      onAction={preview ? () => router.push('/my-techniques') : undefined} />

    {preview ? <View style={styles.folderPreview}>
      {folderTiles.length ? <FolderFronts folders={folderTiles} label="マイ処世術" onOpen={openTile} />
        : <Pressable testID="personal-memo-first-create" accessibilityRole="button" accessibilityLabel="オリジナルの処世術を作る" onPress={() => compose()} style={({ pressed }) => [styles.firstCreate, pressed && styles.pressed]}>
          <AppText style={styles.firstCreateText}>オリジナルの処世術を作る＋</AppText>
        </Pressable>}
    </View> : folder === null ? <View style={styles.folderPreview}>
      {folderTiles.length ? <FolderFronts folders={folderTiles} label="マイ処世術" onOpen={openFolder} />
        : <Pressable testID="personal-memo-first-create" accessibilityRole="button" accessibilityLabel="オリジナルの処世術を作る" onPress={() => compose()} style={({ pressed }) => [styles.firstCreate, pressed && styles.pressed]}>
          <AppText style={styles.firstCreateText}>オリジナルの処世術を作る＋</AppText>
        </Pressable>}
    </View> : <>
      <FolderBack onPress={() => openFolder(null)} />
      <View style={styles.folderHeading}>
        <AppText style={styles.folderTitle}>{folders.find(item => item.id === folder)?.name} · {visible.length}件</AppText>
        <Action label="このフォルダーに新規作成" text="新規作成＋" onPress={() => compose()} />
      </View>
      <View style={styles.list}>
        {visible.length ? visible.slice(0, limit).map(memo => {
          const copy = personalMemoCopy(memo.text);
          return <View key={memo.id} testID="personal-memo-card" style={styles.card}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${memo.text}を編集`} onPress={() => compose(memo)} style={styles.copy}>
              <AppText numberOfLines={2} style={styles.title}>{copy.title}</AppText>
              {copy.excerpt ? <AppText numberOfLines={3} style={styles.excerpt}>{copy.excerpt}</AppText> : null}
              <AppText style={styles.meta}>{personalMemoFolders.find(item => item.id === memo.folderId)?.name ?? '未整理'}</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${memo.text}のメニュー`} onPress={() => setMenu({ memo, mode: 'actions' })} style={styles.more}><AppText style={styles.moreText}>⋯</AppText></Pressable>
          </View>;
        }) : <View testID="personal-memos-empty" style={styles.empty}><AppText style={styles.emptyTitle}>このフォルダーはまだ空です</AppText><AppText style={styles.excerpt}>右上の「新規作成＋」から、自分の知恵を残せます。</AppText></View>}
        <MoreCards remaining={visible.length - limit} onPress={() => setLimit(value => value + 20)} />
      </View>
    </>}

    <Modal transparent visible={editor !== null} animationType="fade" onRequestClose={() => setEditor(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.modalScroll, { paddingTop: Math.max(16, insets.top), paddingBottom: Math.max(16, insets.bottom) }]}>
          <View role="dialog" aria-modal accessibilityLabel="マイ処世術の編集" tabIndex={-1} style={[styles.dialog, styles.composerDialog]}>
            <AppText style={styles.dialogTitle}>{editor?.id ? 'マイ処世術を編集' : 'マイ処世術を作る'}</AppText>
            <AppText style={styles.excerpt}>1行目に見出し、続けて本文を書けます。</AppText>
            <TextInput accessibilityLabel="マイ処世術" multiline maxLength={140} value={text} onChangeText={setText} placeholder="自分の言葉を記してください" placeholderTextColor={colors.muted} style={styles.input} />
            <AppText style={styles.meta}>保存先</AppText>
            <View accessibilityRole="radiogroup" accessibilityLabel="保存先フォルダー" style={styles.destinations}>{[
              ...(!editor?.id ? [{ id: NEW_FOLDER, name: '新しいフォルダー＋' }] : []),
              ...(editor?.id || personalMemos.some(memo => !memo.folderId) ? [{ id: '', name: '未整理' }] : []),
              ...personalMemoFolders,
            ].map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.name} accessibilityState={{ checked: (destination ?? '') === item.id }} onPress={() => { setDestination(item.id || null); setComposerFolderName(personalMemoFolders.find(existing => existing.id === item.id)?.name ?? ''); }} style={[styles.destination, (destination ?? '') === item.id && styles.chosen]}><AppText style={styles.actionText}>{item.name}</AppText></Pressable>)}</View>
            {needsFolderName ? <>
              <AppText style={styles.meta}>フォルダー名</AppText>
              <TextInput accessibilityLabel="フォルダー名" maxLength={32} value={composerFolderName} onChangeText={setComposerFolderName} placeholder="例：仕事で使う知恵" placeholderTextColor={colors.muted} style={styles.folderInput} />
            </> : null}
            <View style={styles.actions}><Action label="作成を閉じる" text="閉じる" onPress={() => setEditor(null)} /><Action label={editor?.id ? '変更を保存' : 'マイ処世術を追加'} text="保存する" primary disabled={!canSave} onPress={save} /></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>

    <Modal transparent visible={menu !== null} animationType="fade" onRequestClose={() => setMenu(null)}><View style={[styles.backdrop, styles.center]}><View role="dialog" aria-modal accessibilityLabel="マイ処世術の操作" style={styles.dialog}>
      <AppText numberOfLines={2} style={styles.dialogTitle}>{menu ? personalMemoCopy(menu.memo.text).title : ''}</AppText>
      {menu?.mode === 'actions' ? <><Action label="編集" onPress={() => compose(menu.memo)} /><Action label="フォルダーへ整理・移動" onPress={() => setMenu({ ...menu, mode: 'move' })} /><Action label="削除" danger onPress={() => setMenu({ ...menu, mode: 'delete' })} /></> : menu?.mode === 'move' ? <ScrollView style={styles.folderList}>{[{ id: '', name: '未整理' }, ...personalMemoFolders].map(item => <Action key={item.id} label={`保存先：${item.name}`} text={item.name} onPress={() => { movePersonalMemo(menu.memo.id, item.id || null); setMenu(null); }} />)}</ScrollView> : menu ? <><AppText style={styles.excerpt}>このマイ処世術を削除しますか？</AppText><Action label="このマイ処世術を削除" danger onPress={() => { removePersonalMemo(menu.memo.id); setMenu(null); }} /></> : null}
      <Action label="操作を閉じる" text="閉じる" onPress={() => setMenu(null)} />
    </View></View></Modal>

    <Modal transparent visible={folderManagerVisible} animationType="fade" onRequestClose={() => setFolderManagerVisible(false)}><View style={[styles.backdrop, styles.center]}><View role="dialog" aria-modal accessibilityLabel="マイ処世術フォルダーの管理" style={styles.dialog}>
      <AppText style={styles.dialogTitle}>フォルダーを管理</AppText>
      <Action label="フォルダーを追加" text="＋ フォルダーを追加" primary onPress={() => startFolderEditor()} />
      {personalMemoFolders.length ? <ScrollView style={styles.folderList}>{personalMemoFolders.map(item => <View key={item.id} style={styles.folderManagerRow}>
        <AppText numberOfLines={1} style={styles.managerFolderName}>{item.name}</AppText>
        <Action label={`${item.name}を編集`} text="編集" onPress={() => startFolderEditor(item.id)} />
        <Action label={`${item.name}を削除`} text="削除" danger onPress={() => { setFolderManagerVisible(false); setFolderEditor({ id: item.id, deleting: true }); }} />
      </View>)}</ScrollView> : <AppText style={styles.excerpt}>フォルダーはまだありません。追加すると、処世術を分けて保存できます。</AppText>}
      <Action label="フォルダー管理を閉じる" text="閉じる" onPress={() => setFolderManagerVisible(false)} />
    </View></View></Modal>

    <Modal transparent visible={folderEditor !== null} animationType="fade" onRequestClose={() => setFolderEditor(null)}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.backdrop, styles.center]}><View role="dialog" aria-modal accessibilityLabel="マイ処世術フォルダーの編集" tabIndex={-1} style={styles.dialog}>
      <AppText style={styles.dialogTitle}>{folderEditor?.deleting ? 'フォルダーを削除' : folderEditor?.id ? 'フォルダーを編集' : 'フォルダーを追加'}</AppText>
      {folderEditor?.deleting ? <><AppText style={styles.excerpt}>フォルダーだけを削除します。中のマイ処世術は「未整理」に戻ります。</AppText><View style={styles.actions}><Action label="削除を取り消す" text="戻る" onPress={() => setFolderEditor(null)} /><Action label="フォルダーだけ削除" text="フォルダーを削除" danger primary onPress={() => { deletePersonalMemoFolder(folderEditor.id!); setFolderEditor(null); if (folder === folderEditor.id) openFolder('unfiled'); }} /></View></> : <>
        <TextInput accessibilityLabel="フォルダー名" maxLength={32} value={folderName} onChangeText={setFolderName} placeholder="例：仕事で使う知恵" placeholderTextColor={colors.muted} style={styles.folderInput} />
        <View style={styles.actions}><Action label="フォルダー編集を閉じる" text="閉じる" onPress={() => setFolderEditor(null)} /><Action label={folderEditor?.id ? 'フォルダー名を保存' : 'フォルダーを作成'} text={folderEditor?.id ? '保存する' : '作成する'} primary disabled={!folderName.trim()} onPress={saveFolder} /></View>
      </>}
    </View></KeyboardAvoidingView></Modal>
  </View>;
}

function Action({ label, text, onPress, disabled = false, primary = false, danger = false }: { label: string; text?: string; onPress: () => void; disabled?: boolean; primary?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.action, primary && styles.primary, danger && styles.dangerAction, disabled && styles.disabled]}><AppText style={[styles.actionText, primary && styles.primaryText, danger && styles.dangerText]}>{text ?? label}</AppText></Pressable>;
}
const styles = StyleSheet.create({
  folderPreview: { marginTop: 2 }, firstCreate: { minHeight: 120, width: '100%', alignItems: 'center', justifyContent: 'center', padding: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.gold, borderRadius: 16, backgroundColor: colors.surface },
  firstCreateText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 18, lineHeight: 28, fontWeight: '600', textAlign: 'center' }, pressed: { opacity: 0.72 }, ellipsis: { minWidth: 40, minHeight: 44, justifyContent: 'center', alignItems: 'center' }, ellipsisText: { color: colors.goldDeep, fontSize: 28, lineHeight: 34, fontWeight: '700' },
  list: { gap: 12 }, card: { flexDirection: 'row', alignItems: 'flex-start', padding: 18, gap: 6, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10 },
  copy: { flex: 1, minWidth: 0 }, title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 29, fontWeight: '600' }, excerpt: { marginTop: 7, color: colors.inkSoft, fontSize: 13, lineHeight: 23 }, meta: { marginTop: 10, color: colors.muted, fontSize: 11, lineHeight: 18 },
  more: { minWidth: 44, minHeight: 44, marginRight: -10, marginTop: -8, alignItems: 'center', justifyContent: 'center' }, moreText: { color: colors.goldDeep, fontSize: 27, lineHeight: 32 }, empty: { paddingVertical: 20, paddingHorizontal: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10 }, emptyTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30 },
  action: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' }, actionText: { color: colors.goldDeep, fontSize: 13, lineHeight: 22, fontWeight: '600' }, primary: { backgroundColor: colors.goldDeep, borderRadius: 8, alignItems: 'center' }, primaryText: { color: colors.white }, dangerAction: { borderRadius: 8 }, dangerText: { color: '#B42318' }, disabled: { opacity: 0.4 },
  folderHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 10 }, folderTitle: { flex: 1, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)' }, center: { padding: 16, alignItems: 'center', justifyContent: 'center' }, modalScroll: { flexGrow: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 500, maxHeight: '95%', backgroundColor: colors.surface, padding: 22, borderRadius: 14, gap: 10 }, composerDialog: { maxHeight: undefined }, dialogTitle: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, fontWeight: '600' },
  input: { minHeight: 140, maxHeight: 240, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 27, textAlignVertical: 'top' },
  folderInput: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, color: colors.ink, fontSize: 16 }, destinations: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, destination: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 8 }, chosen: { backgroundColor: colors.goldSoft, borderColor: colors.gold }, actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 }, folderList: { maxHeight: 300 },
  folderManagerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.line }, managerFolderName: { flex: 1, minWidth: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 22 },
});
