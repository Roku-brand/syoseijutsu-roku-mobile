import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, DetailHeader, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { categoryPalette, colors, fonts, radius, spacing } from '@/constants/theme';
import { categories, getTechniqueDisplayId } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';

export function generateStaticParams() {
  return categories.flatMap((category) =>
    category.subcategories.map((persona) => ({
      category: category.key,
      name: persona.name,
    })),
  );
}

export default function PersonaScreen() {
  const { category: categoryKey, name } = useLocalSearchParams<{
    category: CategoryKey;
    name: string;
  }>();
  const router = useRouter();
  const category = categories.find((item) => item.key === categoryKey);
  const persona = category?.subcategories.find((item) => item.name === name);

  if (!category || !persona) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="人物像が見つかりません"
          description="前の画面へ戻って、人物像を選び直してください。"
        />
      </Screen>
    );
  }

  const palette = categoryPalette[category.key];
  const theme = persona.articleTitle ?? 'その他';

  return (
    <Screen>
      <DetailHeader title="人物像から探す" />

      <View style={[styles.hero, { borderColor: palette.accent, backgroundColor: palette.tint }]}>
        <AppText style={[styles.breadcrumb, { color: palette.accent }]}>
          {category.name}　›　{theme}　›
        </AppText>
        <AppText variant="title" style={styles.title}>{persona.name}</AppText>
        <AppText style={styles.description}>
          この人物像を構成する処世術を、一枚で見渡す
        </AppText>
        <View style={[styles.countPill, { borderColor: palette.accent }]}>
          <AppText style={[styles.countText, { color: palette.accent }]}>
            構成する処世術　{persona.items.length}件
          </AppText>
        </View>
      </View>

      <SectionHeader title="構成する処世術" count={persona.items.length} />

      <View style={[styles.techniquePanel, { borderColor: palette.accent }]}>
        {persona.items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="link"
            accessibilityLabel={`${item.title}を開く`}
            onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
            style={({ pressed }) => [styles.techniqueItem, pressed && styles.techniqueItemPressed]}
          >
            <AppText style={[styles.bullet, { color: palette.accent }]}>•</AppText>
            <AppText style={styles.techniqueTitle}>{item.title}</AppText>
            <AppText style={[styles.techniqueId, { color: palette.accent }]}>
              {getTechniqueDisplayId(item.id)}
            </AppText>
            <AppText style={[styles.chevron, { color: palette.accent }]}>›</AppText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, borderWidth: 1, borderRadius: radius.lg },
  breadcrumb: { fontSize: 11, lineHeight: 17, fontWeight: '700' },
  title: { marginTop: spacing.xs, color: colors.ink, fontSize: 32, lineHeight: 44 },
  description: { marginTop: spacing.sm, color: colors.inkSoft, lineHeight: 24 },
  countPill: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  countText: { fontSize: 12, fontWeight: '700' },
  techniquePanel: {
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  techniqueItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(112,102,85,0.16)',
  },
  techniqueItemPressed: { backgroundColor: colors.paperDeep },
  bullet: { fontSize: 19, lineHeight: 23 },
  techniqueTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
  },
  techniqueId: { fontSize: 10, lineHeight: 15, fontWeight: '700' },
  chevron: { fontSize: 24, lineHeight: 28 },
});
