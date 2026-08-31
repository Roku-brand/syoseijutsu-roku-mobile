import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { FREE_THEORY_ID_SET } from '@/access/access-config';
import { BookScreen } from '@/components/book-ui';
import { SearchMark } from '@/components/search-mark';
import { TheoryFilterBar, theoryFilterOptions, type TheoryFilterKey } from '@/components/theory-catalog';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getTheoryDisplayId, theories } from '@/data/catalog';
import { getTheoryCategoryLabel, getTheoryCoverSummary, isLockedTheoryShell, normalizeDisplayText } from '@/data/theory-display';
import type { TheoryCard } from '@/data/types';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

type SortKey = 'source' | 'alpha';
const PAGE_SIZE = 50;

function safeCategory(value: string | undefined): TheoryFilterKey {
  return theoryFilterOptions.some((option) => option.key === value) ? value as TheoryFilterKey : 'all';
}

function pageItems(current: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const values = new Set([1, total, current - 1, current, current + 1].filter((value) => value >= 1 && value <= total));
  const ordered = [...values].sort((left, right) => left - right);
  const result: Array<number | 'ellipsis'> = [];
  ordered.forEach((value, index) => {
    if (index && value - ordered[index - 1] > 1) result.push('ellipsis');
    result.push(value);
  });
  return result;
}

