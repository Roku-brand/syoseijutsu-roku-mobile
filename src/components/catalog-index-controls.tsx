import { Pressable, StyleSheet, View } from 'react-native';
import { catalogIndexTheme, colors, fonts, spacing } from '@/constants/theme';
import { AppText } from './ui';
import { CategoryFilterLabel } from './category-filter-label';

type Option = { key: string; label: string };

export function CatalogIndexFilters({ kind, options, selected, onSelect }: {
  kind: 'theory' | 'technique'; options: Option[]; selected: string; onSelect: (key: string) => void;
}) {
  const rows = kind === 'theory' && options.length > 4 ? [options.slice(0, 4), options.slice(4)] : [options];
  const testID = kind === 'theory' ? 'theory-category-filters' : 'technique-index-filters';
  const noun = kind === 'theory' ? '理論' : '処世術';
  return <View testID={testID} style={styles.filters}>
    {rows.map((row, index) => <View key={index} style={styles.filterRow}>
      {row.map(({ key, label }) => {
        const active = selected === key;
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${label}で${noun}を絞り込む`}
          accessibilityState={{ selected: active }} aria-selected={active} onPress={() => onSelect(key)}
          style={({ pressed }) => [styles.filter, pressed && styles.pressed]}>
          <View style={[styles.filterSurface, active && { backgroundColor: catalogIndexTheme[kind].selected }]}>
            <CategoryFilterLabel label={label} style={StyleSheet.flatten([styles.filterText, active && styles.filterTextActive])} />
          </View>
        </Pressable>;
      })}
    </View>)}
  </View>;
}

export function CatalogIndexCount({ label, count, testID }: { label: string; count: number; testID: string }) {
  return <View style={styles.count}>
    <AppText style={styles.countLabel}>{label}</AppText>
    <AppText testID={testID} style={styles.countLabel}><AppText style={styles.number}>{count}</AppText>件</AppText>
  </View>;
}

export const catalogIndexLayout = StyleSheet.create({
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingTop: 12, paddingBottom: spacing.xl * 3 },
  resultHeading: { minHeight: 32, marginTop: 12, marginBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  list: { width: '100%', gap: catalogIndexTheme.cardGap },
});

const styles = StyleSheet.create({
  filters: { width: '100%', gap: 1 },
  filterRow: { width: '100%', flexDirection: 'row', gap: 6 },
  filter: { flexBasis: 0, flexGrow: 1, minWidth: 0, minHeight: 44, justifyContent: 'center' },
  filterSurface: {
    minHeight: 36, paddingHorizontal: 2, paddingVertical: 3, backgroundColor: catalogIndexTheme.filterSurface,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  filterText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  filterTextActive: { color: colors.surface },
  pressed: { opacity: 0.75 },
  count: { flexDirection: 'row', alignItems: 'baseline', gap: 5, minWidth: 0, paddingHorizontal: 3 },
  countLabel: { color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 23 },
  number: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
