import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { useAuth } from '@/auth/auth-state';
import { AppText } from '@/components/ui';
import { COMPLETE_EDITION_PRICE_JPY, createCompleteEditionCheckout, formatAccessDateTime, formatRemainingAccess } from '@/lib/purchase';
import { colors, fonts } from '@/constants/theme';
import { categories, techniqueCards, theories } from '@/data/catalog';

const desktopBackground = require('../../assets/upgrade/upgrade-hero-desktop.png');
const mobileBackground = require('../../assets/upgrade/upgrade-hero-mobile.png');

const valuePoints = [
  ['01', '広く、偏りなく学ぶ', '人物像・処世術・ケースを横断して、人生の場面ごとに探せます。'],
  ['02', '理論までつなげる', '心理学・行動科学・戦略から、なぜ使えるかを理解できます。'],
  ['03', '自分の知恵として残す', '保存・メモ・履歴で、学んだことを自分だけの蓄積にできます。'],
] as const;

const personaCount = categories.reduce((count, category) => count + category.subcategories.length, 0);

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string; session_id?: string }>();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const { user } = useAuth();
  const { isPaid, accessInfo, accessStatus, refreshAccess, restorePurchase } = useAccess();
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
    setMessage('Stripeの購入履歴を確認しています…');
    try {
      const restored = await restorePurchase();
      setMessage(restored
        ? '有効な完全版アクセスを復元しました。'
        : accessStatus === 'expired'
          ? '過去の購入履歴は確認できましたが、30日間の利用期間は終了しています。'
          : 'このアカウントの有効な購入はまだ確認できません。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '購入履歴を確認できませんでした。');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (params.checkout === 'success') {
      setMessage('決済を確認しています。完了までこの画面を閉じずにお待ちください。');
      void restorePurchase(params.session_id).then((restored) => {
        setMessage(restored ? '決済を確認しました。完全版をご利用いただけます。' : '決済の反映を待っています。しばらくしてから「購入を復元」を押してください。');
      }).catch(() => {
        setMessage('決済の反映を待っています。「購入を復元」を押してください。');
      });
    } else if (params.checkout === 'cancelled') {
      setMessage('購入はキャンセルされました。完全版の利用権は付与されていません。');
    }
  }, [params.checkout, params.session_id, restorePurchase]);

  useEffect(() => {
    if (params.checkout === 'success' && isPaid) setShowWelcome(true);
  }, [isPaid, params.checkout]);

  const primaryLabel = isPaid
    ? (accessInfo.accessType === 'thirty_day' ? `完全版を利用中・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : '完全版を開く')
    : submitting
      ? '決済画面を開いています…'
      : accessStatus === 'expired'
        ? 'もう一度、完全版を購入する'
        : `完全版を購入する　¥${COMPLETE_EDITION_PRICE_JPY}`;

  return (
    <View style={styles.safe}>
      <ImageBackground source={desktop ? desktopBackground : mobileBackground} resizeMode="cover" style={styles.page} imageStyle={styles.backgroundImage}>
        <ScrollView contentContainerStyle={[styles.scrollContent, desktop && styles.scrollContentDesktop]} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, desktop && styles.heroDesktop]}>
            <AppText style={styles.eyebrow}>処世術禄　完全版</AppText>
            <AppText variant="serif" style={[styles.heroTitle, desktop && styles.heroTitleDesktop]}>知恵を、使える体系として{`\n`}手元に。</AppText>
            <AppText style={[styles.heroLead, desktop && styles.heroLeadDesktop]}>人物像から処世術、理論、ケースまで。{`\n`}現実の判断と行動に活かせる知恵を身につけられます。</AppText>
            <AppText style={styles.catalogEvidence}>全{personaCount}人物像・全{techniqueCards.length}処世術・全{theories.length}理論・全21ケース</AppText>
          </View>

          <View style={[styles.valueSection, desktop && styles.valueSectionDesktop]}>
            {valuePoints.map(([number, title, body], index) => (
              <View key={title} style={[styles.valuePoint, desktop && styles.valuePointDesktop, index !== valuePoints.length - 1 && styles.valuePointDivider, index !== valuePoints.length - 1 && desktop && styles.valuePointDesktopDivider]}>
                <AppText style={styles.valueNumber}>{number}</AppText>
                <AppText variant="serif" style={styles.valueTitle}>{title}</AppText>
                <AppText style={styles.valueBody}>{body}</AppText>
              </View>
            ))}
          </View>

          <View style={[styles.purchaseCard, desktop && styles.purchaseCardDesktop]}>
            <View style={styles.priceBlock}>
              <AppText style={styles.purchaseLabel}>完全版・30日間アクセス</AppText>
              <View style={styles.priceRow}><AppText variant="serif" style={styles.price}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText><AppText style={styles.tax}>税込</AppText></View>
              <AppText style={styles.paymentType}>一回払い・自動更新なし</AppText>
            </View>
            <View style={[styles.purchaseDetails, desktop && styles.purchaseDetailsDesktop]}>
              <AppText style={styles.purchaseDetail}>決済完了から30日間、完全版を利用できます。</AppText>
              <AppText style={styles.purchaseDetail}>期間終了後も、保存データはそのまま残ります。</AppText>
            </View>
            {message ? <AppText accessibilityRole="alert" style={styles.message}>{message}</AppText> : null}
            {desktop ? <>
              <Pressable
                accessibilityRole="button"
                disabled={submitting || accessStatus === 'processing'}
                onPress={() => isPaid ? router.replace('/') : setShowCheckoutConfirmation(true)}
                style={({ pressed }) => [styles.primary, (submitting || accessStatus === 'processing') && styles.disabled, pressed && styles.pressed]}
              >
                <AppText variant="serif" style={styles.primaryText}>{primaryLabel}</AppText>
                {!isPaid ? <AppText style={styles.primaryArrow}>›</AppText> : null}
              </Pressable>
              {!isPaid ? <AppText style={styles.preConfirmation}>決済は次の画面で確定します</AppText> : null}
            </> : null}
            {!isPaid ? <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void restore()} style={({ pressed }) => [styles.restore, pressed && styles.pressed]}><AppText style={styles.restoreText}>{submitting ? '購入履歴を確認中…' : user ? '購入を復元する' : '購入済みの方は復元する'}</AppText></Pressable> : null}
          </View>

          <View style={styles.legalLinks}>
            <Pressable onPress={() => router.push('/legal/terms')}><AppText style={styles.legalText}>利用規約</AppText></Pressable>
            <Pressable onPress={() => router.push('/legal/commerce')}><AppText style={styles.legalText}>特商法表記</AppText></Pressable>
            <Pressable onPress={() => router.push('/legal/faq')}><AppText style={styles.legalText}>FAQ</AppText></Pressable>
          </View>
        </ScrollView>
      </ImageBackground>

      {!desktop ? <View style={styles.mobilePurchaseDock}>
        <Pressable
          accessibilityRole="button"
          disabled={submitting || accessStatus === 'processing'}
          onPress={() => isPaid ? router.replace('/') : setShowCheckoutConfirmation(true)}
          style={({ pressed }) => [styles.mobilePrimary, (submitting || accessStatus === 'processing') && styles.disabled, pressed && styles.pressed]}
        >
          <AppText variant="serif" style={styles.mobilePrimaryText}>{primaryLabel}</AppText>
          {!isPaid ? <AppText style={styles.mobilePrimaryArrow}>›</AppText> : null}
        </Pressable>
        {!isPaid ? <AppText style={styles.mobilePreConfirmation}>決済は次の画面で確定します</AppText> : null}
      </View> : null}

      <Modal transparent visible={showCheckoutConfirmation} animationType="fade" onRequestClose={() => setShowCheckoutConfirmation(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard}>
            <AppText variant="serif" style={styles.confirmationTitle}>購入内容の確認</AppText>
            <View style={styles.confirmationRows}>
              <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>商品</AppText><AppText style={styles.confirmationValue}>処世術禄 完全版</AppText></View>
              <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>価格</AppText><AppText style={styles.confirmationValue}>¥{COMPLETE_EDITION_PRICE_JPY}（税込）</AppText></View>
              <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>利用期間</AppText><AppText style={styles.confirmationValue}>決済完了から30日間</AppText></View>
              <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>自動更新</AppText><AppText style={styles.confirmationValue}>なし</AppText></View>
            </View>
            <AppText style={styles.confirmationNotice}>一回払いで、期間終了後の自動更新や追加課金はありません。終了後は保存データを残したまま無料版へ戻ります。</AppText>
            <AppText style={styles.confirmationSupport}>カード情報はStripeの決済画面で入力します。返品・返金条件は、利用規約と特商法表記で確認できます。</AppText>
            <View style={styles.confirmationLinks}><Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/terms'); }}><AppText style={styles.legalText}>利用規約</AppText></Pressable><Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/commerce'); }}><AppText style={styles.legalText}>特商法表記</AppText></Pressable></View>
            <Pressable disabled={submitting} onPress={() => { setShowCheckoutConfirmation(false); void purchase(); }} style={({ pressed }) => [styles.confirmationButton, pressed && styles.pressed]}><AppText variant="serif" style={styles.confirmationButtonText}>Stripe決済へ進む</AppText></Pressable>
            <Pressable disabled={submitting} onPress={() => setShowCheckoutConfirmation(false)} style={styles.cancelButton}><AppText style={styles.cancelText}>戻る</AppText></Pressable>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showWelcome} animationType="fade" onRequestClose={() => setShowWelcome(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.welcomeCard}>
            <AppText variant="serif" style={styles.welcomeTitle}>購入ありがとうございます</AppText>
            <AppText style={styles.welcomeBody}>完全版が利用可能になりました。{accessInfo.accessExpiresAt ? `${`\n\n`}利用期限${`\n`}${formatAccessDateTime(accessInfo.accessExpiresAt)}まで` : ''}</AppText>
            <Pressable onPress={() => { setShowWelcome(false); router.replace('/'); }} style={({ pressed }) => [styles.welcomeButton, pressed && styles.pressed]}><AppText variant="serif" style={styles.welcomeButtonText}>完全版を使い始める</AppText></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4EEE3' },
  page: { flex: 1, backgroundColor: '#F4EEE3' },
  backgroundImage: { width: '100%', height: '100%', opacity: 1 },
  scrollContent: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 112 },
  scrollContentDesktop: { maxWidth: 1120, paddingHorizontal: 28 },
  hero: { minHeight: 284, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 34, paddingBottom: 38 },
  heroDesktop: { minHeight: 310, paddingTop: 36, paddingBottom: 45 },
  eyebrow: { color: '#E4C27D', fontSize: 11, lineHeight: 17, fontWeight: '700', letterSpacing: 2.2 },
  heroTitle: { marginTop: 10, color: '#FFF9ED', fontSize: 29, lineHeight: 42, textAlign: 'center', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 8 },
  heroTitleDesktop: { fontSize: 38, lineHeight: 54, letterSpacing: 1 },
  heroLead: { marginTop: 13, color: '#EDE3D1', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  heroLeadDesktop: { fontSize: 15, lineHeight: 24 },
  catalogEvidence: { marginTop: 16, color: '#E2BD72', fontSize: 10, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  valueSection: { marginTop: -15, borderWidth: 1, borderColor: 'rgba(180,146,84,0.32)', borderRadius: 18, backgroundColor: 'rgba(255,253,248,0.92)', overflow: 'hidden' },
  valueSectionDesktop: { flexDirection: 'row', marginTop: -28, borderRadius: 20 },
  valuePoint: { paddingHorizontal: 18, paddingVertical: 16 },
  valuePointDesktop: { flex: 1, minHeight: 166, paddingHorizontal: 25, paddingVertical: 25 },
  valuePointDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(183,152,96,0.22)' },
  valuePointDesktopDivider: { borderBottomWidth: 0, borderRightWidth: 1, borderRightColor: 'rgba(183,152,96,0.22)' },
  valueNumber: { color: '#B78329', fontSize: 10, lineHeight: 15, fontWeight: '800', letterSpacing: 1.5 },
  valueTitle: { marginTop: 4, color: '#242019', fontSize: 18, lineHeight: 26, fontWeight: '700' },
  valueBody: { marginTop: 5, color: '#655E52', fontSize: 12, lineHeight: 19 },
  purchaseCard: { marginTop: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(183,145,73,0.4)', borderRadius: 18, backgroundColor: 'rgba(255,253,248,0.95)', shadowColor: '#594523', shadowOpacity: 0.11, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  purchaseCardDesktop: { marginTop: 22, paddingHorizontal: 28, paddingVertical: 25 },
  priceBlock: { alignItems: 'center' },
  purchaseLabel: { color: '#3D3428', fontSize: 13, lineHeight: 20, fontWeight: '700', letterSpacing: 0.5 },
  priceRow: { marginTop: 3, flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  price: { color: '#242019', fontSize: 50, lineHeight: 58, fontWeight: '700' },
  tax: { marginBottom: 8, color: '#6D6457', fontSize: 12, lineHeight: 17 },
  paymentType: { marginTop: 0, color: '#9D6D1C', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  purchaseDetails: { marginTop: 16, paddingTop: 13, borderTopWidth: 1, borderTopColor: 'rgba(183,152,96,0.28)', gap: 4 },
  purchaseDetailsDesktop: { maxWidth: 560, alignSelf: 'center' },
  purchaseDetail: { color: '#5B5449', fontSize: 12, lineHeight: 19, textAlign: 'center' },
  message: { marginTop: 13, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, backgroundColor: '#F3EADF', color: '#704E2A', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  primary: { position: 'relative', minHeight: 58, marginTop: 18, paddingHorizontal: 42, borderWidth: 1, borderColor: '#F4D283', borderRadius: 13, backgroundColor: '#C4881B', alignItems: 'center', justifyContent: 'center', shadowColor: '#76500D', shadowOpacity: 0.32, shadowRadius: 11, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  primaryText: { color: '#FFF9EC', fontSize: 18, lineHeight: 26, fontWeight: '700', textAlign: 'center', textShadowColor: 'rgba(61,37,0,0.35)', textShadowRadius: 3 },
  primaryArrow: { position: 'absolute', right: 17, top: 9, color: '#FFF9EC', fontSize: 34, lineHeight: 38, fontWeight: '300' },
  preConfirmation: { marginTop: 8, color: '#71695D', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  mobilePurchaseDock: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: 'rgba(185,142,57,0.34)', backgroundColor: 'rgba(255,252,246,0.95)', shadowColor: '#241B0D', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: -3 }, elevation: 12 },
  mobilePrimary: { position: 'relative', minHeight: 54, paddingHorizontal: 38, borderWidth: 1, borderColor: '#F4D283', borderRadius: 13, backgroundColor: '#C4881B', alignItems: 'center', justifyContent: 'center', shadowColor: '#76500D', shadowOpacity: 0.32, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 7 },
  mobilePrimaryText: { color: '#FFF9EC', fontSize: 16, lineHeight: 23, fontWeight: '700', textAlign: 'center', textShadowColor: 'rgba(61,37,0,0.35)', textShadowRadius: 3 },
  mobilePrimaryArrow: { position: 'absolute', right: 16, top: 8, color: '#FFF9EC', fontSize: 32, lineHeight: 37, fontWeight: '300' },
  mobilePreConfirmation: { marginTop: 5, color: '#71695D', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  restore: { minHeight: 34, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  restoreText: { color: '#76591F', fontSize: 12, lineHeight: 18, fontWeight: '700', textDecorationLine: 'underline' },
  legalLinks: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap' },
  legalText: { color: '#5E5548', fontSize: 11, lineHeight: 17, textDecorationLine: 'underline' },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.988 }] },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(14,12,9,0.58)' },
  confirmationCard: { width: '100%', maxWidth: 430, padding: 23, borderWidth: 1, borderColor: '#C39238', borderRadius: 20, backgroundColor: '#FFFDF8' },
  confirmationTitle: { color: '#2B241A', fontSize: 23, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
  confirmationRows: { marginTop: 15, borderTopWidth: 1, borderTopColor: colors.line },
  confirmationRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  confirmationLabel: { color: '#70685E', fontSize: 12, lineHeight: 18 },
  confirmationValue: { flexShrink: 1, color: '#2B241A', fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'right' },
  confirmationNotice: { marginTop: 14, padding: 11, borderRadius: 10, backgroundColor: '#F5EEE2', color: '#564E44', fontSize: 12, lineHeight: 19 },
  confirmationSupport: { marginTop: 10, color: '#756C60', fontSize: 11, lineHeight: 18 },
  confirmationLinks: { marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 18 },
  confirmationButton: { minHeight: 53, marginTop: 16, borderWidth: 1, borderColor: '#F4D283', borderRadius: 13, backgroundColor: '#C4881B', alignItems: 'center', justifyContent: 'center' },
  confirmationButtonText: { color: '#FFF9ED', fontSize: 16, lineHeight: 23, fontWeight: '700' },
  cancelButton: { minHeight: 40, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#5E5548', fontSize: 13, lineHeight: 19, textDecorationLine: 'underline' },
  welcomeCard: { width: '100%', maxWidth: 380, padding: 28, borderRadius: 20, backgroundColor: '#FFFDF8', alignItems: 'center' },
  welcomeTitle: { color: '#2B241A', fontSize: 23, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
  welcomeBody: { marginTop: 13, color: '#574F44', fontSize: 14, lineHeight: 23, textAlign: 'center' },
  welcomeButton: { alignSelf: 'stretch', minHeight: 52, marginTop: 24, borderRadius: 13, backgroundColor: '#C4881B', alignItems: 'center', justifyContent: 'center' },
  welcomeButtonText: { color: '#FFF9ED', fontSize: 16, lineHeight: 23, fontWeight: '700' },
});
