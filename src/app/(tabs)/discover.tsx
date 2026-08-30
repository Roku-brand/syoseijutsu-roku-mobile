import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { TechniqueRow } from '@/components/technique-row';
import { TheoryArchiveCard } from '@/components/theory-archive-card';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categories, categoryMeta, categoryOrder, techniqueCards, theories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';
import { getTechniqueSearchText } from '@/data/technique-tags';
import { useAccess } from '@/access/access-state';
import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET, isFreePersona } from '@/access/access-config';
import { getCategoryTechniqueCount, getTechniqueCountTotal } from '@/data/technique-counts';
import { getTheoryCategoryCount } from '@/data/theory-counts';
import { AccessBadge } from '@/components/access-badge';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

type BrowseMode = 'techniques' | 'theories';

const searchAliases: Record<string, string[]> = {
  友達: ['友達', '人間関係', '関係'],
  出世: ['出世', '評価', '昇進', 'キャリア'],
  進路: ['進路', '選択', 'キャリア', '方向性'],
  転職: ['転職', 'キャリア', '仕事'],
  自己肯定感: ['自己肯定感', '自信', '自己評価'],
  リーダーシップ: ['リーダーシップ', 'リーダー', '集団'],
  習慣: ['習慣', '継続', '行動'],
  交渉: ['交渉', '合意', '説得'],
};

const popularSearches = ['友達', '出世', '進路', '会話', '人間関係', '転職', '恋愛', '自己肯定感', '不安', '習慣', 'リーダーシップ', '交渉'];

const theoryCategories = [
  { id: 'psychology', title: '心理学', mark: '心' },
  { id: 'behavioral-science', title: '行動科学', mark: '行' },
  { id: 'organization-management', title: '組織・経営論', mark: '組' },
  { id: 'strategy', title: '戦略論', mark: '戦' },
  { id: 'classics-thought', title: '古典', mark: '古' },
  { id: 'maxims-experience', title: '格言', mark: '格' },
] as const;

function matchesKeyword(source: string, keyword: string) {
  return (searchAliases[keyword] ?? [keyword]).some((term) => source.includes(term));
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<BrowseMode>('techniques');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('interpersonal');
  const [showAllPersonas, setShowAllPersonas] = useState(false);
  const { isPaid } = useAccess();
  const keywords = useMemo(() => query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean), [query]);
  const techniqueMatches = useMemo(
    () => !keywords.length ? [] : techniqueCards
      .filter((card) => isPaid || FREE_TECHNIQUE_IDS.has(card.id))
      .filter((card) => keywords.every((keyword) => matchesKeyword(getTechniqueSearchText(card), keyword))),
    [isPaid, keywords],
  );
  const theoryMatches = useMemo(
    () => !keywords.length ? [] : theories
      .filter((theory) => isPaid || FREE_THEORY_ID_SET.has(theory.tagId))
      .filter((theory) => {
        const source = [theory.tagId, theory.title, theory.summary, theory.categoryTitle].filter(Boolean).join(' ').toLocaleLowerCase();
        return keywords.every((keyword) => matchesKeyword(source, keyword));
      }),
    [isPaid, keywords],
  );
  const personaCount = categories.reduce((total, category) => total + category.subcategories.length, 0);
  const techniqueCount = getTechniqueCountTotal();

  return (
    <BookScreen contentContainerStyle={styles.discoverContent}>
      <View style={[styles.searchBox, compact && styles.searchBoxCompact]}>
        <SearchMark />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="処世術・人物像・理論・キーワードを探す"
          placeholderTextColor={colors.muted}
          accessibilityLabel="処世術・人物像・理論・キーワードを検索"
          style={[styles.searchInput, compact && styles.searchInputCompact]}
        />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="検索語を消す" onPress={() => setQuery('')}><AppText style={styles.clear}>消す</AppText></Pressable> : null}
      </View>

      <View accessibilityRole="tablist" style={styles.modeTabs}>
        <ModeTab label={`処世術　${techniqueCount}`} selected={mode === 'techniques'} onPress={() => setMode('techniques')} />
        <ModeTab label={`理論　${theories.length}`} selected={mode === 'theories'} onPress={() => setMode('theories')} />
      </View>

      {keywords.length ? (
        <SearchResults mode={mode} techniqueMatches={techniqueMatches} theoryMatches={theoryMatches} />
      ) : mode === 'techniques' ? (
        <TechniqueBrowser
          router={router}
          compact={compact}
          selectedCategory={selectedCategory}
          showAllPersonas={showAllPersonas}
          personaCount={personaCount}
          techniqueCount={techniqueCount}
          onSelectCategory={(category) => { setSelectedCategory(category); setShowAllPersonas(false); }}
          onShowAllPersonas={() => setShowAllPersonas(true)}
          onSearch={setQuery}
        />
      ) : <TheoryBrowser router={router} compact={compact} />}
    </BookScreen>
  );
}

