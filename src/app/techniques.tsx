import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { canReadTechnique } from '@/access/access-config';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { catalogTheme, colors, fonts, radius, spacing } from '@/constants/theme';
import { categoryMeta, categoryOrder } from '@/data/catalog';
import { getTechniqueIndex } from '@/data/technique-index';
import { ShoseijutsuCard } from '@/components/shoseijutsu-card';
import { Pagination } from '@/components/pagination';

const PAGE_SIZE = 100;

export default function TechniqueIndexScreen() {
  'use no memo';
  // The mutable catalogue is invalidated by catalogRevision after a public sync.
  const params = useLocalSearchParams<{ category?: string; q?: string; page?: string }>();
  const router = useRouter();
  const { accessState, catalogRevision } = useAccess();
  const category = categoryOrder.includes(params.category ?? '') ? params.category! : 'all';
  const query = params.q ?? '';
  const rows = useMemo(() => getTechniqueIndex(category, query), [catalogRevision, category, query]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const requestedPage = Number(params.page);
  const page = Number.isFinite(requestedPage) ? Math.min(totalPages, Math.max(1, Math.floor(requestedPage))) : 1;
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <BookScreen testID="technique-index-screen" contentContainerStyle={styles.content}>
      <View testID="technique-index-filters" style={styles.filters}>
        {[{ key: 'all', label: 'すべて' }, ...categoryOrder.map(key => ({ key, label: categoryMeta[key].label }))].map(option => (
          <Pressable key={option.key} accessibilityRole="button" accessibilityLabel={`${option.label}で処世術を絞り込む`} accessibilityState={{ selected: category === option.key }} aria-selected={category === option.key} onPress={() => router.setParams({ category: option.key === 'all' ? undefined : option.key, page: undefined })} style={[styles.filter, category === option.key && styles.filterActive]}>
            <AppText style={[styles.filterText, category === option.key && styles.filterTextActive]}>{option.label}</AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.heading}>
        <AppText testID="technique-index-count" style={styles.count}>{rows.length}件</AppText>
      </View>
      <Pagination page={page} totalPages={totalPages} onSelect={value => router.setParams({ page: String(value) })} label="処世術一覧のページ選択" testID="technique-index-pagination" />
      <View testID="technique-index-list" style={styles.list}>
        {pageRows.map(card => <ShoseijutsuCard key={card.id} testID="technique-index-row" card={card} readable={canReadTechnique(accessState === 'paid' ? 'paid' : 'guest', card.id) && card.status !== 'locked'} />)}
        {!rows.length ? <AppText style={styles.empty}>該当する処世術はありません。</AppText> : null}
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: catalogTheme.maxWidth, alignSelf: 'center', paddingBottom: spacing.xl * 3 },
  filters: { flexDirection: 'row', gap: 6, marginTop: spacing.lg },
  filter: { flex: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#F3EFE7' },
  filterActive: { backgroundColor: colors.gold },
  filterText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  filterTextActive: { color: colors.surface },
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 24, marginBottom: 14 },
  count: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 37 },
  list: { gap: 12 },
  empty: { paddingVertical: 30, color: colors.muted, fontSize: 15 },
});
