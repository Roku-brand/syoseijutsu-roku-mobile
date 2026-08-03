import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAccess } from '@/access/access-state';

const benefits = [
  '全434件の処世術',
  '全526件の理論',
  'すべての分類と完全検索',
  '全学習ステージ',
  '全カードの保存・実践記録',
];

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const { restorePurchase } = useAccess();

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <AppText style={styles.kicker}>COMPLETE EDITION</AppText>
        <AppText style={styles.title}>学校では教えてくれない、{`\n`}社会を生きるための教科書。</AppText>
        <View style={styles.metrics}>
          <Metric value="434" label="処世術" />
          <Metric value="526" label="理論" />
          <Metric value="21" label="学習ケース" />
        </View>
      </View>

      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>完全版で広がること</AppText>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <View style={styles.diamond} />
            <AppText style={styles.benefit}>{benefit}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.compare}>
        <View style={styles.compareColumn}>
          <AppText style={styles.compareLabel}>無料版</AppText>
          <AppText style={styles.compareBody}>厳選20枚、印象がいい人、理論20枚、学習ステージ1</AppText>
        </View>
        <View style={[styles.compareColumn, styles.comparePaid]}>
          <AppText style={[styles.compareLabel, styles.gold]}>完全版</AppText>
          <AppText style={styles.compareBody}>全処世術・全理論・全分類・全学習ステージ</AppText>
        </View>
      </View>

      <View style={styles.notice}>
        <AppText style={styles.noticeTitle}>購入機能の接続準備中</AppText>
        <AppText style={styles.noticeBody}>
          現在のGitHub Pagesは静的配信のため、決済と購入権限の検証には外部バックエンドの接続が必要です。ローカル操作だけで完全版を開放する処理は実装していません。
        </AppText>
      </View>

      <Pressable style={styles.primary} onPress={() => router.back()}>
        <AppText style={styles.primaryTitle}>無料版を続ける</AppText>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => void restorePurchase()}>
        <AppText style={styles.secondaryText}>購入を復元する</AppText>
      </Pressable>
      <AppText style={styles.source}>導線: {params.source ?? 'unknown'}</AppText>
    </BookScreen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <AppText style={styles.metricValue}>{value}</AppText>
      <AppText style={styles.metricLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', padding: spacing.lg, paddingBottom: 120 },
  hero: { padding: spacing.xl, borderRadius: radius.md, backgroundColor: colors.charcoal },
  kicker: { color: colors.goldLight, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  title: { marginTop: 16, color: '#F5F0E7', fontFamily: fonts.serif, fontSize: 29, lineHeight: 45, fontWeight: '700' },
  metrics: { flexDirection: 'row', marginTop: 28, gap: 10 },
  metric: { flex: 1, paddingVertical: 14, borderTopWidth: 1, borderColor: '#665F52' },
  metricValue: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 27, fontWeight: '700' },
  metricLabel: { marginTop: 4, color: '#D7D0C3', fontSize: 11 },
  section: { marginTop: 24, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  sectionTitle: { fontFamily: fonts.serif, fontSize: 21, fontWeight: '700' },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 15 },
  diamond: { width: 7, height: 7, backgroundColor: colors.gold, transform: [{ rotate: '45deg' }] },
  benefit: { flex: 1, fontSize: 14, lineHeight: 22 },
  compare: { flexDirection: 'row', gap: 10, marginTop: 18 },
  compareColumn: { flex: 1, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  comparePaid: { borderColor: colors.gold },
  compareLabel: { fontFamily: fonts.serif, fontSize: 16, fontWeight: '700' },
  compareBody: { marginTop: 8, color: colors.inkSoft, fontSize: 12, lineHeight: 20 },
  gold: { color: colors.gold },
  notice: { marginTop: 18, padding: 16, borderLeftWidth: 3, borderColor: colors.gold, backgroundColor: '#F2EADC' },
  noticeTitle: { fontWeight: '700', color: colors.ink },
  noticeBody: { marginTop: 6, color: colors.inkSoft, fontSize: 12, lineHeight: 20 },
  primary: { marginTop: 22, minHeight: 56, borderRadius: 10, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  primaryTitle: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 17, fontWeight: '700' },
  secondary: { marginTop: 10, minHeight: 50, borderRadius: 10, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.gold, fontWeight: '700' },
  source: { marginTop: 14, textAlign: 'center', color: colors.muted, fontSize: 10 },
});
