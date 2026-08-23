import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { colors, fonts, spacing } from '@/constants/theme';
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

function splitIntoColumns<T>(items: T[]): [T[], T[]] {
  const breakAt = Math.ceil(items.length / 2);
  return [items.slice(0, breakAt), items.slice(breakAt)];
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
  const desktopColumns = splitIntoColumns(persona.items);
  const columns = compact ? [persona.items] : desktopColumns;
  const rowsPerColumn = compact ? persona.items.length : desktopColumns[0].length;
  return (
    <Screen scroll={compact} contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      <View style={[styles.page, compact && styles.pageCompact]}>
        <View style={[styles.listSheet, compact && styles.listSheetCompact]}>
          {columns.map((column, columnIndex) => {
            const itemOffset = compact ? 0 : columnIndex * rowsPerColumn;
            const placeholders = compact ? 0 : rowsPerColumn - column.length;
            return (
              <View
                key={columnIndex}
                testID={`technique-column-${columnIndex + 1}`}
                style={[styles.column, compact && styles.columnCompact, columnIndex > 0 && styles.columnDivided]}
              >
                {column.map((item, index) => {
                  const itemNumber = itemOffset + index + 1;
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="link"
                      accessibilityLabel={`${String(itemNumber).padStart(2, '0')} ${item.title}を開く`}
                      onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
                      style={({ pressed }) => [
                        styles.techniqueRow,
                        !compact && styles.techniqueRowDesktop,
                        compact && styles.techniqueRowCompact,
                        index === rowsPerColumn - 1 && styles.techniqueRowLast,
                        pressed && styles.pressed,
                      ]}
                    >
                      <AppText style={[styles.number, compact && styles.numberCompact]}>{String(itemNumber).padStart(2, '0')}</AppText>
                      <AppText
                        variant="serif"
                        numberOfLines={compact ? undefined : 2}
                        ellipsizeMode="clip"
                        adjustsFontSizeToFit={!compact}
                        minimumFontScale={0.86}
                        style={[styles.rowTitle, compact && styles.rowTitleCompact]}
                      >
                        {item.title}
                      </AppText>
                    </Pressable>
                  );
                })}
                {Array.from({ length: placeholders }, (_, index) => (
                  <View key={`placeholder-${index}`} accessibilityElementsHidden style={[styles.placeholder, index === placeholders - 1 && styles.techniqueRowLast]} />
                ))}
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', flexGrow: 1 },
  contentCompact: { paddingBottom: 96 },
  page: { width: '100%', maxWidth: 1240, alignSelf: 'center', flex: 1, minHeight: 0, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  pageCompact: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 8 },
  listSheet: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#d8c6aa',
    backgroundColor: 'rgba(255, 253, 249, 0.42)',
  },
  listSheetCompact: { flexDirection: 'column', flexGrow: 0 },
  column: { flex: 1, minWidth: 0 },
  columnCompact: { width: '100%', flexGrow: 0 },
  columnDivided: { borderLeftWidth: 1, borderLeftColor: '#d8c6aa' },
  techniqueRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  techniqueRowDesktop: { flex: 1, minHeight: 0, paddingVertical: 7 },
  techniqueRowCompact: { minHeight: 58, paddingHorizontal: 12, paddingVertical: 9, gap: 10 },
  techniqueRowLast: { borderBottomWidth: 0 },
  placeholder: { flex: 1, minHeight: 0, borderBottomWidth: 1, borderBottomColor: colors.line },
  number: { width: 34, color: colors.gold, fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 1.1 },
  numberCompact: { width: 30, fontSize: 10, lineHeight: 14 },
  rowTitle: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  rowTitleCompact: { fontSize: 15, lineHeight: 22 },
  pressed: { backgroundColor: '#fff4df' },
});
