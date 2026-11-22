import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { detailStyles } from '@/constants/detail-theme';
import { colors, fonts, radius } from '@/constants/theme';
import { normalizeDisplayText } from '@/data/theory-display';
import { AppText } from './ui';

export type RelatedContentItem = {
  key: string;
  title: string;
  href: Href;
  locked?: boolean;
};

function LockMark({ testID }: { testID?: string }) {
  return (
    <View testID={testID} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={styles.lock}>
      <View style={styles.lockShackle} />
      <View style={styles.lockBody}><View style={styles.lockKeyhole} /></View>
    </View>
  );
}

export function RelatedContentSection({ title, items, testID }: {
  title: string;
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
        {items.some(item => item.locked) ? (
          <View style={styles.legend}>
            <LockMark />
            <AppText style={styles.legendText}>鍵のマークは、完全版限定の項目です</AppText>
          </View>
        ) : null}
      </View>
      <View testID={testID}>
        {items.map((item, index) => (
          <Link key={item.key} href={item.href} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`${item.title}を開く`}
              accessibilityHint={item.locked ? '完全版限定の項目です' : undefined}
              style={styles.row}
            >
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.numberColumn}>
                <View style={styles.numberBadge}>
                  <AppText variant="serif" style={styles.number}>{String(index + 1).padStart(2, '0')}</AppText>
                </View>
              </View>
              <AppText variant="serif" style={styles.title}>{normalizeDisplayText(item.title)}</AppText>
              <View style={styles.trailing}>
                {item.locked ? <LockMark testID="related-content-lock" /> : null}
                <AppText accessibilityElementsHidden aria-hidden style={styles.chevron}>›</AppText>
              </View>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 5 },
  headingArea: { marginBottom: 7 },
  heading: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 9 },
  headingText: { flexShrink: 1, color: colors.ink, fontSize: 19, lineHeight: 28, fontWeight: '700', letterSpacing: 0.4 },
  total: { marginLeft: 'auto', flexShrink: 0, color: colors.goldDeep, fontSize: 12, lineHeight: 24, fontWeight: '600' },
  totalNumber: { color: colors.goldDeep, fontSize: 18, fontStyle: 'italic', fontWeight: '700' },
  legend: { marginLeft: 9, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 },
  legendText: { flexShrink: 1, color: colors.goldDeep, fontSize: 11, lineHeight: 18 },
  row: { width: '100%', minHeight: 44, paddingVertical: 6, paddingLeft: 3, paddingRight: 4, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  numberColumn: { flexShrink: 0, alignSelf: 'stretch', justifyContent: 'center', paddingRight: 12, marginRight: 12, borderRightWidth: 1, borderRightColor: colors.line },
  numberBadge: { minWidth: 29, minHeight: 29, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: '#F3ECDF' },
  number: { color: colors.goldDeep, fontSize: 14, lineHeight: 18, fontStyle: 'italic', fontWeight: '700', fontVariant: ['tabular-nums'] },
  title: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: '700', letterSpacing: 0.2 },
  trailing: { flexShrink: 0, marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 11 },
  chevron: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 21, lineHeight: 24 },
  lock: { width: 13, height: 15, alignItems: 'center', justifyContent: 'center' },
  lockShackle: { width: 8, height: 6, borderWidth: 1.5, borderBottomWidth: 0, borderColor: colors.goldDeep, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  lockBody: { width: 12, height: 8, borderRadius: 2, backgroundColor: colors.goldDeep, alignItems: 'center', justifyContent: 'center' },
  lockKeyhole: { width: 2, height: 3, borderRadius: 1, backgroundColor: colors.surface },
});
