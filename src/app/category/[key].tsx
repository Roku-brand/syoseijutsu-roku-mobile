import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import { AppText, DetailHeader, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { categoryPalette, colors, fonts, radius, spacing } from '@/constants/theme';
import {
  categories,
  categoryMeta,
  getTechniqueDisplayId,
  techniqueCards,
} from '@/data/catalog';
import type { CategoryKey, CatalogCategory } from '@/data/types';

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
        <View style={styles.intro}>
          <AppText variant="title" style={styles.pageTitle}>すべての処世術</AppText>
          <AppText style={styles.description}>
            全{techniqueCards.length}の判断原則を一覧する
          </AppText>
        </View>
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

  const categoryKey = category.key as CategoryKey;
  const meta = categoryMeta[categoryKey];
  const palette = categoryPalette[categoryKey];
  const count = category.subcategories.reduce(
    (total, persona) => total + persona.items.length,
    0,
  );
  const themes = groupByTheme(category);

  return (
    <Screen>
      <DetailHeader title="処世術から探す" />

      <View style={[styles.categoryHero, { borderColor: palette.accent, backgroundColor: palette.tint }]}>
        <View style={[styles.categoryMark, { borderColor: palette.accent }]}>
          <AppText style={[styles.categoryMarkText, { color: palette.accent }]}>{meta.mark}</AppText>
        </View>
        <View style={styles.categoryCopy}>
          <AppText variant="title" style={styles.pageTitle}>{meta.label}</AppText>
          <AppText style={styles.description}>{meta.description}</AppText>
        </View>
        <AppText style={[styles.totalCount, { color: palette.accent }]}>{count}件</AppText>
      </View>

      <SectionHeader title="テーマと処世術" count={count} />

      {themes.map(({ title, personas }) => (
        <View key={title} style={styles.themeSection}>
          <View style={styles.themeHeading}>
            <AppText style={[styles.themePath, { color: palette.accent }]}>{category.name}　›</AppText>
            <AppText variant="serif" style={styles.themeTitle}>{title}</AppText>
          </View>

          <View style={styles.personaList}>
            {personas.map((persona) => {
              const personaIndex = category.subcategories.indexOf(persona) + 1;
              return (
                <View
                  key={persona.name}
                  style={[styles.personaPanel, { borderColor: palette.accent, backgroundColor: palette.tint }]}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${persona.name}の一覧を開く`}
                    onPress={() =>
                      router.push({
                        pathname: '/subcategory/[category]/[name]',
                        params: { category: categoryKey, name: persona.name },
                      })
                    }
                    style={({ pressed }) => [styles.personaHeader, pressed && styles.pressed]}
                  >
                    <View style={[styles.personaNumber, { borderColor: palette.accent }]}>
                      <AppText style={[styles.personaNumberText, { color: palette.accent }]}>
                        {String(personaIndex).padStart(2, '0')}
                      </AppText>
                    </View>
                    <View style={styles.personaCopy}>
                      <AppText style={[styles.breadcrumb, { color: palette.accent }]}>
                        {category.name}　›　{title}　›
                      </AppText>
                      <AppText variant="serif" style={styles.personaTitle}>{persona.name}</AppText>
                    </View>
                    <AppText style={[styles.personaCount, { color: palette.accent }]}>
                      {persona.items.length}件
                    </AppText>
                  </Pressable>

                  <View style={styles.techniqueList}>
                    {persona.items.map((item) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="link"
                        accessibilityLabel={`${item.title}を開く`}
                        onPress={() =>
                          router.push({ pathname: '/card/[id]', params: { id: item.id } })
                        }
                        style={({ pressed }) => [
                          styles.techniqueItem,
                          pressed && styles.techniqueItemPressed,
                        ]}
                      >
                        <AppText style={[styles.bullet, { color: palette.accent }]}>•</AppText>
                        <AppText style={styles.techniqueTitle}>{item.title}</AppText>
                        <AppText style={[styles.techniqueId, { color: palette.accent }]}>
                          {getTechniqueDisplayId(item.id)}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}

function groupByTheme(category: CatalogCategory) {
  const groups = new Map<string, CatalogCategory['subcategories']>();
  category.subcategories.forEach((persona) => {
    const title = persona.articleTitle ?? 'その他';
    groups.set(title, [...(groups.get(title) ?? []), persona]);
  });
  return [...groups.entries()].map(([title, personas]) => ({ title, personas }));
}

const styles = StyleSheet.create({
  intro: { marginBottom: spacing.xl },
  pageTitle: { color: colors.ink, fontSize: 32, lineHeight: 44 },
  description: { color: colors.inkSoft, marginTop: spacing.xs, lineHeight: 24 },
  categoryHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  categoryMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  categoryMarkText: { fontFamily: fonts.serif, fontSize: 23, fontWeight: '700' },
  categoryCopy: { flex: 1 },
  totalCount: { fontFamily: fonts.serif, fontSize: 20, fontWeight: '700' },
  themeSection: { marginBottom: spacing.xxl },
  themeHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  themePath: { fontSize: 12, lineHeight: 18, fontWeight: '700' },
  themeTitle: { fontSize: 22, lineHeight: 31, fontWeight: '700' },
  personaList: { gap: spacing.md },
  personaPanel: { overflow: 'hidden', borderWidth: 1, borderRadius: radius.md },
  personaHeader: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  personaNumber: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  personaNumberText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700' },
  personaCopy: { flex: 1 },
  breadcrumb: { fontSize: 10, lineHeight: 16, marginBottom: 2 },
  personaTitle: { fontSize: 19, lineHeight: 28, fontWeight: '700' },
  personaCount: { fontSize: 11, lineHeight: 17, fontWeight: '700' },
  techniqueList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  techniqueItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(112,102,85,0.16)',
  },
  techniqueItemPressed: { backgroundColor: 'rgba(255,255,255,0.82)' },
  bullet: { fontSize: 19, lineHeight: 23 },
  techniqueTitle: {
    flex: 1,
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 21,
  },
  techniqueId: { fontSize: 10, lineHeight: 15, fontWeight: '700' },
  pressed: { opacity: 0.76 },
});
