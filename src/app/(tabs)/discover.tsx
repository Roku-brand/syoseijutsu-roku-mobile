import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen, BookTitle, IndexCard, OrnamentHeading } from '@/components/book-ui';
import { TechniqueRow } from '@/components/technique-row';
import { TheoryArchiveCard } from '@/components/theory-archive-card';
import { AppText } from '@/components/ui';
import { categoryPalette, colors, fonts, radius, spacing } from '@/constants/theme';
import {
  categories,
  categoryMeta,
  categoryOrder,
  techniqueCards,
  theories,
  theoryById,
} from '@/data/catalog';
import type { TheoryCard } from '@/data/types';
import { useTabVisible } from '@/hooks/use-tab-visible';

type SearchKind = 'all' | 'technique' | 'theory';
type BrowseMode = 'techniques' | 'theories';

const theoryCategories = [
  { id: 'psychology', title: '心理学', mark: '心' },
  { id: 'behavioral-science', title: '行動科学', mark: '動' },
  { id: 'organization-management', title: '組織・経営論', mark: '組' },
  { id: 'strategy', title: '戦略論', mark: '戦' },
  { id: 'classics-thought', title: '古典・思想', mark: '古' },
  { id: 'maxims-experience', title: '格言・経験則', mark: '格' },
];

const shortDescriptions = {
  interpersonal: '関係を築き、守り、集団の中で立ち回る',
  work: '成果と合意をつくり、評価へつなげる',
  life: '判断軸を持ち、不安とつまずきを越える',
} as const;

function searchableText(card: (typeof techniqueCards)[number]) {
  const linkedTheories = (card.theoryTagIds ?? []).map((id) => theoryById.get(id)).filter(Boolean);
  return [
    card.title,
    card.subtitle,
    card.explanation,
    card.categoryName,
    card.subcategory,
    card.articleTitle,
    ...(card.tags ?? []),
    ...(card.theories ?? []),
    ...linkedTheories.flatMap((theory) => [theory?.title, theory?.summary, theory?.discipline]),
  ].filter(Boolean).join(' ').toLocaleLowerCase();
}

function searchableTheoryText(theory: TheoryCard) {
  return [
    theory.title,
    theory.summary,
    theory.definition,
    theory.categoryTitle,
    theory.sourceType,
    theory.discipline,
    theory.conceptType,
    theory.sourceName,
    theory.sourceDetail,
    ...(theory.domains ?? []),
    ...(theory.principles ?? []),
    ...(theory.keyPoints ?? []),
    ...(theory.strategies ?? []),
  ].filter(Boolean).join(' ').toLocaleLowerCase();
}

