import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';
import { useAccess } from '@/access/access-state';
import { LockedPreview } from '@/components/locked-preview';
import { isFreePersona } from '@/access/access-config';
import { getTechniqueCount } from '@/data/technique-counts';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export function generateStaticParams() {
  return categories.flatMap((category) => category.subcategories.map((persona) => ({ category: category.key, name: persona.name })));
}

function orderForVerticalColumns<T>(items: T[], columns: number): T[] {
  const rowsPerColumn = Math.ceil(items.length / columns);
  const ordered: T[] = [];

  for (let row = 0; row < rowsPerColumn; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const item = items[column * rowsPerColumn + row];
      if (item) ordered.push(item);
    }
  }

  return ordered;
}

export default function PersonaScreen() {
  const { category: categoryKey, name } = useLocalSearchParams<{ category: CategoryKey; name: string }>();
  const router = useRouter();
  const { isPaid } = useAccess();
  const { width } = useResponsiveLayout();
  const category = categories.find((item) => item.key === categoryKey);
  const persona = category?.subcategories.find((item) => item.name === name);

  if (!category || !persona) {
    return <Screen><EmptyState title="人物像が見つかりません" description="前の画面へ戻って、人物像を選び直してください。" /></Screen>;
  }

  const techniqueCount = getTechniqueCount(category.key, persona.name, persona.items.length);

  if (!isPaid && !isFreePersona(persona.name)) {
    return <Screen><LockedPreview title={persona.name} description="この人物像の処世術は完全版に収録されています。" count={techniqueCount} source="discover_technique" /></Screen>;
  }

  const compact = width < 760;
  const itemsForDisplay = orderForVerticalColumns(persona.items, 4);
  return (
    <Screen scroll={false} contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      <View style={[styles.page, compact && styles.pageCompact]}>
        <View style={[styles.list, compact && styles.listCompact]}>
          {itemsForDisplay.map((item) => {
            const itemNumber = persona.items.indexOf(item) + 1;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="link"
                accessibilityLabel={`${String(itemNumber).padStart(2, '0')} ${item.title}を開く`}
                onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.techniqueCard, compact && styles.techniqueCardCompact, pressed && styles.pressed]}
              >
                <View style={[styles.numberBadge, compact && styles.numberBadgeCompact]}>
                  <AppText style={[styles.number, compact && styles.numberCompact]}>{String(itemNumber).padStart(2, '0')}</AppText>
                </View>
                <AppText
                  variant="serif"
                  numberOfLines={compact ? 3 : 2}
                  ellipsizeMode="clip"
                  adjustsFontSizeToFit
                  minimumFontScale={compact ? 0.78 : 0.8}
                  style={[styles.rowTitle, compact && styles.rowTitleCompact]}
                >
                  {item.title}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', flexGrow: 1 },
  contentCompact: { paddingBottom: 0 },
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center', flex: 1, minHeight: 0, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  pageCompact: { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8 },
  list: { width: '100%', flex: 1, minHeight: 0, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between' },
  listCompact: { paddingBottom: 4 },
  techniqueCard: {
    width: '24.1%',
    height: '18.5%',
    minHeight: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: '#ddc9a9',
    borderRadius: radius.md,
    backgroundColor: '#fffdf9',
  },
  techniqueCardCompact: { paddingHorizontal: 4, paddingVertical: 4, gap: 4, borderRadius: 8 },
  numberBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.charcoal, flexShrink: 0 },
  numberBadgeCompact: { width: 20, height: 20, borderRadius: 10 },
  number: { color: colors.gold, fontFamily: fonts.sans, fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 0.3 },
  numberCompact: { fontSize: 7, lineHeight: 9 },
  rowTitle: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  rowTitleCompact: { fontSize: 10, lineHeight: 13, letterSpacing: -0.2 },
  pressed: { borderColor: colors.gold, backgroundColor: '#fff8eb' },
});
