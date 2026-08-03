import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const rows = [
  { title: '76%', body: ['94%', '86%', '62%'] },
  { title: '58%', body: ['88%', '91%', '70%'] },
  { title: '83%', body: ['96%', '79%', '66%'] },
];

export function LockedPreview({
  title,
  description,
  count,
  source,
}: {
  title: string;
  description: string;
  count: number;
  source: 'reel' | 'discover_technique' | 'discover_theory' | 'learning' | 'my_os';
}) {
  const router = useRouter();
  return (
    <View style={styles.wrapper}>
      <View style={styles.headingRow}>
        <View style={styles.lock}><AppText style={styles.lockText}>鍵</AppText></View>
        <View style={styles.headingCopy}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText style={styles.count}>完全版に全{count}件</AppText>
        </View>
      </View>
      <AppText style={styles.description}>{description}</AppText>
      <View style={styles.cards}>
        {rows.map((row, index) => (
          <View key={index} style={styles.card}>
            <View style={[styles.lineStrong, { width: row.title as never }]} />
            {row.body.map((width, lineIndex) => (
              <View key={lineIndex} style={[styles.line, { width: width as never }]} />
            ))}
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/upgrade', params: { source } })}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <AppText style={styles.ctaTitle}>完全版を開く</AppText>
        <AppText style={styles.ctaSubtitle}>434の処世術と526の理論をすべて読む</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lock: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  lockText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  headingCopy: { flex: 1 },
  title: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '700' },
  count: { marginTop: 2, color: colors.gold, fontSize: 12, fontWeight: '700' },
  description: { marginTop: 14, color: colors.inkSoft, fontSize: 13, lineHeight: 22 },
  cards: { marginTop: 18, gap: 10 },
  card: { padding: 15, gap: 9, borderWidth: 1, borderColor: '#DED4C3', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.52)' },
  lineStrong: { height: 10, borderRadius: 5, backgroundColor: '#BEB5A6' },
  line: { height: 7, borderRadius: 4, backgroundColor: '#D9D1C5' },
  cta: { marginTop: 20, minHeight: 60, paddingHorizontal: 18, borderRadius: 10, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 17, fontWeight: '700' },
  ctaSubtitle: { marginTop: 2, color: '#E7E1D5', fontSize: 11 },
  pressed: { opacity: 0.72 },
});
