import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { colors, fonts } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

export function PersonalSectionHeading({ title, subtitle, action, actionLabel, onAction, leadingAction }: {
  title: string; subtitle?: string; action?: string; actionLabel?: string; onAction?: () => void; leadingAction?: ReactNode;
}) {
  const { width } = useHydratedWindowDimensions();
  return <View style={styles.row}><View style={styles.copy}>
    <AppText accessibilityRole="header" aria-level={2} style={[styles.title, width < 700 && styles.titleCompact]}>{title}</AppText>
    {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
  </View>{leadingAction ? <View style={styles.actions}>{leadingAction}{onAction ? <Pressable accessibilityRole="button" accessibilityLabel={actionLabel ?? action} onPress={onAction} style={styles.action}><AppText style={styles.actionText}>{action}</AppText></Pressable> : null}</View> : onAction ? <Pressable accessibilityRole="button" accessibilityLabel={actionLabel ?? action} onPress={onAction} style={styles.action}><AppText style={styles.actionText}>{action}</AppText></Pressable> : null}</View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copy: { flex: 1, minWidth: 0 }, title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 42, fontWeight: '600' }, titleCompact: { fontSize: 25, lineHeight: 36 },
  subtitle: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 21 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 }, actionText: { color: colors.goldDeep, fontSize: 13, lineHeight: 21, fontWeight: '600' },
});
