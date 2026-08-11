import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, DetailHeader, EmptyState, Screen } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';
import { useAccess } from '@/access/access-state';
import { LockedPreview } from '@/components/locked-preview';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export function generateStaticParams() {
  return categories.flatMap((category) => category.subcategories.map((persona) => ({ category: category.key, name: persona.name })));
}

export default function PersonaScreen() {
  const { category: categoryKey, name } = useLocalSearchParams<{ category: CategoryKey; name: string }>();
  const router = useRouter();
  const { isPaid } = useAccess();
  const { height, desktop, density } = useResponsiveLayout();
  const category = categories.find((item) => item.key === categoryKey);
  const persona = category?.subcategories.find((item) => item.name === name);

  if (!category || !persona) {
    return <Screen><DetailHeader /><EmptyState title="人物像が見つかりません" description="前の画面へ戻って、人物像を選び直してください。" /></Screen>;
  }

  if (!isPaid && persona.name !== '印象がいい人') {
    return <Screen><DetailHeader title="人物像から探す" /><LockedPreview title={persona.name} description="この人物像の処世術は完全版に収録されています。" count={persona.items.length} source="discover_technique" /></Screen>;
  }

  const theme = persona.articleTitle ?? '人物像';
  // Each persona contains a bounded set of techniques. Keep the entire list
  // usable at a glance on phones, rather than making this overview a scroll.
  const compact = !desktop && (density !== 'normal' || height < 760);
  const rowHeight = compact ? (density === 'veryCompact' ? 41 : 46) : 54;
  const titleSize = compact ? 27 : 32;
  const descriptionSize = compact ? 13 : 15;

  return (
    <Screen scroll={false} contentContainerStyle={styles.content}>
      <View style={[styles.page, compact && styles.pageCompact]}>
        <DetailHeader title="人物像から探す" />
        <AppText style={[styles.breadcrumb, compact && styles.breadcrumbCompact]}>{category.name}　›　{theme}</AppText>
        <View style={[styles.titleRow, compact && styles.titleRowCompact]}>
          <AppText style={[styles.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.3) }]}>{persona.name}</AppText>
          <View style={[styles.countBadge, compact && styles.countBadgeCompact]}><AppText style={styles.countText}>{persona.items.length}の処世術</AppText></View>
        </View>
        <AppText numberOfLines={compact ? 1 : 2} style={[styles.description, { fontSize: descriptionSize, lineHeight: Math.round(descriptionSize * 1.6) }]}>相手に安心感を与え、自然と好かれる人になるための処世術です。</AppText>

        <View style={[styles.listCard, compact && styles.listCardCompact]}>
          {persona.items.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="link"
              accessibilityLabel={`${item.title}を開く`}
              onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
              style={({ pressed }) => [styles.row, { minHeight: rowHeight }, compact && styles.rowCompact, index === persona.items.length - 1 && styles.rowLast, pressed && styles.pressed]}
            >
              <AppText style={[styles.number, compact && styles.numberCompact]}>{String(index + 1).padStart(2, '0')}</AppText>
              <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.rowTitle, compact && styles.rowTitleCompact]}>{item.title}</AppText>
              <AppText style={[styles.chevron, compact && styles.chevronCompact]}>›</AppText>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', flex: 1 },
  page: { width: '100%', maxWidth: 760, alignSelf: 'center', flex: 1, paddingTop: spacing.lg },
  pageCompact: { paddingTop: spacing.sm },
  breadcrumb: { color: colors.gold, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  breadcrumbCompact: { fontSize: 11, lineHeight: 15 },
  titleRow: { marginTop: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  titleRowCompact: { marginTop: 4, gap: spacing.sm },
  title: { flexShrink: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 32, lineHeight: 44, fontWeight: '700' },
  countBadge: { minHeight: 32, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  countBadgeCompact: { minHeight: 26, paddingHorizontal: 10 },
  countText: { color: colors.gold, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  description: { marginTop: spacing.sm, color: colors.inkSoft, fontSize: 15, lineHeight: 25 },
  listCardCompact: { marginTop: spacing.md },
  listCard: { marginTop: spacing.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  row: { minHeight: 58, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowCompact: { paddingHorizontal: spacing.md, gap: spacing.sm },
  rowLast: { borderBottomWidth: 0 },
  number: { width: 28, color: colors.gold, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  numberCompact: { width: 24, fontSize: 12, lineHeight: 16 },
  rowTitle: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  rowTitleCompact: { fontSize: 14, lineHeight: 19 },
  chevron: { color: colors.gold, fontSize: 24, lineHeight: 27 },
  chevronCompact: { fontSize: 20, lineHeight: 22 },
  pressed: { backgroundColor: colors.paperDeep },
});
