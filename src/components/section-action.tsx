import { Pressable, StyleSheet, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, fonts } from '@/constants/theme';
import { NavigationChevron } from './navigation-chevron';

/** Shared secondary action: readable type, a consistent arrow and 44px target. */
export function SectionAction({ label, accessibilityLabel, onPress, role = 'button', disabled = false, testID }: {
  label: string; accessibilityLabel?: string; onPress: () => void;
  role?: 'button' | 'link'; disabled?: boolean; testID?: string;
}) {
  const refresh = /↻\s*$/.test(label);
  const text = label.replace(/\s*[→›＞>↻]\s*$/, '').trim();
  return <Pressable testID={testID} accessibilityRole={role} accessibilityLabel={accessibilityLabel ?? text}
    accessibilityState={{ disabled }} aria-disabled={disabled} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
    <Text style={styles.label}>{text}</Text>{refresh
      ? <SymbolView name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} size={16} tintColor={colors.goldDeep} weight="regular" fallback={<Text style={styles.refresh}>↻</Text>} />
      : <NavigationChevron />}
  </Pressable>;
}

const styles = StyleSheet.create({
  action: { minHeight: 44, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 },
  label: { color: colors.goldDeep, fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  refresh: { color: colors.goldDeep, fontFamily: fonts.sans, fontSize: 16, lineHeight: 20 },
  pressed: { opacity: 0.65 }, disabled: { opacity: 0.5 },
});
