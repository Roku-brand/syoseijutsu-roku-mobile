import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';

type BrandSectionHeadingProps = {
  title: string;
  href: Href;
  actionHref?: Href;
  actionAccessibilityLabel: string;
  compact?: boolean;
};

export function BrandSectionHeading({ title, href, actionHref = href, actionAccessibilityLabel, compact = false }: BrandSectionHeadingProps) {
  return (
    <View style={styles.row}>
      <Link href={href} push asChild>
        <Pressable accessibilityRole="link" style={({ pressed }) => [styles.titleLink, pressed && styles.pressed]}>
          <Text accessibilityRole="header" aria-level={2} style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
        </Pressable>
      </Link>
      <Link href={actionHref} push asChild>
        <Pressable accessibilityRole="link" accessibilityLabel={actionAccessibilityLabel} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionText}>すべて見る →</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  titleLink: { flexShrink: 1 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 38, fontWeight: '700', letterSpacing: 0.8 },
  titleCompact: { fontSize: 23, lineHeight: 33 },
  action: { minHeight: 32, paddingLeft: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  pressed: { opacity: 0.65 },
});