export default function DiscoverScreen() {
  const isFocused = useTabVisible();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchKind, setSearchKind] = useState<SearchKind>('all');
  const [browseMode, setBrowseMode] = useState<BrowseMode>('techniques');
  const searchTerms = useMemo(
    () => query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );
  const techniqueMatches = useMemo(() => {
    if (!searchTerms.length) return [];
    return techniqueCards.filter((card) =>
      searchTerms.every((term) => searchableText(card).includes(term)),
    );
  }, [searchTerms]);
  const theoryMatches = useMemo(() => {
    if (!searchTerms.length) return [];
    return theories.filter((theory) =>
      searchTerms.every((term) => searchableTheoryText(theory).includes(term)),
    );
  }, [searchTerms]);

  if (!isFocused) return null;
  const searching = searchTerms.length > 0;
  const resultCount = techniqueMatches.length + theoryMatches.length;
  const techniqueResults = searchKind !== 'theory' ? techniqueMatches.slice(0, 50) : [];
  const theoryResults = searchKind !== 'technique' ? theoryMatches.slice(0, 50) : [];
  const visibleResultCount =
    (searchKind !== 'theory' ? techniqueMatches.length : 0) +
    (searchKind !== 'technique' ? theoryMatches.length : 0);

  return (
    <BookScreen>
      <BookTitle title="探す" subtitle="検索と体系を、一つの入口に。" />
      <View style={styles.searchBox}>
        <AppText style={styles.searchIcon}>⌕</AppText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="悩み・人物像・理論・言葉を探す"
          placeholderTextColor="#817B70"
          accessibilityLabel="悩み・人物像・理論・言葉を検索"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {searching ? (
          <Pressable accessibilityRole="button" accessibilityLabel="検索を消す" onPress={() => setQuery('')} hitSlop={10}>
            <AppText style={styles.clear}>消す</AppText>
          </Pressable>
        ) : null}
      </View>

      {searching ? (
        <View style={styles.results}>
          <OrnamentHeading>検索結果　{resultCount}</OrnamentHeading>
          <View accessibilityRole="tablist" style={styles.resultFilters}>
            {[
              { key: 'all', label: `すべて ${resultCount}` },
              { key: 'technique', label: `処世術 ${techniqueMatches.length}` },
              { key: 'theory', label: `理論 ${theoryMatches.length}` },
            ].map((item) => {
              const active = searchKind === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSearchKind(item.key as SearchKind)}
                  style={[styles.filter, active && styles.filterActive]}
                >
                  <AppText style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</AppText>
                </Pressable>
              );
            })}
          </View>
          {visibleResultCount ? (
            <>
              {techniqueResults.length ? (
                <View style={styles.resultSection}>
                  <AppText style={styles.resultKind}>処世術　{techniqueMatches.length}</AppText>
                  {techniqueResults.map((card) => <TechniqueRow key={card.id} card={card} />)}
                </View>
              ) : null}
              {theoryResults.length ? (
                <View style={styles.resultSection}>
                  <AppText style={styles.resultKind}>理論　{theoryMatches.length}</AppText>
                  {theoryResults.map((theory) => <TheoryArchiveCard key={theory.tagId} theory={theory} />)}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.empty}>
              <AppText style={styles.emptyTitle}>該当する知恵がありません</AppText>
              <AppText style={styles.emptyBody}>言葉を短くするか、別の表現で探してみてください。</AppText>
            </View>
          )}
        </View>
      ) : (
        <>
          <View accessibilityRole="tablist" style={styles.modeTabs}>
            {[
              { key: 'techniques', label: '処世術' },
              { key: 'theories', label: '理論辞典' },
            ].map((item) => {
              const active = browseMode === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  onPress={() => setBrowseMode(item.key as BrowseMode)}
                  style={[styles.modeTab, active && styles.modeTabActive]}
                >
                  <AppText style={[styles.modeTabText, active && styles.modeTabTextActive]}>{item.label}</AppText>
                </Pressable>
              );
            })}
          </View>

          {browseMode === 'techniques' ? (
            <View>
              <OrnamentHeading>処世術から探す</OrnamentHeading>
              <View accessibilityRole="tablist" style={styles.allTabs}>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel="すべての処世術を見る"
                  onPress={() => router.push({ pathname: '/category/[key]', params: { key: 'all' } })}
                  style={({ pressed }) => [styles.allTab, pressed && styles.pressed]}
                >
                  <AppText style={styles.allTabText}>すべて</AppText>
                  <AppText style={styles.allTabCount}>{techniqueCards.length}</AppText>
                </Pressable>
              </View>
              {categoryOrder.map((key) => {
                const category = categories.find((item) => item.key === key);
                if (!category) return null;
                const count = category.subcategories.reduce((sum, item) => sum + item.items.length, 0);
                return (
                  <IndexCard
                    key={key}
                    mark={categoryMeta[key].mark}
                    title={categoryMeta[key].label}
                    subtitle={shortDescriptions[key]}
                    count={count}
                    tint={categoryPalette[key].tint}
                    onPress={() => router.push({ pathname: '/category/[key]', params: { key } })}
                  />
                );
              })}
            </View>
          ) : (
            <View>
              <OrnamentHeading>理論から探す</OrnamentHeading>
              <View accessibilityRole="tablist" style={styles.allTabs}>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel="すべての理論を見る"
                  onPress={() => router.push({ pathname: '/theories/[category]', params: { category: 'all' } })}
                  style={({ pressed }) => [styles.allTab, pressed && styles.pressed]}
                >
                  <AppText style={styles.allTabText}>すべて</AppText>
                  <AppText style={styles.allTabCount}>{theories.length}</AppText>
                </Pressable>
              </View>
              <View style={styles.theoryGrid}>
                {theoryCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${category.title}を開く`}
                    onPress={() => router.push({ pathname: '/theories/[category]', params: { category: category.id } })}
                    style={({ pressed }) => [styles.theoryCard, pressed && styles.pressed]}
                  >
                    <View style={styles.theoryMark}><AppText style={styles.theoryMarkText}>{category.mark}</AppText></View>
                    <AppText style={styles.theoryTitle}>{category.title}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    shadowColor: '#4C4232',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: spacing.xl,
  },
  searchIcon: { color: colors.gold, fontFamily: fonts.serif, fontSize: 31, lineHeight: 36 },
  searchInput: { flex: 1, minHeight: 58, color: colors.ink, fontFamily: fonts.serif, fontSize: 16, letterSpacing: 0.8 },
  clear: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  modeTabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    minHeight: 52,
    padding: 4,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.paperDeep,
  },
  modeTab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  modeTabActive: { backgroundColor: colors.charcoal },
  modeTabText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  modeTabTextActive: { color: colors.goldLight },
  results: { marginTop: 0 },
  resultFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  filter: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActive: { borderColor: colors.charcoal, backgroundColor: colors.charcoal },
  filterText: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  filterTextActive: { color: colors.goldLight },
  resultSection: { marginBottom: spacing.lg },
  resultKind: { marginBottom: spacing.md, color: colors.gold, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  empty: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.xl, alignItems: 'center' },
  emptyTitle: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  emptyBody: { marginTop: spacing.sm, color: colors.muted, textAlign: 'center' },
  allTabs: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  allTab: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  allTabText: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  allTabCount: {
    color: colors.gold,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  theoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  theoryCard: {
    width: '31.5%',
    minHeight: 130,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  theoryMark: { width: 47, height: 47, borderRadius: 24, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  theoryMarkText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, fontWeight: '700' },
  theoryTitle: { minHeight: 42, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
