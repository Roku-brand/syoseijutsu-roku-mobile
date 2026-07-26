import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, BrandMark, PrimaryButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { techniqueCards, theories } from '@/data/catalog';
import { useAppState } from '@/state/app-state';

export default function OnboardingScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAppState();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <BrandMark />
        <View style={styles.rule} />
        <AppText variant="display" style={styles.headline}>
          人生に必要な{`\n`}処世術を、すべてここに。
        </AppText>
        <AppText style={styles.description}>
          情報があふれる時代だからこそ、{`\n`}現実で使える知恵だけを体系化。{`\n`}
          うまく生きるための判断原則を、この一冊に。
        </AppText>
        <View style={styles.promise}>
          <AppText variant="label" style={styles.promiseLabel}>
            {techniqueCards.length}の処世術 · {theories.length}の理論
          </AppText>
          <AppText variant="caption">
            広告なし・ログイン不要・個人データの外部送信なし
          </AppText>
        </View>
      </View>
      <PrimaryButton
        onPress={() => {
          void Haptics.selectionAsync();
          completeOnboarding([]);
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
});
