import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, BrandMark, ChoiceCard, PrimaryButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { categoryMeta, categoryOrder } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';
import { useAppState } from '@/state/app-state';

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAppState();
  const [step, setStep] = useState<0 | 1>(0);
  const [selected, setSelected] = useState<CategoryKey[]>(categoryOrder);

  if (step === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.hero}>
          <BrandMark />
          <View style={styles.rule} />
          <AppText variant="display" style={styles.headline}>
            人生の判断と{'\n'}立ち回りにOSを。
          </AppText>
          <AppText style={styles.description}>
            情報過多の時代に、本質だけを残す。社会科学・心理学・経験則から、
            現実で使える判断原則を一枚ずつ。
          </AppText>
          <View style={styles.promise}>
            <AppText variant="label" style={styles.promiseLabel}>
              434の処世術 · 526の理論
            </AppText>
            <AppText variant="caption">
              広告なし・ログイン不要・個人データの外部送信なし
            </AppText>
          </View>
        </View>
        <PrimaryButton
          onPress={() => {
            void Haptics.selectionAsync();
            setStep(1);
          }}
        >
          はじめる
        </PrimaryButton>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.selectionHeader}>
        <AppText variant="label" style={styles.stepLabel}>
          最初の設定
        </AppText>
        <AppText variant="title">関心のある領域</AppText>
        <AppText style={styles.selectionDescription}>
          メインに表示する傾向を整えます。あとからいつでも変更できます。
        </AppText>
      </View>
      <ScrollView
        style={styles.choices}
        contentContainerStyle={styles.choicesContent}
        showsVerticalScrollIndicator={false}
      >
        {categoryOrder.map((key) => {
          const meta = categoryMeta[key];
          const isSelected = selected.includes(key);
          return (
            <ChoiceCard
              key={key}
              title={meta.label}
              description={meta.description}
              mark={meta.mark}
              selected={isSelected}
              onPress={() => {
                void Haptics.selectionAsync();
                setSelected((current) =>
                  current.includes(key)
                    ? current.filter((item) => item !== key)
                    : [...current, key],
                );
              }}
            />
          );
        })}
      </ScrollView>
      <PrimaryButton
        disabled={selected.length === 0}
        onPress={() => {
          completeOnboarding(selected);
          router.replace('/(tabs)');
        }}
      >
        処世術を読む
      </PrimaryButton>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  hero: { flex: 1, justifyContent: 'center' },
  rule: { width: 48, height: 1, backgroundColor: colors.gold, marginVertical: 36 },
  headline: { fontSize: 35, lineHeight: 54 },
  description: { color: colors.inkSoft, fontSize: 16, lineHeight: 29, marginTop: 24 },
  promise: {
    marginTop: 36,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 6,
  },
  promiseLabel: { color: colors.gold },
  selectionHeader: { marginTop: spacing.md, marginBottom: spacing.lg },
  stepLabel: { color: colors.gold, marginBottom: 6 },
  selectionDescription: { color: colors.muted, marginTop: spacing.sm },
  choices: { flex: 1 },
  choicesContent: { paddingBottom: spacing.md },
});
