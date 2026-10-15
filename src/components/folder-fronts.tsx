import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { colors, fonts } from '@/constants/theme';

export type FrontFolder = { id: string; name: string; count: number };
const tones = [{ paper: '#FFF2D5', ink: '#93601B' }, { paper: '#E1F1EC', ink: '#226653' }, { paper: '#E6ECFC', ink: '#425F99' }];
export function FolderFronts({ folders, onOpen, label }: { folders: FrontFolder[]; onOpen: (id: string) => void; label: string }) {
  return <View testID="folder-fronts" style={styles.grid}>{folders.map((folder, index) => {
    const tone = tones[index % tones.length];
    return <Pressable key={folder.id} testID={`folder-front-${folder.id}`} accessibilityRole="button" accessibilityLabel={`${label}：${folder.name}`} onPress={() => onOpen(folder.id)} style={({ pressed }) => [styles.card, { backgroundColor: tone.paper }, pressed && styles.pressed]}>
      <View accessibilityElementsHidden style={styles.icon}><View style={[styles.folderTab, { backgroundColor: tone.ink }]} /><View style={[styles.folderBody, { backgroundColor: tone.ink }]} /><View style={styles.folderPaper} /></View>
      <AppText numberOfLines={2} style={styles.name}>{folder.name}</AppText>
      <View style={styles.bottom}><AppText style={[styles.count, { color: tone.ink }]}>{folder.count}件</AppText><AppText accessibilityElementsHidden style={[styles.arrow, { color: tone.ink }]}>開く ›</AppText></View>
    </Pressable>;
  })}</View>;
}
export function FolderBack({ onPress }: { onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="フォルダー一覧に戻る" onPress={onPress} style={styles.back}><AppText style={styles.backText}>‹ フォルダー一覧</AppText></Pressable>;
}
export function MoreCards({ remaining, onPress }: { remaining: number; onPress: () => void }) {
  return remaining > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="次の20件を表示" onPress={onPress} style={styles.more}><AppText style={styles.backText}>もっと見る（残り{remaining}件）</AppText></Pressable> : null;
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '46%', flexGrow: 1, maxWidth: '100%', minHeight: 160, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#D9C9AA', gap: 10 },
  icon: { width: 52, height: 40, position: 'relative', marginBottom: 3 },
  folderTab: { position: 'absolute', width: 24, height: 9, borderTopLeftRadius: 5, borderTopRightRadius: 5, top: 0 },
  folderBody: { position: 'absolute', top: 6, bottom: 0, width: 52, borderRadius: 5, opacity: 0.9 },
  folderPaper: { position: 'absolute', width: 39, height: 21, left: 7, top: 11, borderTopWidth: 3, borderTopColor: '#FFFCF0', borderBottomWidth: 3, borderBottomColor: '#FFFCF0', opacity: 0.7 },
  name: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, fontWeight: '700', flex: 1 },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 13, lineHeight: 20, fontWeight: '700' }, arrow: { fontSize: 12, lineHeight: 20 },
  back: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 4, marginBottom: 8 },
  backText: { color: colors.goldDeep, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  more: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#D9C9AA', backgroundColor: '#FFF6E2' },
  pressed: { opacity: 0.75 },
});
