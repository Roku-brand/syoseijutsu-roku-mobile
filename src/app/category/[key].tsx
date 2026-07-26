import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { categoryPalette, colors, radius, spacing } from '@/constants/theme';
import { categories, categoryMeta } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';

export function generateStaticParams() {
  return categories.map(({ key }) => ({ key }));
}

export default function CategoryDetailScreen() {
  const { key } = useLocalSearchParams<{ key: CategoryKey }>();
  const category = categories.find((item) => item.key === key);

  if (!category || !categoryMeta[key]) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="カテゴリが見つかりません"
          description="前の画面へ戻ってください。"
        />
      </Screen>
    );
  }

  const meta = categoryMeta[key];
  const palette = categoryPalette[key];
  const total = category.subcategories.reduce(
    (sum, item) => sum + item.items.length,
    0,
  );

  return (
    <Screen>
      <DetailHeader title="体系" />
      <View
        style={[
          styles.hero,
          { backgroundColor: palette.tint, borderColor: palette.accent },
        ]}
      >
        <View style={[styles.markBox, { backgroundColor: palette.accent }]}>
          <AppText style={styles.mark}>{meta.mark}</AppText>
        </View>
        <View style={styles.heroCopy}>
          <AppText
            variant="title"
            style={[styles.title, { color: palette.accent }]}
          >
            {meta.label}
          </AppText>
          <AppText style={styles.description}>{meta.description}</AppText>
        </View>
      </View>
      <SectionHeader title="テーマ" count={category.subcategories.length} />
      {category.subcategories.map((subcategory, index) => (
        <Link
          key={subcategory.name}
          href={{
            pathname: '/subcategory/[category]/[name]',
            params: { category: key, name: subcategory.name },
          }}
          asChild
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${subcategory.name}を開く`}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View
              style={[
                styles.index,
                { backgroundColor: palette.tint, borderColor: palette.soft },
              ]}
            >
              <AppText
                variant="label"
                style={[styles.indexText, { color: palette.accent }]}
              >
                {String(index + 1).padStart(2, '0')}
              </AppText>
            </View>
            <View style={styles.copy}>
              <AppText variant="serif" style={styles.itemTitle}>
                {subcategory.name}
              </AppText>
              <AppText variant="caption">{subcategory.articleTitle}</AppText>
              <AppText
                variant="label"
                style={[styles.itemCount, { color: palette.accent }]}
              >
                {subcategory.items.length}の処世術
              </AppText>
            </View>
            <AppText style={[styles.chevron, { color: palette.accent }]}>›</AppText>
          </Pressable>
        </Link>
      ))}
      <AppText variant="caption" style={styles.total}>
        この領域には全{total}件の処世術があります。
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  markBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { color: colors.white, fontSize: 32, lineHeight: 40, fontWeight: '700' },
  heroCopy: { flex: 1 },
  title: { color: colors.ink },
  description: { color: colors.inkSoft, marginTop: spacing.sm, lineHeight: 25 },
  item: {
    minHeight: 124,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#2B241A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  pressed: { opacity: 0.65 },
  index: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: { color: colors.gold },
  copy: { flex: 1 },
  itemTitle: { fontSize: 20, lineHeight: 29, marginBottom: 6 },
  itemCount: { marginTop: spacing.sm, fontSize: 10 },
  chevron: { color: colors.gold, fontSize: 26, lineHeight: 30 },
  total: { textAlign: 'center', marginTop: spacing.xl, marginBottom: spacing.lg },
});
