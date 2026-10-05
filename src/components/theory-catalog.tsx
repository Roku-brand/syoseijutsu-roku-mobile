import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { canReadTheory } from '@/access/access-config';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getTheoryCategoryTitle, getTheoryDisplayId, theoryCategoryOrder } from '@/data/catalog';
import { getTheoryCategoryLabel, getTheoryCoverSummary, normalizeDisplayText } from '@/data/theory-display';
import type { TheoryCard } from '@/data/types';
import { AccessBadge } from './access-badge';
import { AppText } from './ui';

export type TheoryFilterKey = string;

export function getTheoryFilterOptions(): Array<{ key: TheoryFilterKey; label: string }> {
  return [
    { key: 'all', label: 'すべて' },
    ...theoryCategoryOrder.map((key) => ({ key, label: getTheoryCategoryTitle(key) })),
  ];
}

export function TheoryFilterBar({ selected, onSelect }: {
  selected: TheoryFilterKey;
  onSelect: (filter: TheoryFilterKey) => void;
}) {
  const options = getTheoryFilterOptions();
  const renderOption = (option: { key: TheoryFilterKey; label: string }) => {
    const active = selected === option.key;
    const label = option.label;
    return <Pressable
      key={option.key}
      accessibilityRole="button"
      accessibilityLabel={`${label}で理論を絞り込む`}
      accessibilityState={{ selected: active }}
      aria-selected={active}
      onPress={() => onSelect(option.key)}
      style={({ pressed }) => [styles.filterButton, active && styles.filterButtonActive, pressed && styles.pressed]}
    >
      <AppText style={[styles.filterText, active && styles.filterTextActive]}>{label}</AppText>
    </Pressable>;
  };

  return (
    <View testID="theory-category-filters" style={styles.filterGrid}>
      <View style={styles.filterRow}>{options.slice(0, 4).map(renderOption)}</View>
      <View style={styles.filterRow}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.filterSpacer} />
        {options.slice(4).map(renderOption)}
      </View>
    </View>
  );
}

export function TheoryBrowseCard({ theory, compact }: { theory: TheoryCard; compact: boolean }) {
  const router = useRouter();
  const { accessState } = useAccess();
  const effectiveAccess = accessState === 'paid' ? 'paid' : accessState === 'free' ? 'free' : 'guest';
  const locked = !canReadTheory(effectiveAccess, theory.tagId);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${theory.title}の詳細を見る`}
      onPress={() => router.push({ pathname: '/theory/[id]', params: { id: theory.tagId } })}
      style={({ pressed }) => [styles.card, compact && styles.cardCompact, pressed && styles.cardPressed]}
    >
      <AppText style={styles.category}>{getTheoryCategoryLabel(theory)}</AppText>
      <AppText style={styles.code}>{getTheoryDisplayId(theory).replace('－', '-')}</AppText>
      <View style={styles.goldRule} />
      <AppText numberOfLines={2} style={styles.title}>{normalizeDisplayText(theory.title)}</AppText>
      <AppText numberOfLines={compact ? 6 : 5} style={styles.summary}>{getTheoryCoverSummary(theory.summary)}</AppText>
      <View style={styles.footer}>
        <AppText style={styles.link}>詳しく見る　→</AppText>
      </View>
      {locked ? <View style={styles.badge}><AccessBadge locked compact /></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterGrid: { width: '100%', gap: 8, paddingHorizontal: 1, paddingVertical: 2 },
  filterRow: { width: '100%', flexDirection: 'row', gap: 8 },
  filterSpacer: { flex: 1, minWidth: 0 },
  filterButton: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: spacing.xs, borderWidth: 1, borderColor: 'transparent', borderRadius: radius.sm, backgroundColor: '#F3EFE7', alignItems: 'center', justifyContent: 'center' },
  filterButtonActive: { borderColor: colors.goldDeep, backgroundColor: colors.goldDeep },
  filterText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },
  filterTextActive: { color: colors.surface },
  card: { position: 'relative', width: 196, minHeight: 320, flexShrink: 0, padding: 18, borderWidth: 1, borderColor: '#183A5B', borderRadius: radius.md, backgroundColor: '#102A46' },
  cardCompact: { width: 276, minHeight: 310, padding: 18 },
  cardPressed: { opacity: 0.84, transform: [{ translateY: -1 }] },
  category: { color: '#D8B35E', fontFamily: fonts.serif, fontSize: 11, lineHeight: 17, fontWeight: '700', letterSpacing: 0.5 },
  code: { marginTop: 9, color: '#F3F0E9', fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, letterSpacing: 0.7 },
  goldRule: { width: 28, height: 1, marginTop: 13, backgroundColor: '#C49A42' },
  title: { minHeight: 64, marginTop: 16, color: '#FFFFFF', fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '700' },
  summary: { marginTop: 10, color: '#E3E7EC', fontFamily: fonts.serif, fontSize: 12, lineHeight: 21 },
  footer: { marginTop: 'auto', paddingTop: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(206,166,78,0.55)' },
  link: { paddingBottom: 8, color: '#E4C574', fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  badge: { position: 'absolute', top: 10, right: 8, transform: [{ scale: 0.8 }] },
  pressed: { opacity: 0.7 },
});
