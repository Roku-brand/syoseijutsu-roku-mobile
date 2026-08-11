import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen, OrnamentHeading } from '@/components/book-ui';
import { TechniqueRow } from '@/components/technique-row';
import { TheoryArchiveCard } from '@/components/theory-archive-card';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  categories,
  categoryMeta,
  categoryOrder,
  techniqueCards,
  theories,
} from '@/data/catalog';
import { getTechniqueSearchText } from '@/data/technique-tags';
import { searchGoals } from '@/data/search';
import { useAccess } from '@/access/access-state';
import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '@/access/access-config';

type BrowseMode = 'techniques' | 'theories';

const theoryCategories = [
  { id: 'psychology', title: '心理学', mark: '心' },
  { id: 'behavioral-science', title: '行動科学', mark: '行' },
  { id: 'organization-management', title: '組織・経営', mark: '組' },
  { id: 'strategy', title: '戦略論', mark: '戦' },
  { id: 'classics-thought', title: '古典・思想', mark: '古' },
  { id: 'maxims-experience', title: '名言・経験則', mark: '言' },
];

export default function DiscoverScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<BrowseMode>('techniques');
  const { isPaid } = useAccess();
  const keywords = useMemo(
    () => query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );
  const techniqueMatches = useMemo(
    () =>
      !keywords.length
        ? []
        : techniqueCards.filter((card) => (isPaid || FREE_TECHNIQUE_IDS.has(card.id))).filter((card) => {
            const source = getTechniqueSearchText(card);
            return keywords.every((keyword) => source.includes(keyword));
          }),
    [isPaid, keywords],
  );
  const theoryMatches = useMemo(
    () =>
      !keywords.length
        ? []
        : theories.filter((theory) => (isPaid || FREE_THEORY_ID_SET.has(theory.tagId))).filter((theory) => {
            const source = [
              theory.tagId,
              theory.title,
              theory.summary,
              theory.definition,
              theory.categoryTitle,
              theory.sourceType,
              theory.discipline,
              theory.conceptType,
              theory.sourceName,
              theory.sourceDetail,
              ...(theory.domains ?? []),
              ...(theory.principles ?? []),
              ...(theory.keyPoints ?? []),
            ]
              .filter(Boolean)
              .join(' ')
              .toLocaleLowerCase();
            return keywords.every((keyword) => source.includes(keyword));
          }),
    [isPaid, keywords],
  );

  return (
    <BookScreen>
      <View style={styles.searchBox}>
        <AppText style={styles.searchIcon}>⌕</AppText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="処世術・人物像・キーワードを探す"
          placeholderTextColor={colors.muted}
          accessibilityLabel="処世術・理論カードを検索"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')}>
            <AppText style={styles.clear}>消す</AppText>
          </Pressable>
        ) : null}
      </View>

      {keywords.length ? (
        <View>
          <OrnamentHeading>
            検索結果　{techniqueMatches.length + theoryMatches.length}
          </OrnamentHeading>
          {techniqueMatches.length || theoryMatches.length ? (
            <View style={styles.resultGroups}>
              {techniqueMatches.length ? (
                <View>
                  <AppText variant="label" style={styles.resultLabel}>
                    処世術　{techniqueMatches.length}件
                  </AppText>
                  {techniqueMatches.map((card) => (
                    <TechniqueRow key={card.id} card={card} />
                  ))}
                </View>
              ) : null}
              {theoryMatches.length ? (
                <View>
                  <AppText variant="label" style={styles.resultLabel}>
                    理論　{theoryMatches.length}件
                  </AppText>
                  {theoryMatches.map((theory) => (
                    <TheoryArchiveCard key={theory.tagId} theory={theory} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <AppText style={styles.empty}>
              一致する処世術・理論はありません。
            </AppText>
          )}
        </View>
      ) : (
        <>
          <View accessibilityRole="tablist" style={styles.modeTabs}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'techniques' }}
              onPress={() => setMode('techniques')}
              style={[styles.modeTab, mode === 'techniques' && styles.modeTabActive]}
            >
              <AppText style={[styles.modeText, mode === 'techniques' && styles.modeTextActive]}>
                処世術
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'theories' }}
              onPress={() => setMode('theories')}
              style={[styles.modeTab, mode === 'theories' && styles.modeTabActive]}
            >
              <AppText style={[styles.modeText, mode === 'theories' && styles.modeTextActive]}>
                理論
              </AppText>
            </Pressable>
          </View>
          {mode === 'techniques' ? (
            <TechniqueBrowser
              router={router}
              onSearch={setQuery}
              onGoal={(goalId) =>
                router.push({ pathname: '/goal/[id]', params: { id: goalId } })
              }
            />
          ) : (
            <TheoryBrowser router={router} />
          )}
        </>
      )}
    </BookScreen>
  );
}

