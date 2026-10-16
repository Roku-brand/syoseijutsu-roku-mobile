import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { CategoryArt } from './ranking-art';
import { featureCover } from '@/data/feature-covers';
import { featureImage } from './feature-article';
import type { FeatureArticle } from '@/data/features';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { colors, fonts } from '@/constants/theme';

export type PersonalContentRow = { kind: 'technique' | 'theory' | 'feature'; id: string; title: string; label: string; description: string; category: string; article?: FeatureArticle };
export function PersonalContentCard({ row, onPress, action }: { row: PersonalContentRow; onPress: () => void; action?: ReactNode }) {
  const { width } = useHydratedWindowDimensions();
  const mobile = width < 768;
  const tone = row.kind === 'technique' ? '#267261' : row.kind === 'theory' ? '#4666A0' : '#B35A38';
  return <View testID={`personal-content-${row.kind}`} style={[styles.row, mobile && styles.rowMobile]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}を開く`} onPress={onPress} style={({ pressed }) => [styles.open, pressed && styles.pressed]}>
      <View testID="personal-card-image" style={[styles.art, mobile && styles.artMobile]}>{row.kind === 'feature'
        ? <Image source={row.article ? featureCover(row.article)?.compactSource ?? featureImage(row.article.image_path) : featureImage(null)} contentFit="cover" accessible={false} cachePolicy="memory-disk" style={StyleSheet.absoluteFill} />
        : <CategoryArt category={row.category} compact />}</View>
      <View style={styles.copy}><AppText style={[styles.label, mobile && styles.labelMobile, { color: tone }]}>{row.label}</AppText><AppText numberOfLines={2} style={[styles.title, mobile && styles.titleMobile]}>{row.title}</AppText>{row.description ? <AppText numberOfLines={1} style={[styles.description, mobile && styles.descriptionMobile]}>{row.description}</AppText> : null}</View>{!action ? <AppText accessibilityElementsHidden style={styles.arrow}>›</AppText> : null}
    </Pressable>{action}
  </View>;
}
const styles = StyleSheet.create({
  rowMobile: { padding: 10, gap: 8, borderRadius: 14 },
  artMobile: { width: 76, height: 96 },
  labelMobile: { fontSize: 10, lineHeight: 16, paddingLeft: 6, borderLeftWidth: 3 },
  titleMobile: { fontSize: 16, lineHeight: 24, marginTop: 4 },
  descriptionMobile: { fontSize: 11, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#E6DDCF', borderRadius: 18, overflow: 'hidden', backgroundColor: '#FFFDF9' },
  open: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 20 },
  art: { width: 145, height: 118, borderRadius: 10, overflow: 'hidden', backgroundColor: '#EAF0E7' },
  copy: { flex: 1, minWidth: 0, justifyContent: 'center' },
  label: { borderLeftWidth: 4, borderLeftColor: '#C49B50', paddingLeft: 12, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 40, fontWeight: '600', marginTop: 8 },
  description: { color: colors.muted, fontSize: 17, lineHeight: 27, marginTop: 4 },
  arrow: { color: '#A57B35', fontSize: 34, lineHeight: 40, paddingHorizontal: 6 }, pressed: { opacity: 0.72 },
});
