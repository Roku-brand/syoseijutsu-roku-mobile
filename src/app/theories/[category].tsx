import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TheoryArchiveCard } from '@/components/theory-archive-card';
import { AppText, DetailHeader, EmptyState, Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { theories } from '@/data/catalog';

const categoryDescriptions: Record<string, string> = {
  psychology: '人の認知・感情・対人関係を理解する',
  'behavioral-science': '選択・習慣・行動変容の仕組みを読む',
  'organization-management': '組織・評価・権力・協働の力学を読む',
  strategy: '競争・交渉・不確実性の中で勝ち筋をつくる',
  'classics-thought': '古典に残る判断と人間観を現代へ引き寄せる',
  'maxims-experience': '格言・経験則・作品から判断の軸を得る',
};

export function generateStaticParams() {
  return [...new Set(theories.map((theory) => theory.categoryId))].map(
    (category) => ({ category }),
  );
}

export default function TheoryCategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const items = theories.filter((theory) => theory.categoryId === category);
  const title = items[0]?.categoryTitle;

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
    <Screen contentContainerStyle={styles.screenContent}>
      <DetailHeader title="理論辞典" />
      <View style={styles.hero}>
        <AppText variant="display" style={styles.title}>
          {title}
        </AppText>
        <AppText style={styles.description}>
          {categoryDescriptions[category] ?? '処世術を支える知識を読む'}
        </AppText>
      </View>

      <View style={styles.sectionTitle}>
        <AppText variant="serif" style={styles.sectionLabel}>
          {items.length}の理論
        </AppText>
        <View style={styles.rule} />
        <AppText style={styles.ruleMark}>✦</AppText>
      </View>

      <View style={styles.cards}>
        {items.map((theory, index) => (
          <TheoryArchiveCard
            key={theory.tagId}
            theory={theory}
            index={index}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { maxWidth: 1280 },
  hero: { marginTop: spacing.md },
  title: { marginTop: spacing.lg, fontSize: 46, lineHeight: 59 },
  description: {
    marginTop: spacing.md,
    color: colors.inkSoft,
    fontSize: 17,
    lineHeight: 28,
  },
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
});
