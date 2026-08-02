import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { TheoryArchiveCard } from '@/components/theory-archive-card';
import { AppText, ChapterTitle, DetailHeader, EmptyState, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { theories } from '@/data/catalog';

export function generateStaticParams() {
  return [
    { category: 'all' },
    ...[...new Set(theories.map((theory) => theory.categoryId))].map(
      (category) => ({ category }),
    ),
  ];
}

export default function TheoryCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const items =
    category === 'all'
      ? theories
      : theories.filter((theory) => theory.categoryId === category);
  const scrollRef = useRef<ScrollView>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'source' | 'title'>('source');
  const title = category === 'all' ? 'すべての理論' : items[0]?.categoryTitle;
  const filteredItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const matched = term
      ? items.filter((theory) =>
          [
            theory.title,
            theory.summary,
            theory.definition,
            theory.discipline,
            ...(theory.domains ?? []),
            ...(theory.principles ?? []),
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase()
            .includes(term),
        )
      : [...items];
    if (sort === 'title') {
      matched.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    }
    return matched;
  }, [items, query, sort]);

  if (!items.length) {
    return (
      <Screen>
        <DetailHeader title="理論辞典" />
        <EmptyState
          title="理論カテゴリーが見つかりません"
          description="前の画面へ戻って、別の理論を選んでください。"
        />
      </Screen>
    );
  }

  return (
    <Screen
      scrollRef={scrollRef}
      contentContainerStyle={styles.screenContent}
    >
      <DetailHeader title="理論辞典" />
      <ChapterTitle title={title} />

      <View style={styles.tools}>
        <View style={styles.searchBox}>
          <AppText style={styles.searchIcon}>⌕</AppText>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`${title}の中から検索`}
            placeholderTextColor="#77776F"
            accessibilityLabel={`${title}の理論を検索`}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="検索を消す"
              onPress={() => setQuery('')}
              style={styles.clearButton}
            >
              <AppText style={styles.clearText}>消す</AppText>
            </Pressable>
          ) : null}
        </View>
        <View accessibilityRole="tablist" style={styles.sortRow}>
          {[
            { key: 'source', label: '登録順' },
            { key: 'title', label: 'あいうえお順' },
          ].map((option) => {
            const active = sort === option.key;
            return (
              <Pressable
                key={option.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setSort(option.key as 'source' | 'title')}
                style={[styles.sortButton, active && styles.sortButtonActive]}
              >
                <AppText
                  style={[
                    styles.sortText,
                    active && styles.sortTextActive,
                  ]}
                >
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionTitle}>
        <AppText variant="serif" style={styles.sectionLabel}>
          {query ? `${filteredItems.length}件` : `${items.length}の理論`}
        </AppText>
        <View style={styles.rule} />
        <AppText style={styles.ruleMark}>✦</AppText>
      </View>

      <View style={styles.cards}>
        {filteredItems.map((theory) => (
          <TheoryArchiveCard
            key={theory.tagId}
            theory={theory}
          />
        ))}
        {!filteredItems.length ? (
          <View style={styles.empty}>
            <AppText style={styles.emptyTitle}>該当する理論がありません</AppText>
            <AppText style={styles.emptyText}>
              言葉を短くするか、別の表現で検索してください。
            </AppText>
          </View>
        ) : null}
      </View>
      {filteredItems.length > 5 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="一覧の先頭へ戻る"
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          style={styles.toTop}
        >
          <AppText style={styles.toTopText}>↑　先頭へ戻る</AppText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { maxWidth: 1280 },
  tools: {
    marginTop: spacing.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
    gap: spacing.md,
  },
  searchBox: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#6C7B88',
    borderRadius: radius.pill,
    backgroundColor: '#F8F8F4',
  },
  searchIcon: { color: '#34495C', fontSize: 25, lineHeight: 29 },
  searchInput: {
    flex: 1,
    minHeight: 50,
    color: colors.ink,
    fontSize: 15,
  },
  clearButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: { color: '#526577', fontSize: 12, fontWeight: '700' },
  sortRow: { flexDirection: 'row', gap: spacing.sm },
  sortButton: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#8996A1',
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortButtonActive: { backgroundColor: '#263544', borderColor: '#263544' },
  sortText: { color: '#526577', fontSize: 12, fontWeight: '700' },
  sortTextActive: { color: colors.goldLight },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.section,
  },
  sectionLabel: { fontSize: 24, color: colors.gold },
  rule: {
    height: 1,
    flex: 1,
    marginTop: 9,
    backgroundColor: colors.gold,
    opacity: 0.78,
  },
  ruleMark: { marginTop: 5, color: colors.gold, fontSize: 16 },
  cards: { paddingTop: spacing.lg, paddingBottom: spacing.sm },
  empty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { marginTop: spacing.sm, color: colors.muted, textAlign: 'center' },
  toTop: {
    alignSelf: 'center',
    minHeight: 48,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: '#526577',
    borderRadius: radius.pill,
    backgroundColor: '#F4F5F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toTopText: { color: '#34495C', fontSize: 13, fontWeight: '700' },
});
