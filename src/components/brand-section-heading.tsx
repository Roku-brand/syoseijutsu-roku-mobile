import { StyleSheet, Text, View } from 'react-native';
import { SectionAction } from './section-action';

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
        <SectionAction testID={actionTestID} role={actionRole} accessibilityLabel={actionAccessibilityLabel} disabled={actionDisabled} onPress={onAction} label={actionLabel} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flexShrink: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 38, fontWeight: '700', letterSpacing: 0.8 },
  titleCompact: { fontSize: 23, lineHeight: 33 },
});
