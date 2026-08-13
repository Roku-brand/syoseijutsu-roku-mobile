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

  const twoColumn = width >= 760;
  const itemsForDisplay = twoColumn ? orderForVerticalColumns(persona.items) : persona.items;
  const theme = persona.articleTitle ?? '人物像';

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.page}>
        <DetailHeader title="人物像から探す" />
        <AppText style={styles.breadcrumb}>{category.name}　›　{theme}</AppText>
        <View style={styles.titleRow}>
          <AppText style={styles.title}>{persona.name}</AppText>
          <View style={styles.countBadge}><AppText style={styles.countText}>{techniqueCount}の処世術</AppText></View>
        </View>
        <AppText style={styles.description}>{getPersonaDescription(category.key, persona.name)}</AppText>

        <View style={[styles.list, twoColumn && styles.listGrid]}>
          {itemsForDisplay.map((item) => {
            const itemNumber = persona.items.indexOf(item) + 1;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="link"
                accessibilityLabel={`${String(itemNumber).padStart(2, '0')} ${item.title}を開く`}
                onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
                style={({ pressed }) => [styles.techniqueCard, twoColumn && styles.techniqueCardGrid, pressed && styles.pressed]}
              >
                <View style={styles.numberBadge}>
                  <AppText style={styles.number}>{String(itemNumber).padStart(2, '0')}</AppText>
                </View>
                <AppText
                  variant="serif"
                  numberOfLines={twoColumn ? 2 : undefined}
                  ellipsizeMode="clip"
                  adjustsFontSizeToFit={twoColumn}
                  minimumFontScale={0.8}
                  style={styles.rowTitle}
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

function getPersonaDescription(categoryKey: CategoryKey, personaName: string) {
  if (categoryKey === 'interpersonal') return `${personaName}になるための処世術です。人との関係を整え、自然な立ち回りを身につけます。`;
  if (categoryKey === 'work') return `${personaName}になるための処世術です。仕事の場で信頼を得て、成果につなげる判断を学びます。`;
  return `${personaName}になるための処世術です。自分の軸を持ち、人生の判断とつまずきに向き合います。`;
}

const styles = StyleSheet.create({
  content: { width: '100%' },
  page: { width: '100%', maxWidth: 1180, alignSelf: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  breadcrumb: { color: colors.gold, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  titleRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  title: { flexShrink: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 32, lineHeight: 42, fontWeight: '700' },
  countBadge: { minHeight: 32, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  countText: { color: colors.gold, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  description: { marginTop: spacing.sm, color: colors.inkSoft, fontSize: 15, lineHeight: 25 },
  list: { width: '100%', marginTop: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  listGrid: { justifyContent: 'space-between' },
  techniqueCard: {
    width: '100%',
    minHeight: 70,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderWidth: 1,
    borderColor: '#ddc9a9',
    borderRadius: radius.md,
    backgroundColor: '#fffdf9',
  },
  techniqueCardGrid: { width: '49%' },
  numberBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.charcoal, flexShrink: 0 },
  number: { color: colors.gold, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17, fontWeight: '700', letterSpacing: 0.3 },
  rowTitle: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  pressed: { borderColor: colors.gold, backgroundColor: '#fff8eb' },
});