function SearchMark() {
  return <View accessibilityElementsHidden style={styles.searchMark}><View style={styles.searchLens} /><View style={styles.searchHandle} /></View>;
}

function ModeTab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.modeTab, selected && styles.modeTabActive, pressed && styles.pressed]}>
      <AppText style={[styles.modeText, selected && styles.modeTextActive]}>{label}</AppText>
    </Pressable>
  );
}

function SearchResults({ mode, techniqueMatches, theoryMatches }: { mode: BrowseMode; techniqueMatches: typeof techniqueCards; theoryMatches: typeof theories }) {
  const count = mode === 'techniques' ? techniqueMatches.length : theoryMatches.length;
  return (
    <View testID="discover-search-results" style={styles.searchResults}>
      <SectionHeading title="検索結果" note={`${mode === 'techniques' ? '処世術' : '理論'} ${count}件`} />
      {count ? <View>{mode === 'techniques' ? techniqueMatches.map((card) => <TechniqueRow key={card.id} card={card} />) : theoryMatches.map((theory) => <TheoryArchiveCard key={theory.tagId} theory={theory} />)}</View> : <View style={styles.emptyResult}><AppText style={styles.emptyResultText}>一致するものはありません</AppText></View>}
    </View>
  );
}

function TechniqueBrowser({ router, compact, selectedCategory, showAllPersonas, personaCount, techniqueCount, onSelectCategory, onShowAllPersonas, onSearch }: {
  router: ReturnType<typeof useRouter>;
  compact: boolean;
  selectedCategory: CategoryKey;
  showAllPersonas: boolean;
  personaCount: number;
  techniqueCount: number;
  onSelectCategory: (category: CategoryKey) => void;
  onShowAllPersonas: () => void;
  onSearch: (value: string) => void;
}) {
  const { isPaid } = useAccess();
  const selected = categories.find((category) => category.key === selectedCategory) ?? categories[0];
  const personas = showAllPersonas
    ? categories.flatMap((category) => category.subcategories.map((persona) => ({ category, persona })))
    : selected.subcategories.map((persona) => ({ category: selected, persona }));

  return (
    <View>
      <SectionHeading title="体系から探す" note={`${categoryOrder.length}領域 → ${personaCount}人物像 → ${techniqueCount}処世術`} />
      <View testID="discover-category-grid" style={styles.categoryGrid}>
        {categoryOrder.map((key) => {
          const category = categories.find((item) => item.key === key);
          if (!category) return null;
          const selectedCard = !showAllPersonas && selectedCategory === key;
          const count = getCategoryTechniqueCount(key);
          return (
            <Pressable
              key={key}
              testID={`discover-category-${key}`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCard }}
              accessibilityLabel={`${categoryMeta[key].label}、${category.subcategories.length}人物像、${count}処世術`}
              onPress={() => onSelectCategory(key)}
              style={({ pressed }) => [styles.categoryCard, compact && styles.categoryCardCompact, selectedCard && styles.categoryCardSelected, pressed && styles.pressed]}
            >
              <View style={styles.categoryTopLine}>
                <View style={styles.categoryMark}><AppText style={styles.categoryMarkText}>{categoryMeta[key].mark}</AppText></View>
                {selectedCard ? <View accessibilityLabel="選択中" style={styles.selectedMark}><AppText style={styles.selectedMarkText}>✓</AppText></View> : null}
              </View>
              <AppText style={styles.categoryTitle}>{categoryMeta[key].label}</AppText>
              <AppText style={styles.categoryDescription}>{categoryMeta[key].description}</AppText>
              <AppText style={styles.categoryCount}>{category.subcategories.length}人物像 ／ {count}処世術</AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.personaHeadingRow}>
        <SectionHeading title="人物像から探す" note={showAllPersonas ? '（すべて）' : `（${categoryMeta[selectedCategory].label}）`} inline />
        <Pressable accessibilityRole="button" accessibilityLabel={`${personaCount}人物像を一覧で見る`} onPress={onShowAllPersonas} style={({ pressed }) => [styles.allPersonasLink, pressed && styles.pressed]}>
          <AppText style={styles.allPersonasText}>{personaCount}人物像を一覧で見る　›</AppText>
        </Pressable>
      </View>
      <View testID="discover-persona-grid" style={styles.personaGrid}>
        {personas.map(({ category, persona }) => {
          const locked = !isPaid && !isFreePersona(persona.name);
          return (
            <Pressable
              key={`${category.key}-${persona.name}`}
              accessibilityRole="button"
              accessibilityLabel={`${persona.name}、${persona.items.length}処世術を開く`}
              onPress={() => router.push({ pathname: '/subcategory/[category]/[name]', params: { category: category.key, name: persona.name } })}
              style={({ pressed }) => [styles.personaCard, compact && styles.personaCardCompact, pressed && styles.pressed]}
            >
              <View style={styles.personaIcon}><View style={styles.personaHead} /><View style={styles.personaShoulders} /></View>
              <AppText numberOfLines={2} style={styles.personaTitle}>{persona.name}</AppText>
              <View style={styles.personaFooter}>
                <AppText style={styles.personaCount}>{persona.items.length}処世術</AppText>
                {locked ? <AccessBadge locked compact /> : <AppText style={styles.personaArrow}>›</AppText>}
              </View>
            </Pressable>
          );
        })}
      </View>

      <SectionHeading title="よく見られる検索" />
      <View style={styles.chipGrid}>
        {popularSearches.map((label) => (
          <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}で検索`} onPress={() => onSearch(label)} style={({ pressed }) => [styles.popularChip, compact && styles.popularChipCompact, pressed && styles.pressed]}>
            <AppText style={styles.searchChipText}>{label}</AppText><AppText style={styles.chipSearchIcon}>⌕</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TheoryBrowser({ router, compact }: { router: ReturnType<typeof useRouter>; compact: boolean }) {
  const { isPaid } = useAccess();
  return (
    <View>
      <SectionHeading title="理論から探す" note={`${theoryCategories.length}カテゴリ → ${theories.length}理論`} />
      <View testID="discover-theory-grid" style={styles.theoryGrid}>
        {theoryCategories.map((category) => {
          const count = getTheoryCategoryCount(category.id);
          const freeCount = theories.filter((theory) => theory.categoryId === category.id && FREE_THEORY_ID_SET.has(theory.tagId)).length;
          const partial = !isPaid && freeCount > 0 && freeCount < count;
          const locked = !isPaid && freeCount === 0;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityLabel={`${category.title}、${count}理論を開く`}
              onPress={() => router.push({ pathname: '/theories/[category]', params: { category: category.id } })}
              style={({ pressed }) => [styles.theoryCard, compact && styles.theoryCardCompact, pressed && styles.theoryCardPressed]}
            >
              <View style={styles.theoryMark}><AppText style={styles.theoryMarkText}>{category.mark}</AppText></View>
              <AppText style={styles.theoryTitle}>{category.title}</AppText>
              <View style={styles.theoryFooter}><AppText style={styles.theoryCount}>{count}理論</AppText><AppText style={styles.theoryArrow}>›</AppText></View>
              {locked ? <View testID="discover-theory-locked-badge" style={styles.browserLock}><AccessBadge locked compact /></View> : partial ? <View testID="discover-theory-partial-badge" style={styles.browserLock}><AppText style={styles.partialBadgeText}>一部無料</AppText></View> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SectionHeading({ title, note, inline = false }: { title: string; note?: string; inline?: boolean }) {
  return <View style={[styles.sectionHeading, inline && styles.sectionHeadingInline]}><AppText style={styles.sectionTitle}>{title}</AppText>{note ? <AppText style={styles.sectionNote}>{note}</AppText> : null}</View>;
}

const styles = StyleSheet.create({
  discoverContent: { paddingBottom: spacing.xl * 2 },
  searchBox: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.78)' },
  searchBoxCompact: { minHeight: 52, paddingHorizontal: spacing.md, gap: 10 },
  searchMark: { position: 'relative', width: 21, height: 23 },
  searchLens: { width: 15, height: 15, borderWidth: 1.5, borderColor: colors.gold, borderRadius: 8 },
  searchHandle: { position: 'absolute', width: 8, height: 1.5, left: 12, top: 15, borderRadius: 1, backgroundColor: colors.gold, transform: [{ rotate: '-48deg' }] },
  searchInput: { flex: 1, minWidth: 0, minHeight: 54, color: colors.ink, fontFamily: fonts.serif, fontSize: 16 },
  searchInputCompact: { minHeight: 50, fontSize: 13 },
  clear: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  modeTabs: { flexDirection: 'row', width: '100%', maxWidth: 560, alignSelf: 'center', marginTop: spacing.md, padding: 4, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  modeTab: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  modeTabActive: { backgroundColor: colors.charcoal },
  modeText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 14, fontWeight: '600' },
  modeTextActive: { color: colors.goldLight },
  searchResults: { marginTop: spacing.sm },
  emptyResult: { minHeight: 160, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  emptyResultText: { color: colors.muted, fontFamily: fonts.serif, fontSize: 14 },
  sectionHeading: { minHeight: 34, marginTop: spacing.xl, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.md },
  sectionHeadingInline: { flex: 1, minWidth: 0, marginBottom: spacing.md },
  sectionTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 21, lineHeight: 30, fontWeight: '600', letterSpacing: 1.2 },
  sectionNote: { color: colors.muted, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  categoryCard: { position: 'relative', flex: 1, flexBasis: 260, minHeight: 188, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.72)', alignItems: 'center', justifyContent: 'center' },
  categoryCardCompact: { flexBasis: '100%', width: '100%', minHeight: 164 },
  categoryCardSelected: { borderColor: colors.gold, backgroundColor: colors.surface },
  categoryTopLine: { position: 'relative', width: '100%', alignItems: 'center' },
  categoryMark: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  categoryMarkText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, fontWeight: '600' },
  selectedMark: { position: 'absolute', right: 0, top: -3, width: 21, height: 21, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold },
  selectedMarkText: { color: colors.surface, fontSize: 11, lineHeight: 14, fontWeight: '700' },
  categoryTitle: { marginTop: 10, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 27, fontWeight: '600', letterSpacing: 1.2 },
  categoryDescription: { marginTop: 4, color: colors.muted, fontSize: 11, lineHeight: 18, textAlign: 'center' },
  categoryCount: { marginTop: 10, color: colors.gold, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  personaHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  allPersonasLink: { minHeight: 40, marginTop: spacing.xl, marginBottom: spacing.md, justifyContent: 'center' },
  allPersonasText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18, fontWeight: '600' },
  personaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  personaCard: { flexGrow: 1, flexBasis: 172, minWidth: 0, minHeight: 150, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.64)', alignItems: 'center', justifyContent: 'center' },
  personaCardCompact: { flexBasis: '47%', minHeight: 142, paddingHorizontal: 9 },
  personaIcon: { width: 43, height: 43, borderRadius: 22, backgroundColor: colors.paperDeep, alignItems: 'center', justifyContent: 'center' },
  personaHead: { width: 10, height: 10, borderWidth: 1.2, borderColor: colors.inkSoft, borderRadius: 5, marginBottom: 4 },
  personaShoulders: { width: 20, height: 10, borderTopWidth: 1.2, borderLeftWidth: 1.2, borderRightWidth: 1.2, borderColor: colors.inkSoft, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  personaTitle: { minHeight: 43, marginTop: 8, color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  personaFooter: { width: '100%', minHeight: 22, marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  personaCount: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 11, lineHeight: 17 },
  personaArrow: { color: colors.gold, fontSize: 22, lineHeight: 22 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  popularChip: { flexGrow: 1, flexBasis: '22%', minHeight: 42, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.62)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  popularChipCompact: { flexBasis: '45%' },
  searchChipText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  chipSearchIcon: { color: colors.inkSoft, fontSize: 16, lineHeight: 18 },
  theoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  theoryCard: { position: 'relative', flexGrow: 1, flexBasis: 280, minHeight: 178, padding: spacing.lg, borderWidth: 1, borderColor: '#A77A25', borderRadius: radius.md, backgroundColor: '#1B1A17', alignItems: 'center', justifyContent: 'center' },
  theoryCardCompact: { flexBasis: '46%', minHeight: 164, paddingHorizontal: 10 },
  theoryCardPressed: { opacity: 0.88, transform: [{ translateY: -1 }] },
  theoryMark: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#C5A45D', backgroundColor: '#121210', alignItems: 'center', justifyContent: 'center' },
  theoryMarkText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, fontWeight: '600' },
  theoryTitle: { minHeight: 42, marginTop: 10, color: colors.paper, fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  theoryFooter: { width: '100%', marginTop: 5, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(196,148,50,0.28)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  theoryCount: { color: '#D7CCB8', fontSize: 11, lineHeight: 17 },
  theoryArrow: { color: colors.goldLight, fontSize: 22, lineHeight: 22 },
  browserLock: { position: 'absolute', top: 10, right: 10 },
  partialBadgeText: { color: colors.goldLight, fontSize: 9, lineHeight: 14, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: '#211F1A' },
  pressed: { opacity: 0.74 },
});
