import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

export function LockMark({ color = colors.goldDeep, testID }: { color?: string; testID?: string }) {
  return (
    <View testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={styles.lock}>
      <View style={[styles.shackle, { borderColor: color }]} />
      <View style={[styles.body, { backgroundColor: color }]}><View style={styles.keyhole} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  lock: { width: 13, height: 15, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  shackle: { width: 8, height: 6, borderWidth: 1.5, borderBottomWidth: 0, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  body: { width: 12, height: 8, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  keyhole: { width: 2, height: 3, borderRadius: 1, backgroundColor: colors.surface },
});
