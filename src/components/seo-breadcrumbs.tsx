import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { catalogTheme, colors } from '@/constants/theme';
import { AppText } from './ui';

export function SeoBreadcrumbs({ items, tone, compact = false }: { items: { label: string; href?: Href }[]; tone?: 'theory'; compact?: boolean }) {
  return (
    <View accessibilityRole="list" accessibilityLabel="パンくずリスト" style={[styles.row, compact && styles.compactRow]}>
      {items.map((item, index) => (
        <View key={`${item.label}-${index}`} role="listitem" style={[styles.item, compact && styles.compactItem]}>
          {index > 0 ? <AppText accessibilityElementsHidden style={[styles.separator, tone === 'theory' && styles.theoryText]}>›</AppText> : null}
          {item.href ? (
            <Link href={item.href} asChild>
              <Pressable accessibilityRole="link" accessibilityLabel={`${item.label}へ移動`}>
                <AppText style={[styles.link, tone === 'theory' && styles.theoryLink]}>{item.label}</AppText>
              </Pressable>
            </Link>
          ) : <AppText numberOfLines={compact ? 1 : undefined} style={[styles.current, compact && styles.compactCurrent, tone === 'theory' && styles.theoryText]}>{item.label}</AppText>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  compactRow: { flexWrap: 'nowrap', gap: 4, marginBottom: 12 },
  compactItem: { flexShrink: 1, minWidth: 0, gap: 4 },
  compactCurrent: { flexShrink: 1 },
  theoryLink: { color: catalogTheme.theory.ink },
  theoryText: { color: catalogTheme.theory.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginBottom: 18 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  separator: { color: '#958B7C', fontSize: 12, lineHeight: 18 },
  link: { color: colors.gold, fontSize: 11, lineHeight: 18, textDecorationLine: 'underline' },
  current: { maxWidth: 260, color: '#6F6A61', fontSize: 11, lineHeight: 18 },
});

