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
  description,
  items,
  testID,
  continuation = false,
}: {
  title: string;
  description?: string;
  items: RelatedContentItem[];
  testID?: string;
  continuation?: boolean;
}) {
  if (!items.length) return null;

  return (
    <View style={[styles.section, continuation && styles.sectionContinuation]}>
      <View style={styles.headingArea}>
        <View style={styles.heading}>
          <AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.headingText}>{title}</AppText>
          <View style={styles.countBadge}><AppText style={styles.countText}>{items.length}</AppText></View>
        </View>
        {description ? <AppText style={styles.description}>{description}</AppText> : null}
      </View>
      <View testID={testID} style={styles.list}>
        {items.map((item, index) => (
          <Link key={item.key} href={item.href} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={item.accessibilityLabel ?? `${item.title}を開く`}
              style={StyleSheet.flatten([
                styles.row,
                index === items.length - 1 && styles.rowLast,
              ])}
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
