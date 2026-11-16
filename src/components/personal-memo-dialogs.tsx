import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { colors } from '@/constants/theme';
import { personalMemoCopy } from '@/data/personal-dashboard';
import type { PersonalMemoController } from '@/hooks/use-personal-memos';
import { MemoComposer } from './personal-memo-composer';
import { AppText } from './ui';
import { personalMemoStyles as styles } from './personal-memo-styles';

export function MemoAction({ label, text, onPress, disabled = false, primary = false, danger = false }: {
  label: string; text?: string; onPress: () => void; disabled?: boolean; primary?: boolean; danger?: boolean;
}) {
  return <Pressable
    accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={[styles.action, primary && styles.primary, danger && styles.dangerAction, disabled && styles.disabled]}
  ><AppText style={[styles.actionText, primary && styles.primaryText, danger && styles.dangerText]}>{text ?? label}</AppText></Pressable>;
}

function DialogFrame({ label, children, keyboard = false }: {
  label: string; children: ReactNode; keyboard?: boolean;
}) {
  const panel = <View role="dialog" aria-modal accessibilityLabel={label} tabIndex={-1} style={styles.dialog}>{children}</View>;
  const keyboardBehavior = Platform.OS === 'ios' ? 'padding' : undefined;
  if (keyboard) return <KeyboardAvoidingView behavior={keyboardBehavior} style={[styles.backdrop, styles.center]}>{panel}</KeyboardAvoidingView>;
  return <View style={[styles.backdrop, styles.center]}>{panel}</View>;
}

function MemoMenu({ controller }: { controller: PersonalMemoController }) {
  if (controller.dialog?.kind !== 'memo-menu') return null;
  const { memo, mode } = controller.dialog;
  let actions: ReactNode;
  switch (mode) {
    case 'actions':
      actions = <>
        <MemoAction label="編集" onPress={() => controller.openComposer(memo)} />
        <MemoAction label="フォルダーへ整理・移動" onPress={() => controller.openMemoMenu(memo, 'move')} />
        <MemoAction label="削除" danger onPress={() => controller.openMemoMenu(memo, 'delete')} />
      </>;
      break;
    case 'move':
      actions = <ScrollView style={styles.folderList}>
        {[{ id: '', name: '未整理' }, ...controller.personalMemoFolders].map(item =>
          <MemoAction key={item.id} label={`保存先：${item.name}`} text={item.name} onPress={() => controller.moveMemo(memo.id, item.id || null)} />,
        )}
      </ScrollView>;
      break;
    case 'delete':
      actions = <>
        <AppText style={styles.excerpt}>このマイ処世術を削除しますか？</AppText>
        <MemoAction label="このマイ処世術を削除" danger onPress={() => controller.deleteMemo(memo.id)} />
      </>;
  }
  return <DialogFrame label="マイ処世術の操作">
    <AppText numberOfLines={2} style={styles.dialogTitle}>{personalMemoCopy(memo.text).title}</AppText>
    {actions}
    <MemoAction label="操作を閉じる" text="閉じる" onPress={controller.closeDialog} />
  </DialogFrame>;
}

function FolderManager({ controller }: { controller: PersonalMemoController }) {
  return <DialogFrame label="マイ処世術フォルダーの管理">
    <AppText style={styles.dialogTitle}>フォルダーを管理</AppText>
    <MemoAction label="フォルダーを追加" text="＋ フォルダーを追加" primary onPress={() => controller.openFolderEditor()} />
    {controller.personalMemoFolders.length ? <ScrollView style={styles.folderList}>
      {controller.personalMemoFolders.map(item => <View key={item.id} style={styles.folderManagerRow}>
        <AppText numberOfLines={1} style={styles.managerFolderName}>{item.name}</AppText>
        <MemoAction label={`${item.name}を編集`} text="編集" onPress={() => controller.openFolderEditor(item.id)} />
        <MemoAction label={`${item.name}を削除`} text="削除" danger onPress={() => controller.confirmFolderDelete(item.id)} />
      </View>)}
    </ScrollView> : <AppText style={styles.excerpt}>フォルダーはまだありません。追加すると、処世術を分けて保存できます。</AppText>}
    <MemoAction label="フォルダー管理を閉じる" text="閉じる" onPress={controller.closeDialog} />
  </DialogFrame>;
}

function FolderEditor({ controller }: { controller: PersonalMemoController }) {
  if (controller.dialog?.kind !== 'folder-editor') return null;
  const { id, name } = controller.dialog;
  return <DialogFrame label="マイ処世術フォルダーの編集" keyboard>
    <AppText style={styles.dialogTitle}>{id ? 'フォルダーを編集' : 'フォルダーを追加'}</AppText>
    <TextInput
      accessibilityLabel="フォルダー名" maxLength={32} value={name} onChangeText={controller.updateFolderName}
      placeholder="例：仕事で使う知恵" placeholderTextColor={colors.muted} style={styles.folderInput}
    />
    <AppText style={styles.counter}>{name.length} / 32文字</AppText>
    <View style={styles.actions}>
      <MemoAction label="フォルダー編集を閉じる" text="閉じる" onPress={controller.closeDialog} />
      <MemoAction label={id ? 'フォルダー名を保存' : 'フォルダーを作成'} text={id ? '保存する' : '作成する'} primary disabled={!name.trim()} onPress={controller.saveFolder} />
    </View>
  </DialogFrame>;
}

function FolderDeletion({ controller }: { controller: PersonalMemoController }) {
  if (controller.dialog?.kind !== 'folder-delete') return null;
  const { id } = controller.dialog;
  return <DialogFrame label="マイ処世術フォルダーの編集" keyboard>
    <AppText style={styles.dialogTitle}>フォルダーを削除</AppText>
    <AppText style={styles.excerpt}>フォルダーだけを削除します。中のマイ処世術は「未整理」に戻ります。</AppText>
    <View style={styles.actions}>
      <MemoAction label="削除を取り消す" text="戻る" onPress={controller.closeDialog} />
      <MemoAction label="フォルダーだけ削除" text="フォルダーを削除" danger primary onPress={() => controller.deleteFolder(id)} />
    </View>
  </DialogFrame>;
}

export function PersonalMemoDialogs({ controller }: { controller: PersonalMemoController }) {
  let content: ReactNode = null;
  switch (controller.dialog?.kind) {
    case 'composer': content = <MemoComposer controller={controller} />; break;
    case 'memo-menu': content = <MemoMenu controller={controller} />; break;
    case 'folder-manager': content = <FolderManager controller={controller} />; break;
    case 'folder-editor': content = <FolderEditor controller={controller} />; break;
    case 'folder-delete': content = <FolderDeletion controller={controller} />; break;
  }
  return <Modal transparent visible={controller.dialog !== null} animationType="fade" onRequestClose={controller.closeDialog}>{content}</Modal>;
}
