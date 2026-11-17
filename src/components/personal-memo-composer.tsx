import { useRef, useState } from 'react';
import { Image } from 'expo-image';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { memoDestinationKey, type PersonalMemoController } from '@/hooks/use-personal-memos';
import { AppText } from './ui';

const iconPaths = {
  pencil: '<path d="m16 3 5 5M3 21l5-1 13-13a2.8 2.8 0 0 0-5-5L3 15l-1 6ZM4 15l5 5m8 1h3"/>',
  folder: '<path d="M3 5h6l2 3h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 1-2Z" transform="translate(0 -2)"/>',
  chevron: '<path d="m5 9 7 7 7-7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};

function ComposerIcon({ name, size = 22 }: { name: keyof typeof iconPaths; size?: number }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#7D5923" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</svg>`;
  return <Image accessible={false} pointerEvents="none" source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }} style={{ width: size, height: size }} />;
}

// A quiet paper grain and ink-wash landscape, kept behind the form controls.
const paper = { uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="700" viewBox="0 0 640 700" preserveAspectRatio="none"><defs><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><linearGradient id="wash" x2="0" y2="1"><stop stop-color="#B89B6B" stop-opacity=".36"/><stop offset="1" stop-color="#D9C5A4" stop-opacity="0"/></linearGradient><linearGradient id="mist" x2="0" y2="1"><stop stop-color="#FCF7EF" stop-opacity="0"/><stop offset="1" stop-color="#FCF7EF"/></linearGradient></defs><rect width="640" height="700" filter="url(#grain)" opacity=".035"/><g transform="translate(340 25)"><path fill="url(#wash)" d="m0 100 30-13 14-13 13 5 20-21 14-4 10-10 10 6 12 11 10-4 25-30 12-3 13-13 11 4 12 18 11-3 20 22 13-3 18 18 17-2 30 22v40H0Z"/><path fill="none" stroke="#B59869" stroke-width="2" opacity=".18" d="m10 104 45-23 22-16 15-3 13-10 18 18 13-2 34-36 12-2 9-7 13 17 12 4 18 18 12-1 32 23 31 7M100 107l28-19 17 3 39-43 18 15 14-3 27 26 18 1 31 19"/><path fill="url(#wash)" opacity=".5" d="m40 122 34-20 21 3 29-23 23 9 24-17 20 10 22-11 20 26 20-4 47 25v24H40Z"/><rect width="300" height="130" fill="url(#mist)"/></g></svg>`)}` };

