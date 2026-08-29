import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import { AppText, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { categoryPalette, colors, fonts, radius, spacing } from '@/constants/theme';
import { categories, categoryMeta, getPersonaThemeTitle, techniqueCards } from '@/data/catalog';
import type { CatalogCategory } from '@/data/types';
import { useAccess } from '@/access/access-state';
import { isFreePersona } from '@/access/access-config';
import { getThemeTechniqueCount } from '@/data/technique-counts';
import { AccessBadge } from '@/components/access-badge';

export function generateStaticParams() {
  return [{ key: 'all' }, ...categories.map(({ key }) => ({ key }))];
}

export default function CategoryDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const { isPaid } = useAccess();

  if (key === 'all') {
    return (
      <Screen>
        <SectionHeader title="処世術" count={techniqueCards.length} />
        {techniqueCards.map((card) => <TechniqueRow key={card.id} card={card} />)}
      </Screen>
    );
  }

  const category = categories.find((item) => item.key === key);
  if (!category) {
    return (
      <Screen>
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
      <SectionHeader title="テーマを選ぶ" count={themes.length} />

      <View style={styles.themeTabs}>
        {themes.map((theme, index) => {
          const locked = !isPaid && theme.personas.every((persona) => !isFreePersona(persona.name));
          return (
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
            <View style={styles.themeTabTop}>
              <AppText style={[styles.themeTabIndex, { color: palette.accent }]}>
                THEME {String(index + 1).padStart(2, '0')}
              </AppText>
              {locked ? <AccessBadge locked compact /> : <AppText style={[styles.themeSelect, { color: palette.accent }]}>選ぶ</AppText>}
            </View>
            <View style={styles.themeTabBody}>
              <AppText variant="serif" style={styles.themeTabTitle}>{theme.title}</AppText>
            </View>
            <View style={styles.themeTabFooter}>
              <AppText style={[styles.themeTabCount, { color: palette.accent }]}>
                {theme.personas.length}の人物像・{theme.count}件
              </AppText>
            </View>
          </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

function groupByTheme(category: CatalogCategory) {
  const groups = new Map<string, CatalogCategory['subcategories']>();
  category.subcategories.forEach((persona) => {
    const title = getPersonaThemeTitle(persona, category.key);
    groups.set(title, [...(groups.get(title) ?? []), persona]);
  });
  return [...groups.entries()].map(([title, personas]) => ({
    title,
    personas,
    count: getThemeTechniqueCount(category.key, personas.map((persona) => persona.name)),
  }));
}

const styles = StyleSheet.create({
  themeTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  themeTab: {
    flexGrow: 1,
    flexBasis: 280,
    minHeight: 154,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    justifyContent: 'space-between',
  },
  themeTabTop: { minHeight: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  themeTabIndex: { fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5 },
  themeSelect: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
  themeTabBody: { flex: 1, justifyContent: 'center', paddingVertical: spacing.sm },
  themeTabTitle: { fontSize: 20, lineHeight: 29, fontWeight: '700' },
  themeTabFooter: { minHeight: 18, justifyContent: 'flex-end' },
  themeTabCount: { fontSize: 11, lineHeight: 17 },
  pressed: { opacity: 0.92, transform: [{ translateY: -1 }] },
});
