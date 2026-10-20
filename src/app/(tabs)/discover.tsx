import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { BookScreen } from '@/components/book-ui';
import { BrandSectionHeading } from '@/components/brand-section-heading';
import { DiscoveryCategoryCard } from '@/components/discovery-category-card';
import { SearchMark } from '@/components/search-mark';
import { getTheoryFilterOptions } from '@/components/theory-catalog';
import { AppText } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { categoryMeta, categoryOrder } from '@/data/catalog';
import { POPULAR_SEARCHES, getSearchResults, type BrowseMode } from '@/data/search-catalog';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { APP_ROUTES } from '@/navigation/app-routes';

export default function DiscoverScreen() {
  'use no memo';
  // Category names and ordering can change during a published catalogue sync.
  const router = useRouter();
  const { isPaid } = useAccess();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const narrow = width > 0 && width < 370;
  const [query, setQuery] = useState('');
  const theoryCategories = getTheoryFilterOptions().filter(option => option.key !== 'all');
  const openSearch = (value = query, preferredMode: BrowseMode = 'techniques') => {
    const searchQuery = value.trim();
    const results = getSearchResults(searchQuery, isPaid);
    const mode = preferredMode === 'techniques' && !results.techniqueMatches.length && results.theoryMatches.length ? 'theories' : preferredMode;
    router.push({ pathname: '/search', params: { mode, ...(searchQuery ? { q: searchQuery } : {}) } });
  };
  const techniqueCards = categoryOrder.map(key => <DiscoveryCategoryCard
    key={key} category={key} title={categoryMeta[key].label}
    compact={compact} style={styles.gridCard}
    onPress={() => router.push({ pathname: APP_ROUTES.personas, params: { category: key } })}
  />);

  return <BookScreen contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
    <View testID="discover-search" style={[styles.search, compact && styles.searchCompact]}>
      <SearchMark size={compact ? 23 : 25} color={colors.gold} />
      <TextInput accessibilityLabel="処世術・理論・特集を検索" testID="discover-search-input" value={query} onChangeText={setQuery}
        onSubmitEditing={() => openSearch()} returnKeyType="search" autoCapitalize="none" autoCorrect={false}
        placeholder="処世術・理論・特集を検索" placeholderTextColor={colors.muted}
        style={[styles.searchInput, compact && styles.searchInputCompact, narrow && styles.searchInputNarrow]} />
      <Pressable accessibilityRole="button" accessibilityLabel="処世術・理論・特集を検索" testID="discover-search-submit" onPress={() => openSearch()} style={({ pressed }) => [styles.searchSubmit, pressed && styles.pressed]}>
        <AppText style={styles.searchSubmitText}>検索</AppText>
      </Pressable>
    </View>

    <View testID="discover-categories">
      <View testID="discover-techniques-section" style={styles.techniqueSection}>
        <BrandSectionHeading title="処世術を探す" compact={compact} actionLabel="すべて見る →" actionAccessibilityLabel="すべての処世術を見る" onAction={() => router.push(APP_ROUTES.techniques)} />
        <AppText style={styles.sectionDescription}>どのように行動するか</AppText>
        <AppText accessibilityRole="header" aria-level={3} style={styles.subheading}>人物像から探す</AppText>
        <View testID="discover-technique-grid" style={[styles.grid, compact && styles.techniqueGridCompact]}>
          {techniqueCards}
        </View>
      </View>

      <View testID="discover-theories-section" style={styles.theorySection}>
        <BrandSectionHeading title="理論を探す" compact={compact} actionLabel="すべて見る →" actionAccessibilityLabel="すべての理論を見る" onAction={() => router.push('/theories')} />
        <AppText style={styles.sectionDescription}>なぜそうなるのか</AppText>
        <View testID="discover-theory-grid" style={[styles.grid, styles.theoryGrid]}>
          {theoryCategories.map(option => <DiscoveryCategoryCard key={option.key} category={option.key} title={option.label} compact={compact} theory style={compact ? styles.theoryCardCompact : styles.gridCard}
            onPress={() => router.push({ pathname: '/theories', params: { category: option.key } })} />)}
        </View>
      </View>
    </View>

    <View testID="discover-popular" style={styles.popularSection}>
      <AppText accessibilityRole="header" aria-level={3} style={styles.popularTitle}>よく見られる検索</AppText>
      <View style={styles.popularGrid}>
        {POPULAR_SEARCHES.map(({ term, mode }) => <Pressable key={term} accessibilityRole="button" accessibilityLabel={term + 'を検索'} onPress={() => openSearch(term, mode)} style={({ pressed }) => [styles.popularButton, compact && styles.popularButtonCompact, pressed && styles.pressed]}>
          <SearchMark size={16} color={colors.gold} /><AppText numberOfLines={1} style={styles.popularText}>{term}</AppText>
        </Pressable>)}
      </View>
    </View>
  </BookScreen>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', paddingTop: 16, paddingBottom: 42 },
  contentCompact: { paddingTop: 12, paddingBottom: 24 },
  search: { width: '100%', height: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: colors.goldSoft, borderRadius: radius.pill, backgroundColor: colors.surface },
  searchCompact: { height: 56, gap: 9, paddingHorizontal: 14 },
  searchInput: { flex: 1, minWidth: 0, height: '100%', padding: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, outlineStyle: 'none' } as object,
  searchInputCompact: { fontSize: 14, lineHeight: 22 }, searchInputNarrow: { fontSize: 13 },
  searchSubmit: { minWidth: 36, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  searchSubmitText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 14, fontWeight: '700' },
  techniqueSection: { marginTop: 28 },
  sectionDescription: { marginTop: 5, color: colors.muted, fontSize: 13, lineHeight: 20 },
  subheading: { marginTop: 18, marginBottom: 12, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridCard: { width: '30%', flexGrow: 1, flexShrink: 1 },
  techniqueGridCompact: { gap: 8, flexWrap: 'nowrap' },
  theorySection: { marginTop: 36 }, theoryGrid: { marginTop: 18 },
  theoryCardCompact: { width: '46%', flexGrow: 1, flexShrink: 1 },
  popularSection: { marginTop: 32 }, popularTitle: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, fontWeight: '600' },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  popularButton: { width: '30%', flexGrow: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 8, borderWidth: 1, borderColor: colors.goldSoft, borderRadius: radius.pill, backgroundColor: colors.surface },
  popularButtonCompact: { width: '46%' }, popularText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20 },
  pressed: { opacity: 0.75 },
});