export default function TheoryIndexScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string; sort?: string; page?: string }>();
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const { isPaid, accessState, catalogRevision } = useAccess();
  const browserSearch = Platform.OS === 'web' && typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search)
    : undefined;
  const [query, setQuery] = useState(browserSearch?.get('q') ?? (typeof params.q === 'string' ? params.q : ''));
  const [category, setCategory] = useState<TheoryFilterKey>(safeCategory(browserSearch?.get('category') ?? params.category));
  const [sort, setSort] = useState<SortKey>((browserSearch?.get('sort') ?? params.sort) === 'alpha' ? 'alpha' : 'source');
  const [page, setPage] = useState(Math.max(1, Number(browserSearch?.get('page') ?? params.page) || 1));
  const [urlReady] = useState(Platform.OS !== 'web' || typeof window !== 'undefined');

  const visibleCatalog = useMemo(
    () => theories
      .filter((theory) => !isLockedTheoryShell(theory))
      .filter((theory) => isPaid || FREE_THEORY_ID_SET.has(theory.tagId)),
    [catalogRevision, isPaid],
  );
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const matched = visibleCatalog.filter((theory) => {
      if (category !== 'all' && theory.categoryId !== category) return false;
      if (!term) return true;
      const searchText = [
        theory.tagId,
        getTheoryDisplayId(theory),
        theory.title,
        theory.summary,
        theory.categoryTitle,
        getTheoryCategoryLabel(theory),
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return searchText.includes(term);
    });
    return sort === 'alpha'
      ? [...matched].sort((left, right) => left.title.localeCompare(right.title, 'ja'))
      : matched;
  }, [category, query, sort, visibleCatalog]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageTheories = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  useEffect(() => {
    if (!urlReady) return;
    const timer = setTimeout(() => {
      router.setParams({ q: query || '', category, sort, page: String(safePage) });
    }, 250);
    return () => clearTimeout(timer);
  }, [category, query, router, safePage, sort, urlReady]);

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
    setSort('source');
    setPage(1);
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <AppText accessibilityRole="header" aria-level={1} style={[styles.title, compact && styles.titleCompact]}>理論一覧</AppText>
        <AppText style={styles.subtitle}>{theories.length}理論</AppText>
      </View>

      <View style={styles.tools}>
        <View style={styles.searchBox}>
          <SearchMark />
          <TextInput
            value={query}
            onChangeText={(value) => { setQuery(value); setPage(1); }}
            accessibilityLabel="理論名・キーワードから検索"
            placeholder="理論名・キーワードから検索"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {query ? <Pressable accessibilityRole="button" accessibilityLabel="理論検索を消す" onPress={() => { setQuery(''); setPage(1); }}><AppText style={styles.clearText}>消す</AppText></Pressable> : null}
        </View>
        <TheoryFilterBar selected={category} onSelect={(value) => { setCategory(value); setPage(1); }} />
        <View accessibilityRole="tablist" style={styles.sortRow}>
          {[{ key: 'source', label: '登録順' }, { key: 'alpha', label: 'あいうえお順' }].map((option) => {
            const active = sort === option.key;
            return <Pressable key={option.key} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => { setSort(option.key as SortKey); setPage(1); }} style={[styles.sortButton, active && styles.sortButtonActive]}><AppText style={[styles.sortText, active && styles.sortTextActive]}>{option.label}</AppText></Pressable>;
          })}
        </View>
      </View>

      <View style={styles.resultHeading}>
        <AppText style={styles.resultTitle}>{isPaid ? `${filtered.length}件` : `${filtered.length}件を無料公開`}</AppText>
        {!isPaid ? <AppText style={styles.totalNote}>全{theories.length}理論</AppText> : null}
      </View>

      {accessState === 'checking' ? <TheoryListSkeleton /> : pageTheories.length ? (
        <View testID="theory-index-list" style={styles.list}>
          {pageTheories.map((theory) => <TheoryIndexRow key={theory.tagId} theory={theory} compact={compact} />)}
        </View>
      ) : (
        <View style={styles.empty}>
          <AppText style={styles.emptyTitle}>該当する理論が見つかりませんでした。</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="理論一覧の条件を解除" onPress={resetFilters} style={styles.resetButton}><AppText style={styles.resetText}>検索とカテゴリを解除</AppText></Pressable>
        </View>
      )}

      {filtered.length > PAGE_SIZE ? (
        <View accessibilityLabel="理論一覧のページ選択" style={styles.pagination}>
          {pageItems(safePage, totalPages).map((item, index) => item === 'ellipsis'
            ? <AppText key={`ellipsis-${index}`} style={styles.ellipsis}>…</AppText>
            : <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${item}ページ目`} accessibilityState={{ selected: item === safePage }} onPress={() => setPage(item)} style={[styles.pageButton, item === safePage && styles.pageButtonActive]}><AppText style={[styles.pageText, item === safePage && styles.pageTextActive]}>{item}</AppText></Pressable>)}
        </View>
      ) : null}

      {!isPaid && theories.length > visibleCatalog.length ? (
        <View style={styles.upgradePanel}>
          <AppText style={styles.upgradeTitle}>完全版では全{theories.length}理論を検索できます</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="理論一覧の完全版を見る" onPress={() => router.push({ pathname: '/upgrade', params: { source: 'discover_theory' } })} style={styles.upgradeButton}><AppText style={styles.upgradeButtonText}>完全版を見る　›</AppText></Pressable>
        </View>
      ) : null}
    </BookScreen>
  );
}

function TheoryIndexRow({ theory, compact }: { theory: TheoryCard; compact: boolean }) {
  const rowStyle = StyleSheet.flatten([styles.row, compact && styles.rowCompact]);
  return (
    <Link href={{ pathname: '/theory/[id]', params: { id: theory.tagId } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${theory.title}を開く`} style={rowStyle}>
        <View style={styles.rowMeta}><AppText style={styles.rowCode}>{getTheoryDisplayId(theory)}</AppText><AppText style={styles.rowCategory}>{getTheoryCategoryLabel(theory)}</AppText></View>
        <AppText numberOfLines={2} style={styles.rowTitle}>{normalizeDisplayText(theory.title)}</AppText>
        <AppText numberOfLines={2} style={styles.rowSummary}>{getTheoryCoverSummary(theory.summary)}</AppText>
        <AppText style={styles.rowArrow}>›</AppText>
      </Pressable>
    </Link>
  );
}

function TheoryListSkeleton() {
  return <View testID="theory-index-loading" style={styles.list}>{Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.row, styles.skeletonRow]}><View style={styles.skeletonLineShort} /><View style={styles.skeletonLine} /><View style={styles.skeletonLineWide} /></View>)}</View>;
}

