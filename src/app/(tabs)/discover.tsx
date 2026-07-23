import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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

  const selectedCategory = categories.find((item) => item.key === category);
  const results = useMemo(() => {
    if (!category || !subcategory || !goal) return [];
    return rankByGoal(
      techniqueCards.filter(
        (card) =>
          card.categoryKey === category && card.subcategory === subcategory,
      ),
      goal.id,
    );
  }, [category, subcategory, goal]);

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
        description="三つの選択で、今の場面に近い処世術へ。"
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
          <SectionHeader title="処世術" count={results.length} />
          {results.map((card) => (
            <TechniqueRow key={card.id} card={card} showCategory={false} />
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
