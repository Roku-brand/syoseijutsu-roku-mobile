import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { EditionCover } from '@/components/locked-preview';
import { AppText } from '@/components/ui';
import { useAccess } from '@/access/access-state';
import { useAuth } from '@/auth/auth-state';
import { COMPLETE_EDITION_PRICE_JPY, createCompleteEditionCheckout } from '@/lib/purchase';

const benefits = [
  { icon: '⌕', title: '状況から探せる', body: '同じ状況で使える一手を厳選して提案' },
  { icon: '▤', title: '背景理論まで読める', body: '心理学・行動科学・戦略論を体系的に学べる' },
  { icon: '♧', title: 'ケースで理解を深められる', body: '実例・ケースで思考と判断力を鍛えられる' },
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
            <View style={styles.priceNote}><AppText style={styles.priceNoteText}>買い切り・追加課金なし</AppText></View>
          </View>
          <AppText style={styles.productMeta}>♧　434の処世術・526の理論・全21ケース</AppText>
        </View>
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
          <AppText variant="serif" style={styles.primaryText}>{submitting ? '決済画面を開いています…' : user ? '購入へ進む' : '会員登録して購入へ進む'}</AppText>
          <AppText style={styles.primaryArrow}>›</AppText>
        </Pressable>
      )}
      <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void restore()} style={styles.secondary}>
        <AppText variant="serif" style={styles.secondaryText}>{user ? '購入を復元する' : '購入済みの方はこちら'}</AppText>
        <AppText style={styles.secondaryArrow}>›</AppText>
      </Pressable>
      <AppText style={styles.instantNote}>♢　購入後すぐに完全版へ切り替わります</AppText>

      <AppText variant="serif" style={[styles.sectionTitle, styles.paymentHeading]}>お支払い方法</AppText>
      <View style={styles.paymentBox}>
        <PaymentRow icon="●" title="Apple Pay" />
        <PaymentRow icon="▣" title="クレジットカード" note="Visa / Mastercard / JCB / AMEX" />
        <PaymentRow icon="Link" title="Link" note="ソフトバンク・ワイモバイルまとめて支払い" last />
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
      </View>
    </BookScreen>
  );
}

function PaymentRow({ icon, title, note, last = false }: { icon: string; title: string; note?: string; last?: boolean }) {
  return (
    <View style={[styles.paymentRow, last && styles.paymentRowLast]}>
      <AppText style={[styles.paymentIcon, icon === 'Link' && styles.linkIcon]}>{icon}</AppText>
      <View style={styles.paymentCopy}><AppText style={styles.paymentTitle}>{title}</AppText>{note ? <AppText style={styles.paymentNote}>{note}</AppText> : null}</View>
      <AppText style={styles.paymentArrow}>›</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 580, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 28, paddingBottom: 132 },
  productHero: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  heroCopy: { flex: 1, minWidth: 0 },
  productTitle: { color: '#171713', fontSize: 25, lineHeight: 35, fontWeight: '700' },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 11, marginTop: 6 },
  price: { color: '#F04A17', fontSize: 43, lineHeight: 50, fontWeight: '700' },
  priceNote: { borderWidth: 1, borderColor: '#D9D0C3', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  priceNoteText: { color: '#8B6B38', fontSize: 11, fontWeight: '600' },
  productMeta: { marginTop: 7, color: '#5A5954', fontSize: 12, lineHeight: 19 },
  rule: { height: 1, marginTop: 26, backgroundColor: '#D6CCBD' },
  sectionTitle: { marginTop: 22, color: '#AF8438', fontSize: 20, lineHeight: 29, fontWeight: '700' },
  benefitList: { marginTop: 13, gap: 19 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 17 },
  benefitIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#F1ECE3', alignItems: 'center', justifyContent: 'center' },
  benefitIconText: { color: '#171713', fontSize: 29, lineHeight: 34 },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: '#292925', fontFamily: 'Hiragino Sans', fontSize: 17, lineHeight: 25, fontWeight: '700' },
  benefitBody: { marginTop: 3, color: '#55554F', fontSize: 12, lineHeight: 19 },
  message: { marginTop: 18, color: '#8B5B22', fontSize: 12, lineHeight: 19, textAlign: 'center' },
  primary: { position: 'relative', minHeight: 68, marginTop: 28, borderRadius: 8, backgroundColor: '#F04A17', alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#FFFDF8', fontSize: 25, lineHeight: 33, fontWeight: '700' },
  primaryArrow: { position: 'absolute', right: 24, color: '#FFFDF8', fontSize: 42, lineHeight: 42, fontWeight: '300' },
  secondary: { position: 'relative', minHeight: 58, marginTop: 16, borderWidth: 1, borderColor: '#B89658', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#8A6A31', fontSize: 17, lineHeight: 25, fontWeight: '700' },
  secondaryArrow: { position: 'absolute', right: 24, color: '#9B7A3D', fontSize: 35, lineHeight: 35, fontWeight: '300' },
  instantNote: { marginTop: 14, color: '#74736D', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  paymentHeading: { marginTop: 28 },
  paymentBox: { marginTop: 9, paddingHorizontal: 13, borderWidth: 1, borderColor: '#DDD4C7', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.32)' },
  paymentRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 15, borderBottomWidth: 1, borderColor: '#E1D8CC' },
  paymentRowLast: { borderBottomWidth: 0 },
  paymentIcon: { width: 48, color: '#111', fontSize: 20, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  linkIcon: { fontFamily: 'serif', fontSize: 18 },
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
  disabled: { opacity: 0.55 },
});
