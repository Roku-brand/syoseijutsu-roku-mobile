import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { canReadTechnique } from '@/access/access-config';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categoryMeta, categoryOrder, getTechniqueDisplayId } from '@/data/catalog';
import { getTechniqueIndex } from '@/data/technique-index';
import type { TechniqueCard } from '@/data/types';
import { techniqueRoute } from '@/navigation/app-routes';

const PAGE_SIZE = 100;

export default function TechniqueIndexScreen() {
  const params = useLocalSearchParams<{ category?: string; q?: string; page?: string }>();
  const router = useRouter();
  const { accessState, catalogRevision } = useAccess();
  const category = categoryOrder.includes(params.category ?? '') ? params.category! : 'all';
  const query = params.q ?? '';
  const [input, setInput] = useState(query);
  useEffect(() => setInput(query), [query]);
  const rows = useMemo(() => getTechniqueIndex(category, query), [catalogRevision, category, query]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const requestedPage = Number(params.page);
  const page = Number.isFinite(requestedPage) ? Math.min(totalPages, Math.max(1, Math.floor(requestedPage))) : 1;
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const search = () => router.setParams({ q: input.trim() || undefined, page: undefined });

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View testID="technique-index-filters" style={styles.filters}>
        {[{ key: 'all', label: 'すべて' }, ...categoryOrder.map(key => ({ key, label: categoryMeta[key].label }))].map(option => (
          <Pressable key={option.key} accessibilityRole="button" accessibilityLabel={`${option.label}で処世術を絞り込む`} accessibilityState={{ selected: category === option.key }} aria-selected={category === option.key} onPress={() => router.setParams({ category: option.key === 'all' ? undefined : option.key, page: undefined })} style={[styles.filter, category === option.key && styles.filterActive]}>
            <AppText style={[styles.filterText, category === option.key && styles.filterTextActive]}>{option.label}</AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.search}>
        <TextInput accessibilityLabel="通しID・処世術名・人物像で検索" placeholder="通しID・処世術名・人物像" placeholderTextColor={colors.muted} value={input} onChangeText={setInput} onSubmitEditing={search} returnKeyType="search" autoCapitalize="none" autoCorrect={false} style={styles.input} />
        <Pressable accessibilityRole="button" accessibilityLabel="処世術一覧を検索" onPress={search} style={styles.searchButton}><AppText style={styles.searchText}>検索</AppText></Pressable>
      </View>
      <View style={styles.heading}>
        <AppText testID="technique-index-count" style={styles.count}>{rows.length}件</AppText>
        <AppText style={styles.note}>通しID順</AppText>
      </View>
      {totalPages > 1 ? <View testID="technique-index-pagination" accessibilityLabel="処世術一覧のページ選択" style={styles.pagination}>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value}ページ目`} accessibilityState={{ selected: value === page }} aria-selected={value === page} onPress={() => router.setParams({ page: String(value) })} style={[styles.page, value === page && styles.filterActive]}><AppText style={[styles.filterText, value === page && styles.filterTextActive]}>{value}</AppText></Pressable>)}
      </View> : null}
      <View testID="technique-index-list" style={styles.list}>
        {pageRows.map(card => <TechniqueIndexRow key={card.id} card={card} readable={canReadTechnique(accessState === 'paid' ? 'paid' : 'guest', card.id) && card.status !== 'locked'} />)}
        {!rows.length ? <AppText style={styles.empty}>該当する処世術はありません。</AppText> : null}
      </View>
    </BookScreen>
  );
}

function TechniqueIndexRow({ card, readable }: { card: TechniqueCard; readable: boolean }) {
  const title = readable ? card.title : '完全版の処世術';
  const displayId = getTechniqueDisplayId(card);
  return <Link href={techniqueRoute(card.id)} asChild>
    <Pressable testID="technique-index-row" accessibilityRole="link" accessibilityLabel={`${displayId} ${title}を開く`} style={styles.row}>
      <AppText testID="technique-index-id" style={styles.code}>{displayId}</AppText>
      <View style={styles.copy}>
        <AppText style={styles.meta}>{card.categoryName} · {card.subcategory}</AppText>
        <AppText style={styles.title}>{title}</AppText>
        {!readable ? <AppText style={styles.note}>完全版で読む</AppText> : null}
      </View>
      <AppText accessibilityElementsHidden style={styles.arrow}>›</AppText>
    </Pressable>
  </Link>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', paddingBottom: spacing.xl * 3 },
  filters: { flexDirection: 'row', gap: 6, marginTop: spacing.lg },
  filter: { flex: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#F3EFE7' },
  filterActive: { backgroundColor: colors.gold },
  filterText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  filterTextActive: { color: colors.surface },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingVertical: 10, color: colors.ink, fontSize: 14, lineHeight: 22 },
  searchButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  searchText: { color: colors.goldDeep, fontSize: 14, fontWeight: '700' },
  heading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 24, marginBottom: 14 },
  count: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 37 },
  note: { color: colors.goldDeep, fontSize: 12, lineHeight: 19 },
  pagination: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  page: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#F3EFE7' },
  list: { gap: 10 },
  row: { minHeight: 100, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E0D0B8', borderRadius: radius.md, backgroundColor: colors.surface },
  code: { width: 62, flexShrink: 0, color: colors.goldDeep, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 26, fontWeight: '700' },
  arrow: { color: colors.goldDeep, fontSize: 26, lineHeight: 30 },
  empty: { paddingVertical: 30, color: colors.muted, fontSize: 15 },
});
