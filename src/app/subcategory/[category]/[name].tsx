import { Link, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, View, type TextStyle } from 'react-native';
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
import { SeoBreadcrumbs } from '@/components/seo-breadcrumbs';

const compactTwoLineWebStyle = Platform.OS === 'web'
  ? ({ overflowWrap: 'anywhere', whiteSpace: 'pre-line', wordBreak: 'normal' } as unknown as TextStyle)
  : undefined;

export function generateStaticParams() {
  return categories.flatMap((category) => category.subcategories.map((persona) => ({ category: category.key, name: persona.name })));
}

function splitIntoColumns<T>(items: T[]): [T[], T[]] {
  const breakAt = Math.ceil(items.length / 2);
  return [items.slice(0, breakAt), items.slice(breakAt)];
}

function compactTechniqueTitle(title: string) {
  if (title.length <= 16) return title;
  const middle = Math.ceil(title.length / 2);
  const punctuationBreaks = [...title]
    .map((character, index) => ['、', '。', '・'].includes(character) ? index + 1 : -1)
    .filter((index) => index >= Math.floor(title.length * 0.35) && index <= Math.ceil(title.length * 0.65));
  const breakAt = punctuationBreaks.sort((left, right) => Math.abs(left - middle) - Math.abs(right - middle))[0] ?? middle;
  return `${title.slice(0, breakAt)}\n${title.slice(breakAt)}`;
}

export default function PersonaScreen() {
  'use no memo';
  const { category: categoryKey, name } = useLocalSearchParams<{ category: CategoryKey; name: string }>();
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
        <SeoBreadcrumbs items={[
          { label: '探す', href: '/discover' },
          { label: category.name, href: { pathname: '/personas', params: { category: category.key } } },
          { label: persona.name },
        ]} />
        <AppText
          accessibilityRole="header"
          aria-level={1}
          testID="persona-page-title"
          variant="serif"
          numberOfLines={compact ? 2 : undefined}
          adjustsFontSizeToFit={compact && Platform.OS !== 'web'}
          minimumFontScale={0.82}
          style={[styles.pageTitle, compact && styles.pageTitleCompact, compact && (persona.articleTitle ?? persona.name).length > 10 && styles.pageTitleCompactLong]}
        >{persona.articleTitle ?? persona.name}</AppText>
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
                      <Link href={{ pathname: '/card/[id]', params: { id: item.id } }} asChild>
                        <Pressable
                          accessibilityRole="link"
                          accessibilityLabel={`${String(itemNumber).padStart(2, '0')} ${item.title}を開く`}
                          style={({ pressed }) => [styles.techniqueOpenArea, compact && styles.techniqueOpenAreaCompact, pressed && styles.pressed]}
                        >
                          <AppText style={[styles.number, compact && styles.numberCompact]}>{String(itemNumber).padStart(2, '0')}</AppText>
                          <View style={styles.rowTitleWrap}>
                            <AppText
                              testID={`persona-technique-title-${itemNumber}`}
                              variant="serif"
                              numberOfLines={compact ? 2 : undefined}
                              adjustsFontSizeToFit={compact && Platform.OS !== 'web'}
                              minimumFontScale={0.78}
                              style={[styles.rowTitle, compact && styles.rowTitleCompact, compact && compactTwoLineWebStyle, compact && item.title.length > 18 && styles.rowTitleCompactLong]}
                            >{compact ? compactTechniqueTitle(item.title) : item.title}</AppText>
                          </View>
                        </Pressable>
                      </Link>
                      <View style={[styles.saveAction, compact && styles.saveActionCompact]}>
                        <SaveDiamondButton
                          saved={saved}
                          compact
                          onPress={() => {
                            toggleSaved(item.id);
                            showToast(saved ? '蔵書から外しました' : '蔵書に保存しました');
                          }}
                        />
                      </View>
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
  pageCompact: { flex: 0, flexGrow: 0, flexBasis: 'auto', paddingHorizontal: 0, paddingTop: 4, paddingBottom: 8 },
  pageTitle: { marginBottom: 18, color: '#24231E', fontSize: 27, lineHeight: 38 },
  pageTitleCompact: { marginBottom: 12, fontSize: 22, lineHeight: 32 },
  pageTitleCompactLong: { fontSize: 19, lineHeight: 27, letterSpacing: 0.2 },
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
    position: 'relative',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#E2DDD5',
  },
  techniqueOpenArea: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14 },
  techniqueOpenAreaCompact: { width: '100%', flexBasis: '100%', gap: 6, paddingRight: 42 },
  saveAction: { marginLeft: 'auto', flexShrink: 0, alignItems: 'flex-end', justifyContent: 'center' },
  saveActionCompact: { position: 'absolute', right: 8, top: 9, marginLeft: 0 },
  techniqueRowDesktop: { flex: 1, minHeight: 0, paddingVertical: 7 },
  techniqueRowCompact: { minHeight: 62, paddingHorizontal: 8, paddingVertical: 9, gap: 6 },
  techniqueRowLast: { borderBottomWidth: 0 },
  placeholder: { flex: 1, minHeight: 0, borderBottomWidth: 1, borderBottomColor: '#E2DDD5' },
  number: { width: 34, color: '#A77A25', fontFamily: fonts.sans, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 1.1 },
  numberCompact: { width: 22, fontSize: 9, lineHeight: 13 },
  rowTitleWrap: { flex: 1, minWidth: 0, overflow: 'hidden', justifyContent: 'center' },
  rowTitle: { maxWidth: '100%', minWidth: 0, flexShrink: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  rowTitleCompact: { fontSize: 13.5, lineHeight: 19 },
  rowTitleCompactLong: { fontSize: 12, lineHeight: 18, letterSpacing: 0 },
  endMarker: { minHeight: 48, paddingTop: 22, flexDirection: 'row', alignItems: 'center', gap: 24 },
  endMarkerCompact: { minHeight: 42, paddingTop: 18, paddingHorizontal: 2, gap: 10 },
  endLine: { flex: 1, minWidth: 0, height: 1, backgroundColor: '#D7D0C6' },
  endCount: { paddingHorizontal: 8, color: '#A77A25', fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 1.2, backgroundColor: colors.paper, zIndex: 1 },
  pressed: { backgroundColor: '#fff4df' },
});
