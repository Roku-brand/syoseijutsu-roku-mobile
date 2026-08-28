import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { useAuth } from '@/auth/auth-state';
import { AppText } from '@/components/ui';
import { COMPLETE_EDITION_PRICE_JPY, createCompleteEditionCheckout, formatAccessDateTime, formatRemainingAccess } from '@/lib/purchase';
import { colors } from '@/constants/theme';
import { techniqueCards, theories } from '@/data/catalog';

const completeMark = require('../../assets/upgrade/complete-mark.png');

const valuePoints = [
  ['①', '網羅性を追求', 'テーマごとに必要な処世術を揃える、完結を目指した網羅。'],
  ['②', '紐づく理論', '心理学・行動科学・戦略論を根拠とする、理論的な裏づけ。'],
  ['③', '独自の処世術集', '保存・メモ・履歴で積み上げる、知恵のパーソナライズ。'],
] as const;

function ProductCover({ compact = false }: { compact?: boolean }) {
  return <Image source={completeMark} accessibilityLabel="処世術禄のマーク" resizeMode="contain" style={[styles.cover, compact && styles.coverCompact]} />;
}

function FeatureIcon({ index }: { index: number }) {
  return <View style={styles.featureIcon} accessibilityElementsHidden>
    {index === 0 ? <View style={styles.gridIcon}>{[0, 1, 2, 3].map((cell) => <View key={cell} style={styles.gridIconCell} />)}</View> : null}
    {index === 1 ? <View style={styles.bookIcon}><View style={[styles.bookIconPage, styles.bookIconPageLeft]} /><View style={[styles.bookIconPage, styles.bookIconPageRight]} /></View> : null}
    {index === 2 ? <View style={styles.memoIcon}><View style={styles.memoIconLine} /><View style={styles.memoIconLine} /><View style={[styles.memoIconLine, styles.memoIconLineShort]} /></View> : null}
  </View>;
}

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

  const purchase = async () => {
    if (!user) {
      router.push({ pathname: '/auth', params: { intent: 'checkout', mode: 'signin' } });
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
      // Do not turn a restore tap into a new purchase flow. After login the
      // user can retry restoration for account-linked purchases; legacy guest
      // purchases continue through the session-specific claim flow below.
      router.push({ pathname: '/auth', params: { mode: 'signin' } });
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
      if (!user) {
        setMessage('決済を確認しました。決済に使用したメールアドレスでログインすると、完全版を有効にできます。');
        return;
      }
      setMessage('決済を確認しています。完了までこの画面を閉じずにお待ちください。');
      void restorePurchase(params.session_id).then((restored) => {
        setMessage(restored ? '決済を確認しました。完全版をご利用いただけます。' : '決済の反映を待っています。しばらくしてから「購入を復元」を押してください。');
      }).catch(() => {
        setMessage('決済の反映を待っています。「購入を復元」を押してください。');
      });
    } else if (params.checkout === 'cancelled') {
      setMessage('購入はキャンセルされました。完全版の利用権は付与されていません。');
    }
  }, [params.checkout, params.session_id, restorePurchase, user]);

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
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.page, desktop && styles.pageDesktop, compact && styles.pageCompact]}>
        <View style={[styles.content, desktop && styles.contentDesktop, compact && styles.contentCompact]}>
          <View style={[styles.productIntro, compact && styles.productIntroCompact]}>
            <ProductCover compact={compact} />
            <View style={styles.productCopy}>
              <AppText variant="serif" style={[styles.productTitle, compact && styles.productTitleCompact]}>処世術禄　完全版</AppText>
              <AppText style={[styles.productLead, compact && styles.productLeadCompact]}>30日間、すべての知恵を。</AppText>
              <View style={styles.productPriceRow}><View style={styles.originalPriceGroup}><AppText variant="serif" style={[styles.originalPrice, compact && styles.originalPriceCompact]}>¥680</AppText><AppText style={[styles.originalPriceNote, compact && styles.originalPriceNoteCompact]}>期間限定割引</AppText></View><AppText variant="serif" style={[styles.productPrice, compact && styles.productPriceCompact]}>¥280</AppText><View style={styles.durationBadge}><AppText style={styles.durationBadgeText}>30日間</AppText></View></View>
              <View style={[styles.productConditionRow, compact && styles.productConditionRowCompact]}><AppText style={[styles.productCondition, compact && styles.productConditionCompact]}>一回払い・自動更新なし</AppText><AppText style={[styles.scopeText, compact && styles.scopeTextCompact]}>処世術{techniqueCards.length}件・理論{theories.length}件・全21コース</AppText></View>
            </View>
          </View>

          <View style={[styles.editionComparison, compact && styles.editionComparisonCompact]}>
            <View style={[styles.editionOption, styles.freeEdition]}><AppText style={styles.editionBadge}>無料版</AppText><AppText variant="serif" style={[styles.editionCount, compact && styles.editionCountCompact]}>処世術45件{`\n`}理論20件</AppText></View>
            <AppText style={[styles.editionArrow, compact && styles.editionArrowCompact]}>›</AppText>
            <View style={[styles.editionOption, styles.completeEdition]}><AppText style={[styles.editionBadge, styles.completeEditionBadge]}>完全版</AppText><AppText variant="serif" style={[styles.editionCount, styles.completeEditionCount, compact && styles.completeEditionCountCompact]}>処世術{techniqueCards.length}件・理論{theories.length}件</AppText></View>
          </View>

          <View style={[styles.valueHeading, compact && styles.valueHeadingCompact]}><View style={styles.valueHeadingLine} /><View><AppText variant="serif" style={styles.valueHeadingTitle}>迷ったとき、すぐ一手が見つかる</AppText><AppText style={styles.valueHeadingSub}>完全版で手に入る3つの強み。</AppText></View><View style={styles.valueHeadingLine} /></View>
          <View style={[styles.featurePanel, compact && styles.featurePanelCompact]}>
            {valuePoints.map(([number, title, body], index) => <View key={title} style={[styles.featureRow, index !== valuePoints.length - 1 && styles.featureRowDivider, compact && styles.featureRowCompact]}>
              <FeatureIcon index={index} />
              <View style={styles.featureCopy}><View style={styles.featureTitleRow}><AppText style={[styles.featureNumber, compact && styles.featureNumberCompact]}>{number}</AppText><AppText variant="serif" style={[styles.featureTitle, compact && styles.featureTitleCompact]}>{title}</AppText></View><AppText style={[styles.featureBody, compact && styles.featureBodyCompact]}>{body}</AppText></View>
            </View>)}
          </View>

          <View style={[styles.purchaseCard, desktop && styles.purchaseCardDesktop, compact && styles.purchaseCardCompact]}>
            <AppText variant="serif" style={[styles.purchaseLabel, compact && styles.purchaseLabelCompact]}>完全版・30日間</AppText>
            <View style={styles.priceRow}><AppText variant="serif" style={[styles.price, compact && styles.priceCompact]}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText><AppText style={[styles.tax, compact && styles.taxCompact]}>（税込）</AppText></View>
            <AppText style={[styles.paymentType, compact && styles.paymentTypeCompact]}>一回払い・自動更新なし</AppText>
            {message ? <AppText accessibilityRole="alert" style={[styles.message, compact && styles.messageCompact]}>{message}</AppText> : null}
            {params.checkout === 'success' && !user && params.session_id ? <Pressable accessibilityRole="button" disabled={submitting} onPress={() => router.push({ pathname: '/auth', params: { intent: 'claim', session_id: params.session_id, mode: 'signin' } })} style={styles.claimButton}><AppText style={styles.claimButtonText}>決済に使ったメールアドレスでログインして完全版を有効にする</AppText></Pressable> : null}
            <Pressable accessibilityRole="button" disabled={submitting || accessStatus === 'processing'} onPress={() => isPaid ? router.replace('/') : setShowCheckoutConfirmation(true)} style={({ pressed }) => [styles.primary, compact && styles.primaryCompact, (submitting || accessStatus === 'processing') && styles.disabled, pressed && styles.pressed]}>
              <View pointerEvents="none" style={styles.primarySheen} />
              <AppText variant="serif" style={[styles.primaryText, compact && styles.primaryTextCompact]}>{primaryLabel}</AppText>
              {!isPaid ? <AppText style={[styles.primaryArrow, compact && styles.primaryArrowCompact]}>›</AppText> : null}
            </Pressable>
            {!isPaid ? <AppText style={[styles.preConfirmation, compact && styles.preConfirmationCompact]}>{user ? '決済は次の画面で確定します' : 'アカウント作成またはログイン後に、決済へ進みます'}</AppText> : null}
            <View style={[styles.utilityRow, compact && styles.utilityRowCompact]}>
              {!isPaid ? <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void restore()}><AppText style={[styles.utilityLink, compact && styles.utilityLinkCompact]}>{submitting ? '購入履歴を確認中…' : user ? '購入を復元する' : '購入済みの方は復元する'}</AppText></Pressable> : null}
              <Pressable onPress={() => router.push('/legal/terms')}><AppText style={[styles.utilityLink, compact && styles.utilityLinkCompact]}>利用規約</AppText></Pressable>
              <Pressable onPress={() => router.push('/legal/commerce')}><AppText style={[styles.utilityLink, compact && styles.utilityLinkCompact]}>特商法表記</AppText></Pressable>
              <Pressable onPress={() => router.push('/legal/faq')}><AppText style={[styles.utilityLink, compact && styles.utilityLinkCompact]}>FAQ</AppText></Pressable>
            </View>
          </View>
        </View>
        </View>
      </ScrollView>

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
            <AppText style={styles.confirmationSupport}>{user
              ? 'クレジットカード・PayPay対応です。このアカウントに購入情報と30日間の利用権を紐づけます。利用可能な方法はStripeの決済画面に表示されます。'
              : '決済前にアカウントを作成またはログインします。購入情報と30日間の利用権は、そのアカウントに安全に紐づきます。クレジットカード・PayPayはStripeの決済画面で選べます。'}
            </AppText>
            <View style={styles.confirmationLinks}><Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/terms'); }}><AppText style={styles.confirmationLink}>利用規約</AppText></Pressable><Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/commerce'); }}><AppText style={styles.confirmationLink}>特商法表記</AppText></Pressable></View>
            <Pressable disabled={submitting} onPress={() => { setShowCheckoutConfirmation(false); void purchase(); }} style={({ pressed }) => [styles.confirmationButton, pressed && styles.pressed]}><AppText variant="serif" style={styles.confirmationButtonText}>{user ? 'Stripe決済へ進む' : 'アカウント作成・ログインへ'}</AppText></Pressable>
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
  safe: { flex: 1, minHeight: 0, backgroundColor: '#F5F0E8' },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { flexGrow: 1 },
  page: { flexGrow: 1, minHeight: '100%', width: '100%', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F5F0E8' },
  pageDesktop: { paddingHorizontal: 32, paddingVertical: 20 },
  pageCompact: { paddingHorizontal: 12, paddingVertical: 7 },
  content: { flex: 1, width: '100%', maxWidth: 700, alignSelf: 'center', justifyContent: 'space-between' },
  contentDesktop: { maxWidth: 740, justifyContent: 'flex-start' },
  contentCompact: { justifyContent: 'flex-start' },
  productIntro: { width: '100%', maxWidth: 560, minHeight: 112, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 17, paddingHorizontal: 10 },
  productIntroCompact: { minHeight: 82, gap: 12, paddingHorizontal: 3 },
  cover: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#151512', shadowColor: '#4E3B19', shadowOpacity: 0.3, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  coverCompact: { width: 64, height: 64, borderRadius: 32 },
  productCopy: { flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center' },
  productTitle: { color: '#27231E', fontSize: 26, lineHeight: 34, fontWeight: '700' },
  productTitleCompact: { fontSize: 20, lineHeight: 26 },
  productLead: { marginTop: 2, color: '#635A4D', fontSize: 12, lineHeight: 17 },
  productLeadCompact: { fontSize: 10, lineHeight: 14 },
  productPriceRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 9 },
  originalPriceGroup: { alignItems: 'center' },
  originalPrice: { color: '#8C8273', fontSize: 18, lineHeight: 25, textDecorationLine: 'line-through' },
  originalPriceCompact: { fontSize: 12, lineHeight: 17 },
  originalPriceNote: { marginTop: -1, color: '#9A6B22', fontSize: 8, lineHeight: 11, fontWeight: '700' },
  originalPriceNoteCompact: { fontSize: 7, lineHeight: 9 },
  productPrice: { color: '#BB7B0B', fontSize: 44, lineHeight: 51, fontWeight: '700' },
  productPriceCompact: { fontSize: 31, lineHeight: 36 },
  durationBadge: { paddingHorizontal: 9, paddingVertical: 4, borderWidth: 1, borderColor: '#C9932C', borderRadius: 8 },
  durationBadgeText: { color: '#9D6510', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  productConditionRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  productConditionRowCompact: { marginTop: 0, gap: 5, flexWrap: 'nowrap' },
  productCondition: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F5EEDF', color: '#806235', fontSize: 10, lineHeight: 14 },
  productConditionCompact: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 8, lineHeight: 11 },
  scopeText: { flexShrink: 1, color: '#372F25', fontSize: 10.5, lineHeight: 15, fontWeight: '700' },
  scopeTextCompact: { fontSize: 7.5, lineHeight: 10 },
  editionComparison: { minHeight: 91, marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 14 },
  editionComparisonCompact: { minHeight: 62, marginTop: 5, gap: 8 },
  editionOption: { flex: 1, minWidth: 0, minHeight: 91, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 10 },
  freeEdition: { borderWidth: 1, borderColor: '#DACDB8', backgroundColor: 'rgba(255,253,248,0.82)' },
  completeEdition: { borderWidth: 1, borderColor: '#2B2922', backgroundColor: '#1A1916' },
  editionBadge: { marginBottom: 4, paddingHorizontal: 8, paddingVertical: 1, borderWidth: 1, borderColor: '#D2C2A6', borderRadius: 4, color: '#857360', fontSize: 9, lineHeight: 13 },
  completeEditionBadge: { borderColor: '#C8982F', color: '#E1BA5D' },
  editionCount: { color: '#302B24', fontSize: 19, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  completeEditionCount: { color: '#E0B84F' },
  editionCountCompact: { fontSize: 14, lineHeight: 19 },
  completeEditionCountCompact: { fontSize: 11.5, lineHeight: 16 },
  editionArrow: { color: '#BD8318', fontSize: 33, lineHeight: 37, fontWeight: '300' },
  editionArrowCompact: { fontSize: 25, lineHeight: 28 },
  valueHeading: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  valueHeadingCompact: { marginTop: 5, gap: 7 },
  valueHeadingLine: { flex: 1, height: 1, backgroundColor: '#D6C39F' },
  valueHeadingTitle: { color: '#A66D16', fontSize: 16, lineHeight: 22, textAlign: 'center' },
  valueHeadingSub: { marginTop: 0, color: '#857363', fontSize: 8.5, lineHeight: 12, textAlign: 'center' },
  featurePanel: { marginTop: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#DDD0BC', borderRadius: 13, backgroundColor: 'rgba(255,253,248,0.62)' },
  featurePanelCompact: { marginTop: 4, borderRadius: 10 },
  featureRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 7 },
  featureRowCompact: { minHeight: 45, gap: 8, paddingHorizontal: 9, paddingVertical: 4 },
  featureRowDivider: { borderBottomWidth: 1, borderBottomColor: '#E2D7C8' },
  featureIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1916' },
  gridIcon: { width: 15, height: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  gridIconCell: { width: 6.5, height: 6.5, borderWidth: 1, borderColor: '#E1B54C', borderRadius: 1 },
  bookIcon: { width: 16, height: 15, flexDirection: 'row', gap: 2 },
  bookIconPage: { width: 7, height: 14, borderWidth: 1, borderColor: '#E1B54C', borderRadius: 1 },
  bookIconPageLeft: { borderTopRightRadius: 4 },
  bookIconPageRight: { borderTopLeftRadius: 4 },
  memoIcon: { width: 15, gap: 3 },
  memoIconLine: { height: 1, borderRadius: 1, backgroundColor: '#E1B54C' },
  memoIconLineShort: { width: '62%' },
  featureCopy: { flex: 1, minWidth: 0 },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  featureNumber: { color: '#B67B16', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  featureNumberCompact: { fontSize: 11, lineHeight: 15 },
  featureTitle: { color: '#A36A13', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  featureTitleCompact: { fontSize: 12, lineHeight: 16 },
  featureBody: { marginTop: 1, color: '#574F44', fontSize: 10.5, lineHeight: 15 },
  featureBodyCompact: { fontSize: 8.5, lineHeight: 12 },
  productBand: { minHeight: 76, padding: 3, borderRadius: 12, backgroundColor: '#171614', shadowColor: '#090806', shadowOpacity: 0.24, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  productBandDesktop: { minHeight: 94, maxWidth: 740, alignSelf: 'center', width: '100%' },
  productBandCompact: { minHeight: 60, borderRadius: 10 },
  productBandInner: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C8983C', borderRadius: 9, paddingHorizontal: 14 },
  productName: { color: '#F0CC7E', fontSize: 27, lineHeight: 36, fontWeight: '700', letterSpacing: 3, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  productNameDesktop: { fontSize: 35, lineHeight: 45, letterSpacing: 5 },
  productNameCompact: { fontSize: 23, lineHeight: 29, letterSpacing: 2.5 },
  productRule: { width: '82%', marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 6 },
  productRuleLine: { flex: 1, height: 1, backgroundColor: '#B68529' },
  productRuleMark: { width: 7, height: 7, transform: [{ rotate: '45deg' }], backgroundColor: '#D7AB50' },
  editionMeta: { height: 26, marginTop: 6, flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, paddingHorizontal: 13, borderWidth: 1, borderColor: 'rgba(194,145,42,0.45)', borderRadius: 13, backgroundColor: 'rgba(255,253,248,0.62)' },
  editionMetaLabel: { color: '#5E513D', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  editionMetaDivider: { width: 1, height: 12, backgroundColor: '#D8C39E' },
  editionMetaPrice: { color: '#B8780C', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  editionMetaTax: { color: '#6C6255', fontSize: 10, lineHeight: 14 },
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
  valueSectionDesktop: { flexDirection: 'row', marginTop: 14, gap: 20 },
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
  purchaseCardDesktop: { width: '100%', maxWidth: 740, alignSelf: 'center', marginTop: 14, paddingHorizontal: 22, paddingVertical: 15 },
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
  claimButton: { minHeight: 42, marginTop: 7, paddingHorizontal: 12, borderWidth: 1, borderColor: '#B47B17', borderRadius: 10, backgroundColor: '#FFF9EF', alignItems: 'center', justifyContent: 'center' },
  claimButtonText: { color: '#6D4710', fontSize: 11, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  primary: { position: 'relative', alignSelf: 'stretch', minHeight: 56, marginTop: 10, paddingHorizontal: 36, borderWidth: 1, borderColor: '#FFEDB7', borderRadius: 12, overflow: 'hidden', backgroundColor: '#D99B1B', alignItems: 'center', justifyContent: 'center', shadowColor: '#6C4300', shadowOpacity: 0.52, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  primaryCompact: { minHeight: 45, marginTop: 7, borderRadius: 10 },
  primaryText: { color: '#FFF9EC', fontSize: 18, lineHeight: 25, fontWeight: '700', textAlign: 'center', textShadowColor: 'rgba(61,37,0,0.38)', textShadowRadius: 3 },
  primaryTextCompact: { fontSize: 16, lineHeight: 22 },
  primarySheen: { position: 'absolute', top: 1, right: 1, left: 1, height: '44%', borderTopLeftRadius: 11, borderTopRightRadius: 11, backgroundColor: 'rgba(255,244,196,0.22)' },
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
