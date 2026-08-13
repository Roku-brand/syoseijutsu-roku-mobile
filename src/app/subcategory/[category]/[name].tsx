import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, DetailHeader, EmptyState, Screen } from '@/components/ui';
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

function orderForVerticalColumns<T>(items: T[]): T[] {
  const rowsPerColumn = Math.ceil(items.length / 2);
  const ordered: T[] = [];

  for (let row = 0; row < rowsPerColumn; row += 1) {
    ordered.push(items[row]);
    const rightColumnItem = items[rowsPerColumn + row];
    if (rightColumnItem) ordered.push(rightColumnItem);
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
    return <Screen><DetailHeader /><EmptyState title="人物像が見つかりません" description="前の画面へ戻って、人物像を選び直してください。" /></Screen>;
  }

  const techniqueCount = getTechniqueCount(category.key, persona.name, persona.items.length);

  if (!isPaid && !isFreePersona(persona.name)) {
    return <Screen><DetailHeader title="人物像から探す" /><LockedPreview title={persona.name} description="この人物像の処世術は完全版に収録されています。" count={techniqueCount} source="discover_technique" /></Screen>;
  }

  const compact = width < 760;
  const twoColumn = !compact;
  const itemsForDisplay = twoColumn ? orderForVerticalColumns(persona.items) : persona.items;
  return (
    <Screen scroll={false} contentContainerStyle={styles.content}>
      <View style={styles.page}>
        <DetailHeader title="人物像から探す" />
        <View style={styles.titleRow}>
          <AppText style={styles.title}>{persona.name}</AppText>
          <View style={styles.countBadge}><AppText style={styles.countText}>{techniqueCount}の処世術</AppText></View>
        </View>

        <View style={[styles.list, twoColumn && styles.listGrid, compact && styles.listCompact]}>
          {itemsForDisplay.map((item) => {
            const itemNumber = persona.items.indexOf(item) + 1;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="link"
                accessibilityLabel={`${String(itemNumber).padStart(2, '0')} ${item.title}を開く`}
                onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.techniqueCard, twoColumn && styles.techniqueCardGrid, compact && styles.techniqueCardCompact, pressed && styles.pressed]}
              >
                <View style={[styles.numberBadge, compact && styles.numberBadgeCompact]}>
                  <AppText style={[styles.number, compact && styles.numberCompact]}>{String(itemNumber).padStart(2, '0')}</AppText>
                </View>
                <AppText
                  variant="serif"
                  numberOfLines={compact ? 1 : 2}
                  ellipsizeMode="clip"
                  adjustsFontSizeToFit
                  minimumFontScale={compact ? 0.62 : 0.8}
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
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingTop: spacing.sm, paddingBottom: spacing.lg },
  titleRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  title: { flexShrink: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 28, lineHeight: 36, fontWeight: '700' },
  countBadge: { minHeight: 28, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  countText: { color: colors.gold, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  list: { width: '100%', marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listCompact: { marginTop: spacing.sm, gap: 5 },
  listGrid: { justifyContent: 'space-between' },
  techniqueCard: {
    width: '100%',
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: '#ddc9a9',
    borderRadius: radius.md,
    backgroundColor: '#fffdf9',
  },
  techniqueCardGrid: { width: '49%' },
  techniqueCardCompact: { minHeight: 42, paddingHorizontal: 9, paddingVertical: 5, gap: 8 },
  numberBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.charcoal, flexShrink: 0 },
  numberBadgeCompact: { width: 27, height: 27, borderRadius: 14 },
  number: { color: colors.gold, fontFamily: fonts.sans, fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 0.3 },
  numberCompact: { fontSize: 9, lineHeight: 12 },
  rowTitle: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  rowTitleCompact: { fontSize: 12, lineHeight: 16 },
  pressed: { borderColor: colors.gold, backgroundColor: '#fff8eb' },
});
