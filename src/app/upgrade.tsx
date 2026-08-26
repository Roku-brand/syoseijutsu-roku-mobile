import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { useAuth } from '@/auth/auth-state';
import { AppText } from '@/components/ui';
import { COMPLETE_EDITION_PRICE_JPY, createCompleteEditionCheckout, formatAccessDateTime, formatRemainingAccess } from '@/lib/purchase';
import { colors } from '@/constants/theme';
import { categories, techniqueCards, theories } from '@/data/catalog';

const valuePoints = [
  ['①', '網羅性を追求', 'テーマごとに必要な処世術を揃える、完結を目指した網羅。'],
  ['②', '紐づく理論', '心理学・行動科学・戦略論を根拠とする、理論的な裏づけ。'],
  ['③', '独自の処世術集', '保存・メモ・履歴で積み上げる、知恵のパーソナライズ。'],
] as const;

const personaCount = categories.reduce((count, category) => count + category.subcategories.length, 0);

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string; session_id?: string }>();
  const { width, height } = useWindowDimensions();
  const desktop = width >= 900;
  const compact = !desktop && height <= 740;
  const { user } = useAuth();
  const { isPaid, accessInfo, accessStatus, refreshAccess, restorePurchase } = useAccess();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);

  const comparisonRows = [
    ['人物像', '6', String(personaCount)],
    ['処世術', '45', String(techniqueCards.length)],
    ['理論', '20', String(theories.length)],
  ] as const;

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
    <View testID="upgrade-single-screen" style={styles.safe}>
      <View style={[styles.page, desktop && styles.pageDesktop, compact && styles.pageCompact]}>
        <View style={[styles.content, desktop && styles.contentDesktop, compact && styles.contentCompact]}>
          <View style={[styles.productBand, desktop && styles.productBandDesktop, compact && styles.productBandCompact]}>
            <View style={styles.productBandInner}>
              <AppText variant="serif" style={[styles.productName, desktop && styles.productNameDesktop, compact && styles.productNameCompact]}>処世術禄　完全版</AppText>
              <View style={styles.productRule}><View style={styles.productRuleLine} /><View style={styles.productRuleMark} /><View style={styles.productRuleLine} /></View>
            </View>
          </View>

          <View style={[styles.comparisonSection, compact && styles.comparisonSectionCompact]}>
            <View style={styles.comparisonHeading}><View style={styles.headingRule} /><AppText variant="serif" style={[styles.comparisonTitle, compact && styles.comparisonTitleCompact]}>無料版　→　完全版</AppText><View style={styles.headingRule} /></View>
            <View style={styles.comparisonTable}>
              {comparisonRows.map(([label, free, complete], index) => <View key={label} style={[styles.comparisonRow, index !== comparisonRows.length - 1 && styles.comparisonRowDivider]}>
                <AppText variant="serif" style={[styles.comparisonLabel, compact && styles.comparisonLabelCompact]}>{label}</AppText>
                <AppText variant="serif" style={[styles.freeCount, compact && styles.countCompact]}>{free}</AppText>
                <AppText style={[styles.comparisonArrow, compact && styles.arrowCompact]}>→</AppText>
                <AppText variant="serif" style={[styles.completeCount, compact && styles.completeCountCompact]}>{complete}</AppText>
              </View>)}
            </View>
          </View>

          <View style={[styles.valueSection, desktop && styles.valueSectionDesktop, compact && styles.valueSectionCompact]}>
            {valuePoints.map(([number, title, body], index) => <View key={title} style={[styles.valuePoint, desktop && styles.valuePointDesktop, index !== valuePoints.length - 1 && styles.valueDivider, desktop && index !== valuePoints.length - 1 && styles.valueDividerDesktop]}>
              <AppText style={[styles.valueNumber, compact && styles.valueNumberCompact]}>{number}</AppText>
              <View style={styles.valueCopy}><AppText variant="serif" style={[styles.valueTitle, compact && styles.valueTitleCompact]}>{title}</AppText><AppText style={[styles.valueBody, compact && styles.valueBodyCompact]}>{body}</AppText></View>
            </View>)}
          </View>

          <View style={[styles.purchaseCard, desktop && styles.purchaseCardDesktop, compact && styles.purchaseCardCompact]}>
            <AppText variant="serif" style={[styles.purchaseLabel, compact && styles.purchaseLabelCompact]}>完全版・30日間</AppText>
            <View style={styles.priceRow}><AppText variant="serif" style={[styles.price, compact && styles.priceCompact]}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText><AppText style={[styles.tax, compact && styles.taxCompact]}>（税込）</AppText></View>
            <AppText style={[styles.paymentType, compact && styles.paymentTypeCompact]}>一回払い・自動更新なし</AppText>
            {message ? <AppText accessibilityRole="alert" style={[styles.message, compact && styles.messageCompact]}>{message}</AppText> : null}
            <Pressable accessibilityRole="button" disabled={submitting || accessStatus === 'processing'} onPress={() => isPaid ? router.replace('/') : setShowCheckoutConfirmation(true)} style={({ pressed }) => [styles.primary, compact && styles.primaryCompact, (submitting || accessStatus === 'processing') && styles.disabled, pressed && styles.pressed]}>
              <AppText variant="serif" style={[styles.primaryText, compact && styles.primaryTextCompact]}>{primaryLabel}</AppText>
              {!isPaid ? <AppText style={[styles.primaryArrow, compact && styles.primaryArrowCompact]}>›</AppText> : null}
            </Pressable>
            {!isPaid ? <AppText style={[styles.preConfirmation, compact && styles.preConfirmationCompact]}>決済は次の画面で確定します</AppText> : null}
            <View style={[styles.utilityRow, compact && styles.utilityRowCompact]}>
              {!isPaid ? <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void restore()}><AppText style={[styles.utilityLink, compact && styles.utilityLinkCompact]}>{submitting ? '購入履歴を確認中…' : user ? '購入を復元する' : '購入済みの方は復元する'}</AppText></Pressable> : null}
              <Pressable onPress={() => router.push('/legal/terms')}><AppText style={[styles.utilityLink, compact && styles.utilityLinkCompact]}>利用規約</AppText></Pressable>
              <Pressable onPress={() => router.push('/legal/commerce')}><AppText style={[styles.utilityLink, compact && styles.utilityLinkCompact]}>特商法表記</AppText></Pressable>
              <Pressable onPress={() => router.push('/legal/faq')}><AppText style={[styles.utilityLink, compact && styles.utilityLinkCompact]}>FAQ</AppText></Pressable>
            </View>
          </View>
        </View>
      </View>

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
            <View style={styles.confirmationLinks}><Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/terms'); }}><AppText style={styles.confirmationLink}>利用規約</AppText></Pressable><Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/commerce'); }}><AppText style={styles.confirmationLink}>特商法表記</AppText></Pressable></View>
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
  safe: { flex: 1, minHeight: 0, backgroundColor: '#F5F0E8', overflow: 'hidden' },
  page: { flex: 1, minHeight: 0, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F5F0E8' },
  pageDesktop: { paddingHorizontal: 32, paddingVertical: 20 },
  pageCompact: { paddingHorizontal: 12, paddingVertical: 7 },
  content: { flex: 1, width: '100%', maxWidth: 700, alignSelf: 'center', justifyContent: 'space-between' },
  contentDesktop: { maxWidth: 900, justifyContent: 'center' },
  contentCompact: { justifyContent: 'space-between' },
  productBand: { minHeight: 76, padding: 3, borderRadius: 12, backgroundColor: '#171614', shadowColor: '#090806', shadowOpacity: 0.24, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  productBandDesktop: { minHeight: 94, maxWidth: 760, alignSelf: 'center', width: '100%' },
  productBandCompact: { minHeight: 60, borderRadius: 10 },
  productBandInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C8983C', borderRadius: 9, paddingHorizontal: 14 },
  productName: { color: '#F0CC7E', fontSize: 27, lineHeight: 36, fontWeight: '700', letterSpacing: 3, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  productNameDesktop: { fontSize: 35, lineHeight: 45, letterSpacing: 5 },
  productNameCompact: { fontSize: 23, lineHeight: 29, letterSpacing: 2.5 },
  productRule: { width: '82%', marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 6 },
  productRuleLine: { flex: 1, height: 1, backgroundColor: '#B68529' },
  productRuleMark: { width: 7, height: 7, transform: [{ rotate: '45deg' }], backgroundColor: '#D7AB50' },
  comparisonSection: { marginTop: 10 },
  comparisonSectionCompact: { marginTop: 7 },
  comparisonHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  headingRule: { flex: 1, height: 1, backgroundColor: '#C39A50' },
  comparisonTitle: { color: '#27231F', fontSize: 19, lineHeight: 27, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center' },
  comparisonTitleCompact: { fontSize: 16, lineHeight: 22 },
  comparisonTable: { marginTop: 8, borderWidth: 1, borderColor: '#D2C2A7', borderRadius: 13, overflow: 'hidden', backgroundColor: 'rgba(255,253,248,0.72)' },
  comparisonRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  comparisonRowDivider: { borderBottomWidth: 1, borderBottomColor: '#DDD2C0' },
  comparisonLabel: { width: '38%', color: '#312C26', fontSize: 18, lineHeight: 25, fontWeight: '700' },
  comparisonLabelCompact: { fontSize: 15, lineHeight: 20 },
  freeCount: { width: '18%', color: '#77736C', fontSize: 24, lineHeight: 29, textAlign: 'center' },
  completeCount: { width: '25%', color: '#BE7A0C', fontSize: 31, lineHeight: 36, textAlign: 'center', fontWeight: '700', textShadowColor: 'rgba(151,91,0,0.14)', textShadowRadius: 2 },
  completeCountCompact: { fontSize: 24, lineHeight: 28 },
  countCompact: { fontSize: 21, lineHeight: 25 },
  comparisonArrow: { width: '19%', color: '#766F65', fontSize: 22, lineHeight: 26, textAlign: 'center' },
  arrowCompact: { fontSize: 18, lineHeight: 21 },
  valueSection: { marginTop: 10 },
  valueSectionDesktop: { flexDirection: 'row', marginTop: 16, gap: 26 },
  valueSectionCompact: { marginTop: 8 },
  valuePoint: { minHeight: 46, flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  valuePointDesktop: { flex: 1, minHeight: 100, paddingHorizontal: 4, alignItems: 'flex-start' },
  valueDivider: { borderBottomWidth: 1, borderBottomColor: '#DDD4C6' },
  valueDividerDesktop: { borderBottomWidth: 0, borderRightWidth: 0 },
  valueNumber: { width: 38, color: '#B47B17', fontSize: 18, lineHeight: 25, fontWeight: '700', textAlign: 'center' },
  valueNumberCompact: { width: 31, fontSize: 15, lineHeight: 20 },
  valueCopy: { flex: 1, minWidth: 0 },
  valueTitle: { color: '#29241E', fontSize: 19, lineHeight: 26, fontWeight: '700' },
  valueTitleCompact: { fontSize: 16, lineHeight: 21 },
  valueBody: { marginTop: 3, color: '#514A40', fontSize: 12.5, lineHeight: 18 },
  valueBodyCompact: { marginTop: 1, fontSize: 10.5, lineHeight: 15 },
  purchaseCard: { marginTop: 10, paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: '#C9932C', borderRadius: 16, backgroundColor: 'rgba(255,253,248,0.92)', shadowColor: '#594523', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  purchaseCardDesktop: { width: '100%', maxWidth: 650, alignSelf: 'center', marginTop: 15, paddingHorizontal: 22, paddingVertical: 15 },
  purchaseCardCompact: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  purchaseLabel: { color: '#29241E', fontSize: 17, lineHeight: 23, fontWeight: '700', textAlign: 'center' },
  purchaseLabelCompact: { fontSize: 15, lineHeight: 19 },
  priceRow: { marginTop: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 5 },
  price: { color: '#1E1B17', fontSize: 38, lineHeight: 45, fontWeight: '700' },
  priceCompact: { fontSize: 31, lineHeight: 36 },
  tax: { marginBottom: 6, color: '#5E584F', fontSize: 12, lineHeight: 17 },
  taxCompact: { marginBottom: 4, fontSize: 10, lineHeight: 14 },
  paymentType: { color: '#5A5145', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  paymentTypeCompact: { fontSize: 10, lineHeight: 14 },
  message: { marginTop: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: '#F3EADF', color: '#704E2A', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  messageCompact: { fontSize: 9, lineHeight: 12 },
  primary: { position: 'relative', alignSelf: 'stretch', minHeight: 56, marginTop: 10, paddingHorizontal: 36, borderWidth: 1, borderColor: '#FFE8AD', borderRadius: 12, backgroundColor: '#D09118', alignItems: 'center', justifyContent: 'center', shadowColor: '#76500D', shadowOpacity: 0.42, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  primaryCompact: { minHeight: 45, marginTop: 7, borderRadius: 10 },
  primaryText: { color: '#FFF9EC', fontSize: 18, lineHeight: 25, fontWeight: '700', textAlign: 'center', textShadowColor: 'rgba(61,37,0,0.38)', textShadowRadius: 3 },
  primaryTextCompact: { fontSize: 16, lineHeight: 22 },
  primaryArrow: { position: 'absolute', right: 14, top: 6, color: '#FFF9EC', fontSize: 30, lineHeight: 34, fontWeight: '300' },
  primaryArrowCompact: { right: 12, top: 4, fontSize: 27, lineHeight: 31 },
  preConfirmation: { marginTop: 4, color: '#6E665A', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  preConfirmationCompact: { marginTop: 3, fontSize: 9, lineHeight: 12 },
  utilityRow: { minHeight: 18, marginTop: 9, paddingTop: 5, borderTopWidth: 1, borderTopColor: 'rgba(210,194,167,0.62)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  utilityRowCompact: { minHeight: 13, marginTop: 5, paddingTop: 3, gap: 7 },
  utilityLink: { color: '#5D513D', fontSize: 9.5, lineHeight: 14, textDecorationLine: 'underline' },
  utilityLinkCompact: { fontSize: 8, lineHeight: 11 },
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
  confirmationLink: { color: '#5E5548', fontSize: 11, lineHeight: 17, textDecorationLine: 'underline' },
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
