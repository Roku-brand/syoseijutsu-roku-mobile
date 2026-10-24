import type { ReactNode } from 'react';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { catalogTheme, colors, fonts } from '@/constants/theme';
import { getTheoryDisplayId } from '@/data/catalog';
import type { TheoryCard as TheoryRecord } from '@/data/types';
import { getTheoryCoverSummary, normalizeDisplayText } from '@/data/theory-display';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { AppText } from './ui';
import { NavigationChevron } from './navigation-chevron';

/** The same theory card is used in the catalogue and every saved folder. */
export function TheoryCard({ theory, actions, onPress, testID, role = 'link', showClassification = true }: {
  theory: TheoryRecord; actions?: ReactNode; onPress?: () => void; testID?: string; role?: 'link' | 'button'; showClassification?: boolean;
}) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const summary = getTheoryCoverSummary(theory.summary);
  // Match the Router slot's flat-style contract on web and native.
  const areaStyle = StyleSheet.flatten([styles.open, compact && styles.openCompact, !summary && styles.titleOnly, !summary && compact && styles.titleOnlyCompact, Boolean(actions) && styles.withActions]);
  const content = <Pressable testID={testID} accessibilityRole={role} accessibilityLabel={`${theory.title}を開く`} onPress={onPress} style={onPress ? ({ pressed }) => [areaStyle, pressed && styles.pressed] : areaStyle}>
      <View style={[styles.meta, !showClassification && styles.metaCodeOnly, Boolean(actions) && styles.metaWithActions]}>
        {showClassification ? <AppText testID="theory-card-subcategory" style={[styles.classification, compact && styles.metaCompact]}>{theory.subcategoryTitle || theory.categoryTitle}</AppText> : null}
        <AppText testID="theory-card-id" style={[styles.code, compact && styles.metaCompact]}>{getTheoryDisplayId(theory)}</AppText>
      </View>
      <View style={[styles.copy, compact && styles.copyCompact, !summary && styles.titleOnlyCopy]}>
        <AppText testID="theory-card-title" style={[styles.title, compact && styles.titleCompact]}>{normalizeDisplayText(theory.title)}</AppText>
        {summary ? <>
          <View testID="theory-card-ornament" accessibilityElementsHidden aria-hidden style={styles.rule} />
          <AppText testID="theory-card-summary" style={[styles.summary, compact && styles.summaryCompact]}>{summary}</AppText>
        </> : null}
      </View>
      <NavigationChevron color={colors.ink} style={[styles.arrow, compact && styles.arrowCompact]} />
    </Pressable>;
  return <View testID="theory-card" style={styles.card}>
    <View pointerEvents="none" accessibilityElementsHidden aria-hidden style={styles.innerFrame} />
    {onPress ? content : <Link href={{ pathname: '/theory/[id]', params: { id: theory.tagId } }} style={areaStyle} asChild>{content}</Link>}
    {actions ? <View style={styles.actions}>{actions}</View> : null}
  </View>;
}

const blue = catalogTheme.theory;
const styles = StyleSheet.create({
  card: { position: 'relative', width: '100%', minWidth: 0, borderWidth: 1, borderColor: blue.border, borderRadius: 4, backgroundColor: '#FFFEFB', shadowColor: blue.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.025, shadowRadius: 4, elevation: 1 },
  innerFrame: { position: 'absolute', left: 5, right: 5, top: 5, bottom: 5, borderWidth: 1, borderColor: '#E0E5E9', borderRadius: 1 },
  open: { width: '100%', minWidth: 0, minHeight: 148, paddingTop: 18, paddingBottom: 22, paddingHorizontal: 28 },
  openCompact: { minHeight: 148, paddingTop: 17, paddingBottom: 20, paddingHorizontal: 20 },
  titleOnly: { minHeight: 96, paddingTop: 16, paddingBottom: 18 },
  titleOnlyCompact: { minHeight: 104, paddingTop: 16, paddingBottom: 18 },
  titleOnlyCopy: { gap: 0, paddingTop: 8 },
  withActions: { paddingTop: 17 },
  metaWithActions: { paddingRight: 82, minHeight: 36 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  metaCodeOnly: { justifyContent: 'flex-end' },
  classification: { flex: 1, minWidth: 0, color: colors.ink, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20 },
  code: { flexShrink: 0, color: colors.ink, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, fontVariant: ['tabular-nums'] },
  metaCompact: { fontSize: 12, lineHeight: 20 },
  copy: { minWidth: 0, paddingRight: 16, paddingTop: 10, alignItems: 'flex-start', gap: 11 },
  copyCompact: { paddingRight: 12, paddingTop: 8, gap: 10 },
  title: { width: '100%', color: colors.ink, fontFamily: fonts.serif, fontSize: 23, lineHeight: 35, fontWeight: '600', textAlign: 'left', ...Platform.select({ web: { overflowWrap: 'anywhere' as const } }) },
  titleCompact: { fontSize: 21, lineHeight: 32 },
  summary: { width: '100%', color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 28, textAlign: 'left' },
  summaryCompact: { fontSize: 15, lineHeight: 26, textAlign: 'left' },
  rule: { width: 28, height: 2, backgroundColor: blue.muted },
  arrow: { position: 'absolute', right: 14, top: '50%', marginTop: -10 },
  arrowCompact: { right: 9 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, position: 'absolute', top: 8, right: 12 },
  pressed: { opacity: 0.76 },
});
