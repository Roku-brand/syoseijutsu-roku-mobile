import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { FREE_THEORY_ID_SET } from '@/access/access-config';
import { BookScreen } from '@/components/book-ui';
import { getTheoryFilterOptions, TheoryFilterBar, type TheoryFilterKey } from '@/components/theory-catalog';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getTheoryDisplayId, theories } from '@/data/catalog';
import { getTheoryCoverSummary, isLockedTheoryShell, normalizeDisplayText } from '@/data/theory-display';
import type { TheoryCard } from '@/data/types';
import { groupTheorySections, resolveTheorySubcategoryId } from '@/data/theory-taxonomy';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

const PAGE_SIZE = 100;

function safeCategory(value: string | undefined): TheoryFilterKey {
  return getTheoryFilterOptions().some((option) => option.key === value) ? value as TheoryFilterKey : 'all';
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
  const params = useLocalSearchParams<{ category?: string; subcategory?: string; page?: string }>();
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const { isPaid, accessState, catalogRevision } = useAccess();
  const requestedCategory = params.category;
  const requestedPage = params.page;
  const [category, setCategory] = useState<TheoryFilterKey>(safeCategory(requestedCategory));
  const [page, setPage] = useState(Math.max(1, Math.floor(Number(requestedPage)) || 1));

  const visibleCatalog = useMemo(
    () => theories.filter((theory) => isPaid || FREE_THEORY_ID_SET.has(theory.tagId) || isLockedTheoryShell(theory)),
    [catalogRevision, isPaid],
  );
  const filtered = useMemo(
    () => visibleCatalog.filter((theory) => category === 'all' || theory.categoryId === category),
    [category, visibleCatalog],
  );
  const subcategories = groupTheorySections(filtered);
  const requestedSubcategory = resolveTheorySubcategoryId(params.subcategory);
  const subcategory = category !== 'all' && subcategories.some(section => section.subcategoryId === requestedSubcategory) ? requestedSubcategory : undefined;
  const selectedTheories = subcategory ? filtered.filter(theory => theory.subcategoryId === subcategory) : filtered;
  const paginated = category === 'all';
  const totalPages = paginated ? Math.max(1, Math.ceil(selectedTheories.length / PAGE_SIZE)) : 1;
  const safePage = Math.min(page, totalPages);
  const pageTheories = paginated ? selectedTheories.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : selectedTheories;

  useEffect(() => {
    setCategory(safeCategory(requestedCategory));
    setPage(Math.max(1, Math.floor(Number(requestedPage)) || 1));
  }, [requestedCategory, requestedPage]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const selectCategory = (value: TheoryFilterKey) => {
    setCategory(value);
    setPage(1);
    router.setParams({ category: value === 'all' ? undefined : value, subcategory: undefined, page: undefined });
  };
  const selectSubcategory = (id?: string) => {
    setPage(1);
    router.setParams({ category, subcategory: id, page: undefined });
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.filters}>
        <TheoryFilterBar selected={category} onSelect={selectCategory} />
        {category !== 'all' ? <View testID="theory-subcategory-filters" style={styles.subcategoryFilters}>
          <AppText style={styles.subcategoryLabel}>内部分類</AppText>
          <View style={styles.subcategoryOptions}>
            {[{ subcategoryId: undefined, title: 'すべて', items: filtered }, ...subcategories].map(section => <Pressable key={section.subcategoryId ?? 'all'} accessibilityRole="button" accessibilityLabel={`${section.title}で内部分類を絞り込む`} accessibilityState={{ selected: section.subcategoryId === subcategory }} aria-selected={section.subcategoryId === subcategory} onPress={() => selectSubcategory(section.subcategoryId)} style={({ pressed }) => [styles.subcategoryButton, { width: compact ? '48%' : '31.5%' }, section.subcategoryId === subcategory && styles.subcategoryActive, pressed && styles.filterPressed]}><AppText style={[styles.subcategoryText, section.subcategoryId === subcategory && styles.subcategoryTextActive]}>{section.title}</AppText><AppText style={[styles.subcategoryCount, section.subcategoryId === subcategory && styles.subcategoryTextActive]}>{section.items.length}件収録</AppText></Pressable>)}
          </View>
        </View> : null}
      </View>

      <View style={styles.resultHeading}>
        <AppText style={styles.resultTitle}>{selectedTheories.length}件</AppText>
        {!isPaid ? <AppText style={styles.totalNote}>{FREE_THEORY_ID_SET.size}件を無料公開</AppText> : null}
      </View>

      {paginated && selectedTheories.length > PAGE_SIZE ? (
        <View testID="theory-index-pagination" accessibilityLabel="理論一覧のページ選択" style={styles.pagination}>
          {pageItems(safePage, totalPages).map((item, index) => item === 'ellipsis'
            ? <AppText key={`ellipsis-${index}`} style={styles.ellipsis}>…</AppText>
            : <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${item}ページ目`} accessibilityState={{ selected: item === safePage }} aria-selected={item === safePage} onPress={() => { setPage(item); router.setParams({ category: category === 'all' ? undefined : category, subcategory, page: String(item) }); }} style={[styles.pageButton, item === safePage && styles.pageButtonActive]}><AppText style={[styles.pageText, item === safePage && styles.pageTextActive]}>{item}</AppText></Pressable>)}
        </View>
      ) : null}

      {accessState === 'checking' ? <TheoryListSkeleton /> : pageTheories.length ? (
        <View testID="theory-index-list" style={styles.list}>
          {groupTheorySections(pageTheories).map((section,index,sections) => <View key={`${section.categoryId}:${section.subcategoryId}`} style={styles.section}>
            {index === 0 || sections[index-1].categoryId !== section.categoryId ? <AppText accessibilityRole="header" aria-level={2} style={styles.majorHeading}>{section.categoryTitle}</AppText> : null}
            <View style={styles.subHeading}><AppText accessibilityRole="header" aria-level={3} style={styles.subTitle}>{section.title}</AppText><AppText style={styles.totalNote}>{filtered.filter(t=>t.subcategoryId===section.subcategoryId).length}件</AppText></View>
            {section.items.map(theory=><TheoryIndexRow key={theory.tagId} theory={theory} compact={compact} />)}
          </View>)}
        </View>
      ) : (
        <View style={styles.empty}><AppText style={styles.emptyTitle}>この分類の理論はまだありません。</AppText></View>
      )}
    </BookScreen>
  );
}

function TheoryIndexRow({ theory, compact }: { theory: TheoryCard; compact: boolean }) {
  return (
    <Link href={{ pathname: '/theory/[id]', params: { id: theory.tagId } }} asChild style={[styles.row, compact && styles.rowCompact]}>
      <Pressable testID="theory-index-row-card" accessibilityRole="link" accessibilityLabel={`${theory.title}を開く`}>
        <View style={[styles.idColumn, compact && styles.idColumnCompact]}><AppText style={styles.rowCode}>{getTheoryDisplayId(theory)}</AppText></View>
        <View style={styles.rowCopy}>
          <AppText numberOfLines={2} style={[styles.rowTitle, compact && styles.rowTitleCompact]}>{normalizeDisplayText(theory.title)}</AppText>
          <AppText numberOfLines={compact ? 3 : 2} style={styles.rowSummary}>{getTheoryCoverSummary(theory.summary)}</AppText>
        </View>
        <AppText style={styles.rowArrow}>›</AppText>
      </Pressable>
    </Link>
  );
}

function TheoryListSkeleton() {
  return <View testID="theory-index-loading" style={styles.list}>{Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.row, styles.skeletonRow]}><View style={styles.skeletonCode} /><View style={styles.rowCopy}><View style={styles.skeletonLine} /><View style={styles.skeletonLineWide} /></View></View>)}</View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', paddingBottom: spacing.xl * 3 },
  filters: { marginTop: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  subcategoryFilters: { marginTop: spacing.md, gap: 8 },
  subcategoryLabel: { color: colors.inkSoft, fontSize: 13, fontWeight: '600' },
  subcategoryOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  subcategoryButton: { minHeight: 66, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center', borderWidth: 1, borderColor: '#C9B99F', borderRadius: 4, backgroundColor: colors.surface },
  subcategoryActive: { backgroundColor: colors.goldDeep, borderColor: colors.goldDeep },
  subcategoryText: { color: colors.inkSoft, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  subcategoryCount: { marginTop: 3, color: colors.muted, fontSize: 11, lineHeight: 16 },
  filterPressed: { opacity: 0.8 },
  subcategoryTextActive: { color: colors.white },
  resultHeading: { marginTop: spacing.xl, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  resultTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 37, fontWeight: '600' },
  totalNote: { color: colors.goldDeep, fontSize: 11, lineHeight: 18 },
  list: { width: '100%', gap: 12 },
  section: { width: '100%', gap: 12, marginBottom: spacing.lg },
  majorHeading: { color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 36, marginTop: spacing.md },
  subHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gold },
  subTitle: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, fontWeight: '600' },
  row: { position: 'relative', width: '100%', minHeight: 112, paddingVertical: 18, paddingRight: 48, flexDirection: 'row', alignItems: 'stretch', borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderLeftWidth: 1, borderStyle: 'solid', borderColor: '#E0D0B8', borderRadius: radius.md, backgroundColor: '#FFFEFB' },
  rowCompact: { minHeight: 126, paddingVertical: 15, paddingRight: 37 },
  idColumn: { width: 108, flexShrink: 0, paddingHorizontal: 20, alignItems: 'flex-start', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.line },
  idColumnCompact: { width: 76, paddingHorizontal: 12 },
  rowCode: { color: colors.goldDeep, fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.2 },
  rowCopy: { flex: 1, minWidth: 0, paddingHorizontal: 24, justifyContent: 'center' },
  rowTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  rowTitleCompact: { fontSize: 17, lineHeight: 25 },
  rowSummary: { marginTop: 5, color: colors.muted, fontSize: 13, lineHeight: 21 },
  rowArrow: { position: 'absolute', right: 18, top: '50%', marginTop: -16, color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 30, lineHeight: 32 },
  empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 15, lineHeight: 24 },
  pagination: { marginTop: spacing.md, marginBottom: spacing.md, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 7 },
  pageButton: { width: 44, height: 44, borderWidth: 1, borderColor: '#C9B99F', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  pageButtonActive: { borderColor: colors.goldDeep, backgroundColor: colors.goldDeep },
  pageText: { color: colors.inkSoft, fontSize: 11 },
  pageTextActive: { color: colors.surface, fontWeight: '700' },
  ellipsis: { color: colors.muted, paddingHorizontal: 3 },
  skeletonRow: { opacity: 0.5 },
  skeletonCode: { width: 62, height: 10, marginHorizontal: 20, alignSelf: 'center', borderRadius: 5, backgroundColor: colors.paperDeep },
  skeletonLine: { width: '58%', height: 16, borderRadius: 6, backgroundColor: colors.paperDeep },
  skeletonLineWide: { width: '86%', height: 10, marginTop: 12, borderRadius: 5, backgroundColor: colors.paperDeep },
});
