import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { detailStyles } from '@/constants/detail-theme';
import { colors, fonts, radius } from '@/constants/theme';
import { normalizeDisplayText } from '@/data/theory-display';
import { AppText } from './ui';

export type RelatedContentItem = {
  key: string;
  title: string;
  supportingText?: string;
  href: Href;
  locked?: boolean;
};

export function RelatedContentSection({
  title,
  description,
  items,
  testID,
}: {
  title: string;
  description?: string;
  items: RelatedContentItem[];
  testID?: string;
}) {
  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headingArea}>
        <View style={styles.heading}>
          <View accessibilityElementsHidden importantForAccessibility="no" style={detailStyles.sectionMark} />
          <AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.headingText}>{title}</AppText>
          <AppText variant="serif" style={styles.total}>
            {'全 '}<AppText variant="serif" style={styles.totalNumber}>{items.length}</AppText>{' 件'}
          </AppText>
        </View>
        {description ? <AppText style={styles.description}>{description}</AppText> : null}
      </View>
      <View testID={testID}>
        {items.map((item, index) => {
          const supportingText = normalizeDisplayText(item.supportingText).replace(/\n+/g, ' ');
          return (
            <Link key={item.key} href={item.href} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${item.title}を開く`}
                style={styles.row}
              >
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.numberColumn}>
                  <View style={styles.numberBadge}>
                    <AppText variant="serif" style={styles.number}>{String(index + 1).padStart(2, '0')}</AppText>
                  </View>
                </View>
                <View style={styles.copy}>
                  <AppText variant="serif" style={styles.title}>{normalizeDisplayText(item.title)}</AppText>
                  {item.locked ? <AppText style={styles.supporting}>完全版で読む</AppText> : null}
                  {supportingText ? (
                    <AppText style={[styles.supporting, styles.supportingPreview]}>
                      {supportingText}
                    </AppText>
                  ) : null}
                </View>
                <AppText accessibilityElementsHidden style={styles.chevron}>›</AppText>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%' },
  headingArea: { marginBottom: 9 },
  heading: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 9 },
  headingText: { flexShrink: 1, color: colors.ink, fontSize: 19, lineHeight: 28, fontWeight: '700', letterSpacing: 0.4 },
  total: { marginLeft: 'auto', flexShrink: 0, color: colors.goldDeep, fontSize: 12, lineHeight: 24, fontWeight: '600' },
  totalNumber: { color: colors.goldDeep, fontSize: 17, fontStyle: 'italic', fontWeight: '700' },
  description: { marginTop: 3, marginLeft: 13, color: '#6B655C', fontSize: 12, lineHeight: 19 },
  row: { width: '100%', minHeight: 52, paddingVertical: 10, paddingLeft: 3, paddingRight: 4, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  numberColumn: { flexShrink: 0, alignSelf: 'stretch', justifyContent: 'center', marginVertical: 1, paddingRight: 12, marginRight: 13, borderRightWidth: 1, borderRightColor: colors.line },
  numberBadge: { minWidth: 32, minHeight: 28, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: '#F3ECDF' },
  number: { color: colors.goldDeep, fontSize: 14, lineHeight: 18, fontStyle: 'italic', fontWeight: '700', fontVariant: ['tabular-nums'] },
  copy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 17, lineHeight: 25, fontWeight: '700', letterSpacing: 0.2 },
  supporting: { marginTop: 3, color: '#625E56', fontSize: 13, lineHeight: 21 },
  supportingPreview: { marginTop: 2, lineHeight: 18 },
  chevron: { flexShrink: 0, marginLeft: 8, color: colors.gold, fontFamily: fonts.serif, fontSize: 23, lineHeight: 26 },
});

