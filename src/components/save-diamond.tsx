import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

export function SaveDiamond({ saved }: { saved: boolean }) {
  return <View testID="save-diamond" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.diamond, saved && styles.filled]} />;
}
const styles = StyleSheet.create({
  diamond: { width: 15, height: 15, borderWidth: 1.5, borderColor: colors.gold, transform: [{ rotate: '45deg' }] },
  filled: { backgroundColor: colors.gold },
});
