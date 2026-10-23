import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { featureCategoryLabel } from '@/data/feature-categories';
import { featureCover, hasFeatureImageOverride } from '@/data/feature-covers';
import { featureImageAlt, featureImageSource } from '@/data/feature-images';
import type { FeatureArticle } from '@/data/features';
import { AppText } from './ui';

/** Generic scenery is replaced by an editorial cover; authored artwork is retained. */
export function FeatureVisual({ article, style, compact = false }: { article: FeatureArticle; style?: StyleProp<ViewStyle>; compact?: boolean }) {
  const artwork = featureCover(article) || hasFeatureImageOverride(article) || (article.image_path && !article.image_path.startsWith('bundled:feature-'));
  return <View style={[styles.frame, style]}>
    {artwork ? <><Image source={featureImageSource(article)} accessibilityLabel={featureImageAlt(article)} contentFit="cover" style={StyleSheet.absoluteFill} /><View pointerEvents="none" style={styles.wash} /></> : <View accessible accessibilityLabel={`${article.title}の特集表紙`} style={[styles.editorial, compact && styles.editorialCompact]}>
      <View pointerEvents="none" style={styles.circle} /><View pointerEvents="none" style={styles.innerFrame} />
      <AppText style={styles.eyebrow}>処世術禄 ─ 特集</AppText>
      <AppText numberOfLines={4} style={[styles.title, compact && styles.titleCompact]}>{article.title}</AppText>
      <View style={styles.rule} /><AppText style={styles.category}>{article.category_id ? featureCategoryLabel(article.category_id) : '日々の知恵を、深く読む'}</AppText>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.paperDeep }, wash: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(165,123,53,0.05)' },
  editorial: { flex: 1, padding: 36, justifyContent: 'center', gap: 16, backgroundColor: '#F1E8D6' }, editorialCompact: { padding: 20, gap: 8 },
  innerFrame: { position: 'absolute', top: 10, bottom: 10, left: 10, right: 10, borderWidth: 1, borderColor: '#B89B68' },
  circle: { position: 'absolute', right: -70, top: -90, width: 300, height: 300, borderWidth: 22, borderColor: '#E6D4AF', borderRadius: 150 },
  eyebrow: { color: colors.goldDeep, fontSize: 12, lineHeight: 20, letterSpacing: 1 }, title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 48, fontWeight: '700', color: colors.ink, maxWidth: 650 }, titleCompact: { fontSize: 21, lineHeight: 32 },
  rule: { width: 40, height: 1, backgroundColor: colors.gold }, category: { color: colors.inkSoft, fontSize: 12, lineHeight: 20 },
});
