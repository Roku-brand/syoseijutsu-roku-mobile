import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookScreen } from '@/components/book-ui';
import { SearchMark } from '@/components/search-mark';
import { theoryFilterOptions, type TheoryFilterKey } from '@/components/theory-catalog';
import { AppText } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { categoryMeta, categoryOrder } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { APP_ROUTES } from '@/navigation/app-routes';

const popularSearches = ['友達', '出世', '進路', '会話', '印象', '信頼'] as const;
const techniqueDescriptions: Record<CategoryKey, string> = {
  interpersonal: '人との関わり方', work: '仕事で成果を出す', life: 'より良く生きる',
};
const techniqueRoutes: Record<CategoryKey, Href> = {
  interpersonal: APP_ROUTES.interpersonal, work: APP_ROUTES.work, life: APP_ROUTES.life,
};
const theoryDetails: Array<{ key: TheoryFilterKey; description: string; glyph: string }> = [
  { key: 'psychology', description: '心の仕組みを知る', glyph: '◉' },
  { key: 'behavioral-science', description: '行動を変える', glyph: '▥' },
  { key: 'strategy', description: '長期的に考える', glyph: '◇' },
  { key: 'organization-management', description: '組織と社会を動かす', glyph: '♙' },
  { key: 'classics-thought', description: '普遍の知恵を学ぶ', glyph: '▤' },
  { key: 'practical-wisdom', description: '現場からの学び', glyph: '✧' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const narrow = width > 0 && width < 370;
  const openSearch = (query?: string) => router.push({ pathname: '/search', params: { mode: 'techniques', ...(query ? { q: query } : {}) } });

  return (
    <BookScreen contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      <Pressable accessibilityRole="button" accessibilityLabel="処世術・人物像・理論を検索" testID="discover-search" onPress={() => openSearch()} style={({ pressed }) => [styles.search, compact && styles.searchCompact, pressed && styles.pressed]}>
        <SearchMark size={compact ? 27 : 30} color={colors.gold} />
        <AppText numberOfLines={1} style={[styles.searchPlaceholder, compact && styles.searchPlaceholderCompact, narrow && styles.searchPlaceholderNarrow]}>処世術・人物像・理論を探す</AppText>
      </Pressable>
      <AppText style={[styles.lead, compact && styles.leadCompact]}>いまの悩みや、なりたい自分から探せます。</AppText>

      <View testID="discover-destinations" style={[styles.destinations, compact && styles.destinationsCompact]}>
        <DestinationCard title="人物像から探す" description="目指したい人物像から、必要な処世術を探します。" icon="person" compact={compact} narrow={narrow} onPress={() => router.push(APP_ROUTES.personas)} />
        <DestinationCard title="理論から探す" description="心理学・行動科学・戦略論などの理論から探します。" icon="book" compact={compact} narrow={narrow} onPress={() => router.push('/theories')} />
      </View>

      <View testID="discover-categories" style={[styles.categoriesSection, compact && styles.categoriesSectionCompact]}>
        <View style={styles.sectionHeading}>
          <AppText accessibilityRole="header" aria-level={2} style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>カテゴリから探す</AppText>
          <Pressable accessibilityRole="link" accessibilityLabel="すべての人物像を見る" onPress={() => router.push(APP_ROUTES.personas)} style={({ pressed }) => pressed && styles.pressed}><AppText style={styles.seeAll}>すべて見る →</AppText></Pressable>
        </View>
        <GroupHeading title="処世術" />
        <View testID="discover-technique-grid" style={styles.categoryGrid}>
          {categoryOrder.map((key) => <CategoryCard key={key} title={categoryMeta[key].label} description={techniqueDescriptions[key]} mark={categoryMeta[key].mark} narrow={narrow} onPress={() => router.push(techniqueRoutes[key])} />)}
        </View>
        <GroupHeading title="理論" secondary />
        <View testID="discover-theory-grid" style={styles.categoryGrid}>
          {theoryDetails.map((item) => {
            const title = theoryFilterOptions.find((option) => option.key === item.key)?.label;
            if (!title) return null;
            return <CategoryCard key={item.key} title={title} description={item.description} glyph={item.glyph} narrow={narrow} onPress={() => router.push({ pathname: '/theories', params: { category: item.key } })} />;
          })}
        </View>
      </View>

      <View testID="discover-popular" style={[styles.popularSection, compact && styles.popularSectionCompact]}>
        <AppText accessibilityRole="header" aria-level={2} style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>よく見られる検索</AppText>
        <View style={styles.popularGrid}>
          {popularSearches.map((term) => <Pressable key={term} accessibilityRole="button" accessibilityLabel={term + 'を検索'} onPress={() => openSearch(term)} style={({ pressed }) => [styles.popularButton, compact && styles.popularButtonCompact, pressed && styles.pressed]}><SearchMark size={compact ? 16 : 18} color={colors.gold} /><AppText numberOfLines={1} style={[styles.popularText, narrow && styles.popularTextNarrow]}>{term}</AppText></Pressable>)}
        </View>
      </View>
    </BookScreen>
  );
}

function DestinationCard({ title, description, icon, compact, narrow, onPress }: { title: string; description: string; icon: 'person' | 'book'; compact: boolean; narrow: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.destinationCard, compact && styles.destinationCardCompact, narrow && styles.destinationCardNarrow, pressed && styles.pressedCard]}>
    <View style={[styles.destinationIcon, compact && styles.destinationIconCompact]}><DestinationIcon name={icon} /></View>
    <View style={styles.destinationCopy}><AppText numberOfLines={2} style={[styles.destinationTitle, compact && styles.destinationTitleCompact, narrow && styles.destinationTitleNarrow]}>{title}</AppText><AppText numberOfLines={3} style={[styles.destinationDescription, compact && styles.destinationDescriptionCompact]}>{description}</AppText></View>
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

function CategoryCard({ title, description, mark, glyph, narrow, onPress }: { title: string; description: string; mark?: string; glyph?: string; narrow: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={title + 'から探す'} onPress={onPress} style={({ pressed }) => [styles.categoryCard, narrow && styles.categoryCardNarrow, pressed && styles.pressedCard]}>
    <View style={[styles.categoryIcon, glyph && styles.theoryIcon, narrow && styles.categoryIconNarrow]}><AppText style={[styles.categoryMark, glyph && styles.theoryGlyph, narrow && styles.categoryMarkNarrow]}>{mark ?? glyph}</AppText></View>
    <View style={styles.categoryCopy}><AppText numberOfLines={2} style={[styles.categoryTitle, narrow && styles.categoryTitleNarrow]}>{title}</AppText><AppText numberOfLines={2} style={[styles.categoryDescription, narrow && styles.categoryDescriptionNarrow]}>{description}</AppText></View>
    <AppText accessibilityElementsHidden style={[styles.arrow, styles.categoryArrow, narrow && styles.categoryArrowNarrow]}>›</AppText>
  </Pressable>;
}

const softGold = '#E7D9C3';
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', paddingBottom: 42 },
  contentCompact: { paddingBottom: 22 },
  search: { width: '100%', minHeight: 82, marginTop: 8, paddingHorizontal: 26, flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1.2, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: colors.surface },
  searchCompact: { minHeight: 72, marginTop: 5, paddingHorizontal: 20, gap: 12 },
  searchPlaceholder: { flexShrink: 1, color: '#898680', fontFamily: fonts.serif, fontSize: 19, lineHeight: 27, letterSpacing: 0.4 },
  searchPlaceholderCompact: { fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  searchPlaceholderNarrow: { fontSize: 14 },
  lead: { marginTop: 8, color: colors.muted, fontFamily: fonts.serif, fontSize: 14, lineHeight: 23 },
  leadCompact: { marginTop: 7, fontSize: 12, lineHeight: 20 },
  destinations: { flexDirection: 'row', gap: 14, marginTop: 26 },
  destinationsCompact: { gap: 10, marginTop: 20 },
  destinationCard: { position: 'relative', flex: 1, minWidth: 0, minHeight: 150, flexDirection: 'row', alignItems: 'center', gap: 15, paddingHorizontal: 18, paddingVertical: 18, borderWidth: 1, borderColor: softGold, borderRadius: 18, backgroundColor: colors.surface },
  destinationCardCompact: { minHeight: 136, gap: 9, paddingHorizontal: 12, paddingVertical: 12 },
  destinationCardNarrow: { minHeight: 144, paddingHorizontal: 8, gap: 6 },
  destinationIcon: { width: 52, height: 52, flexShrink: 0, borderRadius: 26, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  destinationIconCompact: { width: 39, height: 39, borderRadius: 20 },
  destinationCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  destinationTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '700' },
  destinationTitleCompact: { fontSize: 15, lineHeight: 21 },
  destinationTitleNarrow: { fontSize: 13, lineHeight: 19 },
  destinationDescription: { marginTop: 8, color: colors.muted, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21 },
  destinationDescriptionCompact: { marginTop: 5, fontSize: 11, lineHeight: 17 },
  arrow: { color: colors.gold, fontFamily: fonts.serif, fontWeight: '600' },
  destinationArrow: { position: 'absolute', right: 8, top: '47%', fontSize: 24, lineHeight: 24 },
  categoriesSection: { marginTop: 36 }, categoriesSectionCompact: { marginTop: 28 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 38, fontWeight: '700', letterSpacing: 0.8 },
  sectionTitleCompact: { fontSize: 23, lineHeight: 33 },
  seeAll: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  groupHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, marginBottom: 8 }, groupHeadingSecondary: { marginTop: 18 },
  groupTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  groupRule: { flex: 1, height: 1, backgroundColor: colors.line },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryCard: { position: 'relative', width: '30%', flexGrow: 1, minWidth: 0, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 7, borderWidth: 1, borderColor: softGold, borderRadius: 13, backgroundColor: colors.surface },
  categoryCardNarrow: { minHeight: 78, gap: 4, paddingHorizontal: 5 },
  categoryIcon: { width: 38, height: 38, flexShrink: 0, borderRadius: 19, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  categoryIconNarrow: { width: 27, height: 27, borderRadius: 14 },
  theoryIcon: { backgroundColor: '#FDFBF7', borderWidth: 1, borderColor: softGold },
  categoryMark: { color: '#DDB867', fontFamily: fonts.serif, fontSize: 21, lineHeight: 27, fontWeight: '700' },
  theoryGlyph: { color: colors.gold, fontSize: 22, fontWeight: '400' },
  categoryMarkNarrow: { fontSize: 16, lineHeight: 21 },
  categoryCopy: { flex: 1, minWidth: 0, paddingRight: 5 },
  categoryTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  categoryTitleNarrow: { fontSize: 10, lineHeight: 14 },
  categoryDescription: { marginTop: 3, color: colors.muted, fontFamily: fonts.serif, fontSize: 9, lineHeight: 13 },
  categoryDescriptionNarrow: { fontSize: 8, lineHeight: 11 },
  categoryArrow: { position: 'absolute', right: 3, top: '42%', fontSize: 18, lineHeight: 20 },
  categoryArrowNarrow: { right: 1, fontSize: 15 },
  popularSection: { marginTop: 34 }, popularSectionCompact: { marginTop: 28 },
  popularGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  popularButton: { width: '30%', flexGrow: 1, minHeight: 47, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, borderWidth: 1, borderColor: softGold, borderRadius: radius.pill, backgroundColor: colors.surface },
  popularButtonCompact: { minHeight: 39, gap: 9 },
  popularText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20 }, popularTextNarrow: { fontSize: 12 },
  pressed: { opacity: 0.68 }, pressedCard: { opacity: 0.75 },
  personIcon: { width: 28, height: 29, alignItems: 'center' },
  personHead: { width: 10, height: 10, borderRadius: 6, borderWidth: 1.5, borderColor: '#DDB867' },
  personBody: { width: 22, height: 14, marginTop: 2, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 1.5, borderBottomWidth: 0, borderColor: '#DDB867' },
  bookIcon: { width: 27, height: 22, flexDirection: 'row', gap: 1 },
  bookPage: { width: 13, height: 20, borderWidth: 1.5, borderColor: '#DDB867' },
  bookPageLeft: { borderTopLeftRadius: 3, borderBottomLeftRadius: 3, borderTopRightRadius: 5 },
  bookPageRight: { borderTopRightRadius: 3, borderBottomRightRadius: 3, borderTopLeftRadius: 5 },
});
