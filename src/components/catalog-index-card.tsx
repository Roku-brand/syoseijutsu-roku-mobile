import type { ReactNode } from 'react';
import { Link, type Href } from 'expo-router';
import { Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { catalogIndexTheme, catalogTheme, colors, fonts, shadow } from '@/constants/theme';
import { AppText } from './ui';
import { TechniqueTitle } from './technique-title';

type CardProps = {
  href: Href;
  title: string;
  label: string;
  testID?: string;
  action: ReactNode;
  onOpen?: () => void;
} & (
  | { kind: 'theory'; code: string; definition: string; classification?: string }
  | { kind: 'technique'; code: string; metadata: string; category: string; readable: boolean }
  | { kind: 'feature'; cover: ReactNode; lead: string; classification?: string }
);

const mountain = require('../../assets/catalog/index-mountains.png');

export function CatalogIndexCard(props: CardProps) {
  const { width } = useWindowDimensions();
  const compact = width <= 360;
  const theory = props.kind === 'theory';
  const theme = catalogIndexTheme[theory ? 'theory' : 'technique'];
  const surfaceStyle = StyleSheet.flatten([styles.cardSurface, theory && styles.theorySurface, compact && styles.compactSurface]);
  const cardBody = (
    <Pressable testID={props.testID} accessibilityRole={props.onOpen ? 'button' : 'link'}
      accessibilityLabel={props.label} onPress={props.onOpen} style={surfaceStyle}>
      <Image testID="catalog-index-mountains" source={mountain} resizeMode="stretch" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
        style={[styles.mountain, { tintColor: theme.mountain }]} />
      {props.kind === 'technique' ? <View testID="technique-category-bar" accessibilityElementsHidden aria-hidden
        style={[styles.categoryBar, { backgroundColor: catalogTheme.categoryBars[props.category] ?? colors.gold }]} /> : null}
      <View style={[styles.numberColumn, theory && styles.theoryNumberColumn, compact && (theory ? styles.compactTheoryNumberColumn : styles.compactNumberColumn), { borderRightColor: theme.divider }]}>
        {props.kind === 'feature'
          ? <View testID="personal-card-image" style={[styles.featureCover, compact && styles.compactFeatureCover]}>{props.cover}</View>
          : <AppText testID={theory ? 'theory-card-id' : 'technique-index-id'} numberOfLines={1}
              style={[styles.number, theory && styles.theoryNumber, compact && styles.compactNumber, { color: theme.accent }]}>{props.code}</AppText>}
      </View>
      <View style={styles.body}>
        {props.kind === 'technique' ? <AppText style={styles.metadata}>{props.metadata}</AppText> : null}
        {props.kind === 'feature' && props.classification ? <AppText style={styles.metadata}>{props.classification}</AppText> : null}
        {props.kind === 'theory' && props.classification ? <AppText testID="theory-card-subcategory" style={styles.metadata}>{props.classification}</AppText> : null}
        {props.kind === 'technique'
          ? <TechniqueTitle testID="technique-index-title" title={props.title} minimumFontSize={compact ? 16 : 18}
            style={[styles.title, compact && styles.compactTitle]} />
          : <AppText testID="theory-card-title" style={[styles.title, styles.theoryTitle, compact && styles.compactTitle, { color: theme.ink }]}>
            {props.title}
          </AppText>}
        {props.kind === 'theory' && props.definition ? <AppText testID="theory-card-summary" numberOfLines={3} style={styles.definition}>{props.definition}</AppText> : null}
        {props.kind === 'feature' && props.lead ? <AppText numberOfLines={1} style={styles.definition}>{props.lead}</AppText> : null}
        {props.kind === 'technique' && !props.readable ? <AppText style={styles.access}>完全版で読む</AppText> : null}
      </View>
      <View accessibilityElementsHidden aria-hidden style={[styles.chevron, { borderColor: theme.accent }]} />
    </Pressable>
  );

  return (
    <View testID={theory ? 'theory-card' : props.kind === 'technique' ? 'shoseijutsu-card' : 'personal-content-feature'} style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      {props.onOpen ? cardBody : <Link href={props.href} asChild style={surfaceStyle}>{cardBody}</Link>}
      <View style={styles.action}>{props.action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%', minWidth: 0, borderWidth: 1, borderRadius: catalogIndexTheme.cardRadius,
    ...shadow.card, shadowRadius: 5, shadowOpacity: 0.09,
  },
  cardSurface: {
    position: 'relative', overflow: 'hidden', width: '100%', minWidth: 0, minHeight: 98,
    borderRadius: catalogIndexTheme.cardRadius - 1,
    flexDirection: 'row', alignItems: 'center', gap: 13,
    paddingLeft: 18, paddingRight: 43, paddingVertical: 13,
  },
  theorySurface: { minHeight: 88, paddingLeft: 12 },
  compactSurface: { gap: 10, paddingRight: 38 },
  action: { position: 'absolute', top: 0, right: 3 },
  numberColumn: { minWidth: 64, minHeight: 44, flexShrink: 0, justifyContent: 'center', borderRightWidth: 1, paddingRight: 7 },
  theoryNumberColumn: { minWidth: 48, minHeight: 52 },
  compactNumberColumn: { minWidth: 56 },
  compactTheoryNumberColumn: { minWidth: 44 },
  featureCover: { position: 'relative', width: 52, height: 56, borderRadius: 5, overflow: 'hidden', backgroundColor: colors.line },
  compactFeatureCover: { width: 46, height: 50 },
  number: { fontFamily: fonts.sans, fontSize: 15, lineHeight: 21, fontWeight: '600', fontVariant: ['tabular-nums'] },
  theoryNumber: { fontFamily: fonts.serif, fontSize: 14 },
  compactNumber: { fontSize: 13 },
  body: { minWidth: 0, flex: 1, gap: 4, justifyContent: 'center' },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, fontWeight: '700', textAlign: 'left', ...Platform.select({ web: { overflowWrap: 'anywhere' as const } }) },
  theoryTitle: { fontSize: 20, lineHeight: 25 },
  compactTitle: { fontSize: 17, lineHeight: 23 },
  metadata: { color: colors.muted, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18 },
  definition: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 12.5, lineHeight: 18.5, textAlign: 'left' },
  access: { color: colors.goldDeep, fontSize: 11, lineHeight: 16 },
  mountain: { position: 'absolute', left: 0, bottom: 0, width: 108, height: 31, opacity: 0.76 },
  categoryBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7 },
  chevron: { position: 'absolute', right: 20, top: '58%', width: 7, height: 7, borderTopWidth: 1.5, borderRightWidth: 1.5, transform: [{ rotate: '45deg' }] },
});
