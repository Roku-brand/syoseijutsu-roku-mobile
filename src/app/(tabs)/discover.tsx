import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { getPersonaCount, getPersonaEntries, getPersonaFilterLabel, PersonaCard, PersonaFilterBar, type PersonaFilterKey } from '@/components/persona-catalog';
import { TheoryBrowseCard, TheoryFilterBar, theoryFilterOptions, type TheoryFilterKey } from '@/components/theory-catalog';
import { TechniqueRow } from '@/components/technique-row';
import { TheoryArchiveCard } from '@/components/theory-archive-card';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueCards, theories } from '@/data/catalog';
import { isLockedTheoryShell } from '@/data/theory-display';
import { getTechniqueSearchText } from '@/data/technique-tags';
import { useAccess } from '@/access/access-state';
import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '@/access/access-config';
import { getTechniqueCountTotal } from '@/data/technique-counts';
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
const popularTheorySearches = ['初頭効果', 'ピーク・エンドの法則', 'ハビットループ', '認知的不協和', '損失回避の法則', '80対20の法則'];

function matchesKeyword(source: string, keyword: string) {
  return (searchAliases[keyword] ?? [keyword]).some((term) => source.includes(term));
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<BrowseMode>('techniques');
  const [selectedCategory, setSelectedCategory] = useState<PersonaFilterKey>('all');
  const [selectedTheoryCategory, setSelectedTheoryCategory] = useState<TheoryFilterKey>('all');
  const { isPaid, catalogRevision } = useAccess();
  const keywords = useMemo(() => query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean), [query]);
  const techniqueMatches = useMemo(
    () => !keywords.length ? [] : techniqueCards
      .filter((card) => isPaid || FREE_TECHNIQUE_IDS.has(card.id))
      .filter((card) => keywords.every((keyword) => matchesKeyword(getTechniqueSearchText(card), keyword))),
    [catalogRevision, isPaid, keywords],
  );
  const theoryMatches = useMemo(
    () => !keywords.length ? [] : theories
      .filter((theory) => !isLockedTheoryShell(theory))
      .filter((theory) => isPaid || FREE_THEORY_ID_SET.has(theory.tagId))
      .filter((theory) => {
        const source = [theory.tagId, theory.title, theory.summary, theory.categoryTitle].filter(Boolean).join(' ').toLocaleLowerCase();
        return keywords.every((keyword) => matchesKeyword(source, keyword));
      }),
    [catalogRevision, isPaid, keywords],
  );
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
          onSelectCategory={setSelectedCategory}
          onSearch={setQuery}
        />
      ) : <TheoryBrowser router={router} compact={compact} selectedCategory={selectedTheoryCategory} onSelectCategory={setSelectedTheoryCategory} onSearch={setQuery} />}
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

