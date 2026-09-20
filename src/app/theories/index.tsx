import { Link, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { FREE_THEORY_ID_SET } from '@/access/access-config';
import { BookScreen } from '@/components/book-ui';
import { CatalogModeSwitch, CatalogTitleBar } from '@/components/catalog-navigation';
import { TheoryFilterBar, theoryFilterOptions, type TheoryFilterKey } from '@/components/theory-catalog';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getTheoryDisplayId, theories } from '@/data/catalog';
import { getTheoryCoverSummary, isLockedTheoryShell, normalizeDisplayText } from '@/data/theory-display';
import type { TheoryCard } from '@/data/types';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

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
  const params = useLocalSearchParams<{ category?: string; page?: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const { isPaid, accessState, catalogRevision } = useAccess();
  const browserSearch = Platform.OS === 'web' && typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : undefined;
  const [category, setCategory] = useState<TheoryFilterKey>(safeCategory(browserSearch?.get('category') ?? params.category));
  const [page, setPage] = useState(Math.max(1, Number(browserSearch?.get('page') ?? params.page) || 1));

  const visibleCatalog = useMemo(
    () => theories.filter((theory) => isPaid || FREE_THEORY_ID_SET.has(theory.tagId) || isLockedTheoryShell(theory)),
    [catalogRevision, isPaid],
  );
  const filtered = useMemo(
    () => visibleCatalog.filter((theory) => category === 'all' || theory.categoryId === category),
    [category, visibleCatalog],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageTheories = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const selectCategory = (value: TheoryFilterKey) => {
    setCategory(value);
    setPage(1);
    router.setParams({ category: value === 'all' ? undefined : value, page: '1' });
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      {pathname === '/discover' ? <CatalogTitleBar title="理論一覧" searchMode="theories" /> : null}
      <CatalogModeSwitch active="theories" />
      <View style={styles.filters}>
        <TheoryFilterBar selected={category} onSelect={selectCategory} />
      </View>

      <View style={styles.resultHeading}>
        <AppText style={styles.resultTitle}>{filtered.length}件</AppText>
        {!isPaid ? <AppText style={styles.totalNote}>{FREE_THEORY_ID_SET.size}件を無料公開</AppText> : null}
      </View>

      {accessState === 'checking' ? <TheoryListSkeleton /> : pageTheories.length ? (
        <View testID="theory-index-list" style={styles.list}>
          {pageTheories.map((theory) => <TheoryIndexRow key={theory.tagId} theory={theory} compact={compact} />)}
        </View>
      ) : (
        <View style={styles.empty}><AppText style={styles.emptyTitle}>この分類の理論はまだありません。</AppText></View>
      )}

      {filtered.length > PAGE_SIZE ? (
        <View accessibilityLabel="理論一覧のページ選択" style={styles.pagination}>
          {pageItems(safePage, totalPages).map((item, index) => item === 'ellipsis'
            ? <AppText key={`ellipsis-${index}`} style={styles.ellipsis}>…</AppText>
            : <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${item}ページ目`} accessibilityState={{ selected: item === safePage }} onPress={() => { setPage(item); router.setParams({ category: category === 'all' ? undefined : category, page: String(item) }); }} style={[styles.pageButton, item === safePage && styles.pageButtonActive]}><AppText style={[styles.pageText, item === safePage && styles.pageTextActive]}>{item}</AppText></Pressable>)}
        </View>
      ) : null}
    </BookScreen>
  );
}

function TheoryIndexRow({ theory, compact }: { theory: TheoryCard; compact: boolean }) {
  return (
    <Link href={{ pathname: '/theory/[id]', params: { id: theory.tagId } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${theory.title}を開く`} style={({ pressed }) => [styles.row, compact && styles.rowCompact, pressed && styles.rowPressed]}>
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
  resultHeading: { marginTop: spacing.xl, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  resultTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 37, fontWeight: '600' },
  totalNote: { color: colors.gold, fontSize: 11, lineHeight: 18 },
  list: { width: '100%', gap: 10 },
  row: { position: 'relative', width: '100%', minHeight: 112, paddingVertical: 18, paddingRight: 48, flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: 'rgba(255,253,248,0.72)' },
  rowCompact: { minHeight: 126, paddingVertical: 15, paddingRight: 37 },
  rowPressed: { backgroundColor: '#F7F0E3', transform: [{ translateX: 1 }] },
  idColumn: { width: 108, flexShrink: 0, paddingHorizontal: 20, alignItems: 'flex-start', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.line },
  idColumnCompact: { width: 76, paddingHorizontal: 12 },
  rowCode: { color: colors.gold, fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.2 },
  rowCopy: { flex: 1, minWidth: 0, paddingHorizontal: 24, justifyContent: 'center' },
  rowTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  rowTitleCompact: { fontSize: 17, lineHeight: 25 },
  rowSummary: { marginTop: 5, color: colors.muted, fontSize: 13, lineHeight: 21 },
  rowArrow: { position: 'absolute', right: 18, top: '50%', marginTop: -16, color: colors.gold, fontFamily: fonts.serif, fontSize: 30, lineHeight: 32 },
  empty: { minHeight: 190, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  emptyTitle: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 15, lineHeight: 24 },
  pagination: { marginTop: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 7 },
  pageButton: { width: 38, height: 38, borderWidth: 1, borderColor: colors.line, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  pageButtonActive: { borderColor: colors.gold, backgroundColor: colors.gold },
  pageText: { color: colors.inkSoft, fontSize: 11 },
  pageTextActive: { color: colors.surface, fontWeight: '700' },
  ellipsis: { color: colors.muted, paddingHorizontal: 3 },
  skeletonRow: { opacity: 0.5 },
  skeletonCode: { width: 62, height: 10, marginHorizontal: 20, alignSelf: 'center', borderRadius: 5, backgroundColor: colors.paperDeep },
  skeletonLine: { width: '58%', height: 16, borderRadius: 6, backgroundColor: colors.paperDeep },
  skeletonLineWide: { width: '86%', height: 10, marginTop: 12, borderRadius: 5, backgroundColor: colors.paperDeep },
});
