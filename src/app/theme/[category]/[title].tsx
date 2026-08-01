import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, DetailHeader, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { categoryPalette, colors, fonts, radius, spacing } from '@/constants/theme';
import { categories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';

export function generateStaticParams() {
  return categories.flatMap((category) =>
    [...new Set(category.subcategories.map((persona) => persona.articleTitle ?? 'その他'))]
      .map((title) => ({ category: category.key, title })),
  );
}

export default function ThemeScreen() {
  const { category: categoryKey, title } = useLocalSearchParams<{
    category: CategoryKey;
    title: string;
  }>();
  const router = useRouter();
  const category = categories.find((item) => item.key === categoryKey);
  const personas = category?.subcategories.filter(
    (persona) => (persona.articleTitle ?? 'その他') === title,
  );

  if (!category || !personas?.length) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="テーマが見つかりません"
          description="前の画面へ戻って、テーマを選び直してください。"
        />
      </Screen>
    );
  }

  const palette = categoryPalette[category.key];
  const count = personas.reduce((total, persona) => total + persona.items.length, 0);

  return (
    <Screen>
      <DetailHeader title="テーマから探す" />

      <View style={[styles.hero, { borderColor: palette.accent, backgroundColor: palette.tint }]}>
        <AppText style={[styles.breadcrumb, { color: palette.accent }]}>{category.name}　›</AppText>
        <AppText variant="title" style={styles.title}>{title}</AppText>
        <AppText style={styles.description}>
          {personas.length}の人物像から、{count}件の処世術を探す
        </AppText>
      </View>

      <SectionHeader title="人物像を選ぶ" count={personas.length} />

      <View style={styles.personaTabs}>
        {personas.map((persona) => {
          const index = category.subcategories.indexOf(persona) + 1;
          return (
            <Pressable
              key={persona.name}
              accessibilityRole="button"
              accessibilityLabel={`${persona.name}、${persona.items.length}件`}
              onPress={() =>
                router.push({
                  pathname: '/subcategory/[category]/[name]',
                  params: { category: category.key, name: persona.name },
                })
              }
              style={({ pressed }) => [
                styles.personaTab,
                { borderColor: palette.accent, backgroundColor: palette.tint },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.personaNumber, { borderColor: palette.accent }]}>
                <AppText style={[styles.personaNumberText, { color: palette.accent }]}>
                  {String(index).padStart(2, '0')}
                </AppText>
              </View>
              <View style={styles.personaCopy}>
                <AppText style={[styles.path, { color: palette.accent }]}>
                  {category.name}　›　{title}　›
                </AppText>
                <AppText variant="serif" style={styles.personaTitle}>{persona.name}</AppText>
                <AppText style={[styles.personaCount, { color: palette.accent }]}>
                  構成する処世術　{persona.items.length}件
                </AppText>
              </View>
              <AppText style={[styles.chevron, { color: palette.accent }]}>›</AppText>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, borderWidth: 1, borderRadius: radius.lg },
  breadcrumb: { fontSize: 11, lineHeight: 17, fontWeight: '700' },
  title: { marginTop: spacing.xs, color: colors.ink, fontSize: 32, lineHeight: 44 },
  description: { marginTop: spacing.sm, color: colors.inkSoft, lineHeight: 24 },
  personaTabs: { gap: spacing.md },
  personaTab: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  personaNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  personaNumberText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700' },
  personaCopy: { flex: 1 },
  path: { fontSize: 10, lineHeight: 16, marginBottom: 2 },
  personaTitle: { fontSize: 20, lineHeight: 29, fontWeight: '700' },
  personaCount: { marginTop: 3, fontSize: 11, lineHeight: 17 },
  chevron: { fontSize: 30, lineHeight: 34 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
