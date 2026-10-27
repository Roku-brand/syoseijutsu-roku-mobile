import type { ReactNode } from 'react';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { catalogTheme, fonts } from '@/constants/theme';
import { getTheoryDisplayId } from '@/data/catalog';
import type { TheoryCard as TheoryRecord } from '@/data/types';
import { getTheoryCardSupplement, normalizeDisplayText } from '@/data/theory-display';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { AppText } from './ui';

/** The same theory card is used in the catalogue and every saved folder. */
export function TheoryCard({ theory, actions, onPress, testID, role = 'link', showClassification = true }: {
  theory: TheoryRecord; actions?: ReactNode; onPress?: () => void; testID?: string; role?: 'link' | 'button'; showClassification?: boolean;
}) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const summary = getTheoryCardSupplement(theory);
  // Match the Router slot's flat-style contract on web and native.
  const areaStyle = StyleSheet.flatten([styles.open, compact && styles.openCompact]);
  const content = <Pressable testID={testID} accessibilityRole={role} accessibilityLabel={`${theory.title}を開く`} onPress={onPress} style={onPress ? ({ pressed }) => [areaStyle, pressed && styles.pressed] : areaStyle}>
      <View style={[styles.meta, !showClassification && !actions && styles.metaCodeOnly, !showClassification && !actions && compact && styles.metaCodeOnlyCompact, Boolean(actions) && styles.metaWithActions]}>
        {showClassification ? <AppText testID="theory-card-subcategory" style={[styles.classification, compact && styles.metaCompact]}>{theory.subcategoryTitle || theory.categoryTitle}</AppText> : null}
        <AppText testID="theory-card-id" style={[styles.code, compact && styles.metaCompact]}>{getTheoryDisplayId(theory)}</AppText>
      </View>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <AppText testID="theory-card-title" style={[styles.title, compact && styles.titleCompact]}>{normalizeDisplayText(theory.title)}</AppText>
        <View testID="theory-card-ornament" accessibilityElementsHidden aria-hidden style={[styles.rule, compact && styles.ruleCompact]} />
        {summary ? <AppText testID="theory-card-summary" numberOfLines={compact ? 3 : 2} style={[styles.summary, compact && styles.summaryCompact]}>{summary}</AppText> : null}
      </View>
      <View accessibilityElementsHidden aria-hidden style={[styles.arrow, compact && styles.arrowCompact]} />
    </Pressable>;
  return <View testID="theory-card" style={styles.card}>
    {onPress ? content : <Link href={{ pathname: '/theory/[id]', params: { id: theory.tagId } }} style={areaStyle} asChild>{content}</Link>}
    {actions ? <View style={styles.actions}>{actions}</View> : null}
  </View>;
}

const blue = catalogTheme.theory;
const styles = StyleSheet.create({
  card: { position: 'relative', width: '100%', minWidth: 0, borderWidth: 1, borderColor: blue.border, borderRadius: 6, backgroundColor: '#FCFCFD', shadowColor: '#414B5B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.065, shadowRadius: 4, elevation: 1 },
  open: { width: '100%', minWidth: 0, minHeight: 158, justifyContent: 'center', paddingTop: 22, paddingBottom: 24, paddingHorizontal: 28 },
  openCompact: { minHeight: 168, paddingTop: 40, paddingBottom: 22, paddingHorizontal: 24 },
  metaWithActions: { paddingRight: 82, minHeight: 36 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 },
  metaCodeOnly: { position: 'absolute', top: 20, right: 24, marginBottom: 0 },
  metaCodeOnlyCompact: { top: 15, right: 16 },
  classification: { flex: 1, minWidth: 0, color: '#414B5B', fontFamily: fonts.serif, fontSize: 12, lineHeight: 20 },
  code: { flexShrink: 0, color: '#414B5B', fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, fontVariant: ['tabular-nums'] },
  metaCompact: { fontSize: 12, lineHeight: 20 },
  copy: { minWidth: 0, alignItems: 'center' },
  copyCompact: { paddingHorizontal: 0 },
  title: { width: '100%', paddingHorizontal: 64, color: '#0C2748', fontFamily: fonts.serif, fontSize: 32, lineHeight: 46, fontWeight: '700', textAlign: 'center', ...Platform.select({ web: { overflowWrap: 'anywhere' as const } }) },
  titleCompact: { paddingHorizontal: 8, fontSize: 22, lineHeight: 34 },
  summary: { width: '100%', marginTop: 14, paddingHorizontal: 28, color: '#414B5B', fontFamily: fonts.serif, fontSize: 18, lineHeight: 28, textAlign: 'center' },
  summaryCompact: { paddingHorizontal: 4, fontSize: 14, lineHeight: 25 },
  rule: { width: 56, height: 1.5, marginTop: 20, backgroundColor: '#91ABC8' },
  ruleCompact: { width: 44, marginTop: 14 },
  arrow: { position: 'absolute', right: 24, top: '50%', marginTop: -6, width: 12, height: 12, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: '#0C2748', transform: [{ rotate: '45deg' }] },
  arrowCompact: { right: 12, width: 9, height: 9, marginTop: -4.5 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, position: 'absolute', top: 8, right: 12 },
  pressed: { opacity: 0.76 },
});
