import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { AppText } from './ui';

/** 共通ヘッダーと完全版画面で使う戻る操作。 */
export function HeaderBackButton({ onPress, testID }: { onPress: () => void; testID?: string }) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="前の画面へ戻る"
      testID={testID}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.button, compact && styles.buttonCompact, pressed && styles.pressed]}
    >
      <View style={styles.circle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <AppText style={styles.arrow}>‹</AppText>
      </View>
      <AppText style={[styles.label, compact && styles.labelCompact]}>戻る</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 64, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: radius.pill },
  buttonCompact: { minWidth: 52 },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: '#DEDEDA', alignItems: 'center', justifyContent: 'center' },
  arrow: { color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 34, lineHeight: 36, marginTop: -2 },
  label: { color: colors.ink, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  labelCompact: { fontSize: 11, lineHeight: 16 },
  pressed: { backgroundColor: 'rgba(210,182,111,0.14)', opacity: 0.72 },
});
