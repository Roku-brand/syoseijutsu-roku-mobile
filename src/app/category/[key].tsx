import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import { AppText, DetailHeader, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { categoryPalette, colors, fonts, radius, spacing } from '@/constants/theme';
import { categories, categoryMeta, techniqueCards } from '@/data/catalog';
import type { CatalogCategory } from '@/data/types';

export function generateStaticParams() {
  return [{ key: 'all' }, ...categories.map(({ key }) => ({ key }))];
}

export default function CategoryDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();

  if (key === 'all') {
    return (
      <Screen>
        <DetailHeader title="探す" />
        <SectionHeader title="処世術" count={techniqueCards.length} />
        {techniqueCards.map((card) => <TechniqueRow key={card.id} card={card} />)}
      </Screen>
    );
  }

  const category = categories.find((item) => item.key === key);
  if (!category) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="カテゴリが見つかりません"
          description="前の画面へ戻って、別のカテゴリを選んでください。"
        />
      </Screen>
    );
  }

  const meta = categoryMeta[category.key];
  const palette = categoryPalette[category.key];
  const themes = groupByTheme(category);

  return (
    <Screen>
      <DetailHeader title="処世術から探す" />

      <SectionHeader title="テーマを選ぶ" count={themes.length} />

      <View style={styles.themeTabs}>
        {themes.map((theme, index) => (
          <Pressable
            key={theme.title}
            accessibilityRole="button"
            accessibilityLabel={`${theme.title}、${theme.count}件`}
            onPress={() =>
              router.push({
                pathname: '/theme/[category]/[title]',
                params: { category: category.key, title: theme.title },
              })
            }
            style={({ pressed }) => [
              styles.themeTab,
              { borderColor: palette.accent, backgroundColor: palette.tint },
              pressed && styles.pressed,
            ]}
          >
            <AppText style={[styles.themeTabIndex, { color: palette.accent }]}>
              {String(index + 1).padStart(2, '0')}
            </AppText>
            <AppText variant="serif" style={styles.themeTabTitle}>{theme.title}</AppText>
            <AppText style={[styles.themeTabCount, { color: palette.accent }]}>
              {theme.personas.length}の人物像・{theme.count}件
            </AppText>
            <AppText style={[styles.chevron, { color: palette.accent }]}>›</AppText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function groupByTheme(category: CatalogCategory) {
  const groups = new Map<string, CatalogCategory['subcategories']>();
  category.subcategories.forEach((persona) => {
    const title = persona.articleTitle ?? 'その他';
    groups.set(title, [...(groups.get(title) ?? []), persona]);
  });
  return [...groups.entries()].map(([title, personas]) => ({
    title,
    personas,
    count: personas.reduce((total, persona) => total + persona.items.length, 0),
  }));
}

const styles = StyleSheet.create({
  themeTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  themeTab: {
    position: 'relative',
    flexGrow: 1,
    flexBasis: 250,
    minHeight: 146,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  themeTabIndex: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
  themeTabTitle: { fontSize: 19, lineHeight: 28, textAlign: 'center', fontWeight: '700' },
  themeTabCount: { fontSize: 11, lineHeight: 17 },
  chevron: { position: 'absolute', right: spacing.md, fontSize: 28, lineHeight: 32 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.985 }] },
});
