import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

type BrandSectionHeadingProps = {
  title: string;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  actionRole?: 'button' | 'link';
  actionTestID?: string;
  actionDisabled?: boolean;
  onAction?: () => void;
  compact?: boolean;
};

export function BrandSectionHeading({ title, actionLabel, actionAccessibilityLabel, actionRole = 'link', actionTestID, actionDisabled = false, onAction, compact = false }: BrandSectionHeadingProps) {
  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" aria-level={2} style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable testID={actionTestID} accessibilityRole={actionRole} accessibilityLabel={actionAccessibilityLabel ?? actionLabel.replace(/\s*→$/, '')} accessibilityState={{ disabled: actionDisabled }} aria-disabled={actionDisabled} disabled={actionDisabled} onPress={onAction} style={({ pressed }) => [styles.action, actionDisabled && styles.disabled, pressed && styles.pressed]}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flexShrink: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 38, fontWeight: '700', letterSpacing: 0.8 },
  titleCompact: { fontSize: 23, lineHeight: 33 },
  action: { minHeight: 32, paddingLeft: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.5 },
});