function TechniqueBrowser({ router, compact, selectedCategory, onSelectCategory, onSearch }: {
  router: ReturnType<typeof useRouter>;
  compact: boolean;
  selectedCategory: PersonaFilterKey;
  onSelectCategory: (category: PersonaFilterKey) => void;
  onSearch: (value: string) => void;
}) {
  const railRef = useRef<ScrollView>(null);
  const personaCount = getPersonaCount();
  const [rail, setRail] = useState({ x: 0, viewport: 0, content: 0 });
  const personas = getPersonaEntries(selectedCategory);
  const atStart = rail.x <= 2;
  const atEnd = rail.content <= rail.viewport + 2 || rail.x >= rail.content - rail.viewport - 2;

  useEffect(() => {
    railRef.current?.scrollTo({ x: 0, animated: false });
    setRail((current) => ({ ...current, x: 0 }));
  }, [selectedCategory]);

  const moveRail = (direction: -1 | 1) => {
    const step = Math.max(320, rail.viewport * 0.82);
    const next = Math.max(0, Math.min(rail.content - rail.viewport, rail.x + direction * step));
    railRef.current?.scrollTo({ x: next, animated: true });
  };

  const onRailScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setRail((current) => ({ ...current, x: event.nativeEvent.contentOffset.x }));
  };

  return (
    <View>
      <View style={styles.filterIntroduction}>
        <View style={styles.filterLine} />
        <AppText style={styles.filterLabel}>処世術のカテゴリから絞り込む</AppText>
        <View style={styles.filterLine} />
      </View>
      <PersonaFilterBar selected={selectedCategory} onSelect={onSelectCategory} />

      <View style={styles.personaHeadingRow}>
        <SectionHeading title="人物像から探す" note={`（${getPersonaFilterLabel(selectedCategory)}）`} inline />
        <Pressable accessibilityRole="link" accessibilityLabel={`${personaCount}人物像を一覧で見る`} onPress={() => router.push('/personas')} style={({ pressed }) => [styles.allPersonasLink, pressed && styles.pressed]}>
          <AppText style={styles.allPersonasText}>{personaCount}人物像を一覧で見る　›</AppText>
        </Pressable>
      </View>
      <View style={styles.personaRailFrame}>
        {!compact ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="前の人物像へ"
            accessibilityState={{ disabled: atStart }}
            disabled={atStart}
            onPress={() => moveRail(-1)}
            style={({ pressed }) => [styles.railArrow, styles.railArrowPrevious, atStart && styles.railArrowDisabled, pressed && styles.pressed]}
          >
            <AppText style={styles.railArrowText}>‹</AppText>
          </Pressable>
        ) : null}
        <ScrollView
          ref={railRef}
          horizontal
          testID="discover-persona-rail"
          accessibilityLabel="人物像の横スクロール一覧"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onRailScroll}
          onLayout={(event) => setRail((current) => ({ ...current, viewport: event.nativeEvent.layout.width }))}
          onContentSizeChange={(content) => setRail((current) => ({ ...current, content }))}
          contentContainerStyle={[styles.personaRail, !compact && styles.personaRailDesktop]}
        >
          {personas.map((entry) => <PersonaCard key={`${entry.category.key}-${entry.persona.name}`} entry={entry} variant="rail" compact={compact} />)}
        </ScrollView>
        {!compact ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="次の人物像へ"
            accessibilityState={{ disabled: atEnd }}
            disabled={atEnd}
            onPress={() => moveRail(1)}
            style={({ pressed }) => [styles.railArrow, styles.railArrowNext, atEnd && styles.railArrowDisabled, pressed && styles.pressed]}
          >
            <AppText style={styles.railArrowText}>›</AppText>
          </Pressable>
        ) : null}
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

