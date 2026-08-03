import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAccess } from '@/access/access-state';
import { useAuth } from '@/auth/auth-state';
import { COMPLETE_EDITION_PRICE_JPY, createCompleteEditionCheckout } from '@/lib/purchase';

const strengths = [
  { mark: '根', title: '心理学・行動科学・戦略論に基づく', body: '経験談だけではなく、人が動く理由と社会の構造から一手を理解する。' },
  { mark: '系', title: '断片ではなく、状況別の体系', body: '人間関係・集団・仕事・人生を横断し、今の悩みから必要な知識へ進める。' },
  { mark: '実', title: '理論を行動へ変え、ケースで試す', body: '読むだけで終わらず、選択と振り返りを通じて判断の精度を上げる。' },
];

const sourceLead: Record<string, string> = {
  learning: '続きのケースでは、頼まれ方・押され方・人生の選択まで判断を試せます。',
  discover_technique: 'この先には、同じ状況で使える一手と、その注意点が体系的に収録されています。',
  discover_theory: 'この先では、心理学の原理と、それを現実でどう使うかまで往復できます。',
  reel: '気になった一枚を入口に、関連する理論と別の一手まで掘り下げられます。',
  my_os: '完全版の知識を保存し、自分の判断基準として蓄積できます。',
};

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; checkout?: string }>();
  const { user } = useAuth();
  const { isPaid, refreshAccess, restorePurchase } = useAccess();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const lead = sourceLead[params.source ?? ''] ?? '表向きの正しさだけでは説明できない、人間社会の原理を一つの体系で学べます。';

  useEffect(() => {
    if (params.checkout === 'success') {
      setMessage('決済を確認しています。反映されない場合は「購入を復元」を押してください。');
      void refreshAccess();
    } else if (params.checkout === 'cancelled') {
      setMessage('購入はキャンセルされました。料金は発生していません。');
    }
  }, [params.checkout, refreshAccess]);

  const purchase = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const result = await createCompleteEditionCheckout();
      if (result.alreadyPaid) {
        await refreshAccess();
        setMessage('このアカウントはすでに完全版を利用できます。');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '購入画面を開けませんでした。');
    } finally {
      setSubmitting(false);
    }
  };

  const restore = async () => {
    setSubmitting(true);
    const restored = await restorePurchase();
    setSubmitting(false);
    setMessage(restored ? '完全版を復元しました。' : 'このアカウントの購入はまだ確認できません。');
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <AppText style={styles.kicker}>SHOSEIJUTSU ROKU / COMPLETE EDITION</AppText>
        <AppText style={styles.title}>人間社会には、{`\n`}知っている側だけが使っている原理がある。</AppText>
        <AppText style={styles.lead}>{lead}</AppText>
        <View style={styles.methodRow}>
          <AppText style={styles.method}>状況から探す</AppText><AppText style={styles.arrow}>→</AppText>
          <AppText style={styles.method}>原理を知る</AppText><AppText style={styles.arrow}>→</AppText>
          <AppText style={styles.method}>ケースで試す</AppText>
        </View>
        <View style={styles.priceRow}>
          <AppText style={styles.price}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText>
          <View><AppText style={styles.priceNote}>買い切り</AppText><AppText style={styles.priceSub}>追加課金なし</AppText></View>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric value="434" label="状況別の処世術" />
        <Metric value="526" label="背景にある理論" />
        <Metric value="21" label="判断ケース" />
      </View>

      <View style={styles.section}>
        <AppText style={styles.eyebrow}>WHY ROKU</AppText>
        <AppText style={styles.sectionTitle}>断片的な心理学を、使える判断体系へ。</AppText>
        {strengths.map((item) => (
          <View key={item.mark} style={styles.strengthRow}>
            <View style={styles.strengthMark}><AppText style={styles.strengthMarkText}>{item.mark}</AppText></View>
            <View style={styles.strengthCopy}><AppText style={styles.strengthTitle}>{item.title}</AppText><AppText style={styles.strengthBody}>{item.body}</AppText></View>
          </View>
        ))}
      </View>

      <View style={styles.compare}>
        <View style={styles.compareColumn}>
          <AppText style={styles.compareLabel}>無料版</AppText>
          <AppText style={styles.compareHeadline}>考え方を体験する</AppText>
          <AppText style={styles.compareBody}>厳選された処世術・理論と、学習ステージ1を利用できます。</AppText>
        </View>
        <View style={[styles.compareColumn, styles.comparePaid]}>
          <AppText style={[styles.compareLabel, styles.gold]}>完全版</AppText>
          <AppText style={styles.compareHeadline}>自分の状況から探せる</AppText>
          <AppText style={styles.compareBody}>全分類・全理論・全学習ステージを解放し、知識を横断して使えます。</AppText>
        </View>
      </View>

      <View style={styles.promise}>
        <AppText style={styles.promiseTitle}>人を操るためではなく、社会を見誤らないために。</AppText>
        <AppText style={styles.promiseBody}>処世術禄は、万能な心理テクニックを断言するサービスではありません。適用場面と注意点を含め、状況に応じて一手を選ぶための知識を提供します。</AppText>
      </View>

      {message ? <AppText style={styles.message}>{message}</AppText> : null}
      {isPaid ? (
        <Pressable style={styles.primary} onPress={() => router.back()}><AppText style={styles.primaryTitle}>完全版を開く</AppText></Pressable>
      ) : (
        <Pressable disabled={submitting} style={[styles.primary, submitting && styles.disabled]} onPress={() => void purchase()}>
          <AppText style={styles.primaryTitle}>{submitting ? '確認中…' : user ? '知っている側へ進む' : 'ログインして完全版へ進む'}</AppText>
          <AppText style={styles.primarySub}>¥{COMPLETE_EDITION_PRICE_JPY}・買い切り</AppText>
        </Pressable>
      )}
      <Pressable disabled={submitting} style={styles.secondary} onPress={() => void restore()}><AppText style={styles.secondaryText}>購入済みの方はこちら</AppText></Pressable>
      <Pressable style={styles.freeLink} onPress={() => router.back()}><AppText style={styles.freeLinkText}>無料版を続ける</AppText></Pressable>
    </BookScreen>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><AppText style={styles.metricValue}>{value}</AppText><AppText style={styles.metricLabel}>{label}</AppText></View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: spacing.lg, paddingBottom: 120 },
  hero: { padding: spacing.xl, borderRadius: radius.md, backgroundColor: colors.charcoal },
  kicker: { color: colors.goldLight, fontSize: 10, letterSpacing: 1.7, fontWeight: '700' },
  title: { marginTop: 16, color: '#F7F1E6', fontFamily: fonts.serif, fontSize: 29, lineHeight: 43, fontWeight: '700' },
  lead: { marginTop: 14, color: '#D8D0C2', fontSize: 13, lineHeight: 22 },
  methodRow: { marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  method: { color: '#F3E1B6', fontSize: 11, fontWeight: '700' },
  arrow: { color: '#817767', fontSize: 11 },
  priceRow: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  price: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 38, fontWeight: '700' },
  priceNote: { color: '#F4EEE3', fontSize: 12, fontWeight: '700' },
  priceSub: { marginTop: 2, color: '#AAA294', fontSize: 10 },
  metrics: { flexDirection: 'row', gap: 9, marginTop: 12 },
  metric: { flex: 1, minHeight: 90, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  metricValue: { color: colors.gold, fontFamily: fonts.serif, fontSize: 25, fontWeight: '700' },
  metricLabel: { marginTop: 7, color: colors.inkSoft, fontSize: 11, lineHeight: 16 },
  section: { marginTop: 22, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  eyebrow: { color: colors.gold, fontSize: 10, letterSpacing: 1.8, fontWeight: '700' },
  sectionTitle: { marginTop: 7, fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, fontWeight: '700' },
  strengthRow: { marginTop: 18, flexDirection: 'row', gap: 13 },
  strengthMark: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  strengthMarkText: { color: colors.gold, fontFamily: fonts.serif, fontWeight: '700' },
  strengthCopy: { flex: 1 },
  strengthTitle: { color: colors.ink, fontWeight: '700', fontSize: 14, lineHeight: 21 },
  strengthBody: { marginTop: 4, color: colors.inkSoft, fontSize: 12, lineHeight: 20 },
  compare: { flexDirection: 'row', gap: 10, marginTop: 16 },
  compareColumn: { flex: 1, padding: 16, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  comparePaid: { borderColor: colors.gold, backgroundColor: '#F7F0E2' },
  compareLabel: { fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  compareHeadline: { marginTop: 8, fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  compareBody: { marginTop: 7, color: colors.inkSoft, fontSize: 11, lineHeight: 18 },
  gold: { color: colors.gold },
  promise: { marginTop: 16, padding: 16, borderLeftWidth: 3, borderColor: colors.gold, backgroundColor: '#F2EADC' },
  promiseTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  promiseBody: { marginTop: 7, color: colors.inkSoft, fontSize: 12, lineHeight: 20 },
  message: { marginTop: 16, color: colors.inkSoft, fontSize: 13, lineHeight: 21, textAlign: 'center' },
  primary: { marginTop: 22, minHeight: 64, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  primaryTitle: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 18, fontWeight: '700' },
  primarySub: { marginTop: 3, color: '#D8D0C2', fontSize: 10 },
  disabled: { opacity: 0.5 },
  secondary: { marginTop: 10, minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.gold, fontWeight: '700' },
  freeLink: { marginTop: 10, padding: 10, alignItems: 'center' },
  freeLinkText: { color: colors.inkSoft, textDecorationLine: 'underline', fontSize: 12 },
});
