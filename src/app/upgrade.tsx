import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { EditionCover } from '@/components/locked-preview';
import { AppText } from '@/components/ui';
import { useAccess } from '@/access/access-state';
import { useAuth } from '@/auth/auth-state';
import { COMPLETE_EDITION_PRICE_JPY, createCompleteEditionCheckout } from '@/lib/purchase';
import { colors, radius, spacing } from '@/constants/theme';

const benefits = [
  { icon: '網', title: '網羅性', body: '216の処世術を人生・仕事・対人に整理' },
  { icon: '理', title: '理論性', body: '526の理論から、知恵の背景まで理解' },
  { icon: '実', title: '実践性', body: '全21ケースで、判断を自分の力に変える' },
  { icon: '普', title: '普遍性', body: '流行に消費されない知恵を、何度でも使える' },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string; startCheckout?: string }>();
  const { user } = useAuth();
  const { isPaid, refreshAccess, restorePurchase } = useAccess();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const purchase = async () => {
    if (!user) {
      router.push({ pathname: '/auth', params: { intent: 'checkout', mode: 'signup' } });
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
    if (!user) {
      router.push({ pathname: '/auth', params: { intent: 'checkout', mode: 'signin' } });
      return;
    }
    setSubmitting(true);
    const restored = await restorePurchase();
    setSubmitting(false);
    setMessage(restored ? '完全版を復元しました。' : 'このアカウントの購入はまだ確認できません。');
  };

  useEffect(() => {
    if (params.checkout === 'success') {
      setMessage('決済を確認しています。反映されない場合は「購入を復元」を押してください。');
      void refreshAccess();
    } else if (params.checkout === 'cancelled') {
      setMessage('購入はキャンセルされました。料金は発生していません。');
    }
  }, [params.checkout, refreshAccess]);

  useEffect(() => {
    if (params.startCheckout === '1' && user && !isPaid && !submitting) {
      void purchase();
    }
  }, [isPaid, params.startCheckout, submitting, user]);

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.productHero}>
        <EditionCover small />
        <View style={styles.heroCopy}>
          <AppText variant="serif" style={styles.productTitle}>処世術禄 完全版</AppText>
          <View style={styles.priceRow}>
            <AppText variant="serif" style={styles.price}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText>
            <AppText style={styles.regularPrice}>通常価格 ¥980</AppText>
            <View style={styles.discount}><AppText style={styles.discountText}>71%OFF</AppText></View>
          </View>
          <AppText style={styles.productMeta}>買い切り・追加課金なし</AppText>
        </View>
      </View>

      <View style={styles.statsRow}>
        {['216の処世術', '526の理論', '全21ケース'].map((label) => <AppText key={label} style={styles.statText}>{label}</AppText>)}
      </View>

      <View style={styles.rule} />
      <AppText variant="serif" style={styles.sectionTitle}>完全版で解放される内容</AppText>
      <View style={styles.benefitList}>
        {benefits.map((benefit) => (
          <View key={benefit.title} style={styles.benefitRow}>
            <View style={styles.benefitIcon}><AppText style={styles.benefitIconText}>{benefit.icon}</AppText></View>
            <View style={styles.benefitCopy}>
              <AppText style={styles.benefitTitle}>{benefit.title}</AppText>
              <AppText style={styles.benefitBody}>{benefit.body}</AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.previewCard}>
        <AppText style={styles.previewLabel}>アプリ画面プレビュー</AppText>
        <View style={styles.previewBody}>
          <View style={styles.previewCover}><AppText style={styles.previewCoverText}>禄</AppText></View>
          <View style={styles.previewLines}><View style={styles.previewLineStrong} /><View style={styles.previewLine} /><View style={styles.previewLineShort} /></View>
        </View>
      </View>

      {message ? <AppText style={styles.message}>{message}</AppText> : null}
      {isPaid ? (
        <Pressable style={styles.primary} onPress={() => router.back()}><AppText style={styles.primaryText}>完全版を開く</AppText></Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={submitting}
          onPress={() => void purchase()}
          style={[styles.primary, submitting && styles.disabled]}
        >
          <AppText variant="serif" style={styles.primaryText}>{submitting ? '決済画面を開いています…' : `¥${COMPLETE_EDITION_PRICE_JPY}で完全版を購入`}</AppText>
          <AppText style={styles.primaryArrow}>›</AppText>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void restore()} style={styles.secondary}>
        <AppText variant="serif" style={styles.secondaryText}>{user ? '購入を復元する' : '購入済みの方はこちら'}</AppText>
        <AppText style={styles.secondaryArrow}>›</AppText>
      </Pressable>
      <AppText style={styles.instantNote}>♢　購入後すぐに完全版へ切り替わります</AppText>
      <AppText style={styles.reassurance}>買い切り　・　追加課金なし　・　広告なし　・　オフライン対応　・　すぐ使える</AppText>

      <AppText variant="serif" style={[styles.sectionTitle, styles.paymentHeading]}>お支払い方法</AppText>
      <View style={styles.paymentBox}>
        <PaymentRow icon="▣" title="Stripe Checkout" note="利用できる支払方法は決済画面に表示されます" last />
      </View>

      <View style={styles.accountNote}>
        <View style={styles.accountLock}><AppText style={styles.accountLockText}>♙</AppText></View>
        <View style={styles.accountCopy}>
          <AppText style={styles.accountTitle}>有料データはこのアカウントに保存されます</AppText>
          <AppText style={styles.accountBody}>機種変更後も、同じアカウントでご利用いただけます。</AppText>
        </View>
      </View>

      <View style={styles.legalLinks}>
        <Pressable onPress={() => router.push('/legal/terms')}><AppText style={styles.legalText}>利用規約</AppText></Pressable>
        <AppText style={styles.legalDivider}>・</AppText>
        <Pressable onPress={() => router.push('/legal/privacy')}><AppText style={styles.legalText}>プライバシーポリシー</AppText></Pressable>
        <AppText style={styles.legalDivider}>・</AppText>
        <Pressable onPress={() => router.push('/legal/commerce')}><AppText style={styles.legalText}>特商法表記</AppText></Pressable>
      </View>
      <AppText style={styles.purchaseConsent}>「購入へ進む」を押すことで、利用規約・プライバシーポリシー・特商法表記に同意したものとします。</AppText>
    </BookScreen>
  );
}

function PaymentRow({ icon, title, note, last = false }: { icon: string; title: string; note?: string; last?: boolean }) {
  return (
    <View style={[styles.paymentRow, last && styles.paymentRowLast]}>
      <AppText style={styles.paymentIcon}>{icon}</AppText>
      <View style={styles.paymentCopy}><AppText style={styles.paymentTitle}>{title}</AppText>{note ? <AppText style={styles.paymentNote}>{note}</AppText> : null}</View>
      <AppText style={styles.paymentArrow}>›</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 132 },
  productHero: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  heroCopy: { flex: 1, minWidth: 0 },
  productTitle: { color: '#171713', fontSize: 25, lineHeight: 35, fontWeight: '700' },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 11, marginTop: 6 },
  price: { color: colors.gold, fontSize: 42, lineHeight: 50, fontWeight: '700' },
  regularPrice: { color: colors.muted, fontSize: 11, lineHeight: 17, textDecorationLine: 'line-through' },
  discount: { paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm },
  discountText: { color: colors.gold, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  productMeta: { marginTop: 7, color: '#5A5954', fontSize: 12, lineHeight: 19 },
  statsRow: { marginTop: spacing.lg, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  statText: { color: colors.inkSoft, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  rule: { height: 1, marginTop: 26, backgroundColor: '#D6CCBD' },
  sectionTitle: { marginTop: 22, color: '#AF8438', fontSize: 20, lineHeight: 29, fontWeight: '700' },
  benefitList: { marginTop: 13, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  benefitRow: { minHeight: 72, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  benefitIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.paperDeep, alignItems: 'center', justifyContent: 'center' },
  benefitIconText: { color: colors.gold, fontFamily: 'serif', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: '#292925', fontFamily: 'Hiragino Sans', fontSize: 17, lineHeight: 25, fontWeight: '700' },
  benefitBody: { marginTop: 3, color: '#55554F', fontSize: 12, lineHeight: 19 },
  message: { marginTop: 18, color: '#8B5B22', fontSize: 12, lineHeight: 19, textAlign: 'center' },
  previewCard: { marginTop: spacing.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  previewLabel: { color: colors.muted, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  previewBody: { minHeight: 110, marginTop: spacing.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, borderRadius: radius.sm, backgroundColor: colors.paperDeep },
  previewCover: { width: 72, height: 88, borderRadius: radius.sm, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  previewCoverText: { color: colors.goldLight, fontFamily: 'serif', fontSize: 26, lineHeight: 33 },
  previewLines: { flex: 1, gap: 10 },
  previewLineStrong: { width: '92%', height: 12, borderRadius: 6, backgroundColor: colors.ink },
  previewLine: { width: '78%', height: 8, borderRadius: 4, backgroundColor: colors.line },
  previewLineShort: { width: '55%', height: 8, borderRadius: 4, backgroundColor: colors.line },
  primary: { position: 'relative', minHeight: 60, marginTop: 24, borderRadius: 16, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontSize: 18, lineHeight: 27, fontWeight: '700' },
  primaryArrow: { position: 'absolute', right: 24, color: '#FFFDF8', fontSize: 42, lineHeight: 42, fontWeight: '300' },
  secondary: { position: 'relative', minHeight: 56, marginTop: 12, borderWidth: 1, borderColor: colors.gold, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#8A6A31', fontSize: 17, lineHeight: 25, fontWeight: '700' },
  secondaryArrow: { position: 'absolute', right: 24, color: '#9B7A3D', fontSize: 35, lineHeight: 35, fontWeight: '300' },
  instantNote: { marginTop: 14, color: '#74736D', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  reassurance: { marginTop: 10, color: colors.muted, fontSize: 10, lineHeight: 17, textAlign: 'center' },
  paymentHeading: { marginTop: 28 },
  paymentBox: { marginTop: 9, paddingHorizontal: 13, borderWidth: 1, borderColor: '#DDD4C7', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.32)' },
  paymentRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 15, borderBottomWidth: 1, borderColor: '#E1D8CC' },
  paymentRowLast: { borderBottomWidth: 0 },
  paymentIcon: { width: 48, color: '#111', fontSize: 20, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  paymentCopy: { flex: 1 },
  paymentTitle: { color: '#252521', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  paymentNote: { marginTop: 2, color: '#66655F', fontSize: 10, lineHeight: 15 },
  paymentArrow: { color: '#4D4D49', fontSize: 33, lineHeight: 33, fontWeight: '300' },
  accountNote: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 14, paddingHorizontal: 18, paddingVertical: 15, borderWidth: 1, borderColor: '#E0D7CA', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.28)' },
  accountLock: { width: 36, height: 36, borderWidth: 1, borderColor: '#BD9847', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  accountLockText: { color: '#AF8533', fontSize: 18 },
  accountCopy: { flex: 1 },
  accountTitle: { color: '#86672E', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  accountBody: { marginTop: 2, color: '#5C5B55', fontSize: 10, lineHeight: 16 },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28, gap: 10 },
  legalText: { color: '#77746C', fontSize: 10, lineHeight: 16, textDecorationLine: 'underline' },
  legalDivider: { color: '#77746C', fontSize: 10 },
  purchaseConsent: { marginTop: 9, color: '#77746C', fontSize: 10, lineHeight: 16, textAlign: 'center' },
  disabled: { opacity: 0.55 },
});
