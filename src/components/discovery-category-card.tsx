import { useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { AppText } from './ui';
import { CategoryArt } from './ranking-art';
import { getCategoryLabelParts } from './category-filter-label';

export function DiscoveryCategoryCard({ category, title, compact, theory = false, style, onPress }: {
  category: string; title: string; compact: boolean; theory?: boolean; style?: StyleProp<ViewStyle>; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();
  const hover = (active: boolean) => Animated.timing(scale, { toValue: active && !reducedMotion ? 1.035 : 1, duration: reducedMotion ? 0 : 200, useNativeDriver: Platform.OS !== 'web' }).start();
  return <Pressable accessibilityRole="link" accessibilityLabel={`${title}から探す`} onPress={onPress} onHoverIn={() => hover(true)} onHoverOut={() => hover(false)} style={({ pressed }) => [styles.card, compact && styles.compact, compact && theory && styles.theoryCompact, style, pressed && styles.pressed]}>
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}><CategoryArt category={category} compact /></Animated.View>
    <View pointerEvents="none" style={styles.shade} />
    <View pointerEvents="none" style={styles.caption}>
      {theory && compact ? <View style={styles.titleWords}>{getCategoryLabelParts(title).map(part => <AppText key={part} style={[styles.title, styles.theoryTitleCompact, styles.word]}>{part}</AppText>)}</View> : <AppText numberOfLines={2} style={[styles.title, compact && styles.titleCompact]}>{title}</AppText>}
      <AppText accessibilityElementsHidden style={styles.arrow}>›</AppText>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { minWidth: 0, height: 150, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: colors.goldSoft, borderRadius: 14, backgroundColor: colors.charcoal, justifyContent: 'flex-end' },
  compact: { height: 136 }, theoryCompact: { height: 124 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%', backgroundColor: 'rgba(10,18,17,0.42)', ...Platform.select({ web: { backgroundColor: 'transparent', backgroundImage: 'linear-gradient(180deg,transparent 0%,rgba(10,18,17,.25) 35%,rgba(10,18,17,.82) 100%)' } }) },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 18 },
  title: { flex: 1, minWidth: 0, color: '#FFFDF5', fontFamily: fonts.serif, fontSize: 25, lineHeight: 34, fontWeight: '700', textShadowColor: 'rgba(0,0,0,.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  titleCompact: { fontSize: 23, lineHeight: 31 }, theoryTitleCompact: { fontSize: 18, lineHeight: 27 },
  titleWords: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap' },
  word: { flex: 0, flexBasis: 'auto', flexShrink: 0, ...Platform.select({ web: { whiteSpace: 'nowrap' as const } }) },
  arrow: { color: '#EFD49D', fontSize: 27, lineHeight: 31 }, pressed: { opacity: 0.88 },
});
