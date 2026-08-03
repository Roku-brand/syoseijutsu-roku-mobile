import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const rows = [
  { title: '76%', body: ['94%', '86%', '62%'] },
  { title: '58%', body: ['88%', '91%', '70%'] },
  { title: '83%', body: ['96%', '79%', '66%'] },
];

const sourceCopy = {
  reel: { label: '関連する一手を体系で読む', cta: 'この原理を掘り下げる' },
  discover_technique: { label: '同じ状況で使える一手を読む', cta: 'この分類を解放する' },
  discover_theory: { label: '理論と実際の行動を往復する', cta: 'この理論体系を解放する' },
  learning: { label: '知識をケースで判断に変える', cta: '続きの判断を試す' },
  my_os: { label: '知識を自分の判断基準として蓄える', cta: '完全版を自分のOSへ' },
} as const;

export function LockedPreview({
  title,
  description,
  count,
  source,
}: {
  title: string;
  description: string;
  count: number;
  source: keyof typeof sourceCopy;
}) {
  const router = useRouter();
  const copy = sourceCopy[source];
  return (
    <View style={styles.wrapper}>
      <View style={styles.topline}><AppText style={styles.toplineText}>COMPLETE EDITION</AppText><AppText style={styles.price}>¥280・買い切り</AppText></View>
      <View style={styles.headingRow}>
        <View style={styles.lock}><AppText style={styles.lockText}>鍵</AppText></View>
        <View style={styles.headingCopy}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText style={styles.count}>この先に{count}件の知識</AppText>
        </View>
      </View>
      <AppText style={styles.description}>{description}</AppText>
      <View style={styles.valueBox}>
        <AppText style={styles.valueTitle}>{copy.label}</AppText>
        <AppText style={styles.valueBody}>心理学・行動科学・戦略論を、状況別の一手と注意点まで整理しています。</AppText>
      </View>
      <View style={styles.cards}>
        {rows.map((row, index) => (
          <View key={index} style={styles.card}>
            <View style={[styles.lineStrong, { width: row.title as never }]} />
            {row.body.map((width, lineIndex) => <View key={lineIndex} style={[styles.line, { width: width as never }]} />)}
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/upgrade', params: { source } })} style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
        <AppText style={styles.ctaTitle}>{copy.cta}</AppText>
        <AppText style={styles.ctaSubtitle}>人間社会の原理を、断片ではなく体系で</AppText>
      </Pressable>
      <AppText style={styles.reassurance}>434の処世術・526の理論・全21ケース</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { padding: spacing.lg, borderWidth: 1, borderColor: '#CDBD9E', borderRadius: radius.md, backgroundColor: '#F8F2E7' },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderColor: '#E1D5C1' },
  toplineText: { color: colors.gold, fontSize: 9, letterSpacing: 1.6, fontWeight: '700' },
  price: { color: colors.inkSoft, fontSize: 10, fontWeight: '700' },
  headingRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  lock: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  lockText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  headingCopy: { flex: 1 },
  title: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '700' },
  count: { marginTop: 2, color: colors.gold, fontSize: 12, fontWeight: '700' },
  description: { marginTop: 14, color: colors.inkSoft, fontSize: 13, lineHeight: 22 },
  valueBox: { marginTop: 15, padding: 14, borderLeftWidth: 2, borderColor: colors.gold, backgroundColor: 'rgba(255,255,255,0.5)' },
  valueTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, fontWeight: '700' },
  valueBody: { marginTop: 5, color: colors.inkSoft, fontSize: 11, lineHeight: 18 },
  cards: { marginTop: 16, gap: 8 },
  card: { padding: 13, gap: 8, borderWidth: 1, borderColor: '#DED4C3', borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.42)' },
  lineStrong: { height: 9, borderRadius: 5, backgroundColor: '#BEB5A6' },
  line: { height: 6, borderRadius: 4, backgroundColor: '#D9D1C5' },
  cta: { marginTop: 18, minHeight: 62, paddingHorizontal: 18, borderRadius: 10, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 17, fontWeight: '700' },
  ctaSubtitle: { marginTop: 3, color: '#D8D0C2', fontSize: 10 },
  reassurance: { marginTop: 9, color: colors.muted, textAlign: 'center', fontSize: 10 },
  pressed: { opacity: 0.72 },
});
