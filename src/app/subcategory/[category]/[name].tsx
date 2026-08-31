import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { colors, fonts, spacing } from '@/constants/theme';
import { categories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';
import { useAccess } from '@/access/access-state';
import { LockedPreview } from '@/components/locked-preview';
import { SaveDiamondButton } from '@/components/book-ui';
import { isFreePersona } from '@/access/access-config';
import { getTechniqueCount } from '@/data/technique-counts';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useAppState } from '@/state/app-state';
import { useAppToast } from '@/components/app-toast';

export function generateStaticParams() {
  return categories.flatMap((category) => category.subcategories.map((persona) => ({ category: category.key, name: persona.name })));
}

function splitIntoColumns<T>(items: T[]): [T[], T[]] {
  const breakAt = Math.ceil(items.length / 2);
  return [items.slice(0, breakAt), items.slice(breakAt)];
}

export default function PersonaScreen() {
  'use no memo';
  const { category: categoryKey, name } = useLocalSearchParams<{ category: CategoryKey; name: string }>();
  const router = useRouter();
  const { isPaid, catalogRevision } = useAccess();
  const { width } = useResponsiveLayout();
  const { savedIds, toggleSaved } = useAppState();
  const showToast = useAppToast();
  const { category, persona } = useMemo(() => {
    const nextCategory = categories.find((item) => item.key === categoryKey);
    return {
      category: nextCategory,
      persona: nextCategory?.subcategories.find((item) => item.name === name),
    };
  }, [catalogRevision, categoryKey, name]);

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
      <View key={catalogRevision} style={[styles.page, compact && styles.pageCompact]}>
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
                  const saved = savedIds.includes(item.id);
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.techniqueRow,
                        !compact && styles.techniqueRowDesktop,
                        compact && styles.techniqueRowCompact,
                        index === rowsPerColumn - 1 && styles.techniqueRowLast,
                      ]}
                    >
                      <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={`${String(itemNumber).padStart(2, '0')} ${item.title}を開く`}
                        onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
                        style={({ pressed }) => [styles.techniqueOpenArea, pressed && styles.pressed]}
                      >
                        <AppText style={[styles.number, compact && styles.numberCompact]}>{String(itemNumber).padStart(2, '0')}</AppText>
                        <AppText variant="serif" style={[styles.rowTitle, compact && styles.rowTitleCompact]}>{item.title}</AppText>
                      </Pressable>
                      <SaveDiamondButton
                        saved={saved}
                        compact
                        onPress={() => {
                          toggleSaved(item.id);
                          showToast(saved ? '蔵書から外しました' : '蔵書に保存しました');
                        }}
                      />
                    </View>
                  );
                })}
                {Array.from({ length: placeholders }, (_, index) => (
                  <View key={`placeholder-${index}`} accessibilityElementsHidden style={[styles.placeholder, index === placeholders - 1 && styles.techniqueRowLast]} />
                ))}
              </View>
            );
          })}
        </View>
        <View testID="persona-list-end" style={[styles.endMarker, compact && styles.endMarkerCompact]}>
          <View style={styles.endLine} />
          <AppText style={styles.endCount}>{techniqueCount} / {techniqueCount}</AppText>
          <View style={styles.endLine} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', flexGrow: 1 },
  contentCompact: { paddingBottom: 96 },
  page: { width: '100%', maxWidth: 1240, alignSelf: 'center', flex: 1, minHeight: 0, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  pageCompact: { flex: 0, flexGrow: 0, flexBasis: 'auto', paddingHorizontal: 10, paddingTop: 4, paddingBottom: 8 },
  listSheet: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DED8CF',
    backgroundColor: 'rgba(255, 253, 249, 0.42)',
  },
  listSheetCompact: { flex: 0, flexDirection: 'column', flexGrow: 0, flexBasis: 'auto' },
  column: { flex: 1, minWidth: 0 },
  columnCompact: { width: '100%', flex: 0, flexGrow: 0, flexBasis: 'auto' },
  columnDivided: { borderLeftWidth: 1, borderLeftColor: '#DED8CF' },
  techniqueRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#E2DDD5',
  },
  techniqueOpenArea: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14 },
  techniqueRowDesktop: { flex: 1, minHeight: 0, paddingVertical: 7 },
  techniqueRowCompact: { minHeight: 58, paddingHorizontal: 12, paddingVertical: 9, gap: 10 },
  techniqueRowLast: { borderBottomWidth: 0 },
  placeholder: { flex: 1, minHeight: 0, borderBottomWidth: 1, borderBottomColor: '#E2DDD5' },
  number: { width: 34, color: '#A77A25', fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 1.1 },
  numberCompact: { width: 30, fontSize: 10, lineHeight: 14 },
  rowTitle: { flex: 1, minWidth: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  rowTitleCompact: { fontSize: 14, lineHeight: 20 },
  endMarker: { minHeight: 48, paddingTop: 22, flexDirection: 'row', alignItems: 'center', gap: 24 },
  endMarkerCompact: { minHeight: 42, paddingTop: 18, paddingHorizontal: 2, gap: 10 },
  endLine: { flex: 1, minWidth: 0, height: 1, backgroundColor: '#D7D0C6' },
  endCount: { paddingHorizontal: 8, color: '#A77A25', fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 1.2, backgroundColor: colors.paper, zIndex: 1 },
  pressed: { backgroundColor: '#fff4df' },
});
