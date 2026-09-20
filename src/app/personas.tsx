import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { CatalogModeSwitch, CatalogTitleBar } from '@/components/catalog-navigation';
import { getPersonaEntries, PersonaCard, PersonaFilterBar, type PersonaFilterKey } from '@/components/persona-catalog';
import { colors, spacing } from '@/constants/theme';
import { categoryOrder } from '@/data/catalog';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

export default function PersonasScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const browserCategory = Platform.OS === 'web' && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('category') ?? undefined
    : undefined;
  const requestedCategory = browserCategory ?? params.category;
  const initialFilter = categoryOrder.includes(requestedCategory as (typeof categoryOrder)[number])
    ? requestedCategory as PersonaFilterKey
    : 'all';
  const [filter, setFilter] = useState<PersonaFilterKey>(initialFilter);
  const personas = getPersonaEntries(filter);
  const columns: 2 | 3 | 4 = width >= 1120 ? 4 : width >= 720 ? 3 : 2;

  const selectFilter = (next: PersonaFilterKey) => {
    setFilter(next);
    router.setParams({ category: next === 'all' ? undefined : next });
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      {pathname === '/discover' ? <CatalogTitleBar title="人物像一覧" searchMode="personas" /> : null}
      <CatalogModeSwitch active="personas" />
      <View style={styles.filters}>
        <PersonaFilterBar selected={filter} onSelect={selectFilter} />
      </View>
      <View testID="personas-grid" style={styles.grid}>
        {personas.map((entry) => (
          <PersonaCard
            key={`${entry.category.key}-${entry.persona.name}`}
            entry={entry}
            variant="grid"
            gridColumns={columns}
          />
        ))}
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingBottom: spacing.xl * 3 },
  filters: { marginTop: spacing.lg, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  grid: { width: '100%', marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', justifyContent: 'flex-start', gap: 12 },
});
