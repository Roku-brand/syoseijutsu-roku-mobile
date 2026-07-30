import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
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
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

const themeMarks: Record<CategoryKey, string[]> = {
  interpersonal: ['縁', '結', '群'],
  work: ['評', '交', '成'],
  life: ['軸', '安', '再'],
};

export function generateStaticParams() {
  return categories.map(({ key }) => ({ key }));
}

export default function CategoryDetailScreen() {
  const { key } = useLocalSearchParams<{ key: CategoryKey }>();
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
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
  const isWide = width >= 900;

  return (
    <Screen>
      <DetailHeader title="体系" />

      <View style={styles.intro}>
        <AppText variant="title" style={styles.pageTitle}>
          {meta.label}
        </AppText>
        <AppText style={styles.description}>{meta.description}</AppText>
      </View>

      <SectionHeader title="三つのテーマ" />

      <View style={[styles.grid, !isWide && styles.gridNarrow]}>
        {category.subcategories.map((subcategory, index) => (
          <Pressable
            key={subcategory.name}
            accessibilityRole="button"
            accessibilityLabel={`${subcategory.name}を開く`}
            onPress={() =>
              router.push({
                pathname: '/subcategory/[category]/[name]',
                params: { category: key, name: subcategory.name },
              })
            }
            style={({ pressed }) => [
              styles.item,
              isWide ? styles.itemWide : styles.itemNarrow,
              {
                backgroundColor: palette.tint,
                borderColor: palette.accent,
              },
              pressed && styles.pressed,
            ]}
          >
            <AppText
              style={[styles.backgroundIndex, { color: palette.accent }]}
              aria-hidden
            >
              {String(index + 1).padStart(2, '0')}
            </AppText>

            <View style={styles.cardTop}>
              <View
                style={[
                  styles.markBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: palette.accent,
                  },
                ]}
              >
                <AppText style={[styles.mark, { color: palette.accent }]}>
                  {themeMarks[key][index]}
                </AppText>
              </View>
            </View>

            <View style={styles.copy}>
              <AppText variant="serif" style={styles.itemTitle}>
                {subcategory.name}
              </AppText>
              <AppText style={styles.articleTitle}>
                {subcategory.articleTitle}
              </AppText>
            </View>

            <View
              style={[styles.divider, { backgroundColor: palette.soft }]}
            />

            <View style={styles.cardFooter}>
              <AppText
                variant="label"
                style={[styles.itemCount, { color: palette.accent }]}
              >
                {subcategory.items.length}の処世術
              </AppText>
              <AppText style={[styles.chevron, { color: palette.accent }]}>
                ›
              </AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.xl },
  pageTitle: { color: colors.ink, fontSize: 34, lineHeight: 46 },
  description: {
    color: colors.inkSoft,
    marginTop: spacing.sm,
    lineHeight: 25,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  gridNarrow: {
    flexDirection: 'column',
  },
  item: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 286,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#2B241A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  itemWide: { flex: 1 },
  itemNarrow: { width: '100%', minHeight: 238 },
  backgroundIndex: {
    position: 'absolute',
    left: 20,
    top: 12,
    fontFamily: undefined,
    fontSize: 76,
    lineHeight: 90,
    opacity: 0.1,
  },
  cardTop: {
    alignItems: 'flex-end',
    minHeight: 72,
  },
  markBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  copy: { flex: 1 },
  itemTitle: {
    color: colors.ink,
    fontSize: 25,
    lineHeight: 35,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  articleTitle: {
    color: colors.inkSoft,
    lineHeight: 23,
  },
  divider: {
    height: 1,
    marginTop: spacing.lg,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  itemCount: { fontSize: 12 },
  chevron: { fontSize: 30, lineHeight: 32 },
});
