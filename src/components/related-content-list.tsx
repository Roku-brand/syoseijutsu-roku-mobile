import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, radius } from '@/constants/theme';
import { normalizeDisplayText } from '@/data/theory-display';
import { AppText } from './ui';

export type RelatedContentItem = {
  key: string;
  title: string;
  supportingText?: string;
  href: Href;
  accessibilityLabel?: string;
};

export function RelatedContentSection({
  title,
  items,
  testID,
}: {
  title: string;
  items: RelatedContentItem[];
  testID?: string;
}) {
  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.headingText}>{title}</AppText>
        <View style={styles.countBadge}><AppText style={styles.countText}>{items.length}</AppText></View>
      </View>
      <View testID={testID} style={styles.list}>
        {items.map((item, index) => (
          <Link key={item.key} href={item.href} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={item.accessibilityLabel ?? `${item.title}を開く`}
              style={({ pressed }) => [
                styles.row,
                index === items.length - 1 && styles.rowLast,
                pressed && styles.rowPressed,
              ]}
            >
              <View accessibilityElementsHidden style={styles.diamond} />
              <View style={styles.copy}>
                <AppText variant="serif" style={styles.title}>{normalizeDisplayText(item.title)}</AppText>
                {item.supportingText ? (
                  <AppText numberOfLines={2} style={styles.supporting}>
                    {normalizeDisplayText(item.supportingText).replace(/\n+/g, ' ')}
                  </AppText>
                ) : null}
              </View>
              <AppText accessibilityElementsHidden style={styles.chevron}>›</AppText>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { width: '100%', marginTop: 30 },
  heading: { minHeight: 34, marginBottom: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headingText: { color: '#24231E', fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '700', letterSpacing: 0.6 },
  countBadge: { minWidth: 25, height: 25, paddingHorizontal: 7, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEE4D2' },
  countText: { color: '#A27526', fontFamily: fonts.serif, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  list: { width: '100%', borderWidth: 1, borderColor: '#DED0BB', borderRadius: radius.sm, backgroundColor: 'rgba(255,253,248,0.68)', overflow: 'hidden' },
  row: { width: '100%', minHeight: 76, paddingVertical: 13, paddingLeft: 24, paddingRight: 18, flexDirection: 'row', alignItems: 'center', gap: 15, borderBottomWidth: 1, borderBottomColor: '#E4D8C7' },
  rowLast: { borderBottomWidth: 0 },
  rowPressed: { backgroundColor: '#F4EBDD' },
  diamond: { width: 8, height: 8, flexShrink: 0, borderWidth: 1, borderColor: '#B8872D', transform: [{ rotate: '45deg' }] },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#1B1D19', fontSize: 17, lineHeight: 25, fontWeight: '700', letterSpacing: 0.25 },
  supporting: { marginTop: 3, color: '#625E56', fontSize: 12, lineHeight: 20 },
  chevron: { flexShrink: 0, marginLeft: 4, color: colors.gold, fontFamily: fonts.serif, fontSize: 28, lineHeight: 30 },
});