function TechniqueBrowser({
  router,
  onSearch,
  onGoal,
}: {
  router: ReturnType<typeof useRouter>;
  onSearch: (value: string) => void;
  onGoal: (goalId: string) => void;
}) {
  return (
    <View>
      <OrnamentHeading>領域から探す</OrnamentHeading>
      <View style={styles.categoryGrid}>
        {categoryOrder.map((key) => {
          const category = categories.find((item) => item.key === key);
          if (!category) return null;
          const count = category.subcategories.reduce(
            (total, persona) => total + persona.items.length,
            0,
          );
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${categoryMeta[key].label}、${count}件`}
              onPress={() =>
                router.push({ pathname: '/category/[key]', params: { key } })
              }
              style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
            >
              <View style={styles.categoryMark}>
                <AppText style={styles.categoryMarkText}>{categoryMeta[key].mark}</AppText>
              </View>
              <AppText style={styles.categoryTitle}>{categoryMeta[key].label}</AppText>
              <AppText style={styles.categoryDescription}>{categoryMeta[key].description}</AppText>
              <AppText style={styles.categoryCount}>{count}件</AppText>
            </Pressable>
          );
        })}
      </View>
      <OrnamentHeading>状況から探す</OrnamentHeading>
      <View style={styles.chipGrid}>
        {['初対面', '会話', '交渉', '不安', '判断', '習慣'].map((label) => (
          <Pressable key={label} onPress={() => onSearch(label)} style={({ pressed }) => [styles.searchChip, pressed && styles.pressed]}>
            <AppText style={styles.searchChipText}>{label}</AppText>
          </Pressable>
        ))}
      </View>
      <OrnamentHeading>目的から探す</OrnamentHeading>
      <View style={styles.purposeGrid}>
        {searchGoals.map((goal) => (
          <Pressable
            key={goal.id}
            accessibilityRole="link"
            accessibilityLabel={`${goal.label}の処世術を探す`}
            onPress={() => onGoal(goal.id)}
            style={({ pressed }) => [styles.purposeRow, pressed && styles.pressed]}
          >
            <AppText style={styles.purposeMark}>{goal.mark}</AppText>
            <View style={styles.purposeCopy}>
              <AppText style={styles.purposeText}>{goal.label}</AppText>
              <AppText style={styles.purposeDescription}>{goal.description}</AppText>
            </View>
            <AppText style={styles.purposeChevron}>›</AppText>
          </Pressable>
        ))}
      </View>
      <OrnamentHeading>よく見られる検索</OrnamentHeading>
      <View style={styles.chipGrid}>
        {['人間関係', '仕事術', 'メンタル'].map((label) => (
          <Pressable key={label} onPress={() => onSearch(label)} style={({ pressed }) => [styles.popularChip, pressed && styles.pressed]}>
            <AppText style={styles.searchChipText}>{label}　⌕</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TheoryBrowser({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <View>
      <OrnamentHeading>理論から探す</OrnamentHeading>
      <View style={styles.theoryGrid}>
        {theoryCategories.map((category) => (
          <Pressable
            key={category.id}
            onPress={() =>
              router.push({
                pathname: '/theories/[category]',
                params: { category: category.id },
              })
            }
            style={({ pressed }) => [styles.theoryCard, pressed && styles.pressed]}
          >
            <View style={styles.theoryMark}>
              <AppText style={styles.theoryMarkText}>{category.mark}</AppText>
            </View>
            <AppText style={styles.theoryTitle}>{category.title}</AppText>
            <AppText style={styles.theoryCount}>
              {theories.filter((theory) => theory.categoryId === category.id).length}件
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  searchIcon: { color: colors.gold, fontFamily: fonts.serif, fontSize: 28 },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 16,
  },
  clear: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  empty: { color: colors.muted, textAlign: 'center', padding: spacing.xl },
  resultGroups: { gap: spacing.xl },
  resultLabel: {
    color: colors.gold,
    marginBottom: spacing.md,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  modeTabs: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    padding: 4,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  modeTab: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  modeTabActive: { backgroundColor: colors.charcoal },
  modeText: {
    color: colors.inkSoft,
    fontFamily: fonts.serif,
    fontSize: 14,
    fontWeight: '700',
  },
  modeTextActive: { color: colors.goldLight },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  categoryCard: {
    flexGrow: 1,
    flexBasis: 220,
    minHeight: 172,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  categoryMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMarkText: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontSize: 18,
    fontWeight: '700',
  },
  categoryTitle: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
  },
  categoryDescription: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  categoryCount: { color: colors.gold, fontSize: 11, lineHeight: 17 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  searchChip: { flexGrow: 1, flexBasis: '30%', minHeight: 38, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  popularChip: { flexGrow: 1, flexBasis: '28%', minHeight: 38, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  searchChipText: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  purposeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  purposeRow: { flexGrow: 1, flexBasis: '45%', minHeight: 68, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface },
  purposeMark: { color: colors.gold, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  purposeCopy: { flex: 1, minWidth: 0, gap: 2 },
  purposeText: { color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  purposeDescription: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  purposeChevron: { color: colors.gold, fontSize: 20, lineHeight: 22 },
  theoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  theoryCard: {
    flexGrow: 1,
    flexBasis: 220,
    minHeight: 132,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  theoryMark: {
    width: 45,
    height: 45,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  theoryMarkText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 17,
    fontWeight: '700',
  },
  theoryTitle: {
    fontFamily: fonts.serif,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  theoryCount: { color: colors.muted, fontSize: 11 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
