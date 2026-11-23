import { CatalogPageFooter } from '@/components/catalog-page-footer';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { canReadTechnique } from '@/access/access-config';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors } from '@/constants/theme';
import { categoryMeta, categoryOrder } from '@/data/catalog';
import { getTechniqueIndex } from '@/data/technique-index';
import { ShoseijutsuListCard } from '@/components/shoseijutsu-card';
import { CatalogIndexCount, CatalogIndexFilters, catalogIndexLayout } from '@/components/catalog-index-controls';
import { Pagination } from '@/components/pagination';

const PAGE_SIZE = 100;

export default function TechniqueIndexScreen() {
  'use no memo';
  // The mutable catalogue is invalidated by catalogRevision after a public sync.
  const params = useLocalSearchParams<{ category?: string; q?: string; page?: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const toTop = () => scrollRef.current?.scrollTo({ y: 0, animated: false });
  const { accessState, catalogRevision } = useAccess();
  const category = categoryOrder.includes(params.category ?? '') ? params.category! : 'all';
  const query = params.q ?? '';
  const rows = useMemo(() => getTechniqueIndex(category, query), [catalogRevision, category, query]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const requestedPage = Number(params.page);
  const page = Number.isFinite(requestedPage) ? Math.min(totalPages, Math.max(1, Math.floor(requestedPage))) : 1;
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectPage = (value: number) => { router.setParams({ page: String(value) }); requestAnimationFrame(toTop); };

  return (
    <BookScreen scrollRef={scrollRef} testID="technique-index-screen" contentContainerStyle={catalogIndexLayout.content}>
      <CatalogIndexFilters kind="technique" selected={category}
        options={[{ key: 'all', label: 'すべて' }, ...categoryOrder.map(key => ({ key, label: categoryMeta[key].label }))]}
        onSelect={key => router.setParams({ category: key === 'all' ? undefined : key, page: undefined })} />
      <View style={catalogIndexLayout.resultHeading}>
        <CatalogIndexCount label="収録処世術" count={rows.length} testID="technique-index-count" />
        <Pagination framed page={page} totalPages={totalPages} onSelect={selectPage} label="処世術一覧のページ選択" testID="technique-index-pagination" />
      </View>
      <View testID="technique-index-list" style={catalogIndexLayout.list}>
        {pageRows.map(card => <ShoseijutsuListCard key={card.id} card={card}
          readable={canReadTechnique(accessState === 'paid' ? 'paid' : 'guest', card.id) && card.status !== 'locked'} />)}
        {!rows.length ? <AppText style={styles.empty}>該当する処世術はありません。</AppText> : null}
      </View>
      <CatalogPageFooter page={page} totalPages={totalPages} onSelect={selectPage} onTop={toTop} label="処世術一覧のページ選択" testID="technique-index-footer" />
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 30, color: colors.muted, fontSize: 15 },
});
