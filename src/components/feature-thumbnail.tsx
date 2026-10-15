import { useState } from 'react';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { featureImage } from '@/components/feature-article';
import { featureCover } from '@/data/feature-covers';
import type { FeatureArticle } from '@/data/features';
import { colors, fonts } from '@/constants/theme';

export function FeatureThumbnail({ article }: { article: FeatureArticle }) {
  const cover = featureCover(article);
  const [width, setWidth] = useState(288);
  const scale = width / 288;
  return <View testID="feature-thumbnail" style={[styles.frame, cover && { backgroundColor: cover.background }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <Image source={cover?.source ?? featureImage(article.image_path)} accessibilityLabel={cover?.alt ?? (article.image_alt || article.title)} contentFit="cover" style={StyleSheet.absoluteFill} />
    {cover ? <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[styles.editorial, { padding: 14 * scale }]}>
      <AppText style={[styles.label, { color: cover.accent, fontSize: 9 * scale, lineHeight: 14 * scale }]}>処世術禄 / 特集</AppText>
      <AppText testID="feature-thumbnail-headline" style={[styles.headline, { fontSize: 23 * scale, lineHeight: 33 * scale }]}>{cover.headline}</AppText>
      <View style={[styles.rule, { backgroundColor: cover.accent, width: 27 * scale }]} />
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.line, overflow: 'hidden' },
  editorial: { flex: 1, alignItems: 'flex-start', justifyContent: 'space-between' },
  label: { fontFamily: fonts.sans, fontWeight: '700', letterSpacing: 1.5 },
  headline: { fontFamily: fonts.sans, color: '#FFFDF6', fontWeight: '800', letterSpacing: -0.5, textShadowColor: '#00000055', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  rule: { height: 2 },
});
