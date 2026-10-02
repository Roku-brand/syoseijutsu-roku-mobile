import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BookScreen } from '@/components/book-ui';
import { BrandSectionHeading } from '@/components/brand-section-heading';
import { SearchMark } from '@/components/search-mark';
import { getTheoryFilterOptions, type TheoryFilterKey } from '@/components/theory-catalog';
import { AppText } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { categoryMeta, categoryOrder, theories } from '@/data/catalog';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { APP_ROUTES } from '@/navigation/app-routes';

const popularSearches = ['友達', '出世', '進路', '会話', '印象', '信頼'] as const;
type TheoryIconName = 'mind' | 'chart' | 'compass' | 'people' | 'classics' | 'idea';
const theoryDetails: Array<{ key: TheoryFilterKey; icon: TheoryIconName }> = [
  { key: 'psychology', icon: 'mind' },
  { key: 'behavioral-science', icon: 'chart' },
  { key: 'strategy', icon: 'compass' },
  { key: 'organization-management', icon: 'people' },
  { key: 'classics-thought', icon: 'classics' },
  { key: 'practical-wisdom', icon: 'idea' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const narrow = width > 0 && width < 370;
  const [query, setQuery] = useState('');
  const openSearch = (value = query) => {
    const searchQuery = value.trim();
    router.push({ pathname: '/search', params: { mode: 'techniques', ...(searchQuery ? { q: searchQuery } : {}) } });
  };

  return (
    <BookScreen contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      <View style={[styles.search, compact && styles.searchCompact]} testID="discover-search">
        <SearchMark size={compact ? 27 : 30} color={colors.gold} />
        <TextInput
          accessibilityLabel="処世術・人物像・理論を検索"
          testID="discover-search-input"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => openSearch()}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="処世術・人物像・理論を探す"
          placeholderTextColor="#898680"
          style={[styles.searchInput, compact && styles.searchInputCompact, narrow && styles.searchInputNarrow]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="処世術・人物像・理論を検索" testID="discover-search-submit" onPress={() => openSearch()} style={({ pressed }) => [styles.searchSubmit, pressed && styles.pressed]}>
          <AppText style={styles.searchSubmitText}>検索</AppText>
        </Pressable>
      </View>
      <View testID="discover-destinations" style={[styles.destinations, compact && styles.destinationsCompact]}>
        <DestinationCard title="人物像から探す" icon="person" compact={compact} narrow={narrow} onPress={() => router.push(APP_ROUTES.personas)} />
        <DestinationCard title="理論から探す" icon="book" compact={compact} narrow={narrow} onPress={() => router.push('/theories')} />
      </View>

      <View testID="discover-categories" style={[styles.categoriesSection, compact && styles.categoriesSectionCompact]}>
        <BrandSectionHeading title="カテゴリから探す" actionLabel="人物像一覧 →" actionAccessibilityLabel="すべての人物像を見る" onAction={() => router.push(APP_ROUTES.personas)} compact={compact} />
        <GroupHeading title="人物像" />
        <View testID="discover-technique-grid" style={styles.categoryGrid}>
          {categoryOrder.map((key) => <CategoryCard key={key} title={categoryMeta[key].label} mark={categoryMeta[key].mark} narrow={narrow} onPress={() => router.push({ pathname: APP_ROUTES.personas, params: { category: key } })} />)}
        </View>
        <GroupHeading title="理論" secondary />
        <View testID="discover-theory-grid" style={styles.categoryGrid}>
          {theoryDetails.map((item) => {
            const title = theories.find((theory) => theory.categoryId === item.key)?.categoryTitle
              ?? getTheoryFilterOptions().find((option) => option.key === item.key)?.label;
            if (!title) return null;
            return <CategoryCard key={item.key} title={title} icon={item.icon} narrow={narrow} wide={compact} onPress={() => router.push({ pathname: '/theories', params: { category: item.key } })} />;
          })}
        </View>
      </View>

      <View testID="discover-popular" style={[styles.popularSection, compact && styles.popularSectionCompact]}>
        <BrandSectionHeading title="よく見られる検索" compact={compact} />
        <View style={styles.popularGrid}>
          {popularSearches.map((term) => <Pressable key={term} accessibilityRole="button" accessibilityLabel={term + 'を検索'} onPress={() => openSearch(term)} style={({ pressed }) => [styles.popularButton, compact && styles.popularButtonCompact, pressed && styles.pressed]}><SearchMark size={compact ? 16 : 18} color={colors.gold} /><AppText numberOfLines={1} style={[styles.popularText, narrow && styles.popularTextNarrow]}>{term}</AppText></Pressable>)}
        </View>
      </View>
    </BookScreen>
  );
}

function DestinationCard({ title, icon, compact, narrow, onPress }: { title: string; icon: 'person' | 'book'; compact: boolean; narrow: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.destinationCard, compact && styles.destinationCardCompact, narrow && styles.destinationCardNarrow, pressed && styles.pressedCard]}>
    <View style={[styles.destinationIcon, compact && styles.destinationIconCompact]}><DestinationIcon name={icon} /></View>
    <View style={styles.destinationCopy}><AppText numberOfLines={2} style={[styles.destinationTitle, compact && styles.destinationTitleCompact, narrow && styles.destinationTitleNarrow]}>{title}</AppText></View>
    <AppText accessibilityElementsHidden style={[styles.arrow, styles.destinationArrow]}>›</AppText>
  </Pressable>;
}

