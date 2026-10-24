import { Image } from 'expo-image';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { colors, fonts } from '@/constants/theme';

export type FrontFolder = { id: string; name: string; count: number };
const art = { gold: require('../../assets/my-page/folder-gold.webp'), sage: require('../../assets/my-page/folder-sage.webp'), blue: require('../../assets/my-page/folder-blue.webp'), pink: require('../../assets/my-page/folder-pink.webp') };
const folderTones = [{ image: art.gold, ink: '#593605', edge: '#D7AD60' }, { image: art.sage, ink: '#12483D', edge: '#B6C9BA' }, { image: art.blue, ink: '#193E72', edge: '#9DBADC' }, { image: art.pink, ink: '#831C19', edge: '#D6AAA0' }];
export function FolderFronts({ folders, onOpen, label }: { folders: FrontFolder[]; onOpen: (id: string) => void; label: string }) {
  const { width } = useHydratedWindowDimensions();
  const mobile = width < 768;
  return <View testID="folder-fronts" style={styles.grid}>{folders.map((folder, index) => {
    const colorIndex = folder.id === 'all' ? 0 : folder.id === 'unfiled' ? 1 : /仕事|業務/.test(folder.name) ? 3 : /対人|人間/.test(folder.name) ? 2 : 2 + index % 2;
    const tone = folderTones[colorIndex];
    return <Pressable key={folder.id} testID={`folder-front-${folder.id}`} accessibilityRole="button" accessibilityLabel={`${label}：${folder.name}`} onPress={() => onOpen(folder.id)} style={({ pressed }) => [styles.card, mobile && styles.cardMobile, { borderColor: tone.edge }, pressed && styles.pressed]}>
      <Image source={tone.image} contentFit="cover" accessible={false} cachePolicy="memory-disk" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.innerFrame} />
      <View pointerEvents="none" style={[styles.corner, styles.cornerTop]} /><View pointerEvents="none" style={[styles.corner, styles.cornerBottom]} />
      <AppText numberOfLines={2} style={[styles.name, mobile && styles.nameMobile, { color: tone.ink }]}>{folder.name}</AppText>
      <View style={styles.bottom}><AppText style={[styles.count, mobile && styles.countMobile, { color: tone.ink }]}>{folder.count}件</AppText><View style={[styles.rule, { backgroundColor: tone.edge }]} /><AppText accessibilityElementsHidden style={[styles.arrow, mobile && styles.arrowMobile, { color: tone.ink }]}>開く ›</AppText></View>
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
  cardMobile: { width: '100%', minHeight: 108, paddingHorizontal: 24, paddingVertical: 14 },
  nameMobile: { fontSize: 24, lineHeight: 36, letterSpacing: 0.5 },
  countMobile: { fontSize: 14, lineHeight: 24 },
  arrowMobile: { fontSize: 14, lineHeight: 24 },
  rule: { width: '28%', maxWidth: 150, height: 1, opacity: 0.6 },
  innerFrame: { position: 'absolute', top: 2, right: 2, bottom: 2, left: 2, borderWidth: 1, borderColor: '#E9D4A3', borderRadius: 15 },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#C99A4C', opacity: 0.7 },
  cornerTop: { left: 4, top: 4, borderTopWidth: 1, borderLeftWidth: 1, borderTopLeftRadius: 20 },
  cornerBottom: { right: 4, bottom: 4, borderRightWidth: 1, borderBottomWidth: 1, borderBottomRightRadius: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47%', flexGrow: 1, maxWidth: '100%', minHeight: 128, paddingHorizontal: 28, paddingVertical: 16, borderRadius: 18, borderWidth: 2, overflow: 'hidden', backgroundColor: '#FFFCF5', boxShadow: '0 5px 10px rgba(64,45,15,0.09)' },
  name: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 46, fontWeight: '700', letterSpacing: 3 },
  bottom: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  count: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 26 }, arrow: { marginLeft: 'auto', fontFamily: fonts.serif, fontSize: 15, lineHeight: 26, letterSpacing: 2 },
  back: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 4, marginBottom: 8 },
  backText: { color: colors.goldDeep, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  more: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#D9C9AA', backgroundColor: '#FFF6E2' },
  pressed: { opacity: 0.75 },
});
