import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { EditionCover } from '@/components/locked-preview';
import { AppText, DetailHeader } from '@/components/ui';
import { useAccess } from '@/access/access-state';
import { useAuth } from '@/auth/auth-state';
import { COMPLETE_EDITION_PRICE_JPY, createCompleteEditionCheckout, formatAccessDateTime, formatRemainingAccess } from '@/lib/purchase';
import { colors, fonts } from '@/constants/theme';
import { techniqueCards, theories } from '@/data/catalog';
import { FREE_PERSONA_NAMES, FREE_REEL_TECHNIQUE_IDS, FREE_THEORY_IDS } from '@/access/access-config';

const benefits = [
  ['▣', '網羅性', '人間関係・仕事・人生まで、最新の処世術を悩み別に網羅'],
  ['◉', '理論性', '心理学・行動科学など採用理論から「なぜ効くか」までわかる'],
  ['◎', '実践性', '全21ケースで考え、読むだけで終わらない判断力に変えられる'],
  ['▤', '普遍性', '気になった知恵は蔵書に保存。迷ったとき何度でも読み返せる'],
] as const;

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string; session_id?: string }>();
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
    } else if (params.checkout === 'cancelled') setMessage('購入はキャンセルされました。完全版の利用権は付与されていません。');
  }, [params.checkout, params.session_id, restorePurchase]);

  useEffect(() => {
    if (params.checkout === 'success' && isPaid) setShowWelcome(true);
  }, [isPaid, params.checkout]);

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <DetailHeader title="完全版" />
      <View style={styles.main}>
        <View style={styles.hero}>
          <EditionCover compact />
          <View style={styles.heroCopy}>
            <AppText variant="serif" style={styles.productTitle}>処世術禄 完全版</AppText>
            <AppText style={styles.tagline}>30日間、すべての知恵を。</AppText>
            <View style={styles.priceRow}>
              <AppText variant="serif" style={styles.price}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText>
              <View style={styles.releasePrice}><AppText style={styles.releasePriceText}>30日間</AppText></View>
            </View>
            <AppText style={styles.buyout}>自動更新・継続課金なし</AppText>
          </View>
        </View>

        <AppText style={styles.stats}>▤　{techniqueCards.length}の処世術・{theories.length}の理論・全21ケース</AppText>

        <View style={styles.editionRow}>
          <View style={styles.freeEdition}>
            <AppText style={styles.editionLabel}>無料版・{FREE_PERSONA_NAMES.length}人物像</AppText>
            <View style={styles.freeCounts}>
              <AppText variant="serif" style={styles.freeCount}>処世術{FREE_REEL_TECHNIQUE_IDS.length}件</AppText>
              <AppText variant="serif" style={styles.freeCount}>理論{FREE_THEORY_IDS.length}件</AppText>
            </View>
          </View>
          <AppText style={styles.compareArrow}>›</AppText>
          <View style={styles.completeEdition}><AppText style={styles.completeLabel}>完全版</AppText><AppText variant="serif" style={styles.completeCount}>処世術{techniqueCards.length}件・理論{theories.length}件</AppText></View>
        </View>

        <View style={styles.strengthHeader}><View style={styles.strengthRule} /><View style={styles.strengthHeadingCopy}><AppText variant="serif" style={styles.strengthTitle}>迷ったとき、すぐ一手が見つかる</AppText><AppText style={styles.strengthSubtitle}>完全版で手に入る4つの強み</AppText></View><View style={styles.strengthRule} /></View>
        <View style={styles.benefitGrid}>
          {benefits.map(([icon, title, body], index) => <View key={title} style={[styles.benefit, index === benefits.length - 1 && styles.benefitLast]}><View style={styles.benefitIcon}><AppText style={styles.benefitIconText}>{icon}</AppText></View><View style={styles.benefitCopy}><View style={styles.benefitTitleRow}><AppText style={styles.benefitTitle}>{title}</AppText><View style={styles.benefitTitleRule} /></View><AppText style={styles.benefitBody} numberOfLines={2}>{body}</AppText></View></View>)}
        </View>
      </View>

      <View style={styles.footer}>
        {message ? <AppText style={styles.message} numberOfLines={2}>{message}</AppText> : null}
        <View style={styles.trustRow}><AppText style={styles.trust}>✓ 30日間</AppText><AppText style={styles.trust}>◇ 自動更新なし</AppText><AppText style={styles.trust}>⚡ 継続課金なし</AppText></View>
        <View style={styles.purchaseNotice}>
          <AppText style={styles.purchaseNoticeText}>一度のお支払いで購入完了から30日間利用できます。期間終了後は無料版へ戻り、追加課金は発生しません。</AppText>
        </View>
        {isPaid ? <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={() => router.replace('/')}><AppText variant="serif" style={styles.primaryText}>{accessInfo.accessType === 'thirty_day' ? `完全版を利用中・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : '完全版を開く'}</AppText></Pressable> : <Pressable accessibilityRole="button" disabled={submitting || accessStatus === 'processing'} onPress={() => setShowCheckoutConfirmation(true)} style={({ pressed }) => [styles.primary, submitting && styles.disabled, pressed && styles.pressed]}><AppText variant="serif" style={styles.crownSafe}>♛</AppText><AppText variant="serif" numberOfLines={1} style={styles.primaryTextSafe}>{submitting ? '決済画面を開いています…' : accessStatus === 'expired' ? 'もう一度30日間利用する' : `${COMPLETE_EDITION_PRICE_JPY}円で30日間利用する`}</AppText><AppText style={styles.primaryArrowSafe}>›</AppText></Pressable>}
        {!isPaid ? <AppText style={styles.autoRenewNotice}>自動更新・継続課金なし</AppText> : null}
        <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void restore()} style={[styles.restore, submitting && styles.disabled]}><AppText variant="serif" style={styles.restoreText}>{submitting ? '購入履歴を確認中…' : user ? '購入を復元する' : '購入済みの方はこちら'}</AppText><AppText style={styles.restoreArrow}>›</AppText></Pressable>
        <View style={styles.legalLinks}><Pressable onPress={() => router.push('/legal/terms')}><AppText style={styles.legalText}>利用規約</AppText></Pressable><AppText style={styles.legalDivider}>｜</AppText><Pressable onPress={() => router.push('/legal/commerce')}><AppText style={styles.legalText}>特商法表記</AppText></Pressable><AppText style={styles.legalDivider}>｜</AppText><Pressable onPress={() => router.push('/legal/faq')}><AppText style={styles.legalText}>FAQ</AppText></Pressable></View>
      </View>
      <Modal transparent visible={showCheckoutConfirmation} animationType="fade" onRequestClose={() => setShowCheckoutConfirmation(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationCard}>
            <AppText variant="serif" style={styles.confirmationTitle}>購入内容の確認</AppText>
            <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>商品</AppText><AppText style={styles.confirmationValue}>処世術禄 完全版｜30日間アクセス</AppText></View>
            <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>価格</AppText><AppText style={styles.confirmationValue}>¥{COMPLETE_EDITION_PRICE_JPY}（税込）</AppText></View>
            <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>利用期間</AppText><AppText style={styles.confirmationValue}>決済完了から30日間</AppText></View>
            <View style={styles.confirmationRow}><AppText style={styles.confirmationLabel}>自動更新</AppText><AppText style={styles.confirmationValue}>なし</AppText></View>
            <AppText style={styles.confirmationNotice}>一回払いです。期間終了後に自動で課金されることはありません。通信販売には原則としてクーリング・オフ制度は適用されず、購入および提供開始後の購入者都合による返品・返金には原則として対応しません。ただし、重複決済、完全版が提供されない場合その他法令上必要な場合を除きます。</AppText>
            <AppText style={styles.confirmationSupport}>期間終了後は保存データを残したまま無料版へ戻ります。再利用には、ユーザー自身による再購入が必要です。</AppText>
            <View style={styles.confirmationLinks}><Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/terms'); }}><AppText style={styles.legalText}>利用規約</AppText></Pressable><AppText style={styles.legalDivider}>｜</AppText><Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/commerce'); }}><AppText style={styles.legalText}>特商法表記</AppText></Pressable></View>
            <Pressable disabled={submitting} onPress={() => { setShowCheckoutConfirmation(false); void purchase(); }} style={({ pressed }) => [styles.confirmationButton, pressed && styles.pressed]}><AppText style={styles.confirmationButtonText}>内容を確認してStripe決済へ進む</AppText></Pressable>
            <Pressable disabled={submitting} onPress={() => setShowCheckoutConfirmation(false)} style={styles.cancelButton}><AppText style={styles.cancelText}>戻る</AppText></Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={showWelcome} animationType="fade" onRequestClose={() => setShowWelcome(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.welcomeCard}>
            <AppText variant="serif" style={styles.welcomeTitle}>購入ありがとうございます</AppText>
            <AppText style={styles.welcomeBody}>完全版が利用可能になりました。{accessInfo.accessExpiresAt ? `${`\n\n`}利用期限${`\n`}${formatAccessDateTime(accessInfo.accessExpiresAt)}まで` : ''}</AppText>
            <Pressable onPress={() => { setShowWelcome(false); router.replace('/'); }} style={({ pressed }) => [styles.welcomeButton, pressed && styles.pressed]}><AppText style={styles.welcomeButtonText}>完全版を使い始める</AppText></Pressable>
          </View>
        </View>
      </Modal>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  crownSafe: { position: 'absolute', left: 18, color: '#F6D26C', fontSize: 23, lineHeight: 27 },
  primaryTextSafe: { paddingHorizontal: 42, color: '#FFFDF8', fontSize: 20, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  primaryArrowSafe: { position: 'absolute', right: 18, color: '#FFFDF8', fontSize: 39, lineHeight: 39, fontWeight: '300' },
  content: { maxWidth: 620, alignSelf: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 92 },
  main: { width: '100%' },
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
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 3 }, price: { color: '#E21B0C', fontSize: 45, lineHeight: 51, fontWeight: '700' }, regularPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -2 }, regularPriceLabel: { color: colors.inkSoft, fontSize: 10, lineHeight: 14 }, regularPrice: { color: '#70695F', fontSize: 15, lineHeight: 19, textDecorationLine: 'line-through' }, regularPriceNote: { color: colors.inkSoft, fontSize: 9, lineHeight: 13 },
  releasePrice: { borderWidth: 1, borderColor: '#D52B1E', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }, releasePriceText: { color: '#C41E16', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  discount: { borderWidth: 1, borderColor: '#D52B1E', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center' }, discountSmall: { color: '#C41E16', fontSize: 8, lineHeight: 11, fontWeight: '700' }, discountMain: { color: '#D71C0C', fontSize: 15, lineHeight: 19, fontWeight: '700' }, buyout: { alignSelf: 'flex-start', marginTop: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, color: '#8B6B3A', fontSize: 10, lineHeight: 14 },
  stats: { marginTop: 7, color: '#312E29', fontSize: 11, lineHeight: 17, fontWeight: '600', textAlign: 'center' },
  editionRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 8 }, freeEdition: { flex: 0.92, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.35)', paddingVertical: 7 }, editionLabel: { borderWidth: 1, borderColor: '#DED6C9', borderRadius: 4, paddingHorizontal: 6, color: '#615B50', fontSize: 9, lineHeight: 12 }, freeCounts: { marginTop: 4, alignItems: 'center' }, freeCount: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '700', textAlign: 'center' }, compareArrow: { color: colors.gold, alignSelf: 'center', fontSize: 30, lineHeight: 30 }, completeEdition: { flex: 1.25, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: colors.charcoal, paddingVertical: 7 }, completeLabel: { borderWidth: 1, borderColor: colors.gold, borderRadius: 4, paddingHorizontal: 7, color: '#E7C779', fontSize: 9, lineHeight: 12 }, completeCount: { marginTop: 4, color: '#E9C66A', fontSize: 16, lineHeight: 22, fontWeight: '700' },
  strengthHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }, strengthRule: { flex: 1, height: 1, backgroundColor: '#DFD2BE' }, strengthHeadingCopy: { alignItems: 'center' }, strengthTitle: { color: '#96692C', fontSize: 14, lineHeight: 19, fontWeight: '700' }, strengthSubtitle: { marginTop: 1, color: '#7B746A', fontSize: 8, lineHeight: 12 }, benefitGrid: { marginTop: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.32)' }, benefit: { minHeight: 47, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, gap: 9, borderBottomWidth: 1, borderBottomColor: '#E8DFD2' }, benefitLast: { borderBottomWidth: 0 }, benefitIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.charcoal }, benefitIconText: { color: '#E4B94E', fontSize: 11, lineHeight: 14 }, benefitCopy: { flex: 1, minWidth: 0 }, benefitTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, benefitTitle: { color: '#A86F20', fontSize: 11, lineHeight: 15, fontWeight: '700' }, benefitTitleRule: { flex: 1, height: 1, backgroundColor: '#E8DFD2' }, benefitBody: { marginTop: 2, color: '#3E3A34', fontSize: 9, lineHeight: 14 },
  footer: { width: '100%', marginTop: 9 }, message: { marginBottom: 4, color: '#9B342C', fontSize: 10, lineHeight: 14, textAlign: 'center' }, trustRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 5, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E4D8C5' }, trust: { color: '#8C692D', fontSize: 9, lineHeight: 13, fontWeight: '600' }, purchaseNotice: { marginTop: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F4EEE2' }, purchaseNoticeText: { color: '#625D54', fontSize: 9, lineHeight: 14, textAlign: 'center' }, primary: { position: 'relative', minHeight: 62, marginTop: 8, borderWidth: 2, borderColor: '#E5A928', borderRadius: 18, backgroundColor: '#E9230C', alignItems: 'center', justifyContent: 'center', shadowColor: '#B2380E', shadowOpacity: 0.24, shadowRadius: 8, elevation: 4 }, primaryText: { color: '#FFFDF8', fontSize: 25, lineHeight: 32, fontWeight: '700' }, autoRenewNotice: { marginTop: 5, color: '#7B5E2C', fontSize: 11, lineHeight: 16, fontWeight: '700', textAlign: 'center' }, restore: { position: 'relative', minHeight: 36, marginTop: 7, borderWidth: 1, borderColor: '#B98831', borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, restoreText: { color: '#946928', fontSize: 13, lineHeight: 19, fontWeight: '700' }, restoreArrow: { position: 'absolute', right: 18, color: '#A5742C', fontSize: 27, lineHeight: 27 }, legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, marginTop: 7 }, legalText: { color: '#676158', fontSize: 9, lineHeight: 13, textDecorationLine: 'underline' }, legalDivider: { color: '#82796C', fontSize: 9 }, disabled: { opacity: 0.55 }, pressed: { transform: [{ translateY: -2 }], shadowOpacity: 0.35 },
});
