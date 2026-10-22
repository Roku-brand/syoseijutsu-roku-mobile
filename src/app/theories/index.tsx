import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { FREE_THEORY_ID_SET } from '@/access/access-config';
import { BookScreen } from '@/components/book-ui';
import { getTheoryFilterOptions, TheoryFilterBar, type TheoryFilterKey } from '@/components/theory-catalog';
import { AppText } from '@/components/ui';
import { TheorySubcategoryReel } from '@/components/theory-subcategory-reel';
import { catalogTheme, colors, fonts, spacing } from '@/constants/theme';
import { theories } from '@/data/catalog';
import { isLockedTheoryShell } from '@/data/theory-display';
import { TheoryCard } from '@/components/theory-card';
import { Pagination } from '@/components/pagination';
import { groupTheorySections, resolveTheorySubcategoryId } from '@/data/theory-taxonomy';

const PAGE_SIZE = 100;

function safeCategory(value: string | undefined): TheoryFilterKey {
  return getTheoryFilterOptions().some((option) => option.key === value) ? value as TheoryFilterKey : 'all';
}

export default function TheoryIndexScreen() {
  'use no memo';
  // Published catalogue changes are invalidated by catalogRevision.
  const params = useLocalSearchParams<{ category?: string; subcategory?: string; page?: string }>();
  const router = useRouter();

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
  const subcategoryOptions = [{ subcategoryId: undefined, title: 'すべて', items: filtered }, ...subcategories];
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
    <BookScreen testID="theory-index-screen" contentContainerStyle={styles.content}>
      <View style={styles.filters}>
        <TheoryFilterBar selected={category} onSelect={selectCategory} />
        {category !== 'all' ? <View testID="theory-subcategory-filters" style={styles.subcategoryFilters}>
          <TheorySubcategoryReel key={category} options={subcategoryOptions} selected={subcategory} onSelect={selectSubcategory} />
        </View> : null}
      </View>

      <View style={[styles.resultHeading, category !== 'all' && styles.resultHeadingWithReel]}>
        <AppText testID="theory-index-count" style={styles.resultTitle}>{selectedTheories.length}件</AppText>
        {!isPaid ? <AppText style={styles.totalNote}>{FREE_THEORY_ID_SET.size}件を無料公開</AppText> : null}
      </View>

      <Pagination page={safePage} totalPages={totalPages} tone="theory" label="理論一覧のページ選択" testID="theory-index-pagination" onSelect={item => { setPage(item); router.setParams({ category: category === 'all' ? undefined : category, subcategory, page: String(item) }); }} />

      {accessState === 'checking' ? <TheoryListSkeleton /> : pageTheories.length ? (
        <View testID="theory-index-list" style={styles.list}>
          {groupTheorySections(pageTheories).map((section,index,sections) => <View key={`${section.categoryId}:${section.subcategoryId}`} style={styles.section}>
            {category === 'all' && (index === 0 || sections[index-1].categoryId !== section.categoryId) ? <AppText accessibilityRole="header" aria-level={2} style={styles.majorHeading}>{section.categoryTitle}</AppText> : null}
            {!subcategory ? <View style={styles.subHeading}><AppText accessibilityRole="header" aria-level={3} style={styles.subTitle}>{section.title}</AppText><AppText style={styles.sectionCount}>{filtered.filter(t=>t.categoryId === section.categoryId && t.subcategoryId===section.subcategoryId).length}件</AppText></View> : null}
            {section.items.map(theory=><TheoryCard key={theory.tagId} theory={theory} testID="theory-index-row-card" />)}
          </View>)}
        </View>
      ) : (
        <View style={styles.empty}><AppText style={styles.emptyTitle}>この分類の理論はまだありません。</AppText></View>
      )}
    </BookScreen>
  );
}

function TheoryListSkeleton() {
  return <View testID="theory-index-loading" style={styles.list}>{Array.from({ length: 6 }, (_, index) => <View key={index} style={styles.skeletonRow}><View style={styles.skeletonCode} /><View style={styles.skeletonLine} /><View style={styles.skeletonLineWide} /></View>)}</View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: catalogTheme.maxWidth, alignSelf: 'center', paddingBottom: spacing.xl * 3 },
  filters: { marginTop: spacing.lg, paddingBottom: spacing.md },
  subcategoryFilters: { marginTop: spacing.lg },
  resultHeading: { marginTop: spacing.xl, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  resultHeadingWithReel: { marginTop: spacing.md },
  resultTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 37, fontWeight: '600' },
  totalNote: { color: colors.ink, fontSize: 11, lineHeight: 18 },
  list: { width: '100%', gap: 12 },
  section: { width: '100%', gap: 12, marginBottom: spacing.lg },
  majorHeading: { color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 36, marginTop: spacing.md },
  subHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 10, paddingBottom: 4 },
  subTitle: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, fontWeight: '600' },
  sectionCount: { color: colors.ink, fontSize: 11, lineHeight: 18 },
  empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 24 },
  skeletonRow: { minHeight: 148, padding: 22, gap: 16, borderWidth: 1, borderColor: catalogTheme.theory.border, borderRadius: 4, alignItems: 'center', opacity: 0.5 },
  skeletonCode: { width: 62, height: 10, alignSelf: 'flex-end', borderRadius: 5, backgroundColor: colors.paperDeep },
  skeletonLine: { width: '58%', height: 16, borderRadius: 6, backgroundColor: colors.paperDeep },
  skeletonLineWide: { width: '86%', height: 10, marginTop: 12, borderRadius: 5, backgroundColor: colors.paperDeep },
});
