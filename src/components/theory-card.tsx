import type { ReactNode } from 'react';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { catalogTheme, colors, fonts } from '@/constants/theme';
import { getTheoryDisplayId } from '@/data/catalog';
import type { TheoryCard as TheoryRecord } from '@/data/types';
import { getTheoryCoverSummary, normalizeDisplayText } from '@/data/theory-display';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { AppText } from './ui';

/** The same theory card is used in the catalogue and every saved folder. */
export function TheoryCard({ theory, actions, onPress, testID, role = 'link' }: {
  theory: TheoryRecord; actions?: ReactNode; onPress?: () => void; testID?: string; role?: 'link' | 'button';
}) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const summary = getTheoryCoverSummary(theory.summary);
  // Match the Router slot's flat-style contract on web and native.
  const areaStyle = StyleSheet.flatten([styles.open, compact && styles.openCompact, Boolean(actions) && styles.withActions]);
  const content = <Pressable testID={testID} accessibilityRole={role} accessibilityLabel={`${theory.title}を開く`} onPress={onPress} style={onPress ? ({ pressed }) => [areaStyle, pressed && styles.pressed] : areaStyle}>
      <View style={[styles.meta, Boolean(actions) && styles.metaWithActions]}>
        <AppText testID="theory-card-subcategory" style={[styles.classification, compact && styles.metaCompact]}>{theory.subcategoryTitle || theory.categoryTitle}</AppText>
        <AppText testID="theory-card-id" style={[styles.code, compact && styles.metaCompact]}>{getTheoryDisplayId(theory)}</AppText>
      </View>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <AppText testID="theory-card-title" style={[styles.title, compact && styles.titleCompact]}>{normalizeDisplayText(theory.title)}</AppText>
        <View testID="theory-card-ornament" accessibilityElementsHidden aria-hidden style={styles.ornament}>
          <View style={styles.rule} /><View style={styles.flourish}><View style={styles.lozenge} /><View style={[styles.lozenge, styles.lozengeMiddle]} /><View style={styles.lozenge} /></View><View style={styles.rule} />
        </View>
        {summary ? <AppText testID="theory-card-summary" numberOfLines={compact ? 3 : 2} style={[styles.summary, compact && styles.summaryCompact]}>{summary}</AppText> : null}
      </View>
      <AppText accessibilityElementsHidden aria-hidden style={[styles.arrow, compact && styles.arrowCompact]}>›</AppText>
    </Pressable>;
  return <View testID="theory-card" style={styles.card}>
    <View pointerEvents="none" accessibilityElementsHidden aria-hidden style={styles.innerFrame} />
    {onPress ? content : <Link href={{ pathname: '/theory/[id]', params: { id: theory.tagId } }} style={areaStyle} asChild>{content}</Link>}
    {actions ? <View style={styles.actions}>{actions}</View> : null}
  </View>;
}

const blue = catalogTheme.theory;
const styles = StyleSheet.create({
  card: { position: 'relative', width: '100%', minWidth: 0, borderWidth: 1, borderColor: blue.border, borderRadius: 4, backgroundColor: blue.surface, shadowColor: blue.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.035, shadowRadius: 4, elevation: 1 },
  innerFrame: { position: 'absolute', left: 5, right: 5, top: 5, bottom: 5, borderWidth: 1, borderColor: blue.border, borderRadius: 1 },
  open: { width: '100%', minWidth: 0, minHeight: 148, paddingTop: 17, paddingBottom: 19, paddingHorizontal: 30 },
  openCompact: { minHeight: 168, paddingTop: 15, paddingBottom: 18, paddingHorizontal: 17 },
  withActions: { paddingTop: 17 },
  metaWithActions: { paddingRight: 82, minHeight: 36 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  classification: { flex: 1, minWidth: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 20 },
  code: { flexShrink: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 20, fontVariant: ['tabular-nums'] },
  metaCompact: { fontSize: 12, lineHeight: 20 },
  copy: { minWidth: 0, paddingHorizontal: 24, alignItems: 'center', gap: 9 },
  copyCompact: { paddingHorizontal: 12, paddingTop: 7, gap: 10 },
  title: { width: '100%', color: colors.ink, fontFamily: fonts.serif, fontSize: 26, lineHeight: 38, fontWeight: '700', textAlign: 'center', ...Platform.select({ web: { overflowWrap: 'anywhere' as const } }) },
  titleCompact: { fontSize: 21, lineHeight: 31 },
  summary: { width: '100%', color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 28, textAlign: 'left' },
  summaryCompact: { fontSize: 15, lineHeight: 26, textAlign: 'left' },
  ornament: { width: 156, height: 10, flexDirection: 'row', alignItems: 'center' },
  rule: { flex: 1, height: 1, backgroundColor: blue.border },
  flourish: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 3 },
  lozenge: { width: 7, height: 5, borderWidth: 1, borderColor: blue.muted, borderRadius: 2, transform: [{ rotate: '35deg' }] },
  lozengeMiddle: { marginHorizontal: -2, transform: [{ rotate: '-35deg' }] },
  arrow: { position: 'absolute', right: 18, top: '50%', marginTop: -16, color: colors.ink, fontFamily: fonts.serif, fontSize: 28, lineHeight: 32 },
  arrowCompact: { right: 9, fontSize: 24 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, position: 'absolute', top: 8, right: 12 },
  pressed: { opacity: 0.76 },
});