export function MemoComposer({ controller }: { controller: PersonalMemoController }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [destinationChosen, setDestinationChosen] = useState(false);
  const [newFolderExpanded, setNewFolderExpanded] = useState(false);
  const folderInput = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 600;
  if (!controller.draft) return null;
  const draft = controller.draft;
  const selected = memoDestinationKey(draft.destination);
  const existing = controller.destinations.filter(item => item.destination.kind !== 'new');
  const selectedLabel = existing.find(item => memoDestinationKey(item.destination) === selected)?.label;
  const showSelected = draft.id || draft.destination.kind === 'folder' || destinationChosen;
  const destinationLabel = draft.destination.kind === 'new' && newFolderExpanded ? '新しいフォルダーに保存' : showSelected ? selectedLabel ?? '未整理' : '既存のフォルダーを選択';
  const title = draft.id ? 'マイ処世術を編集' : 'マイ処世術を作る';

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.modalScroll, { paddingTop: Math.max(20, insets.top), paddingBottom: Math.max(20, insets.bottom) }]}>
      <View role="dialog" aria-modal accessibilityLabel="マイ処世術の編集" tabIndex={-1} testID="personal-memo-composer" style={[styles.panel, compact && styles.compactPanel]}>
        <Image source={paper} contentFit="fill" accessible={false} pointerEvents="none" style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <AppText accessibilityRole="header" style={[styles.title, compact && styles.compactTitle]}>{title}</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="作成を閉じる" onPress={controller.closeDialog} hitSlop={4} style={({ pressed }) => [styles.close, pressed && styles.pressed]}><ComposerIcon name="close" size={22} /></Pressable>
        </View>
        <AppText style={[styles.subtitle, compact && styles.compactSubtitle]}>自分だけの知恵を、言葉に残しましょう。</AppText>

        <View style={[styles.section, compact && styles.compactSection]}>
          <View style={styles.labelRow}><ComposerIcon name="pencil" /><AppText style={styles.label}>処世術の内容</AppText></View>
          <TextInput accessibilityLabel="マイ処世術" multiline maxLength={140} value={draft.text} onChangeText={text => controller.updateDraft({ text })}
            placeholder="自分の言葉を記入してください" placeholderTextColor={colors.muted} style={[styles.input, compact && styles.compactInput]} />
          <AppText style={styles.counter} accessibilityLiveRegion="polite">{draft.text.length} / 140文字</AppText>
        </View>

        <View style={[styles.section, styles.destinationSection, compact && styles.compactSection]}>
          <View style={styles.labelRow}><ComposerIcon name="folder" /><AppText style={styles.label}>保存先</AppText></View>
          <Pressable accessibilityRole="button" accessibilityLabel="保存先フォルダーを選択" accessibilityState={{ expanded: pickerOpen }}
            onPress={() => setPickerOpen(value => !value)} style={({ pressed }) => [styles.select, pickerOpen && styles.selectedBorder, pressed && styles.pressed]}>
            <ComposerIcon name="folder" /><AppText numberOfLines={1} style={styles.selectText}>{destinationLabel}</AppText>
            <View style={pickerOpen && styles.chevronOpen}><ComposerIcon name="chevron" size={20} /></View>
          </Pressable>
          {pickerOpen && <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.options}>
            <View accessibilityRole="radiogroup" accessibilityLabel="保存先フォルダー">
              {existing.map(({ label, destination }) => {
                const key = memoDestinationKey(destination);
                const checked = selected === key;
                return <Pressable key={key} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked }} aria-checked={checked}
                  onPress={() => { controller.selectDestination(destination); setDestinationChosen(true); setPickerOpen(false); }}
                  style={({ pressed }) => [styles.option, checked && styles.chosenOption, pressed && styles.pressed]}>
                  <AppText style={styles.optionText}>{label}</AppText>{checked && <ComposerIcon name="check" size={18} />}
                </Pressable>;
              })}
            </View>
          </ScrollView>}
          {!draft.id && <Pressable accessibilityRole="button" accessibilityLabel="新しいフォルダーを作る" accessibilityState={{ expanded: draft.destination.kind === 'new' && newFolderExpanded }}
            onPress={() => { if (draft.destination.kind !== 'new') controller.selectDestination({ kind: 'new' }); setNewFolderExpanded(true); setPickerOpen(false); folderInput.current?.focus(); }}
            style={({ pressed }) => [styles.newFolder, pressed && styles.pressed]}>
            <ComposerIcon name="plus" /><AppText style={styles.newFolderText}>新しいフォルダーを作る</AppText>
          </Pressable>}
          {controller.needsFolderName && (draft.destination.kind !== 'new' || newFolderExpanded) && <View style={styles.folderFields}>
            <AppText style={styles.folderLabel}>新しいフォルダー名</AppText>
            <TextInput ref={folderInput} autoFocus={draft.destination.kind === 'new'} accessibilityLabel="フォルダー名" maxLength={32} value={draft.folderName}
              onChangeText={folderName => controller.updateDraft({ folderName })} placeholder="例：仕事で使う知恵" placeholderTextColor={colors.muted} style={styles.folderInput} />
            <AppText style={styles.counter}>{draft.folderName.length} / 32文字</AppText>
          </View>}
        </View>

        <View style={[styles.footer, compact && styles.compactFooter]}>
          <Pressable accessibilityRole="button" accessibilityLabel="作成をキャンセル" onPress={controller.closeDialog} style={({ pressed }) => [styles.button, styles.cancel, pressed && styles.pressed]}>
            <AppText style={[styles.buttonText, compact && styles.compactButtonText]}>キャンセル</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={draft.id ? '変更を保存' : 'マイ処世術を追加'} disabled={!controller.canSaveMemo} onPress={controller.saveMemo}
            style={({ pressed }) => [styles.button, styles.save, !controller.canSaveMemo && styles.disabled, pressed && styles.pressed]}>
            <AppText style={[styles.buttonText, styles.saveText, compact && styles.compactButtonText]}>保存する</AppText>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30, 27, 22, 0.48)' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: '5%' },
  panel: { width: '100%', maxWidth: 640, backgroundColor: '#FCF7EF', borderRadius: 32, padding: 36, overflow: 'hidden', outlineWidth: 0, borderWidth: 1, borderColor: '#F5EDE0', shadowColor: '#282116', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 12 },
  compactPanel: { borderRadius: 23, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flex: 1, fontFamily: fonts.serif, fontSize: 31, lineHeight: 44, fontWeight: '700', color: colors.ink },
  compactTitle: { fontSize: 22, lineHeight: 34 },
  close: { width: 44, height: 44, marginRight: -8, borderRadius: 22, borderWidth: 1, borderColor: '#E8DBCA', backgroundColor: 'rgba(249, 240, 226, 0.65)', alignItems: 'center', justifyContent: 'center' },
  subtitle: { marginTop: 8, marginBottom: 24, color: '#5D574C', fontSize: 18, lineHeight: 29 },
  compactSubtitle: { fontSize: 13, lineHeight: 22, marginTop: 5, marginBottom: 16 },
  section: { paddingTop: 18, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#E4DCCF', gap: 10 },
  compactSection: { paddingTop: 12, paddingBottom: 10, gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  label: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30, fontWeight: '700' },
  input: { height: 120, borderWidth: 1, borderColor: '#CFC4B5', borderRadius: 15, paddingHorizontal: 17, paddingTop: 12, paddingBottom: 12, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 29, textAlignVertical: 'top', backgroundColor: 'rgba(255,253,249,0.45)' },
  compactInput: { height: 96, borderRadius: 11, paddingHorizontal: 12, fontSize: 16, lineHeight: 25 },
  counter: { color: colors.muted, textAlign: 'right', fontSize: 13, lineHeight: 20 },
  destinationSection: { paddingBottom: 22 },
  select: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: '#CFC4B5', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,253,249,0.35)' },
  selectedBorder: { borderColor: colors.gold },
  selectText: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 16, lineHeight: 25 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  options: { maxHeight: 190, borderWidth: 1, borderColor: '#DBCEBB', borderRadius: 12, backgroundColor: colors.surface },
  option: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  chosenOption: { backgroundColor: '#F3E9D9' },
  optionText: { flex: 1, color: colors.inkSoft, fontSize: 15, lineHeight: 24 },
  newFolder: { minHeight: 50, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 13, backgroundColor: '#F3EADC', flexDirection: 'row', alignItems: 'center', gap: 12 },
  newFolderText: { flexShrink: 1, color: colors.goldDeep, fontSize: 16, lineHeight: 25, fontWeight: '600' },
  folderFields: { gap: 7, marginTop: 6 },
  folderLabel: { fontSize: 14, lineHeight: 22, color: colors.inkSoft },
  folderInput: { minHeight: 48, borderWidth: 1, borderColor: '#CFC4B5', borderRadius: 11, padding: 12, color: colors.ink, fontSize: 16, backgroundColor: 'rgba(255,253,249,0.45)' },
  footer: { flexDirection: 'row', gap: 18, paddingTop: 22, borderTopWidth: 1, borderTopColor: '#E4DCCF' },
  compactFooter: { gap: 12, paddingTop: 16 },
  button: { flex: 1, minHeight: 56, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cancel: { flex: 0.86, borderWidth: 1, borderColor: '#947039' },
  save: { backgroundColor: '#8C631F', borderWidth: 1, borderColor: '#8C631F' },
  buttonText: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, fontWeight: '600', color: colors.goldDeep },
  compactButtonText: { fontSize: 18, lineHeight: 28 },
  saveText: { color: colors.white },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.82 },
});
