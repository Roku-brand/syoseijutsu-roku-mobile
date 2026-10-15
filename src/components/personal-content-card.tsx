import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { CategoryArt } from './ranking-art';
import { featureCover } from '@/data/feature-covers';
import { featureImage } from './feature-article';
import type { FeatureArticle } from '@/data/features';
import { colors, fonts } from '@/constants/theme';

export type PersonalContentRow = { kind: 'technique' | 'theory' | 'feature'; id: string; title: string; label: string; description: string; category: string; article?: FeatureArticle };
export function PersonalContentCard({ row, onPress, action }: { row: PersonalContentRow; onPress: () => void; action?: ReactNode }) {
  const tone = row.kind === 'technique' ? '#267261' : row.kind === 'theory' ? '#4666A0' : '#B35A38';
  return <View testID={`personal-content-${row.kind}`} style={[styles.row, { borderLeftColor: tone }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}を開く`} onPress={onPress} style={({ pressed }) => [styles.open, pressed && styles.pressed]}>
      <View testID="personal-card-image" style={styles.art}>{row.kind === 'feature'
        ? <Image source={row.article ? featureCover(row.article)?.compactSource ?? featureImage(row.article.image_path) : featureImage(null)} contentFit="cover" accessible={false} cachePolicy="memory-disk" style={StyleSheet.absoluteFill} />
        : <CategoryArt category={row.category} compact />}</View>
      <View style={styles.copy}><AppText style={[styles.label, { color: tone }]}>{row.label}</AppText><AppText numberOfLines={2} style={styles.title}>{row.title}</AppText>{row.description ? <AppText numberOfLines={1} style={styles.description}>{row.description}</AppText> : null}</View>
    </Pressable>{action ?? <AppText accessibilityElementsHidden style={[styles.arrow, { color: tone }]}>›</AppText>}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 12, marginBottom: 10, borderWidth: 1, borderLeftWidth: 3, borderColor: '#E1D8C6', borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFCF6' },
  open: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  art: { width: 72, minHeight: 108, overflow: 'hidden', backgroundColor: '#244D44' },
  copy: { flex: 1, minWidth: 0, paddingVertical: 12, justifyContent: 'center' },
  label: { fontSize: 10, lineHeight: 16, fontWeight: '700' },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, fontWeight: '600', marginTop: 3 },
  description: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 3 },
  arrow: { fontSize: 25, lineHeight: 30 }, pressed: { opacity: 0.72 },
});
