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
  { id: 'psychology', title: '心理学', mark: '心' },
  { id: 'behavioral-science', title: '行動科学', mark: '動' },
  { id: 'organization-management', title: '組織・経営論', mark: '組' },
  { id: 'strategy', title: '戦略論', mark: '戦' },
  { id: 'classics-thought', title: '古典・思想', mark: '古' },
  { id: 'maxims-experience', title: '格言・経験則', mark: '格' },
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

      <SectionHeader title="三つの処世術" count={categories.length} />
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
        六つの出自から、処世術を支える知識と経験知を辿れます。
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
