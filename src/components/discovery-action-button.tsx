import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '@/constants/theme';

/** Shared dimensions and states for the home deck's two actions. */
export const DiscoveryActionButton = forwardRef<View, {
  label: string;
  accessibilityLabel?: string;
  expanded?: boolean;
  disabled: boolean;
  color: string;
  testID: string;
  icon?: ReactNode;
  onPress: () => void;
}>(function DiscoveryActionButton({ label, accessibilityLabel = label, expanded, disabled, color, testID, icon, onPress }, ref) {
  const [focused, setFocused] = useState(false);
  return <Pressable ref={ref} testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    aria-expanded={expanded} aria-disabled={disabled} accessibilityState={{ disabled, ...(expanded === undefined ? {} : { expanded }) }} disabled={disabled} onPress={onPress}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => [styles.button, { backgroundColor: color }, focused && styles.focused, disabled && styles.disabled, pressed && styles.pressed]}>
    {icon}<Text style={styles.label}>{label}</Text>
  </Pressable>;
});

const styles = StyleSheet.create({
  button: { minHeight: 44, minWidth: 96, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 22, borderWidth: 2, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  label: { color: colors.white, fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  focused: { borderColor: colors.inkSoft }, disabled: { opacity: .65 }, pressed: { opacity: .8, transform: [{ scale: .98 }] },
});
