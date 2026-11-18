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
  supportingTextLines = 2,
  tone,
  variant,
}: {
  title: string;
  description?: string;
  items: RelatedContentItem[];
  testID?: string;
  supportingTextLines?: number;
  tone?: 'theory';
  variant?: 'technique-detail';
}) {
  if (!items.length) return null;
  const theoretical = tone === 'theory';

  return (
    <View style={[styles.section, variant && detailStyles.section]}>
      <View style={[styles.headingArea, variant && detailStyles.headingArea]}>
        <View style={[styles.heading, variant && detailStyles.heading]}>
          {variant ? <View accessibilityElementsHidden importantForAccessibility="no" style={detailStyles.goldBar} /> : null}
          <AppText accessibilityRole="header" aria-level={2} variant="serif" style={[styles.headingText, theoretical && theoryStyles.ink, variant && detailStyles.headingText]}>{title}</AppText>
          {variant ? (
            <AppText variant="serif" style={detailStyles.total}>
              {'全 '}<AppText variant="serif" style={detailStyles.totalNumber}>{items.length}</AppText>{' 件'}
            </AppText>
          ) : (
            <View style={[styles.countBadge, theoretical && theoryStyles.countBadge]}><AppText style={[styles.countText, theoretical && theoryStyles.ink]}>{items.length}</AppText></View>
          )}
        </View>
        {description ? <AppText style={[styles.description, theoretical && theoryStyles.text, variant && detailStyles.description]}>{description}</AppText> : null}
      </View>
      <View testID={testID} style={[styles.list, theoretical && theoryStyles.list, variant && detailStyles.list]}>
        {items.map((item, index) => {
          const supportingText = normalizeDisplayText(item.supportingText).replace(/\n+/g, ' ');
          return (
            <Link key={item.key} href={item.href} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={item.accessibilityLabel ?? `${item.title}を開く`}
                style={StyleSheet.flatten([
                  styles.row,
                  theoretical && theoryStyles.row,
                  variant && detailStyles.row,
                  !variant && index === items.length - 1 && styles.rowLast,
                ])}
              >
                {variant ? (
                  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={detailStyles.numberColumn}>
                    <View style={detailStyles.numberBadge}>
                      <AppText variant="serif" style={detailStyles.number}>{String(index + 1).padStart(2, '0')}</AppText>
                    </View>
                  </View>
                ) : (
                  <View accessibilityElementsHidden style={[styles.diamond, theoretical && theoryStyles.diamond]} />
                )}
                <View style={styles.copy}>
                  <AppText variant="serif" style={[styles.title, theoretical && theoryStyles.ink, variant && detailStyles.title]}>{normalizeDisplayText(item.title)}</AppText>
                  {item.locked ? <AppText style={[styles.supporting, theoretical && theoryStyles.text]}>完全版で読む</AppText> : null}
                  {supportingText ? (
                    <AppText numberOfLines={supportingTextLines} style={[styles.supporting, theoretical && theoryStyles.text, variant && detailStyles.supporting]}>
                      {supportingText}
                    </AppText>
                  ) : null}
                  {item.detailText ? <AppText style={[styles.supporting, theoretical && theoryStyles.text]}>{normalizeDisplayText(item.detailText)}</AppText> : null}
                </View>
                <AppText accessibilityElementsHidden style={[styles.chevron, theoretical && theoryStyles.ink, variant && detailStyles.chevron]}>›</AppText>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%', marginTop: 34 },
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
  section: { marginTop: 0 },
  headingArea: { paddingHorizontal: 0, marginBottom: 9 },
  heading: { minHeight: 28, gap: 9 },
  goldBar: { width: 4, height: 23, backgroundColor: '#B28B3A' },
  headingText: { flexShrink: 1, color: colors.ink, fontSize: 19, lineHeight: 28, letterSpacing: 0.4 },
  total: { marginLeft: 'auto', flexShrink: 0, color: colors.goldDeep, fontSize: 12, lineHeight: 24, fontWeight: '600' },
  totalNumber: { color: colors.goldDeep, fontSize: 17, fontStyle: 'italic', fontWeight: '700' },
  description: { marginTop: 3, marginLeft: 13 },
  list: { backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0, overflow: 'visible' },
  row: { minHeight: 52, paddingVertical: 10, paddingLeft: 3, paddingRight: 4, gap: 0, borderBottomColor: colors.line },
  numberColumn: { flexShrink: 0, alignSelf: 'stretch', justifyContent: 'center', marginVertical: 1, paddingRight: 12, marginRight: 13, borderRightWidth: 1, borderRightColor: colors.line },
  numberBadge: { minWidth: 32, minHeight: 28, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: '#F3ECDF' },
  number: { color: colors.goldDeep, fontSize: 14, lineHeight: 18, fontStyle: 'italic', fontWeight: '700', fontVariant: ['tabular-nums'] },
  title: { color: colors.ink, fontSize: 17, lineHeight: 25, letterSpacing: 0.2 },
  supporting: { marginTop: 2, lineHeight: 18 },
  chevron: { fontSize: 23, lineHeight: 26, marginLeft: 8 },
});

