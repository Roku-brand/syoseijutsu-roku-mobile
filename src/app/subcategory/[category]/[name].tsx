import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, DetailHeader, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { categoryPalette, colors, fonts, radius, spacing } from '@/constants/theme';
import { categories } from '@/data/catalog';
import { guidedTopicBySlug } from '@/data/guided-topics';
import type { CategoryKey } from '@/data/types';

const topicSlugsBySubcategory: Record<string, string[]> = {
  '関係の構築': ['good-impression', 'good-conversation', 'build-trust'],
  '関係の管理': ['maintain-relationships', 'avoid-exhaustion', 'read-people'],
  '集団での立ち回り': ['navigate-groups', 'command-respect', 'move-groups'],
  '評価の獲得': ['work-well', 'advance-career'],
  '交渉・合意の戦術': ['negotiate-well', 'build-consensus'],
  '目標達成': ['get-started', 'keep-going', 'produce-results'],
  '人生の指針': ['fulfill-life', 'design-life'],
  '不安の解消': ['handle-anxiety'],
  '人生のつまずき': ['recover-from-setbacks', 'make-luck'],
};

export function generateStaticParams() {
  return categories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({
      category: category.key,
      name: subcategory.name,
    })),
  );
}

export default function SubcategoryScreen() {
  const router = useRouter();
  const { category: categoryKey, name } = useLocalSearchParams<{
    category: CategoryKey;
    name: string;
  }>();
  const category = categories.find((item) => item.key === categoryKey);
  const subcategory = category?.subcategories.find((item) => item.name === name);

  if (!category || !subcategory) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState title="テーマが見つかりません" description="前の画面へ戻って選び直してください。" />
      </Screen>
    );
  }

  const palette = categoryPalette[category.key];
  const topics = (topicSlugsBySubcategory[subcategory.name] ?? [])
    .map((slug) => guidedTopicBySlug.get(slug))
    .filter(Boolean)
    .map((topic) => ({
      ...topic!,
      count: subcategory.items.filter((card) => card.tags?.includes(topic!.tag)).length,
    }))
    .filter((topic) => topic.count > 0);

  return (
    <Screen>
      <DetailHeader title="探す" />
      <View style={styles.hero}>
        <AppText variant="label" style={[styles.category, { color: palette.accent }]}>
          {category.name}
        </AppText>
        <AppText variant="title" style={styles.title}>{subcategory.name}</AppText>
        <AppText style={styles.description}>{subcategory.articleTitle}</AppText>
      </View>

      <SectionHeader title="人物像から選ぶ" />
      <View style={styles.grid}>
        {topics.map((topic, index) => (
          <Pressable
            key={topic.slug}
            accessibilityRole="button"
            accessibilityLabel={`${topic.label}を開く`}
            onPress={() =>
              router.push({
                pathname: '/topic/[slug]',
                params: {
                  slug: topic.slug,
                  category: category.key,
                  subcategory: subcategory.name,
                },
              })
            }
            style={({ pressed }) => [
              styles.topicCard,
              { borderColor: palette.accent, backgroundColor: palette.tint },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.number, { borderColor: palette.accent }]}>
              <AppText style={[styles.numberText, { color: palette.accent }]}>
                {index + 1}
              </AppText>
            </View>
            <View style={styles.copy}>
              <AppText variant="serif" style={styles.topicTitle}>{topic.label}</AppText>
              <AppText style={styles.topicDescription}>{topic.description}</AppText>
              <AppText variant="label" style={[styles.count, { color: palette.accent }]}>
                {topic.count}の処世術
              </AppText>
            </View>
            <AppText style={[styles.chevron, { color: palette.accent }]}>›</AppText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.lg, marginBottom: spacing.xxl },
  category: { fontSize: 12, letterSpacing: 1.2 },
  title: { marginTop: spacing.sm },
  description: { marginTop: spacing.sm, color: colors.muted, fontSize: 16, lineHeight: 27 },
  grid: { gap: spacing.md },
  topicCard: {
    minHeight: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    shadowColor: '#2B241A',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  number: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  numberText: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  copy: { flex: 1 },
  topicTitle: { color: colors.ink, fontSize: 21, lineHeight: 30, fontWeight: '700' },
  topicDescription: { marginTop: 5, color: colors.inkSoft, fontSize: 13, lineHeight: 21 },
  count: { marginTop: spacing.sm, fontSize: 11 },
  chevron: { fontSize: 28, lineHeight: 32 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
