import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import { AppText, DetailHeader, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { categoryPalette, colors, spacing } from '@/constants/theme';
import { categories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';

export function generateStaticParams() {
  return categories.flatMap((category) => category.subcategories.map((subcategory) => ({ category: category.key, name: subcategory.name })));
}

export default function SubcategoryScreen() {
  const { category: categoryKey, name } = useLocalSearchParams<{ category: CategoryKey; name: string }>();
  const category = categories.find((item) => item.key === categoryKey);
  const persona = category?.subcategories.find((item) => item.name === name);
  if (!category || !persona) return <Screen><DetailHeader /><EmptyState title="人物像が見つかりません" description="前の画面へ戻って、人物像を選び直してください。" /></Screen>;
  const palette = categoryPalette[category.key];
  return <Screen>
    <DetailHeader title="人物像から探す" />
    <View style={styles.hero}>
      <AppText variant="label" style={[styles.category, { color: palette.accent }]}>{category.name}</AppText>
      <AppText variant="title" style={styles.title}>{persona.name}</AppText>
      <AppText style={styles.description}>{persona.articleTitle}</AppText>
      <View style={[styles.countPill, { borderColor: palette.accent }]}><AppText style={[styles.countText, { color: palette.accent }]}>構成する処世術　{persona.items.length}件</AppText></View>
    </View>
    <SectionHeader title="構成する処世術" count={persona.items.length} />
    <View style={styles.list}>{persona.items.map((item) => <TechniqueRow key={item.id} card={{ ...item, categoryKey: category.key, categoryName: category.name, subcategory: persona.name, articleTitle: persona.articleTitle ?? persona.name }} />)}</View>
  </Screen>;
}

const styles = StyleSheet.create({
  hero: { marginTop: spacing.lg, marginBottom: spacing.xxl }, category: { fontSize: 12, letterSpacing: 1.2 }, title: { marginTop: spacing.sm }, description: { marginTop: spacing.sm, color: colors.muted, fontSize: 16, lineHeight: 27 }, countPill: { alignSelf: 'flex-start', marginTop: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: 8, borderWidth: 1, borderRadius: 99, backgroundColor: colors.surface }, countText: { fontSize: 12, fontWeight: '700' }, list: { gap: spacing.sm },
});
