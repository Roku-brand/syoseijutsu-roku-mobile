import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { categoryPalette, colors, radius, spacing } from '@/constants/theme';
import { categories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';

export function generateStaticParams() {
  return categories.flatMap((category) =>
    category.subcategories.map((subcategory) => ({
      category: category.key,
      name: subcategory.name,
    })),
  );
}

export default function SubcategoryScreen() {
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
        <EmptyState
          title="テーマが見つかりません"
          description="前の画面へ戻ってください。"
        />
      </Screen>
    );
  }

  const cards = subcategory.items.map((item) => ({
    ...item,
    categoryKey: category.key,
    categoryName: category.name,
    subcategory: subcategory.name,
    articleTitle: subcategory.articleTitle ?? subcategory.name,
  }));
  const palette = categoryPalette[category.key];

  return (
    <Screen>
      <DetailHeader title={category.name} />
      <View style={styles.hero}>
        <AppText variant="title" style={styles.title}>
          {subcategory.name}
        </AppText>
        <AppText style={styles.description}>{subcategory.articleTitle}</AppText>
        <View style={styles.breadcrumb}>
          <AppText
            variant="label"
            style={[styles.breadcrumbActive, { backgroundColor: palette.accent }]}
          >
            {category.name}
          </AppText>
          <AppText style={styles.breadcrumbArrow}>›</AppText>
          <AppText variant="label" style={styles.breadcrumbText}>
            {subcategory.name}
          </AppText>
          <AppText style={styles.breadcrumbArrow}>›</AppText>
          <AppText variant="label" style={styles.breadcrumbText}>
            01〜{String(cards.length).padStart(2, '0')}
          </AppText>
        </View>
      </View>

      <View style={styles.sectionTitle}>
        <SectionHeader title={`${cards.length}の処世術`} />
        <View style={[styles.titleRule, { backgroundColor: palette.accent }]} />
      </View>

      <View style={styles.timeline}>
        {cards.map((card, index) => (
          <View key={card.id} style={styles.timelineItem}>
            <View style={styles.sequenceRail}>
              <AppText
                variant="label"
                style={[styles.sequenceNumber, { color: palette.accent }]}
              >
                {String(index + 1).padStart(2, '0')} / {String(cards.length).padStart(2, '0')}
              </AppText>
            </View>
            <TechniqueRow
              card={card}
              showCategory={false}
              accentColor={palette.accent}
              tintColor={palette.tint}
            />
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.lg },
  title: { marginTop: spacing.md },
  description: { marginTop: spacing.sm, color: colors.muted, fontSize: 16, lineHeight: 27 },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 10,
    minHeight: 50,
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  breadcrumbActive: {
    color: colors.paper,
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  breadcrumbText: { color: colors.gold, flexShrink: 1 },
  breadcrumbArrow: { color: colors.inkSoft, fontSize: 22, lineHeight: 24 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.section },
  titleRule: { height: 1, flex: 1, backgroundColor: colors.gold, opacity: 0.75, marginTop: 12 },
  timeline: { position: 'relative', paddingBottom: spacing.sm },
  timelineItem: { position: 'relative', marginBottom: spacing.sm },
  sequenceRail: {
    alignSelf: 'flex-start',
    minWidth: 56,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sequenceNumber: { color: colors.gold, fontSize: 10, lineHeight: 15, letterSpacing: 0.4 },
});
