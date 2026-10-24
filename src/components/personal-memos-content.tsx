import { Pressable, View } from 'react-native';
import { personalMemoCopy } from '@/data/personal-dashboard';
import { usePersonalMemos, type PersonalMemoController, type PersonalMemosOptions } from '@/hooks/use-personal-memos';
import type { PersonalMemo } from '@/state/app-state';
import { AppText } from './ui';
import { FolderBack, FolderFronts, MoreCards } from './folder-fronts';
import { PersonalSectionHeading } from './personal-section-heading';
import { MemoAction, PersonalMemoDialogs } from './personal-memo-dialogs';
import { personalMemoStyles as styles } from './personal-memo-styles';

export function PersonalMemosContent(options: PersonalMemosOptions) {
  const controller = usePersonalMemos(options);
  const folderAction = <Pressable
    testID="personal-folder-manager-open" accessibilityRole="button" accessibilityLabel="フォルダーを管理"
    onPress={controller.openFolderManager} style={styles.ellipsis}
  ><AppText style={styles.ellipsisText}>…</AppText></Pressable>;

  return <View testID={controller.preview ? 'personal-memos-preview' : 'personal-memos-organizer'}>
    <PersonalSectionHeading
      hideCompactTitle={!controller.preview} title="マイ処世術"
      subtitle={controller.preview ? undefined : '自分の言葉で残した処世術'}
      leadingAction={controller.preview ? undefined : folderAction}
      action={controller.preview ? 'すべて見る ＞' : undefined}
      actionLabel={controller.preview ? 'マイ処世術をすべて見る' : undefined}
      onAction={controller.preview ? controller.openAll : undefined}
    />
    {controller.preview || controller.folder === null ? <FolderOverview controller={controller} /> : <FolderContents controller={controller} />}
    <PersonalMemoDialogs controller={controller} />
  </View>;
}

function FolderOverview({ controller }: { controller: PersonalMemoController }) {
  return <View style={styles.folderPreview}>
    {controller.collection.folderTiles.length
      ? <FolderFronts folders={controller.collection.folderTiles} label="マイ処世術" onOpen={controller.openTile} />
      : <Pressable
        testID="personal-memo-first-create" accessibilityRole="button" accessibilityLabel="オリジナルの処世術を作る"
        onPress={() => controller.openComposer()} style={({ pressed }) => [styles.firstCreate, pressed && styles.pressed]}
      ><AppText style={styles.firstCreateText}>オリジナルの処世術を作る＋</AppText></Pressable>}
  </View>;
}

function FolderContents({ controller }: { controller: PersonalMemoController }) {
  return <>
    <FolderBack onPress={() => controller.openFolder(null)} />
    <View style={styles.folderHeading}>
      <AppText style={styles.folderTitle}>{controller.collection.nameFor(controller.folder)} · {controller.visible.length}件</AppText>
      <MemoAction label="このフォルダーに新規作成" text="新規作成＋" onPress={() => controller.openComposer()} />
    </View>
    <View style={styles.list}>
      {controller.visible.length
        ? controller.visible.slice(0, controller.limit).map(memo => <MemoCard key={memo.id} memo={memo} controller={controller} />)
        : <View testID="personal-memos-empty" style={styles.empty}>
          <AppText style={styles.emptyTitle}>このフォルダーはまだ空です</AppText>
          <AppText style={styles.excerpt}>右上の「新規作成＋」から、自分の知恵を残せます。</AppText>
        </View>}
      <MoreCards remaining={controller.visible.length - controller.limit} onPress={controller.showMore} />
    </View>
  </>;
}

function MemoCard({ memo, controller }: { memo: PersonalMemo; controller: PersonalMemoController }) {
  const copy = personalMemoCopy(memo.text);
  const folder = memo.folderId === null ? undefined : controller.collection.folderById.get(memo.folderId);
  return <View testID="personal-memo-card" style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${memo.text}を編集`} onPress={() => controller.openComposer(memo)} style={styles.copy}>
      <AppText numberOfLines={2} style={styles.title}>{copy.title}</AppText>
      {copy.excerpt ? <AppText numberOfLines={3} style={styles.excerpt}>{copy.excerpt}</AppText> : null}
      <AppText style={styles.meta}>{folder?.name ?? '未整理'}</AppText>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${memo.text}のメニュー`} onPress={() => controller.openMemoMenu(memo)} style={styles.more}>
      <AppText style={styles.moreText}>⋯</AppText>
    </Pressable>
  </View>;
}
