import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { EditionCover } from '@/components/locked-preview';
import { AppText, DetailHeader } from '@/components/ui';
import { useAccess } from '@/access/access-state';
import { useAuth } from '@/auth/auth-state';
import { COMPLETE_EDITION_PRICE_JPY, createCompleteEditionCheckout } from '@/lib/purchase';
import { colors, fonts } from '@/constants/theme';

const benefits = [
  ['▣', '網羅性', '216の処世術を、悩み別に網羅'],
  ['◉', '理論性', '595の理論で「なぜ効くか」までわかる'],
  ['◎', '実践性', '全21ケースで、判断に落とし込める'],
  ['▤', '普遍性', '保存して、何度でも読み返せる'],
] as const;

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string }>();
  const { user } = useAuth();
  const { isPaid, refreshAccess, restorePurchase } = useAccess();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);

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
    } else if (params.checkout === 'cancelled') setMessage('購入はキャンセルされました。料金は発生していません。');
  }, [params.checkout, refreshAccess]);

  useEffect(() => {
    if (params.checkout === 'success' && isPaid) setShowWelcome(true);
  }, [isPaid, params.checkout]);

  return (
    <BookScreen scroll={false} contentContainerStyle={styles.content}>
      <DetailHeader title="完全版" />
      <View style={styles.main}>
        <View style={styles.hero}>
          <EditionCover compact />
          <View style={styles.heroCopy}>
            <AppText variant="serif" style={styles.productTitle}>処世術禄 完全版</AppText>
            <AppText style={styles.tagline}>学校では教えてくれない、社会を生きるための教科書。</AppText>
            <View style={styles.priceRow}>
              <AppText variant="serif" style={styles.price}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText>
              <View><AppText style={styles.regular}>通常価格</AppText><AppText style={styles.strike}>¥980</AppText></View>
              <View style={styles.discount}><AppText style={styles.discountSmall}>リリース記念</AppText><AppText variant="serif" style={styles.discountMain}>71%OFF</AppText></View>
            </View>
            <AppText style={styles.buyout}>買い切り・追加課金なし</AppText>
          </View>
        </View>

        <AppText style={styles.stats}>▤　216の処世術・595の理論・全21ケース</AppText>

        <View style={styles.editionRow}>
          <View style={styles.freeEdition}><AppText style={styles.editionLabel}>無料版</AppText><AppText variant="serif" style={styles.freeCount}>21件まで公開</AppText></View>
          <AppText style={styles.compareArrow}>›</AppText>
          <View style={styles.completeEdition}><AppText style={styles.completeLabel}>完全版</AppText><AppText variant="serif" style={styles.completeCount}>216件すべて閲覧可能</AppText></View>
        </View>

        <View style={styles.strengthHeader}><View style={styles.strengthRule} /><AppText variant="serif" style={styles.strengthTitle}>迷ったとき、すぐ一手が見つかる</AppText><View style={styles.strengthRule} /></View>
        <View style={styles.benefitGrid}>
          {benefits.map(([icon, title, body]) => <View key={title} style={styles.benefit}><View style={styles.benefitIcon}><AppText style={styles.benefitIconText}>{icon}</AppText></View><View style={styles.benefitCopy}><AppText style={styles.benefitTitle}>{title}</AppText><AppText style={styles.benefitBody} numberOfLines={1}>{body}</AppText></View></View>)}
        </View>
      </View>

      <View style={styles.footer}>
        {message ? <AppText style={styles.message} numberOfLines={2}>{message}</AppText> : null}
        <View style={styles.trustRow}><AppText style={styles.trust}>✓ 買い切り</AppText><AppText style={styles.trust}>◇ 追加課金なし</AppText><AppText style={styles.trust}>⚡ すぐ使える</AppText></View>
        <View style={styles.purchaseNotice}>
          <AppText style={styles.purchaseNoticeText}>完成済みデジタルコンテンツとして提供しています。将来の継続的なアップデート・個別サポートを保証する商品ではありません。</AppText>
        </View>
        {isPaid ? <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={() => router.replace('/')}><AppText variant="serif" style={styles.primaryText}>完全版を開く</AppText></Pressable> : <Pressable accessibilityRole="button" disabled={submitting} onPress={() => setShowCheckoutConfirmation(true)} style={({ pressed }) => [styles.primary, submitting && styles.disabled, pressed && styles.pressed]}><AppText variant="serif" style={styles.crown}>♛</AppText><AppText variant="serif" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.primaryText}>{submitting ? '決済画面を開いています…' : `¥${COMPLETE_EDITION_PRICE_JPY}で完全版を購入`}</AppText><AppText style={styles.primaryArrow}>›</AppText></Pressable>}
        <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void restore()} style={styles.restore}><AppText variant="serif" style={styles.restoreText}>{user ? '購入を復元する' : '購入済みの方はこちら'}</AppText><AppText style={styles.restoreArrow}>›</AppText></Pressable>
        <View style={styles.legalLinks}><Pressable onPress={() => router.push('/legal/terms')}><AppText style={styles.legalText}>利用規約</AppText></Pressable><AppText style={styles.legalDivider}>｜</AppText><Pressable onPress={() => router.push('/legal/commerce')}><AppText style={styles.legalText}>特商法表記</AppText></Pressable><AppText style={styles.legalDivider}>｜</AppText><Pressable onPress={() => router.push('/legal/faq')}><AppText style={styles.legalText}>FAQ</AppText></Pressable></View>
      </View>
      <Modal transparent visible={showCheckoutConfirmation} animationType="fade" onRequestClose={() => setShowCheckoutConfirmation(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard}>
            <AppText variant="serif" style={styles.confirmationTitle}>購入内容の確認</AppText>
            <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>商品</AppText><AppText style={styles.confirmationValue}>処世術禄 完全版</AppText></View>
            <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>価格</AppText><AppText style={styles.confirmationValue}>¥{COMPLETE_EDITION_PRICE_JPY}（税込）</AppText></View>
            <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>支払方法</AppText><AppText style={styles.confirmationValue}>一回払い・買い切り</AppText></View>
            <AppText style={styles.confirmationNotice}>月額料金・継続課金はありません。購入および完全版の提供開始後の購入者都合による返品・返金には、原則として対応しません。ただし、重複決済、完全版が提供されない場合その他法令上必要な場合を除きます。</AppText>
            <AppText style={styles.confirmationSupport}>完成済みデジタルコンテンツとして提供します。将来の継続的なアップデート・個別サポートは保証していません。</AppText>
            <View style={styles.confirmationLinks}><Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/terms'); }}><AppText style={styles.legalText}>利用規約</AppText></Pressable><AppText style={styles.legalDivider}>｜</AppText><Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/commerce'); }}><AppText style={styles.legalText}>特商法表記</AppText></Pressable></View>
            <Pressable disabled={submitting} onPress={() => { setShowCheckoutConfirmation(false); void purchase(); }} style={({ pressed }) => [styles.confirmationButton, pressed && styles.pressed]}><AppText style={styles.confirmationButtonText}>Stripe決済へ進む</AppText></Pressable>
            <Pressable disabled={submitting} onPress={() => setShowCheckoutConfirmation(false)} style={styles.cancelButton}><AppText style={styles.cancelText}>戻る</AppText></Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={showWelcome} animationType="fade" onRequestClose={() => setShowWelcome(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.welcomeCard}>
            <AppText variant="serif" style={styles.welcomeTitle}>ご購入ありがとうございます</AppText>
            <AppText style={styles.welcomeBody}>処世術禄 完全版へようこそ。{`\n`}あなたの人生に、何度でも使える知恵を。</AppText>
            <Pressable onPress={() => { setShowWelcome(false); router.replace('/'); }} style={({ pressed }) => [styles.welcomeButton, pressed && styles.pressed]}><AppText style={styles.welcomeButtonText}>完全版をはじめる</AppText></Pressable>
          </View>
        </View>
      </Modal>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, maxWidth: 620, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 80 },
  main: { flex: 1, minHeight: 0 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: 'rgba(20,18,14,0.45)' },
  welcomeCard: { width: '100%', maxWidth: 370, padding: 28, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center' },
  confirmationCard: { width: '100%', maxWidth: 400, padding: 24, borderRadius: 20, backgroundColor: colors.surface },
  confirmationTitle: { color: colors.ink, fontSize: 22, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  confirmationRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginTop: 14 },
  confirmationLabel: { color: colors.inkSoft, fontSize: 13, lineHeight: 20 },
  confirmationValue: { flexShrink: 1, color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'right' },
  confirmationNotice: { marginTop: 18, padding: 12, borderRadius: 10, backgroundColor: '#F5EFE3', color: colors.inkSoft, fontSize: 11, lineHeight: 17 },
  confirmationSupport: { marginTop: 10, color: colors.inkSoft, fontSize: 11, lineHeight: 17 },
  confirmationLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 },
  confirmationButton: { minHeight: 52, marginTop: 16, borderRadius: 13, backgroundColor: '#E9230C', alignItems: 'center', justifyContent: 'center' },
  confirmationButtonText: { color: '#FFFFFF', fontFamily: fonts.serif, fontSize: 16, fontWeight: '700' },
  cancelButton: { minHeight: 38, marginTop: 6, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.inkSoft, fontSize: 13, textDecorationLine: 'underline' },
  welcomeTitle: { color: colors.ink, fontSize: 23, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
  welcomeBody: { marginTop: 13, color: colors.inkSoft, fontSize: 14, lineHeight: 23, textAlign: 'center' },
  welcomeButton: { alignSelf: 'stretch', minHeight: 52, marginTop: 24, borderRadius: 14, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  welcomeButtonText: { color: '#fff', fontFamily: fonts.serif, fontSize: 16, fontWeight: '700' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 13 }, heroCopy: { flex: 1, minWidth: 0 },
  productTitle: { color: colors.ink, fontSize: 22, lineHeight: 29, fontWeight: '700' }, tagline: { marginTop: 2, color: '#3F3B34', fontSize: 10, lineHeight: 15 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }, price: { color: '#E21B0C', fontSize: 46, lineHeight: 51, fontWeight: '700' }, regular: { color: colors.inkSoft, fontSize: 10, lineHeight: 13 }, strike: { color: colors.ink, fontSize: 15, lineHeight: 19, textDecorationLine: 'line-through' },
  discount: { borderWidth: 1, borderColor: '#D52B1E', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center' }, discountSmall: { color: '#C41E16', fontSize: 8, lineHeight: 11, fontWeight: '700' }, discountMain: { color: '#D71C0C', fontSize: 15, lineHeight: 19, fontWeight: '700' }, buyout: { alignSelf: 'flex-start', marginTop: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, color: '#8B6B3A', fontSize: 10, lineHeight: 14 },
  stats: { marginTop: 7, color: '#312E29', fontSize: 11, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  editionRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 8 }, freeEdition: { flex: 0.92, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.35)', paddingVertical: 7 }, editionLabel: { borderWidth: 1, borderColor: '#DED6C9', borderRadius: 4, paddingHorizontal: 6, color: '#615B50', fontSize: 9, lineHeight: 12 }, freeCount: { marginTop: 4, color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' }, compareArrow: { color: colors.gold, alignSelf: 'center', fontSize: 30, lineHeight: 30 }, completeEdition: { flex: 1.25, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.charcoal, paddingVertical: 7 }, completeLabel: { borderWidth: 1, borderColor: colors.gold, borderRadius: 4, paddingHorizontal: 7, color: '#E7C779', fontSize: 9, lineHeight: 12 }, completeCount: { marginTop: 4, color: '#E9C66A', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  strengthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 }, strengthRule: { flex: 1, height: 1, backgroundColor: '#DFD2BE' }, strengthTitle: { color: '#96692C', fontSize: 14, lineHeight: 20, fontWeight: '700' }, benefitGrid: { marginTop: 5, borderWidth: 1, borderColor: colors.line, borderRadius: 9, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.28)' }, benefit: { minHeight: 31, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, gap: 7, borderBottomWidth: 1, borderBottomColor: '#E8DFD2' }, benefitIcon: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.charcoal }, benefitIconText: { color: '#E4B94E', fontSize: 10, lineHeight: 13 }, benefitCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 }, benefitTitle: { color: '#B17A28', fontSize: 11, lineHeight: 15, fontWeight: '700' }, benefitBody: { flex: 1, color: '#3E3A34', fontSize: 10, lineHeight: 14 },
  footer: { flexShrink: 0 }, message: { marginBottom: 4, color: '#9B342C', fontSize: 10, lineHeight: 14, textAlign: 'center' }, trustRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E4D8C5' }, trust: { color: '#8C692D', fontSize: 9, lineHeight: 13, fontWeight: '600' }, purchaseNotice: { marginTop: 7, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F4EEE2' }, purchaseNoticeText: { color: '#625D54', fontSize: 9, lineHeight: 13, textAlign: 'center' }, primary: { position: 'relative', minHeight: 62, marginTop: 7, borderWidth: 2, borderColor: '#E5A928', borderRadius: 18, backgroundColor: '#E9230C', alignItems: 'center', justifyContent: 'center', shadowColor: '#B2380E', shadowOpacity: 0.24, shadowRadius: 8, elevation: 4 }, crown: { position: 'absolute', left: 22, color: '#F6D26C', fontSize: 24, lineHeight: 27 }, primaryText: { color: '#FFFDF8', fontSize: 25, lineHeight: 32, fontWeight: '700' }, primaryArrow: { position: 'absolute', right: 20, color: '#FFFDF8', fontSize: 39, lineHeight: 39, fontWeight: '300' }, restore: { position: 'relative', minHeight: 34, marginTop: 6, borderWidth: 1, borderColor: '#B98831', borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, restoreText: { color: '#946928', fontSize: 13, lineHeight: 19, fontWeight: '700' }, restoreArrow: { position: 'absolute', right: 18, color: '#A5742C', fontSize: 27, lineHeight: 27 }, legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, marginTop: 5 }, legalText: { color: '#676158', fontSize: 9, lineHeight: 13, textDecorationLine: 'underline' }, legalDivider: { color: '#82796C', fontSize: 9 }, disabled: { opacity: 0.55 }, pressed: { transform: [{ translateY: -2 }], shadowOpacity: 0.35 },
});
