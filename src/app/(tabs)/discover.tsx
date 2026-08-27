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
import { useAccess } from '@/access/access-state';
import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '@/access/access-config';
import { getCategoryTechniqueCount } from '@/data/technique-counts';
import { getTheoryCategoryCount } from '@/data/theory-counts';
import { AccessBadge } from '@/components/access-badge';

type BrowseMode = 'techniques' | 'theories';

const searchAliases: Record<string, string[]> = {
  '友達': ['友達', '人間関係', '関係'],
  '出世': ['出世', '評価', '昇進', 'キャリア'],
  '進路': ['進路', '選択', 'キャリア', '方向性'],
  '転職': ['転職', 'キャリア', '仕事'],
  '自己肯定感': ['自己肯定感', '自信', '自己評価'],
  'リーダーシップ': ['リーダーシップ', 'リーダー', '集団'],
  '習慣': ['習慣', '継続', '行動'],
  '交渉': ['交渉', '合意', '説得'],
};

function matchesKeyword(source: string, keyword: string) {
  return (searchAliases[keyword] ?? [keyword]).some((term) => source.includes(term));
}

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
            return keywords.every((keyword) => matchesKeyword(source, keyword));
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
            return keywords.every((keyword) => matchesKeyword(source, keyword));
          }),
    [isPaid, keywords],
  );

  return (
    <BookScreen contentContainerStyle={styles.discoverContent}>
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
                処世術　{isPaid ? techniqueCards.length : FREE_TECHNIQUE_IDS.size}
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'theories' }}
              onPress={() => setMode('theories')}
              style={[styles.modeTab, mode === 'theories' && styles.modeTabActive]}
            >
              <AppText style={[styles.modeText, mode === 'theories' && styles.modeTextActive]}>
                理論　{isPaid ? theories.length : FREE_THEORY_ID_SET.size}
              </AppText>
            </Pressable>
          </View>
          {mode === 'techniques' ? (
            <TechniqueBrowser
              router={router}
              onSearch={setQuery}
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
}: {
  router: ReturnType<typeof useRouter>;
  onSearch: (value: string) => void;
}) {
  const { isPaid } = useAccess();
  return (
    <View>
      <OrnamentHeading>領域から探す</OrnamentHeading>
      <View style={styles.categoryGrid}>
        {categoryOrder.map((key) => {
          const category = categories.find((item) => item.key === key);
          if (!category) return null;
          const freeCount = category.subcategories.reduce(
            (total, persona) =>
              total + persona.items.filter((item) => FREE_TECHNIQUE_IDS.has(item.id)).length,
            0,
          );
          const count = getCategoryTechniqueCount(key);
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
              <AppText style={styles.categoryCount}>{isPaid ? `${count}件` : `無料 ${freeCount}件 ／ 全${count}件`}</AppText>
              {!isPaid && freeCount === 0 ? <View style={styles.browserLock}><AccessBadge locked compact /></View> : null}
            </Pressable>
          );
        })}
      </View>
      <OrnamentHeading>よく見られる検索</OrnamentHeading>
      <View style={styles.chipGrid}>
        {['友達', '出世', '進路', '会話', '人間関係', '転職', '恋愛', '不安', '自己肯定感', 'リーダーシップ', '習慣', '交渉'].map((label) => (
          <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}で検索`} onPress={() => onSearch(label)} style={({ pressed }) => [styles.popularChip, pressed && styles.pressed]}>
            <AppText style={styles.searchChipText}>{label}　⌕</AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TheoryBrowser({ router }: { router: ReturnType<typeof useRouter> }) {
  const { isPaid } = useAccess();
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
              {isPaid
                ? `${getTheoryCategoryCount(category.id)}件`
                : `無料 ${theories.filter((theory) => theory.categoryId === category.id && FREE_THEORY_ID_SET.has(theory.tagId)).length}件 ／ 全${getTheoryCategoryCount(category.id)}件`}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  discoverContent: { paddingBottom: spacing.xl * 2 },
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
  resultCount: { color: colors.gold, fontWeight: '700' },
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
    position: 'relative',
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
  browserLock: { position: 'absolute', top: 10, right: 10 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  popularChip: { flexGrow: 1, flexBasis: '28%', minHeight: 38, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  searchChipText: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, fontWeight: '600' },
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
