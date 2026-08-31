import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AppText } from './ui';

export function SeoBreadcrumbs({ items }: { items: { label: string; href?: Href }[] }) {
  return (
    <View accessibilityRole="list" accessibilityLabel="パンくずリスト" style={styles.row}>
      {items.map((item, index) => (
        <View key={`${item.label}-${index}`} role="listitem" style={styles.item}>
          {index > 0 ? <AppText accessibilityElementsHidden style={styles.separator}>›</AppText> : null}
          {item.href ? (
            <Link href={item.href} asChild>
              <Pressable accessibilityRole="link" accessibilityLabel={`${item.label}へ移動`}>
                <AppText style={styles.link}>{item.label}</AppText>
              </Pressable>
            </Link>
          ) : <AppText style={styles.current}>{item.label}</AppText>}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginBottom: 18 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  separator: { color: '#958B7C', fontSize: 12, lineHeight: 18 },
  link: { color: colors.gold, fontSize: 11, lineHeight: 18, textDecorationLine: 'underline' },
  current: { maxWidth: 260, color: '#6F6A61', fontSize: 11, lineHeight: 18 },
});