function DestinationIcon({ name }: { name: 'person' | 'book' }) {
  if (name === 'book') return <View style={styles.bookIcon}><View style={[styles.bookPage, styles.bookPageLeft]} /><View style={[styles.bookPage, styles.bookPageRight]} /></View>;
  return <View style={styles.personIcon}><View style={styles.personHead} /><View style={styles.personBody} /></View>;
}

function GroupHeading({ title, secondary = false }: { title: string; secondary?: boolean }) {
  return <View style={[styles.groupHeading, secondary && styles.groupHeadingSecondary]}><AppText accessibilityRole="header" aria-level={3} style={styles.groupTitle}>{title}</AppText><View style={styles.groupRule} /></View>;
}

function CategoryCard({ title, mark, icon, narrow, wide = false, onPress }: { title: string; mark?: string; icon?: TheoryIconName; narrow: boolean; wide?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={title + 'から探す'} onPress={onPress} style={({ pressed }) => [styles.categoryCard, wide && styles.theoryCategoryCardCompact, narrow && styles.categoryCardNarrow, pressed && styles.pressedCard]}>
    <View style={styles.categoryTop}><View style={[styles.categoryIcon, icon && styles.theoryIcon, narrow && styles.categoryIconNarrow]}>{mark ? <AppText style={[styles.categoryMark, narrow && styles.categoryMarkNarrow]}>{mark}</AppText> : icon ? <TheoryIcon name={icon} /> : null}</View><AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.categoryTitle, narrow && styles.categoryTitleNarrow]}>{title}</AppText></View>
    <AppText accessibilityElementsHidden style={[styles.arrow, styles.categoryArrow, narrow && styles.categoryArrowNarrow]}>›</AppText>
  </Pressable>;
}

function TheoryIcon({ name }: { name: TheoryIconName }) {
  if (name === 'chart') return <View style={styles.chartIcon}><View style={[styles.chartBar, { height: 7 }]} /><View style={[styles.chartBar, { height: 12 }]} /><View style={[styles.chartBar, { height: 17 }]} /></View>;
  if (name === 'compass') return <View style={styles.compassIcon}><View style={styles.compassNeedle} /></View>;
  if (name === 'people') return <View style={styles.peopleIcon}><View style={styles.peopleHeads}><View style={styles.peopleHead} /><View style={styles.peopleHead} /></View><View style={styles.peopleShoulders} /></View>;
  if (name === 'classics') return <View style={styles.classicsIcon}><View style={styles.classicsRule} /><View style={styles.classicsColumns}><View style={styles.classicsColumn} /><View style={styles.classicsColumn} /><View style={styles.classicsColumn} /></View><View style={styles.classicsRule} /></View>;
  if (name === 'idea') return <View style={styles.ideaIcon}><View style={styles.ideaBulb} /><View style={styles.ideaStem} /></View>;
  return <View style={styles.mindIcon}><View style={styles.mindInner} /><View style={styles.mindNeck} /></View>;
}

