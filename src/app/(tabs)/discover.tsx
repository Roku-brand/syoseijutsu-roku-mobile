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
import { useTabVisible } from '@/hooks/use-tab-visible';

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
  const isFocused = useTabVisible();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<BrowseMode>('techniques');
  const keywords = useMemo(
    () => query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );
  const techniqueMatches = useMemo(
    () =>
      !keywords.length
        ? []
        : techniqueCards.filter((card) => {
            const source = [
              card.title,
              card.subtitle,
              card.explanation,
              card.categoryName,
              card.subcategory,
              ...(card.tags ?? []),
            ]
              .filter(Boolean)
              .join(' ')
              .toLocaleLowerCase();
            return keywords.every((keyword) => source.includes(keyword));
          }),
    [keywords],
  );
  const theoryMatches = useMemo(
    () =>
      !keywords.length
        ? []
        : theories.filter((theory) => {
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
    [keywords],
  );

  if (!isFocused) return null;

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
                処世術から探す
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'theories' }}
              onPress={() => setMode('theories')}
              style={[styles.modeTab, mode === 'theories' && styles.modeTabActive]}
            >
              <AppText style={[styles.modeText, mode === 'theories' && styles.modeTextActive]}>
                理論から探す
              </AppText>
            </Pressable>
          </View>
          {mode === 'techniques' ? (
            <TechniqueBrowser router={router} />
          ) : (
            <TheoryBrowser router={router} />
          )}
        </>
      )}
    </BookScreen>
  );
}

function TechniqueBrowser({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <View>
      <OrnamentHeading>処世術から探す</OrnamentHeading>
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
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginBottom: spacing.xl,
  },
  searchIcon: { color: colors.gold, fontFamily: fonts.serif, fontSize: 28 },
  searchInput: {
    flex: 1,
    minHeight: 54,
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
    backgroundColor: colors.paperDeep,
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
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMarkText: {
    color: colors.gold,
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