function TheoryBrowser({ router, compact, selectedCategory, onSelectCategory, onSearch }: {
  router: ReturnType<typeof useRouter>;
  compact: boolean;
  selectedCategory: TheoryFilterKey;
  onSelectCategory: (category: TheoryFilterKey) => void;
  onSearch: (value: string) => void;
}) {
  const { isPaid } = useAccess();
  const railRef = useRef<ScrollView>(null);
  const [rail, setRail] = useState({ x: 0, viewport: 0, content: 0 });
  const visibleTheories = theories
    .filter((theory) => !isLockedTheoryShell(theory))
    .filter((theory) => isPaid || FREE_THEORY_ID_SET.has(theory.tagId))
    .filter((theory) => selectedCategory === 'all' || theory.categoryId === selectedCategory)
    .slice(0, 24);
  const atStart = rail.x <= 2;
  const atEnd = rail.content <= rail.viewport + 2 || rail.x >= rail.content - rail.viewport - 2;

  useEffect(() => {
    railRef.current?.scrollTo({ x: 0, animated: false });
    setRail((current) => ({ ...current, x: 0 }));
  }, [selectedCategory]);

  const moveRail = (direction: -1 | 1) => {
    const step = Math.max(320, rail.viewport * 0.82);
    const next = Math.max(0, Math.min(rail.content - rail.viewport, rail.x + direction * step));
    railRef.current?.scrollTo({ x: next, animated: true });
  };

  return (
    <View>
      <View style={styles.filterIntroduction}>
        <View style={styles.filterLine} />
        <AppText style={styles.filterLabel}>理論のカテゴリから絞り込む</AppText>
        <View style={styles.filterLine} />
      </View>
      <TheoryFilterBar selected={selectedCategory} onSelect={onSelectCategory} />

      <View style={styles.personaHeadingRow}>
        <SectionHeading title="理論から探す" note={`（${theoryFilterOptions.find((option) => option.key === selectedCategory)?.label ?? 'すべて'}）`} inline />
        <Pressable accessibilityRole="link" accessibilityLabel={`${theories.length}理論を一覧で見る`} onPress={() => router.push('/theories')} style={({ pressed }) => [styles.allPersonasLink, pressed && styles.pressed]}>
          <AppText style={styles.allPersonasText}>{theories.length}理論を一覧で見る　›</AppText>
        </Pressable>
      </View>

      {visibleTheories.length ? (
        <View style={styles.personaRailFrame}>
          {!compact ? <Pressable accessibilityRole="button" accessibilityLabel="前の理論へ" disabled={atStart} onPress={() => moveRail(-1)} style={({ pressed }) => [styles.railArrow, styles.railArrowPrevious, styles.theoryRailArrow, atStart && styles.railArrowDisabled, pressed && styles.pressed]}><AppText style={styles.railArrowText}>‹</AppText></Pressable> : null}
          <ScrollView
            ref={railRef}
            horizontal
            testID="discover-theory-rail"
            accessibilityLabel="理論の横スクロール一覧"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(event) => setRail((current) => ({ ...current, x: event.nativeEvent.contentOffset.x }))}
            onLayout={(event) => setRail((current) => ({ ...current, viewport: event.nativeEvent.layout.width }))}
            onContentSizeChange={(content) => setRail((current) => ({ ...current, content }))}
            contentContainerStyle={[styles.personaRail, !compact && styles.personaRailDesktop]}
          >
            {visibleTheories.map((theory) => <TheoryBrowseCard key={theory.tagId} theory={theory} compact={compact} />)}
          </ScrollView>
          {!compact ? <Pressable accessibilityRole="button" accessibilityLabel="次の理論へ" disabled={atEnd} onPress={() => moveRail(1)} style={({ pressed }) => [styles.railArrow, styles.railArrowNext, styles.theoryRailArrow, atEnd && styles.railArrowDisabled, pressed && styles.pressed]}><AppText style={styles.railArrowText}>›</AppText></Pressable> : null}
        </View>
      ) : <View style={styles.emptyResult}><AppText style={styles.emptyResultText}>このカテゴリで閲覧できる理論はありません</AppText></View>}

      <SectionHeading title="よく見られる検索" />
      <View style={styles.chipGrid}>
        {popularTheorySearches.map((label) => (
          <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}で検索`} onPress={() => onSearch(label)} style={({ pressed }) => [styles.popularChip, compact && styles.popularChipCompact, pressed && styles.pressed]}>
            <AppText style={styles.chipSearchIcon}>⌕</AppText><AppText style={styles.searchChipText}>{label}</AppText>
          </Pressable>
        ))}
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
  modeTabs: { flexDirection: 'row', width: '100%', maxWidth: 660, alignSelf: 'center', marginTop: spacing.md, padding: 4, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  modeTab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
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
  filterIntroduction: { maxWidth: 740, width: '100%', alignSelf: 'center', marginTop: spacing.lg, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  filterLine: { flex: 1, height: 1, backgroundColor: colors.line },
  filterLabel: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 12, lineHeight: 19, letterSpacing: 0.8, textAlign: 'center' },
  personaHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  allPersonasLink: { minHeight: 40, marginTop: spacing.xl, marginBottom: spacing.md, justifyContent: 'center' },
  allPersonasText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18, fontWeight: '600' },
  personaRailFrame: { position: 'relative', marginHorizontal: -2 },
  personaRail: { gap: 12, paddingHorizontal: 2, paddingBottom: 3 },
  personaRailDesktop: { paddingHorizontal: 24 },
  railArrow: { position: 'absolute', top: 66, zIndex: 2, width: 44, height: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  railArrowPrevious: { left: -8 },
  railArrowNext: { right: -8 },
  railArrowDisabled: { opacity: 0.28 },
  railArrowText: { marginTop: -2, color: colors.ink, fontFamily: fonts.serif, fontSize: 31, lineHeight: 34 },
  theoryRailArrow: { top: 138 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  popularChip: { flexGrow: 1, flexBasis: '22%', minHeight: 42, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.62)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  popularChipCompact: { flexBasis: '45%' },
  searchChipText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  chipSearchIcon: { color: colors.inkSoft, fontSize: 16, lineHeight: 18 },
  pressed: { opacity: 0.74 },
});
