import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, ChoiceCard, Header, Screen, SectionHeader } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import {
  categories,
  categoryMeta,
  categoryOrder,
  theories,
} from '@/data/catalog';

const theoryCategories = [
  { id: 'cognition', title: '認知・感情', mark: '認' },
  { id: 'behavior', title: '行動・意思決定', mark: '動' },
  { id: 'social', title: '社会・関係', mark: '社' },
  { id: 'structure', title: '構造・戦略', mark: '構' },
  { id: 'wisdom', title: '哲学・経験知', mark: '知' },
];

export default function CatalogScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Header
        eyebrow="知識から辿る"
        title="体系"
        description="悩みではなく、知識の全体像から処世術を学ぶ。"
      />

      <View style={styles.principle}>
        <AppText variant="label" style={styles.principleLabel}>
          基本原則
        </AppText>
        <AppText variant="serif" style={styles.principleTitle}>
          処世術は万能ではない。
        </AppText>
        <AppText style={styles.principleBody}>
          人・場・力関係・時間軸が変われば、同じ術でも結果は反転する。
          知識を信念にせず、状況に合わせて運用する。
        </AppText>
      </View>

      <SectionHeader title="五つの領域" count={categories.length} />
      {categoryOrder.map((key) => {
        const category = categories.find((item) => item.key === key);
        if (!category) return null;
        const count = category.subcategories.reduce(
          (sum, item) => sum + item.items.length,
          0,
        );
        return (
          <ChoiceCard
            key={key}
            title={categoryMeta[key].label}
            description={`${categoryMeta[key].description} · ${count}件`}
            mark={categoryMeta[key].mark}
            onPress={() =>
              router.push({ pathname: '/category/[key]', params: { key } })
            }
          />
        );
      })}

      <SectionHeader title="理論辞典" count={theories.length} />
      <AppText style={styles.theoryIntro}>
        理論の理解は、処世術を「信念」から「技術」に変えます。
      </AppText>
      <View style={styles.theoryGrid}>
        {theoryCategories.map((category) => {
          const count = theories.filter(
            (theory) => theory.categoryId === category.id,
          ).length;
          return (
            <Link
              key={category.id}
              href={{
                pathname: '/theories/[category]',
                params: { category: category.id },
              }}
              asChild
            >
              <Pressable style={({ pressed }) => [styles.theoryCard, pressed && styles.pressed]}>
                <AppText style={styles.theoryMark}>{category.mark}</AppText>
                <AppText variant="serif" style={styles.theoryTitle}>
                  {category.title}
                </AppText>
                <AppText variant="caption">{count}の理論</AppText>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  principle: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  principleLabel: { color: colors.goldLight },
  principleTitle: {
    color: colors.paper,
    fontSize: 23,
    lineHeight: 34,
    marginTop: spacing.md,
  },
  principleBody: { color: '#C7C7BE', marginTop: spacing.md },
  theoryIntro: { color: colors.muted, marginBottom: spacing.lg },
  theoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  theoryCard: {
    width: '48%',
    minHeight: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  pressed: { opacity: 0.65 },
  theoryMark: {
    color: colors.gold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
  },
  theoryTitle: { fontSize: 16, lineHeight: 23 },
});
