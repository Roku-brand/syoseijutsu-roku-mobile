import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { CategoryArt } from './ranking-art';
import { PersonalSectionHeading } from './personal-section-heading';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import { techniqueById } from '@/data/catalog';
import { uniqueSavedIds } from '@/data/personal-dashboard';
import { colors, fonts } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

const categories = [{ id: 'interpersonal', name: '対人術' }, { id: 'work', name: '仕事術' }, { id: 'life', name: '人生術' }] as const;
export function FavoritesOverview() {
  'use no memo';
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  useAccess(); // Recalculate when the live catalogue is hydrated.
  const { savedIds, savedTheoryIds, savedFeatureIds } = useAppState();
  const ids = uniqueSavedIds(savedIds);
  return <View testID="favorites-overview">
    <PersonalSectionHeading title="お気に入り" action="すべて見る ＞" actionLabel="お気に入りをすべて見る" onAction={() => router.push('/library')} />
    <View style={styles.categories}>{categories.map(category => {
      const count = ids.filter(id => techniqueById.get(id)?.categoryKey === category.id).length;
      return <Pressable key={category.id} testID={`favorite-category-${category.id}`} accessibilityRole="button" accessibilityLabel={`${category.name}のお気に入り ${count}件`} onPress={() => router.push({ pathname: '/library', params: { category: category.id } })} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={[styles.image, width >= 700 && styles.imageWide]}><CategoryArt category={category.id} compact /></View>
        <View style={styles.cardCopy}><AppText style={styles.category}>{category.name}</AppText><AppText style={styles.count}>{count}<AppText style={styles.unit}> 件</AppText></AppText></View>
      </Pressable>;
    })}</View>
    <View style={styles.links}>{([{ kind: 'theory', label: '理論', count: uniqueSavedIds(savedTheoryIds).length }, { kind: 'feature', label: '特集', count: uniqueSavedIds(savedFeatureIds).length }] as const).map(item => <Pressable key={item.kind} accessibilityRole="button" accessibilityLabel={`${item.label}のお気に入り ${item.count}件`} onPress={() => router.push({ pathname: '/library', params: { kind: item.kind } })} style={styles.link}><AppText style={styles.linkLabel}>{item.label}</AppText><AppText style={styles.linkCount}>{item.count}件</AppText><AppText style={styles.arrow}>›</AppText></Pressable>)}</View>
  </View>;
}
const styles = StyleSheet.create({
  categories: { flexDirection: 'row', gap: 10 }, card: { flex: 1, minWidth: 0, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface },
  image: { width: '100%', aspectRatio: 1.15 }, imageWide: { aspectRatio: 2.1 }, cardCopy: { paddingHorizontal: 10, paddingVertical: 12, gap: 3 },
  category: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 26, fontWeight: '600' }, count: { color: colors.goldDeep, fontSize: 19, lineHeight: 28, fontWeight: '600' }, unit: { fontSize: 11, fontWeight: '400' },
  links: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line }, link: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  linkLabel: { color: colors.inkSoft, fontSize: 14 }, linkCount: { color: colors.muted, fontSize: 13 }, arrow: { marginLeft: 'auto', color: colors.goldDeep, fontSize: 21 }, pressed: { opacity: 0.7 },
});
