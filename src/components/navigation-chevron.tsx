import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

/** A single stroke weight for navigation, independent of platform fonts. */
export function NavigationChevron({ direction = 'right', color = colors.goldDeep, style }: {
  direction?: 'right' | 'left' | 'down'; color?: string; style?: StyleProp<ViewStyle>;
}) {
  return <View pointerEvents="none" accessibilityElementsHidden aria-hidden style={[styles.box, style]}>
    <View style={[styles.mark, { borderColor: color }, direction === 'left' ? styles.left : direction === 'down' ? styles.down : styles.right]} />
  </View>;
}

const styles = StyleSheet.create({
  box: { width: 16, height: 20, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 7, height: 7, borderRightWidth: 1.5, borderBottomWidth: 1.5 },
  right: { transform: [{ rotate: '-45deg' }] },
  left: { transform: [{ rotate: '135deg' }] },
  down: { marginTop: -3, transform: [{ rotate: '45deg' }] },
});
