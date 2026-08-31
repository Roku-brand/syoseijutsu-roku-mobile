import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

type SearchMarkProps = {
  size?: number;
  color?: string;
};

/** A CSS-safe magnifying glass used consistently across web and native layouts. */
export function SearchMark({ size = 24, color = colors.gold }: SearchMarkProps) {
  const lensSize = size * 0.62;
  const stroke = Math.max(1, size / 16);

  return (
    <View accessibilityElementsHidden style={[styles.mark, { width: size, height: size }]}>
      <View style={[styles.lens, { width: lensSize, height: lensSize, borderWidth: stroke, borderColor: color, borderRadius: lensSize / 2 }]} />
      <View style={[styles.handle, { width: size * 0.38, height: stroke, left: size * 0.56, top: size * 0.66, backgroundColor: color, borderRadius: stroke }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { position: 'relative', flexShrink: 0 },
  lens: { position: 'absolute', top: '8%', left: '8%' },
  handle: { position: 'absolute', transform: [{ rotate: '45deg' }] },
});
