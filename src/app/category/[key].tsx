import { Link, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Pill,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { categories, categoryMeta } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';

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
  const total = category.subcategories.reduce(
    (sum, item) => sum + item.items.length,
    0,
  );

  return (
    <Screen>
      <DetailHeader title="体系" />
      <View style={styles.hero}>
        <AppText style={styles.mark}>{meta.mark}</AppText>
        <View style={styles.heroCopy}>
          <AppText variant="title" style={styles.title}>
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
          <Pressable style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
            <View style={styles.index}>
              <AppText variant="label" style={styles.indexText}>
                {String(index + 1).padStart(2, '0')}
              </AppText>
            </View>
            <View style={styles.copy}>
              <AppText variant="serif" style={styles.itemTitle}>
                {subcategory.name}
              </AppText>
              <AppText variant="caption">{subcategory.articleTitle}</AppText>
            </View>
            <Pill>{subcategory.items.length}</Pill>
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
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  mark: { color: colors.goldLight, fontSize: 36, lineHeight: 44, fontWeight: '700' },
  heroCopy: { flex: 1 },
  title: { color: colors.paper },
  description: { color: '#C3C4BC', marginTop: 4 },
  item: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: spacing.md,
  },
  pressed: { opacity: 0.65 },
  index: { width: 38 },
  indexText: { color: colors.gold },
  copy: { flex: 1 },
  itemTitle: { fontSize: 18, lineHeight: 26, marginBottom: 4 },
  total: { textAlign: 'center', marginTop: spacing.lg },
});
