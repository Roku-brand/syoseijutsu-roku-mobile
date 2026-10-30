import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { catalogTheme, colors, fonts, radius } from '@/constants/theme';
import { normalizeDisplayText } from '@/data/theory-display';
import { AppText } from './ui';

export type RelatedContentItem = {
  key: string;
  title: string;
  supportingText?: string;
  detailText?: string;
  href: Href;
  accessibilityLabel?: string;
  locked?: boolean;
};

export function RelatedContentSection({
  title,
  description,
  items,
  testID,
  continuation = false,
  tone,
  variant,
}: {
  title: string;
  description?: string;
  items: RelatedContentItem[];
  testID?: string;
  continuation?: boolean;
  tone?: 'theory';
  variant?: 'primary' | 'supplementary' | 'feature' | 'technique';
}) {
  if (!items.length) return null;
  const theoretical = tone === 'theory' || variant === 'primary' || variant === 'supplementary';

  return (
    <View style={[styles.section, continuation && styles.sectionContinuation, variant && detailStyles.section]}>
      <View style={[styles.headingArea, variant && detailStyles.headingArea]}>
        <View style={styles.heading}>
          <AppText accessibilityRole="header" aria-level={2} variant="serif" style={[styles.headingText, theoretical && theoryStyles.ink, variant && detailStyles.headingText]}>{title}</AppText>
          <View style={[styles.countBadge, theoretical && theoryStyles.countBadge]}><AppText style={[styles.countText, theoretical && theoryStyles.ink]}>{items.length}</AppText></View>
        </View>
        {description ? <AppText style={[styles.description, theoretical && theoryStyles.text]}>{description}</AppText> : null}
      </View>
      <View testID={testID} style={[styles.list, theoretical && theoryStyles.list, variant === 'primary' && detailStyles.primaryList, variant === 'feature' && detailStyles.featureList]}>
        {items.map((item, index) => (
          <Link key={item.key} href={item.href} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={item.accessibilityLabel ?? `${item.title}を開く`}
              style={StyleSheet.flatten([
                styles.row,
                theoretical && theoryStyles.row,
                variant === 'primary' && detailStyles.primaryRow,
                variant === 'supplementary' && detailStyles.compactRow,
                variant === 'feature' && detailStyles.featureRow,
                index === items.length - 1 && styles.rowLast,
              ])}
            >
              <View accessibilityElementsHidden style={[styles.diamond, theoretical && theoryStyles.diamond]} />
              <View style={styles.copy}>
                <AppText variant="serif" style={[styles.title, theoretical && theoryStyles.ink, variant === 'primary' && detailStyles.primaryTitle, variant === 'supplementary' && detailStyles.compactTitle]}>{normalizeDisplayText(item.title)}</AppText>
                {item.locked ? <AppText style={[styles.supporting, theoretical && theoryStyles.text]}>完全版で読む</AppText> : null}
                {item.supportingText ? (
                  <AppText numberOfLines={2} style={[styles.supporting, theoretical && theoryStyles.text]}>
                    {normalizeDisplayText(item.supportingText).replace(/\n+/g, ' ')}
                  </AppText>
                ) : null}
                {item.detailText ? <AppText style={[styles.supporting, theoretical && theoryStyles.text]}>{normalizeDisplayText(item.detailText)}</AppText> : null}
              </View>
              <AppText accessibilityElementsHidden style={[styles.chevron, theoretical && theoryStyles.ink]}>›</AppText>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%', marginTop: 34 },
  sectionContinuation: { marginTop: 24 },
  headingArea: { marginBottom: 12, paddingHorizontal: 20 },
  heading: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 11 },
  headingText: { color: '#24231E', fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, fontWeight: '700', letterSpacing: 0.7 },
  description: { marginTop: 2, color: '#6B655C', fontSize: 12, lineHeight: 19 },
  countBadge: { minWidth: 29, height: 29, paddingHorizontal: 8, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE4D2' },
  countText: { color: '#A27526', fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  list: { width: '100%', borderWidth: 1, borderColor: '#DED0BB', borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.74)', overflow: 'hidden' },
  row: { width: '100%', minHeight: 96, paddingVertical: 16, paddingLeft: 28, paddingRight: 22, flexDirection: 'row', alignItems: 'center', gap: 17, borderBottomWidth: 1, borderBottomColor: '#E4D8C7' },
  rowLast: { borderBottomWidth: 0 },
  rowPressed: { backgroundColor: '#F4EBDD' },
  diamond: { width: 9, height: 9, flexShrink: 0, borderWidth: 1, borderColor: '#B8872D', transform: [{ rotate: '45deg' }] },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#1B1D19', fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, fontWeight: '700', letterSpacing: 0.3 },
  supporting: { marginTop: 3, color: '#625E56', fontSize: 13, lineHeight: 21 },
  chevron: { flexShrink: 0, marginLeft: 4, color: colors.gold, fontFamily: fonts.serif, fontSize: 28, lineHeight: 30 },
});

const theoryStyles = StyleSheet.create({
  ink: { color: catalogTheme.theory.ink },
  text: { color: catalogTheme.theory.text },
  countBadge: { backgroundColor: catalogTheme.theory.inactive },
  list: { borderColor: catalogTheme.theory.border, backgroundColor: catalogTheme.theory.surface },
  row: { borderBottomColor: catalogTheme.theory.border },
  diamond: { borderColor: catalogTheme.theory.ink },
});

const detailStyles = StyleSheet.create({
  section: { marginTop: 28 },
  headingArea: { paddingHorizontal: 0 },
  headingText: { fontSize: 19, lineHeight: 28 },
  primaryList: { backgroundColor: '#EDF1F0', borderColor: '#B9C9C7' },
  primaryRow: { minHeight: 118, paddingVertical: 20 },
  primaryTitle: { fontSize: 21, lineHeight: 31 },
  compactRow: { minHeight: 76, paddingVertical: 12, paddingLeft: 18, gap: 12 },
  compactTitle: { fontSize: 16, lineHeight: 24 },
  featureList: { backgroundColor: '#F7F2EA', borderColor: '#DED4C6' },
  featureRow: { minHeight: 82, paddingLeft: 20 },
});

