import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { TheoryArchiveCard } from '@/components/theory-archive-card';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { theories } from '@/data/catalog';
import { useAccess } from '@/access/access-state';
import { FREE_THEORY_ID_SET } from '@/access/access-config';
import { getTheoryCategoryCount, getTheoryCategoryLabel } from '@/data/theory-counts';

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
  const router = useRouter();
  const { isPaid } = useAccess();
  const items =
    category === 'all'
      ? theories
      : theories.filter((theory) => theory.categoryId === category);
  const totalCount = getTheoryCategoryCount(category);
  const visibleItems = isPaid ? items : items.filter((theory) => FREE_THEORY_ID_SET.has(theory.tagId));
  const scrollRef = useRef<ScrollView>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'source' | 'title'>('source');
  const title = getTheoryCategoryLabel(category);
  const filteredItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const matched = term
      ? visibleItems.filter((theory) =>
          [
            theory.tagId,
            theory.title,
            theory.summary,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase()
            .includes(term),
        )
      : [...visibleItems];
    if (sort === 'title') {
      matched.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    }
    return matched;
  }, [query, sort, visibleItems]);

  if (!items.length) {
    return (
      <Screen>
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
          {query ? `${filteredItems.length}件` : isPaid ? `${totalCount}の理論` : `${visibleItems.length}件を無料公開`}
        </AppText>
        <View style={styles.rule} />
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
      {!isPaid && totalCount > visibleItems.length ? (
        <View testID="theory-category-upgrade-panel" style={styles.upgradePanel}>
          <View style={styles.upgradeCopy}>
            <AppText variant="serif" style={styles.upgradeTitle}>{title}の完全版</AppText>
            <AppText style={styles.upgradeDescription}>
              {visibleItems.length > 0
                ? `無料公開の${visibleItems.length}件に加えて、残り${totalCount - visibleItems.length}件を閲覧できます。`
                : `全${totalCount}件を完全版で閲覧できます。`}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title}の完全版を見る`}
            onPress={() => router.push({ pathname: '/upgrade', params: { source: 'discover_theory' } })}
            style={({ pressed }) => [styles.upgradeButton, pressed && styles.pressed]}
          >
            <AppText style={styles.upgradeButtonText}>完全版を見る ›</AppText>
          </Pressable>
        </View>
      ) : null}
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
  searchIcon: { color: colors.gold, fontSize: 25, lineHeight: 29 },
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
  clearText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
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
  sortButtonActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  sortText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
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
  upgradePanel: { marginTop: spacing.lg, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, backgroundColor: '#211F1A' },
  upgradeCopy: { gap: 5 },
  upgradeTitle: { color: '#F0D99D', fontSize: 20, lineHeight: 29, fontWeight: '700' },
  upgradeDescription: { color: '#E8E1D4', fontSize: 13, lineHeight: 21 },
  upgradeButton: { alignSelf: 'flex-start', minHeight: 42, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: '#C9AB68', borderRadius: radius.pill, justifyContent: 'center' },
  upgradeButtonText: { color: '#F0D99D', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.82 },
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
  toTopText: { color: colors.gold, fontSize: 13, fontWeight: '700' },
});
