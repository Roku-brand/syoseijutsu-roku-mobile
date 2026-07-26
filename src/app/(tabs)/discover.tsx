import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  AppText,
  ChoiceCard,
  Header,
  Pill,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { TechniqueRow } from '@/components/technique-row';
import { colors, radius, spacing } from '@/constants/theme';
import { categories, categoryMeta, categoryOrder, techniqueCards } from '@/data/catalog';
import { goalsForCategory, rankByGoal, type SearchGoal } from '@/data/search';
import type { CategoryKey } from '@/data/types';

type Step = 'category' | 'situation' | 'goal' | 'results';

export default function DiscoverScreen() {
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [goal, setGoal] = useState<SearchGoal | null>(null);
  const [query, setQuery] = useState('');

  const selectedCategory = categories.find((item) => item.key === category);
  const guidedResults = useMemo(() => {
    if (!category || !subcategory || !goal) return [];
    return rankByGoal(
      techniqueCards.filter(
        (card) =>
          card.categoryKey === category && card.subcategory === subcategory,
      ),
      goal.id,
    );
  }, [category, subcategory, goal]);

  const keywordResults = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return [];
    return techniqueCards
      .filter((card) =>
        [
          card.title,
          card.subtitle,
          card.explanation,
          card.categoryName,
          card.subcategory,
          card.articleTitle,
          ...(card.tags ?? []),
          ...(card.theories ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
          .includes(keyword),
      )
      .slice(0, 30);
  }, [query]);

  const isKeywordSearch = query.trim().length > 0;

  const reset = () => {
    setStep('category');
    setCategory(null);
    setSubcategory(null);
    setGoal(null);
  };

  const goBack = () => {
    if (step === 'situation') {
      setStep('category');
      setCategory(null);
    } else if (step === 'goal') {
      setStep('situation');
      setSubcategory(null);
    } else if (step === 'results') {
      setStep('goal');
      setGoal(null);
    }
  };

  const stepIndex = { category: 1, situation: 2, goal: 3, results: 3 }[step];

  return (
    <Screen key={step}>
      <Header
        eyebrow="状況から引く"
        title="探す"
        description="言葉から探すか、状況から辿るか。"
        right={
          step !== 'category' ? (
            <Pressable onPress={reset} hitSlop={8}>
              <AppText variant="label" style={styles.reset}>
                最初から
              </AppText>
            </Pressable>
          ) : undefined
        }
      />

      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="例：舐められたくない、交渉、不安"
          placeholderTextColor={colors.muted}
          accessibilityLabel="処世術をキーワードで検索"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {isKeywordSearch && (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <AppText variant="label" style={styles.clear}>消す</AppText>
          </Pressable>
        )}
      </View>

      {isKeywordSearch ? (
        <>
          <SectionHeader title="検索結果" count={keywordResults.length} />
          {keywordResults.length ? (
            keywordResults.map((card) => <TechniqueRow key={card.id} card={card} />)
          ) : (
            <View style={styles.noResult}>
              <AppText variant="serif" style={styles.noResultTitle}>
                該当する処世術は見つかりませんでした。
              </AppText>
                <AppText variant="caption">
                  検索語を変えるか、検索を消して分類から探してください。
                </AppText>
            </View>
          )}
        </>
      ) : (
        <>

      <View style={styles.progress}>
        {[1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.progressItem,
              index <= stepIndex && styles.progressItemActive,
            ]}
          />
        ))}
      </View>

      {step !== 'category' && (
        <Pressable onPress={goBack} style={styles.back}>
          <AppText style={styles.backArrow}>‹</AppText>
          <AppText variant="label">一つ戻る</AppText>
        </Pressable>
      )}

      {step === 'category' && (
        <>
          <AppText variant="serif" style={styles.question}>
            何について悩んでいますか？
          </AppText>
          {categoryOrder.map((key) => (
            <ChoiceCard
              key={key}
              title={categoryMeta[key].label}
              description={categoryMeta[key].description}
              mark={categoryMeta[key].mark}
              onPress={() => {
                void Haptics.selectionAsync();
                setCategory(key);
                setStep('situation');
              }}
            />
          ))}
        </>
      )}

      {step === 'situation' && selectedCategory && (
        <>
          <View style={styles.selectionSummary}>
            <Pill active>{selectedCategory.name}</Pill>
          </View>
          <AppText variant="serif" style={styles.question}>
            どの状況に近いですか？
          </AppText>
          {selectedCategory.subcategories.map((item) => (
            <ChoiceCard
              key={item.name}
              title={item.name}
              description={item.articleTitle}
              onPress={() => {
                void Haptics.selectionAsync();
                setSubcategory(item.name);
                setStep('goal');
              }}
            />
          ))}
        </>
      )}

      {step === 'goal' && category && subcategory && (
        <>
          <View style={styles.selectionSummary}>
            <Pill>{categoryMeta[category].label}</Pill>
            <AppText variant="caption">›</AppText>
            <Pill active>{subcategory}</Pill>
          </View>
          <AppText variant="serif" style={styles.question}>
            どうなりたいですか？
          </AppText>
          {goalsForCategory(category).map((item) => (
            <ChoiceCard
              key={item.id}
              title={item.label}
              description={item.description}
              onPress={() => {
                void Haptics.selectionAsync();
                setGoal(item);
                setStep('results');
              }}
            />
          ))}
        </>
      )}

      {step === 'results' && category && subcategory && goal && (
        <>
          <View style={styles.resultHero}>
            <AppText variant="label" style={styles.resultEyebrow}>
              今の状況に近い処世術
            </AppText>
            <AppText variant="serif" style={styles.resultTitle}>
              {categoryMeta[category].label}の「{subcategory}」で、
              {goal.label}
            </AppText>
            <AppText variant="caption" style={styles.resultNote}>
              一つの正解ではなく、使えそうな選択肢を上から並べています。
            </AppText>
          </View>
          <SectionHeader title="処世術" count={guidedResults.length} />
          {guidedResults.map((card) => (
            <TechniqueRow key={card.id} card={card} showCategory={false} />
          ))}
        </>
      )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, color: colors.ink, fontSize: 15, fontFamily: 'System' },
  clear: { color: colors.gold, paddingVertical: spacing.sm },
  noResult: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  noResultTitle: { fontSize: 17, lineHeight: 26 },
  reset: { color: colors.gold, paddingTop: 10 },
  progress: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
  progressItem: {
    flex: 1,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.line,
  },
  progressItemActive: { backgroundColor: colors.gold },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: spacing.lg,
  },
  backArrow: { fontSize: 25, lineHeight: 26, color: colors.gold },
  question: { fontSize: 22, lineHeight: 32, marginBottom: spacing.lg },
  selectionSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
  },
  resultHero: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  resultEyebrow: { color: colors.goldLight, marginBottom: spacing.sm },
  resultTitle: { color: colors.paper, fontSize: 21, lineHeight: 34 },
  resultNote: { color: '#BDBEB6', marginTop: spacing.md },
});
