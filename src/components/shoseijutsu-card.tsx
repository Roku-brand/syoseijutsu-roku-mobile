import type { ReactNode } from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { catalogTheme, colors, fonts, shadow } from '@/constants/theme';
import { getTechniqueDisplayId } from '@/data/catalog';
import type { TechniqueCard } from '@/data/types';
import { techniqueRoute } from '@/navigation/app-routes';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { AppText } from './ui';
import { TechniqueTitle } from './technique-title';

/** Catalogue and saved-folder entries share this presentation; data stays upstream. */
export function ShoseijutsuCard({ card, readable = true, previewTitle = false, actions, onPress, testID, role = 'link', openLabel }: {
  card: TechniqueCard; readable?: boolean; previewTitle?: boolean; actions?: ReactNode; onPress?: () => void; testID?: string; role?: 'link' | 'button'; openLabel?: string;
}) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const title = readable || previewTitle ? card.title : '完全版の処世術';
  const displayId = getTechniqueDisplayId(card);
  // Expo Router's asChild slot requires a flat child style, not a callback/array.
  const areaStyle = StyleSheet.flatten([styles.open, compact && styles.openCompact, Boolean(actions) && styles.withActions]);
  const content = <Pressable testID={testID} accessibilityRole={role} accessibilityLabel={openLabel ?? `${displayId} ${title}を開く`} onPress={onPress} style={onPress ? ({ pressed }) => [areaStyle, pressed && styles.pressed] : areaStyle}>
      <AppText testID="technique-index-id" style={[styles.code, compact && styles.codeCompact]}>{displayId}</AppText>
      <View style={styles.copy}>
        <AppText style={[styles.meta, compact && styles.metaCompact]}>{card.categoryName}・{card.subcategory || '独立した処世術'}</AppText>
        <TechniqueTitle testID="technique-index-title" title={title} minimumFontSize={compact ? 14 : 18} style={[styles.title, compact && styles.titleCompact]} />
        {!readable ? <AppText style={styles.access}>完全版で読む</AppText> : null}
      </View>
      <AppText accessibilityElementsHidden aria-hidden style={styles.arrow}>›</AppText>
    </Pressable>;
  return <View testID="shoseijutsu-card" style={styles.card}>
    <View testID="technique-category-bar" accessibilityElementsHidden aria-hidden style={[styles.bar, { backgroundColor: catalogTheme.categoryBars[card.categoryKey] ?? colors.gold }]} />
    {onPress ? content : <Link href={techniqueRoute(card.id)} style={areaStyle} asChild>{content}</Link>}
    {actions ? <View style={styles.actions}>{actions}</View> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { position: 'relative', width: '100%', minWidth: 0, borderWidth: 1, borderColor: catalogTheme.technique.border, borderRadius: 14, backgroundColor: catalogTheme.technique.surface, overflow: 'hidden', ...shadow.card },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7 },
  open: { minWidth: 0, minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 22, paddingVertical: 22, paddingLeft: 28, paddingRight: 20 },
  openCompact: { minHeight: 104, gap: 10, paddingVertical: 16, paddingLeft: 17, paddingRight: 12 },
  withActions: { paddingTop: 48 },
  code: { width: 70, flexShrink: 0, color: colors.goldDeep, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  codeCompact: { width: 58, fontSize: 12, lineHeight: 20 },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  meta: { color: colors.muted, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21 },
  metaCompact: { fontSize: 12, lineHeight: 20 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 22, lineHeight: 33, fontWeight: '600' },
  titleCompact: { fontSize: 17, lineHeight: 26 },
  access: { color: colors.goldDeep, fontSize: 11, lineHeight: 18 },
  arrow: { flexShrink: 0, color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 28, lineHeight: 34 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, position: 'absolute', top: 3, right: 12 },
  pressed: { opacity: 0.75 },
});