const softGold = colors.goldSoft;
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', paddingBottom: 42 },
  contentCompact: { paddingBottom: 22 },
  search: { width: '100%', minHeight: 82, marginTop: 8, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1.2, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: colors.surface },
  searchCompact: { minHeight: 72, marginTop: 5, paddingHorizontal: 20, gap: 12 },
  searchInput: { flex: 1, minWidth: 0, height: 52, padding: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 27, letterSpacing: 0.4, outlineStyle: 'none' } as object,
  searchInputCompact: { fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  searchInputNarrow: { fontSize: 14 },
  searchSubmit: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 3 },
  searchSubmitText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 14, fontWeight: '700' },
  destinations: { flexDirection: 'row', gap: 14, marginTop: 18 },
  destinationsCompact: { gap: 10, marginTop: 20 },
  destinationCard: { position: 'relative', flex: 1, minWidth: 0, minHeight: 90, flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: softGold, borderRadius: 18, backgroundColor: colors.surface },
  destinationCardCompact: { minHeight: 72, gap: 6, paddingHorizontal: 10, paddingVertical: 8 },
  destinationCardNarrow: { minHeight: 72, paddingHorizontal: 8, gap: 5 },
  destinationIcon: { width: 52, height: 52, flexShrink: 0, borderRadius: 26, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  destinationIconCompact: { width: 34, height: 34, borderRadius: 17 },
  destinationCopy: { flex: 1, minWidth: 0, paddingRight: 3 },
  destinationTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '700' },
  destinationTitleCompact: { fontSize: 16, lineHeight: 22 },
  destinationTitleNarrow: { fontSize: 14, lineHeight: 20 },
  arrow: { color: colors.gold, fontFamily: fonts.serif, fontWeight: '600' },
  destinationArrow: { position: 'absolute', right: 4, top: '47%', fontSize: 21, lineHeight: 24 },
  categoriesSection: { marginTop: 36 }, categoriesSectionCompact: { marginTop: 28 },
  groupHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 8 }, groupHeadingSecondary: { marginTop: 18 },
  groupTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  groupRule: { flex: 1, height: 1, backgroundColor: colors.line },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: { position: 'relative', width: '30%', flexGrow: 1, minWidth: 0, minHeight: 58, justifyContent: 'center', paddingHorizontal: 7, paddingVertical: 6, borderWidth: 1, borderColor: softGold, borderRadius: 13, backgroundColor: colors.surface },
  categoryCardNarrow: { minHeight: 64, paddingHorizontal: 5 },
  theoryCategoryCardCompact: { width: '46%' },
  categoryTop: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0, paddingRight: 4 },
  categoryIcon: { width: 29, height: 29, flexShrink: 0, borderRadius: 15, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  categoryIconNarrow: { width: 24, height: 24, borderRadius: 12 },
  theoryIcon: { backgroundColor: '#FDFBF7', borderWidth: 1, borderColor: softGold },
  categoryMark: { color: '#DDB867', fontFamily: fonts.serif, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  categoryMarkNarrow: { fontSize: 15, lineHeight: 20 },
  categoryTitle: { flexShrink: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  categoryTitleNarrow: { fontSize: 12, lineHeight: 16 },
  categoryArrow: { position: 'absolute', right: 2, bottom: 2, fontSize: 16, lineHeight: 18 },
  categoryArrowNarrow: { right: 1, fontSize: 14 },
  popularSection: { marginTop: 34 }, popularSectionCompact: { marginTop: 28 },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  popularButton: { width: '30%', flexGrow: 1, minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, borderWidth: 1, borderColor: softGold, borderRadius: radius.pill, backgroundColor: colors.surface },
  popularButtonCompact: { minHeight: 39, gap: 9 },
  popularText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20 }, popularTextNarrow: { fontSize: 13 },
  pressed: { opacity: 0.68 }, pressedCard: { opacity: 0.75 },
  personIcon: { width: 28, height: 29, alignItems: 'center' },
  personHead: { width: 10, height: 10, borderRadius: 6, borderWidth: 1.5, borderColor: '#DDB867' },
  personBody: { width: 22, height: 14, marginTop: 2, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1.5, borderBottomWidth: 0, borderColor: '#DDB867' },
  bookIcon: { width: 27, height: 22, flexDirection: 'row', gap: 1 },
  bookPage: { width: 13, height: 20, borderWidth: 1.5, borderColor: '#DDB867' },
  bookPageLeft: { borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 5 },
  bookPageRight: { borderTopRightRadius: 3, borderBottomRightRadius: 3, borderTopLeftRadius: 5 },
  chartIcon: { width: 19, height: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 2 },
  chartBar: { width: 4, borderWidth: 1.2, borderColor: colors.gold },
  compassIcon: { width: 19, height: 19, borderWidth: 1.3, borderColor: colors.gold, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  compassNeedle: { width: 3, height: 14, borderWidth: 1.1, borderColor: colors.gold, transform: [{ rotate: '40deg' }] },
  peopleIcon: { width: 20, height: 18, alignItems: 'center', justifyContent: 'center' },
  peopleHeads: { flexDirection: 'row', gap: 3 },
  peopleHead: { width: 6, height: 6, borderRadius: 3, borderWidth: 1.1, borderColor: colors.gold },
  peopleShoulders: { width: 17, height: 7, marginTop: 2, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1.1, borderBottomWidth: 0, borderColor: colors.gold },
  classicsIcon: { width: 19, height: 17, alignItems: 'center', justifyContent: 'center' },
  classicsRule: { width: 19, height: 3, borderWidth: 1, borderColor: colors.gold },
  classicsColumns: { width: 15, height: 11, flexDirection: 'row', justifyContent: 'space-between' },
  classicsColumn: { width: 3, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.gold },
  ideaIcon: { width: 18, height: 20, alignItems: 'center' },
  ideaBulb: { width: 14, height: 14, borderWidth: 1.2, borderColor: colors.gold, borderRadius: 7 },
  ideaStem: { width: 6, height: 5, borderLeftWidth: 1.2, borderRightWidth: 1.2, borderBottomWidth: 1.2, borderColor: colors.gold },
  mindIcon: { width: 18, height: 16, borderWidth: 1.2, borderColor: colors.gold, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mindInner: { width: 6, height: 6, borderWidth: 1, borderColor: colors.gold, borderRadius: 3 },
  mindNeck: { position: 'absolute', bottom: -3, right: 0, width: 5, height: 5, borderLeftWidth: 1, borderBottomWidth: 1, borderColor: colors.gold },
});
