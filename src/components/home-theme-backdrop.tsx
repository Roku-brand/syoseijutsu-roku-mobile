import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useHomeAppearance } from '@/state/home-appearance';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const wash = { uri: `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" preserveAspectRatio="none"><defs><linearGradient id="paper" x2="0" y2="1"><stop offset=".38" stop-color="#FAF7EF" stop-opacity="0"/><stop offset=".81" stop-color="#FAF7EF" stop-opacity=".92"/><stop offset="1" stop-color="#FAF7EF"/></linearGradient><linearGradient id="ink"><stop stop-color="#071B19" stop-opacity=".55"/><stop offset=".72" stop-color="#071B19" stop-opacity="0"/></linearGradient></defs><rect width="100" height="100" fill="url(#ink)"/><rect width="100" height="100" fill="url(#paper)"/></svg>')}` };

export function HomeThemeBackdrop({ width, desktop }: { width: number; desktop: boolean }) {
  const { theme } = useHomeAppearance();
  const reduced = useReducedMotion();
  const artWidth = desktop ? Math.min(width, 680) : width * .62;
  const edgeWash = useMemo(() => ({ uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" preserveAspectRatio="none"><defs><linearGradient id="left"><stop stop-color="${theme.background}"/><stop offset=".28" stop-color="${theme.background}" stop-opacity="0"/></linearGradient><linearGradient id="bottom" x2="0" y2="1"><stop offset=".64" stop-color="${theme.background}" stop-opacity="0"/><stop offset="1" stop-color="${theme.background}"/></linearGradient></defs><rect width="100" height="100" fill="url(#left)"/><rect width="100" height="100" fill="url(#bottom)"/></svg>`)}` }), [theme.background]);
  return <View testID="home-theme-background" accessibilityLabel={theme.name} pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, styles.background, { backgroundColor: theme.background }]}>
    <View style={{ position: 'absolute', right: 0, top: desktop ? -60 : -10, width: artWidth, height: artWidth * 1.5 }}>
      <Image source={theme.image} contentFit="cover" transition={reduced ? 0 : 320} accessibilityElementsHidden style={StyleSheet.absoluteFill} />
      <Image source={edgeWash} contentFit="fill" style={StyleSheet.absoluteFill} accessibilityElementsHidden />
    </View>
    <Image source={wash} contentFit="fill" style={StyleSheet.absoluteFill} accessibilityElementsHidden />
  </View>;
}
const styles = StyleSheet.create({ background: { overflow: 'hidden' } });
