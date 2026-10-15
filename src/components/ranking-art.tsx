import { Image as ExpoImage } from 'expo-image';
import { Image, StyleSheet, View } from 'react-native';
import { compactTechniqueCategoryImages, techniqueCategoryImages } from '../data/category-images';

// Theory categories retain their fixed contact-sheet tiles.
export const RANKING_CATEGORY_TILES: Record<string, number> = {
  interpersonal: 0, work: 1, life: 2, psychology: 3,
  'behavioral-science': 4, 'organization-management': 5, strategy: 6,
  'practical-wisdom': 7, 'classics-thought': 8,
};
export function CategoryArt({ category, compact = false }: { category: string; compact?: boolean }) {
  const photo = category === 'interpersonal' || category === 'work' || category === 'life'
    ? (compact ? compactTechniqueCategoryImages : techniqueCategoryImages)[category] : undefined;
  const tile = RANKING_CATEGORY_TILES[category] ?? 8;
  return <View testID={`category-art-${category}`} pointerEvents="none" style={styles.crop}>
    {compact ? <ExpoImage source={photo ?? require('../../assets/categories/theory-sheet.webp')} accessible={false} cachePolicy="memory-disk" contentFit={photo ? 'cover' : 'fill'}
      style={photo ? styles.photo : [styles.sheet, { left: `${-(tile % 3) * 100}%`, top: `${-Math.floor(tile / 3) * 100}%` }]} /> : photo ? <Image source={photo} accessible={false} resizeMode="cover" style={styles.photo} />
      : <Image source={compact ? require('../../assets/categories/theory-sheet.webp') : require('../../assets/rankings/categories.webp')} accessible={false} resizeMode="stretch"
        style={[styles.sheet, { left: `${-(tile % 3) * 100}%`, top: `${-Math.floor(tile / 3) * 100}%` }]} />}
  </View>;
}
export function RankingArt({ category }: { category: string }) {
  return <View testID={`ranking-art-${category}`} style={StyleSheet.absoluteFill}><CategoryArt category={category} /></View>;
}
const styles = StyleSheet.create({
  crop: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  photo: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  sheet: { position: 'absolute', width: '300%', height: '300%' },
});
