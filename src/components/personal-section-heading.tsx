import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SectionAction } from './section-action';
import { AppText } from './ui';
import { colors, fonts } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

export function PersonalSectionHeading({ title, subtitle, action, actionLabel, onAction, leadingAction, hideCompactTitle = false }: {
  title: string; subtitle?: string; action?: string; actionLabel?: string; onAction?: () => void; leadingAction?: ReactNode; hideCompactTitle?: boolean;
}) {
  const { width } = useHydratedWindowDimensions();
  const showTitle = !hideCompactTitle || width >= 700;
  return <View style={styles.section}>
    <View style={styles.row}><View style={styles.copy}>
      {showTitle ? <AppText accessibilityRole="header" aria-level={2} style={[styles.title, width < 700 && styles.titleCompact]}>{title}</AppText> : subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
    </View>{leadingAction ? <View style={styles.actions}>{leadingAction}{onAction && action ? <SectionAction accessibilityLabel={actionLabel} onPress={onAction} label={action} /> : null}</View> : onAction && action ? <SectionAction accessibilityLabel={actionLabel} onPress={onAction} label={action} /> : null}</View>
    {showTitle && subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
  </View>;
}
const styles = StyleSheet.create({
  section: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copy: { flex: 1, minWidth: 0 }, title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 42, fontWeight: '600' }, titleCompact: { fontSize: 25, lineHeight: 36 },
  subtitle: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 21 },
});
