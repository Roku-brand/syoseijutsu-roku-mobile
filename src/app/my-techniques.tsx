import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAppState, type PersonalMemo } from '@/state/app-state';

type FolderFilter = 'all' | 'unfiled' | string;

export default function MyTechniquesScreen() {
  const {
    personalMemos,
    personalMemoFolders,
    addPersonalMemo,
    removePersonalMemo,
    createPersonalMemoFolder,
    deletePersonalMemoFolder,
    movePersonalMemo,
  } = useAppState();
  const [filter, setFilter] = useState<FolderFilter>('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [folderComposerOpen, setFolderComposerOpen] = useState(false);
  const [movingMemoId, setMovingMemoId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [folderDraft, setFolderDraft] = useState('');
  const [draftFolderId, setDraftFolderId] = useState<string | null>(null);

  const visibleMemos = personalMemos.filter((memo) => filter === 'all' || (filter === 'unfiled' ? !memo.folderId : memo.folderId === filter));
  const addMemo = () => {
    if (!draft.trim()) return;
    addPersonalMemo(draft, draftFolderId);
    setDraft('');
    setDraftFolderId(null);
    setComposerOpen(false);
  };
  const addFolder = () => {
    const id = createPersonalMemoFolder(folderDraft);
    if (!id) return;
    setFolderDraft('');
    setFolderComposerOpen(false);
    setFilter(id);
  };
  const folderName = (folderId: string | null) => personalMemoFolders.find((folder) => folder.id === folderId)?.name ?? '未整理';

  return <BookScreen contentContainerStyle={styles.content}>
    <View style={styles.listHeader}>
      <View><AppText variant="label" style={styles.eyebrow}>MY TECHNIQUES</AppText><AppText variant="serif" style={styles.listTitle}>マイ処世術一覧</AppText></View>
      <Pressable accessibilityRole="button" accessibilityLabel="マイ処世術を新規作成" onPress={() => setComposerOpen(true)} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}><AppText style={styles.createButtonText}>＋</AppText><AppText style={styles.createButtonLabel}>新規作成</AppText></Pressable>
    </View>

    <View style={styles.folderBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderScroll}>
        <FolderTab label="すべて" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <FolderTab label="未整理" selected={filter === 'unfiled'} onPress={() => setFilter('unfiled')} />
        {personalMemoFolders.map((folder) => <FolderTab key={folder.id} label={folder.name} selected={filter === folder.id} onPress={() => setFilter(folder.id)} onDelete={() => { deletePersonalMemoFolder(folder.id); if (filter === folder.id) setFilter('unfiled'); }} />)}
        <Pressable accessibilityRole="button" accessibilityLabel="フォルダーを追加" onPress={() => setFolderComposerOpen(true)} style={({ pressed }) => [styles.folderAdd, pressed && styles.pressed]}><AppText style={styles.folderAddText}>＋ フォルダー</AppText></Pressable>
      </ScrollView>
    </View>

    {visibleMemos.length ? <View style={styles.memoList}>{visibleMemos.map((memo, index) => <MemoCard key={memo.id} memo={memo} index={index} folderName={folderName(memo.folderId)} folders={personalMemoFolders.map((folder) => ({ id: folder.id, name: folder.name }))} moving={movingMemoId === memo.id} onMove={() => setMovingMemoId(movingMemoId === memo.id ? null : memo.id)} onChooseFolder={(folderId) => { movePersonalMemo(memo.id, folderId); setMovingMemoId(null); }} onDelete={() => removePersonalMemo(memo.id)} />)}</View> : <View style={styles.emptyCard}><AppText variant="serif" style={styles.emptyTitle}>このフォルダーはまだ空です。</AppText><AppText style={styles.emptyLead}>右上の「＋ 新規作成」から、自分の処世術を残せます。</AppText></View>}

    <Modal transparent visible={composerOpen} animationType="fade" onRequestClose={() => setComposerOpen(false)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><AppText variant="serif" style={styles.modalTitle}>新しい処世術</AppText><AppText style={styles.modalLead}>自分の言葉で、あとから使い返せる一文を残します。</AppText><TextInput autoFocus multiline maxLength={140} value={draft} onChangeText={setDraft} placeholder="例：迷ったら、その場で返事をしない" placeholderTextColor={colors.muted} accessibilityLabel="マイ処世術" style={styles.input} /><AppText style={styles.folderSelectLabel}>保存先</AppText><View style={styles.folderPicker}><Picker label="未整理" selected={!draftFolderId} onPress={() => setDraftFolderId(null)} />{personalMemoFolders.map((folder) => <Picker key={folder.id} label={folder.name} selected={draftFolderId === folder.id} onPress={() => setDraftFolderId(folder.id)} />)}</View><View style={styles.modalActions}><Pressable accessibilityRole="button" onPress={() => setComposerOpen(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel="マイ処世術を追加" disabled={!draft.trim()} onPress={addMemo} style={({ pressed }) => [styles.save, !draft.trim() && styles.saveDisabled, pressed && draft.trim() && styles.pressed]}><AppText style={styles.saveText}>保存する</AppText></Pressable></View></View></View></Modal>
    <Modal transparent visible={folderComposerOpen} animationType="fade" onRequestClose={() => setFolderComposerOpen(false)}><View style={styles.modalBackdrop}><View style={styles.folderModalCard}><AppText variant="serif" style={styles.modalTitle}>フォルダーを作成</AppText><TextInput autoFocus maxLength={32} value={folderDraft} onChangeText={setFolderDraft} placeholder="例：仕事、人間関係、朝の習慣" placeholderTextColor={colors.muted} accessibilityLabel="フォルダー名" style={styles.folderInput} /><View style={styles.modalActions}><Pressable accessibilityRole="button" onPress={() => setFolderComposerOpen(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel="フォルダーを作成する" disabled={!folderDraft.trim()} onPress={addFolder} style={({ pressed }) => [styles.save, !folderDraft.trim() && styles.saveDisabled, pressed && folderDraft.trim() && styles.pressed]}><AppText style={styles.saveText}>作成する</AppText></Pressable></View></View></View></Modal>
  </BookScreen>;
}

function FolderTab({ label, selected, onPress, onDelete }: { label: string; selected: boolean; onPress: () => void; onDelete?: () => void }) {
  return <View style={[styles.folderTab, selected && styles.folderTabSelected]}><Pressable accessibilityRole="tab" accessibilityLabel={`${label}フォルダー`} accessibilityState={{ selected }} onPress={onPress} style={styles.folderTabPress}><AppText style={[styles.folderTabText, selected && styles.folderTabTextSelected]}>{label}</AppText></Pressable>{onDelete ? <Pressable accessibilityRole="button" accessibilityLabel={`${label}フォルダーを削除`} onPress={onDelete} hitSlop={8} style={styles.folderDelete}><AppText style={styles.folderDeleteText}>×</AppText></Pressable> : null}</View>;
}

function Picker({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.picker, selected && styles.pickerSelected]}><AppText style={[styles.pickerText, selected && styles.pickerTextSelected]}>{label}</AppText></Pressable>;
}

function MemoCard({ memo, index, folderName, folders, moving, onMove, onChooseFolder, onDelete }: { memo: PersonalMemo; index: number; folderName: string; folders: Array<{ id: string; name: string }>; moving: boolean; onMove: () => void; onChooseFolder: (folderId: string | null) => void; onDelete: () => void }) {
  return <View style={styles.memoCard}><View style={styles.memoTop}><View style={styles.memoNumber}><AppText variant="serif" style={styles.memoNumberText}>{String(index + 1).padStart(2, '0')}</AppText></View><View style={styles.memoCopy}><AppText style={styles.memoText}>{memo.text}</AppText><Pressable accessibilityRole="button" accessibilityLabel={`${memo.text}のフォルダーを変更`} onPress={onMove} style={styles.memoFolder}><AppText style={styles.memoFolderText}>▱ {folderName}</AppText></Pressable></View><Pressable accessibilityRole="button" accessibilityLabel={`${index + 1}番目のマイ処世術を削除`} onPress={onDelete} hitSlop={10} style={styles.deleteButton}><AppText style={styles.deleteText}>削除</AppText></Pressable></View>{moving ? <View style={styles.movePicker}><Picker label="未整理" selected={!memo.folderId} onPress={() => onChooseFolder(null)} />{folders.map((folder) => <Picker key={folder.id} label={folder.name} selected={memo.folderId === folder.id} onPress={() => onChooseFolder(folder.id)} />)}</View> : null}</View>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl * 2 },
  listHeader: { width: '100%', maxWidth: 840, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { color: colors.gold, fontSize: 11, lineHeight: 17, letterSpacing: 1.8, fontWeight: '700' },
  listTitle: { marginTop: 3, color: colors.ink, fontSize: 26, lineHeight: 36, fontWeight: '600', letterSpacing: 1.4 },
  createButton: { minHeight: 42, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.pill, backgroundColor: colors.charcoal },
  createButtonText: { color: colors.goldLight, fontSize: 22, lineHeight: 24, fontWeight: '300' },
  createButtonLabel: { color: '#FFF8EA', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  folderBar: { width: '100%', maxWidth: 840, alignSelf: 'center', marginTop: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  folderScroll: { gap: 7, paddingRight: spacing.md },
  folderTab: { minHeight: 36, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D5C7B3', borderRadius: radius.sm, backgroundColor: '#FCFAF6' },
  folderTabSelected: { borderColor: colors.gold, backgroundColor: '#F4E7CA' },
  folderTabPress: { minHeight: 34, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  folderTabText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 18 },
  folderTabTextSelected: { color: colors.ink, fontWeight: '700' },
  folderDelete: { minHeight: 34, paddingHorizontal: 7, justifyContent: 'center' },
  folderDeleteText: { color: colors.muted, fontSize: 17, lineHeight: 20 },
  folderAdd: { minHeight: 36, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  folderAddText: { color: colors.gold, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  memoList: { width: '100%', maxWidth: 840, alignSelf: 'center', marginTop: spacing.lg, gap: spacing.sm },
  memoCard: { padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  memoTop: { minHeight: 54, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  memoNumber: { width: 31, height: 31, marginTop: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.charcoal },
  memoNumberText: { color: colors.goldLight, fontSize: 12, lineHeight: 16 },
  memoCopy: { flex: 1, minWidth: 0 },
  memoText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 25 },
  memoFolder: { alignSelf: 'flex-start', minHeight: 24, marginTop: 5, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#D5C7B3' },
  memoFolderText: { color: colors.gold, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  deleteButton: { minHeight: 30, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  movePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#E5DDCF' },
  picker: { minHeight: 30, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D5C7B3', borderRadius: radius.pill, backgroundColor: '#FCFAF6' },
  pickerSelected: { borderColor: colors.gold, backgroundColor: '#F4E7CA' },
  pickerText: { color: colors.inkSoft, fontSize: 11, lineHeight: 16 },
  pickerTextSelected: { color: colors.ink, fontWeight: '700' },
  emptyCard: { width: '100%', maxWidth: 840, alignSelf: 'center', marginTop: spacing.lg, padding: spacing.xl, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D8CBB8', borderRadius: radius.md, backgroundColor: '#FBF7F0', alignItems: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 19, lineHeight: 28 },
  emptyLead: { marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  modalBackdrop: { flex: 1, padding: spacing.lg, backgroundColor: 'rgba(17,18,17,0.58)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 540, padding: spacing.xl, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.lg, backgroundColor: colors.surface },
  folderModalCard: { width: '100%', maxWidth: 440, padding: spacing.xl, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.lg, backgroundColor: colors.surface },
  modalTitle: { color: colors.ink, fontSize: 23, lineHeight: 32, fontWeight: '600' },
  modalLead: { marginTop: spacing.sm, color: colors.muted, fontSize: 13, lineHeight: 20 },
  input: { minHeight: 118, marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 27, textAlignVertical: 'top' },
  folderInput: { minHeight: 48, marginTop: spacing.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.serif, fontSize: 16 },
  folderSelectLabel: { marginTop: spacing.lg, color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  folderPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancel: { minHeight: 48, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontWeight: '700' },
  save: { flex: 1, minHeight: 48, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  saveDisabled: { backgroundColor: '#B7B0A5' },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
