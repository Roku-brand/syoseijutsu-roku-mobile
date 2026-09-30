import { Image, StyleSheet, View } from 'react-native';

// One fixed photograph per category. The contact sheet is downloaded once;
// each category always displays the same tile on web and native.
export const RANKING_CATEGORY_TILES: Record<string, number> = {
  interpersonal: 0, work: 1, life: 2, psychology: 3,
  'behavioral-science': 4, 'organization-management': 5, strategy: 6,
  'practical-wisdom': 7, 'classics-thought': 8,
};
export function RankingArt({ category }: { category: string }) {
  const tile = RANKING_CATEGORY_TILES[category] ?? 8;
  return <View testID={`ranking-art-${category}`} pointerEvents="none" style={styles.crop}>
    <Image source={require('../../assets/rankings/categories.webp')} accessible={false} resizeMode="stretch"
      style={[styles.sheet, { left: `${-(tile % 3) * 100}%`, top: `${-Math.floor(tile / 3) * 100}%` }]} />
  </View>;
}
const styles = StyleSheet.create({
  crop: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  sheet: { position: 'absolute', width: '300%', height: '300%' },
});