const styles = StyleSheet.create({
  content: { maxWidth: 1260, paddingBottom: spacing.xl * 2 },
  intro: { alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 42, fontWeight: '600', letterSpacing: 2 },
  titleCompact: { fontSize: 25, lineHeight: 36 },
  subtitle: { marginTop: 3, color: colors.gold, fontFamily: fonts.serif, fontSize: 12, lineHeight: 19 },
  tools: { marginTop: spacing.xl, gap: spacing.md },
  searchBox: { minHeight: 68, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.75)' },
  searchInput: { flex: 1, minWidth: 0, minHeight: 66, padding: 0, margin: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 14 },
  clearText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  sortRow: { flexDirection: 'row', gap: spacing.sm },
  sortButton: { minHeight: 48, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  sortButtonActive: { borderColor: '#10263F', backgroundColor: '#10263F' },
  sortText: { color: colors.inkSoft, fontSize: 11, fontWeight: '700' },
  sortTextActive: { color: colors.goldLight },
  resultHeading: { marginTop: spacing.xl, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  resultTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '600' },
  totalNote: { color: colors.gold, fontSize: 11 },
  list: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 12 },
  row: { position: 'relative', width: '48%', maxWidth: '49.4%', flexGrow: 1, flexShrink: 0, flexBasis: '48%', minHeight: 176, padding: 20, paddingRight: 46, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.78)' },
  rowCompact: { width: '100%', maxWidth: '100%', flexBasis: '100%', minHeight: 156 },
  rowMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  rowCode: { color: colors.gold, fontSize: 10, lineHeight: 16, fontWeight: '700' },
  rowCategory: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  rowTitle: { marginTop: 7, color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  rowSummary: { marginTop: 7, color: colors.inkSoft, fontSize: 12, lineHeight: 20 },
  rowArrow: { position: 'absolute', right: 17, top: '50%', marginTop: -15, color: colors.gold, fontSize: 27, lineHeight: 30 },
  empty: { minHeight: 200, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
  emptyTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 24, textAlign: 'center' },
  resetButton: { minHeight: 40, marginTop: spacing.md, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, justifyContent: 'center' },
  resetText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  pagination: { marginTop: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 7 },
  pageButton: { width: 38, height: 38, borderWidth: 1, borderColor: colors.line, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  pageButtonActive: { borderColor: '#10263F', backgroundColor: '#10263F' },
  pageText: { color: colors.inkSoft, fontSize: 11 },
  pageTextActive: { color: colors.goldLight, fontWeight: '700' },
  ellipsis: { color: colors.muted, paddingHorizontal: 3 },
  upgradePanel: { marginTop: spacing.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, backgroundColor: '#171714', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  upgradeTitle: { flex: 1, minWidth: 220, color: '#F0D99D', fontFamily: fonts.serif, fontSize: 14, lineHeight: 22 },
  upgradeButton: { minHeight: 40, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: '#C9AB68', borderRadius: radius.pill, justifyContent: 'center' },
  upgradeButtonText: { color: '#F0D99D', fontSize: 11, fontWeight: '700' },
  skeletonRow: { overflow: 'hidden', opacity: 0.55 },
  skeletonLineShort: { width: 72, height: 9, borderRadius: 5, backgroundColor: colors.paperDeep },
  skeletonLine: { width: '58%', height: 16, marginTop: 14, borderRadius: 6, backgroundColor: colors.paperDeep },
  skeletonLineWide: { width: '86%', height: 10, marginTop: 12, borderRadius: 5, backgroundColor: colors.paperDeep },
  pressed: { opacity: 0.72 },
});
