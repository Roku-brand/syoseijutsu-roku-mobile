import { CatalogPageFooter } from '@/components/catalog-page-footer';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { canReadTheory } from '@/access/access-config';
import { BookScreen } from '@/components/book-ui';
import { getTheoryFilterOptions, TheoryFilterBar, type TheoryFilterKey } from '@/components/theory-catalog';
import { AppText } from '@/components/ui';
import { TheorySubcategoryReel } from '@/components/theory-subcategory-reel';
import { catalogIndexTheme, colors, fonts, spacing } from '@/constants/theme';
import { theories } from '@/data/catalog';
import { TheoryListCard } from '@/components/theory-card';
import { CatalogIndexCount, catalogIndexLayout } from '@/components/catalog-index-controls';
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
  const scrollRef = useRef<ScrollView>(null);
  const toTop = () => scrollRef.current?.scrollTo({ y: 0, animated: false });

  const { accessState, catalogRevision } = useAccess();
  const requestedCategory = params.category;
  const requestedPage = params.page;
  const [category, setCategory] = useState<TheoryFilterKey>(safeCategory(requestedCategory));
  const [page, setPage] = useState(Math.max(1, Math.floor(Number(requestedPage)) || 1));


  const filtered = useMemo(
    // Titles belong to the public catalogue, independently of body access.
    () => theories.filter((theory) => category === 'all' || theory.categoryId === category),
    [category, catalogRevision],
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

  const selectPage = (value: number) => { setPage(value); router.setParams({ category: category === 'all' ? undefined : category, subcategory, page: String(value) }); requestAnimationFrame(toTop); };

  return (
    <BookScreen scrollRef={scrollRef} testID="theory-index-screen" contentContainerStyle={catalogIndexLayout.content}>
      <View>
        <TheoryFilterBar selected={category} onSelect={selectCategory} />
        {category !== 'all' ? <View testID="theory-subcategory-filters" style={styles.subcategoryFilters}>
          <TheorySubcategoryReel key={category} options={subcategoryOptions} selected={subcategory} onSelect={selectSubcategory} />
        </View> : null}
      </View>

      <View style={[styles.resultHeading, category !== 'all' && styles.resultHeadingWithReel]}>
        <CatalogIndexCount label="収録理論" count={selectedTheories.length} testID="theory-index-count" />
        <Pagination framed page={safePage} totalPages={totalPages} tone="theory" label="理論一覧のページ選択" testID="theory-index-pagination" onSelect={selectPage} />
      </View>

      {accessState === 'checking' ? <TheoryListSkeleton /> : pageTheories.length ? (
        <View testID="theory-index-list" style={catalogIndexLayout.list}>
          {groupTheorySections(pageTheories).map((section) => <View key={`${section.categoryId}:${section.subcategoryId}`} style={styles.section}>
            {!subcategory ? <View style={styles.subHeading}>
              {category === 'all' ? <AppText style={styles.categoryLabel}>{section.categoryTitle}</AppText> : null}
              <AppText accessibilityRole="header" aria-level={2} style={styles.subTitle}>{section.title}</AppText>
            </View> : null}
            {section.items.map(theory => <TheoryListCard key={theory.tagId} theory={theory}
              readable={canReadTheory(accessState === 'paid' ? 'paid' : 'guest', theory.tagId)} />)}
          </View>)}
        </View>
      ) : (
        <View style={styles.empty}><AppText style={styles.emptyTitle}>この分類の理論はまだありません。</AppText></View>
      )}
      <CatalogPageFooter page={safePage} totalPages={totalPages} onSelect={selectPage} onTop={toTop} label="理論一覧のページ選択" testID="theory-index-footer" theory />
    </BookScreen>
  );
}

function TheoryListSkeleton() {
  return <View testID="theory-index-loading" style={catalogIndexLayout.list}>{Array.from({ length: 6 }, (_, index) => <View key={index} style={styles.skeletonRow}><View style={styles.skeletonCode} /><View style={styles.skeletonLine} /><View style={styles.skeletonLineWide} /></View>)}</View>;
}

const styles = StyleSheet.create({
  subcategoryFilters: { marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 9 },
  resultHeading: { minHeight: 32, marginTop: 12, marginBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultHeadingWithReel: { marginTop: 12 },
  section: { width: '100%', gap: catalogIndexTheme.cardGap, marginBottom: 5 },
  subHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, paddingTop: 4, paddingBottom: 2 },
  categoryLabel: { color: colors.ink, fontFamily: fonts.sans, fontSize: 12, lineHeight: 22, paddingRight: 10, borderRightWidth: 1, borderRightColor: colors.line },
  subTitle: { flexShrink: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 26, fontWeight: '600' },
  empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 24 },
  skeletonRow: { minHeight: 90, padding: 14, gap: 8, borderWidth: 1, borderColor: catalogIndexTheme.theory.border, borderRadius: catalogIndexTheme.cardRadius, alignItems: 'flex-start', opacity: 0.5 },
  skeletonCode: { width: 62, height: 8, borderRadius: 5, backgroundColor: colors.paperDeep },
  skeletonLine: { width: '58%', height: 13, borderRadius: 6, backgroundColor: colors.paperDeep },
  skeletonLineWide: { width: '86%', height: 8, borderRadius: 5, backgroundColor: colors.paperDeep },
});
