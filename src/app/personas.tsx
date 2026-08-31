import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { getPersonaCount, getPersonaEntries, getPersonaFilterLabel, PersonaCard, PersonaFilterBar, type PersonaFilterKey } from '@/components/persona-catalog';
import { AppText } from '@/components/ui';
import { colors, fonts, spacing } from '@/constants/theme';
import { categoryOrder } from '@/data/catalog';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

export default function PersonasScreen() {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const [filter, setFilter] = useState<PersonaFilterKey>('all');
  const personas = getPersonaEntries(filter);
  const personaCount = getPersonaCount();

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.introduction}>
        <AppText accessibilityRole="header" aria-level={1} style={[styles.title, compact && styles.titleCompact]}>{personaCount}人物像</AppText>
        <AppText style={styles.subtitle}>{categoryOrder.length}領域・{personaCount}人物像から選ぶ</AppText>
      </View>

      <View style={styles.filterSection}>
        <AppText style={styles.filterHeading}>領域から絞り込む</AppText>
        <PersonaFilterBar selected={filter} onSelect={setFilter} />
      </View>

      <View style={styles.listHeading}>
        <AppText accessibilityRole="header" aria-level={2} style={styles.listTitle}>人物像一覧</AppText>
        <AppText style={styles.listCount}>{getPersonaFilterLabel(filter)}・{personas.length}人物像</AppText>
      </View>
      <View testID="personas-grid" style={styles.grid}>
        {personas.map((entry) => (
          <PersonaCard
            key={`${entry.category.key}-${entry.persona.name}`}
            entry={entry}
            variant="grid"
            compact={compact}
            showCategory
          />
        ))}
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl * 2 },
  introduction: { paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: 'center' },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 42, fontWeight: '600', letterSpacing: 2.4 },
  titleCompact: { fontSize: 25, lineHeight: 36 },
  subtitle: { marginTop: 4, color: colors.muted, fontFamily: fonts.serif, fontSize: 12, lineHeight: 20, letterSpacing: 0.8 },
  filterSection: { marginTop: spacing.xl },
  filterHeading: { marginBottom: 12, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 12, lineHeight: 19, letterSpacing: 0.8, textAlign: 'center' },
  listHeading: { minHeight: 38, marginTop: spacing.xl, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  listTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 21, lineHeight: 30, fontWeight: '600', letterSpacing: 1.2 },
  listCount: { color: colors.gold, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 12 },
});
