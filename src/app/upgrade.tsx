import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { FREE_PERSONA_NAMES, FREE_REEL_TECHNIQUE_IDS, FREE_THEORY_IDS } from '@/access/access-config';
import { useAuth } from '@/auth/auth-state';
import { BookScreen } from '@/components/book-ui';
import { AppText, DetailHeader } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueCards, theories } from '@/data/catalog';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import {
  COMPLETE_EDITION_PRICE_JPY,
  createCompleteEditionCheckout,
  formatAccessDateTime,
  formatRemainingAccess,
} from '@/lib/purchase';

const benefits = [
  ['人物像から読める', 'なりたい人物像を入口に、関連する処世術を体系でたどれます。'],
  ['理由まで理解できる', '心理学・行動科学・戦略などの理論から「なぜ効くか」を確認できます。'],
  ['ケースで試せる', '全21ケースで選択と結果を確かめ、判断の使い方を練習できます。'],
  ['自分の知恵として残せる', '処世術と理論を蔵書に保存し、メモや履歴から読み返せます。'],
] as const;

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string; session_id?: string }>();
  const { width } = useHydratedWindowDimensions();
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

  const details = (
    <View style={[styles.details, desktop && styles.detailsDesktop]}>
      <AppText style={styles.eyebrow}>処世術禄</AppText>
      <AppText variant="serif" style={styles.productTitle}>完全版</AppText>
      <AppText style={styles.lead}>対人・仕事・人生の人物像を入口に、処世術・理論・ケースをすべて利用できます。</AppText>

      <View style={styles.catalogSummary}>
        <View style={styles.catalogSummaryItem}><AppText variant="serif" style={styles.catalogSummaryValue}>26</AppText><AppText style={styles.catalogSummaryLabel}>人物像</AppText></View>
        <View style={styles.catalogSummaryItem}><AppText variant="serif" style={styles.catalogSummaryValue}>{techniqueCards.length}</AppText><AppText style={styles.catalogSummaryLabel}>処世術</AppText></View>
        <View style={styles.catalogSummaryItem}><AppText variant="serif" style={styles.catalogSummaryValue}>{theories.length}</AppText><AppText style={styles.catalogSummaryLabel}>理論</AppText></View>
        <View style={styles.catalogSummaryItem}><AppText variant="serif" style={styles.catalogSummaryValue}>21</AppText><AppText style={styles.catalogSummaryLabel}>ケース</AppText></View>
      </View>

      <View style={styles.comparison}>
        <View style={styles.comparisonColumn}>
          <AppText style={styles.comparisonLabel}>無料版</AppText>
          <AppText style={styles.comparisonMain}>{FREE_PERSONA_NAMES.length}人物像</AppText>
          <AppText style={styles.comparisonDetail}>処世術{FREE_REEL_TECHNIQUE_IDS.length}件・理論{FREE_THEORY_IDS.length}件</AppText>
        </View>
        <View style={[styles.comparisonColumn, styles.comparisonComplete]}>
          <AppText style={[styles.comparisonLabel, styles.comparisonLabelComplete]}>完全版</AppText>
          <AppText style={[styles.comparisonMain, styles.comparisonMainComplete]}>全26人物像</AppText>
          <AppText style={[styles.comparisonDetail, styles.comparisonDetailComplete]}>全カード・全21ケース</AppText>
        </View>
      </View>

      <View style={styles.benefitList}>
        {benefits.map(([title, body]) => (
          <View key={title} style={styles.benefit}>
            <AppText style={styles.benefitTitle}>{title}</AppText>
            <AppText style={styles.benefitBody}>{body}</AppText>
          </View>
        ))}
      </View>
    </View>
  );

  const purchasePanel = (
    <View style={[styles.purchasePanel, desktop && styles.purchasePanelDesktop]}>
      <AppText style={styles.purchaseLabel}>完全版・30日間アクセス</AppText>
      <View style={styles.priceRow}>
        <AppText variant="serif" style={styles.price}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText>
        <AppText style={styles.tax}>税込</AppText>
      </View>
      <AppText style={styles.paymentType}>一回払い・自動更新なし</AppText>

      <View style={styles.purchaseTerms}>
        <View style={styles.purchaseTermRow}><AppText style={styles.purchaseTermLabel}>利用期間</AppText><AppText style={styles.purchaseTermValue}>決済完了から30日間</AppText></View>
        <View style={styles.purchaseTermRow}><AppText style={styles.purchaseTermLabel}>期間終了後</AppText><AppText style={styles.purchaseTermValue}>保存データを残して無料版へ</AppText></View>
        <View style={[styles.purchaseTermRow, styles.purchaseTermRowLast]}><AppText style={styles.purchaseTermLabel}>追加課金</AppText><AppText style={styles.purchaseTermValue}>なし</AppText></View>
      </View>

      {message ? <AppText accessibilityRole="alert" style={styles.message}>{message}</AppText> : null}

      {isPaid ? (
        <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={() => router.replace('/')}>
          <AppText style={styles.primaryText}>{accessInfo.accessType === 'thirty_day' ? `完全版を利用中・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : '完全版を開く'}</AppText>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={submitting || accessStatus === 'processing'}
          onPress={() => setShowCheckoutConfirmation(true)}
          style={({ pressed }) => [styles.primary, submitting && styles.disabled, pressed && styles.pressed]}
        >
          <AppText style={styles.primaryText}>{submitting ? '決済画面を開いています…' : '購入内容を確認する'}</AppText>
        </Pressable>
      )}
      {!isPaid ? <AppText style={styles.preConfirmation}>このボタンでは、まだ決済は確定しません。</AppText> : null}

      {!isPaid ? (
        <View style={styles.accountNotice}>
          <AppText style={styles.accountNoticeTitle}>購入前のアカウントについて</AppText>
          <AppText style={styles.accountNoticeBody}>{user ? '購入履歴は現在のアカウントに保存され、機種変更後も復元できます。' : '購入履歴の保存・復元のため、決済前にメールアドレスでアカウントを作成します。無料版は登録なしで利用できます。'}</AppText>
        </View>
      ) : null}

      <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void restore()} style={[styles.restore, submitting && styles.disabled]}>
        <AppText style={styles.restoreText}>{submitting ? '購入履歴を確認中…' : user ? '購入を復元する' : '購入済みの方はこちら'}</AppText>
      </Pressable>
      <View style={styles.legalLinks}>
        <Pressable onPress={() => router.push('/legal/terms')}><AppText style={styles.legalText}>利用規約</AppText></Pressable>
        <Pressable onPress={() => router.push('/legal/commerce')}><AppText style={styles.legalText}>特商法表記</AppText></Pressable>
        <Pressable onPress={() => router.push('/legal/faq')}><AppText style={styles.legalText}>FAQ</AppText></Pressable>
      </View>
    </View>
  );

  return (
    <BookScreen contentContainerStyle={[styles.content, desktop && styles.contentDesktop]}>
      <DetailHeader title="完全版" />
      {desktop ? (
        <View style={styles.desktopGrid}>{details}{purchasePanel}</View>
      ) : (
        <View style={styles.mobileStack}>{purchasePanel}{details}</View>
      )}

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
            <AppText style={styles.providerNote}>カード情報はStripeの決済画面で入力します。購入後の返品・返金条件は、利用規約と特商法表記で確認できます。</AppText>
            <View style={styles.confirmationLinks}>
              <Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/terms'); }}><AppText style={styles.legalText}>利用規約</AppText></Pressable>
              <Pressable onPress={() => { setShowCheckoutConfirmation(false); router.push('/legal/commerce'); }}><AppText style={styles.legalText}>特商法表記</AppText></Pressable>
            </View>
            <Pressable disabled={submitting} onPress={() => { setShowCheckoutConfirmation(false); void purchase(); }} style={({ pressed }) => [styles.confirmationButton, pressed && styles.pressed]}>
              <AppText style={styles.confirmationButtonText}>決済画面へ進む</AppText>
            </Pressable>
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
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: 54 },
  contentDesktop: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  desktopGrid: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 28 },
  mobileStack: { width: '100%', gap: 18 },
  details: { width: '100%', paddingHorizontal: 2 },
  detailsDesktop: { flex: 1, minWidth: 0, paddingTop: 10 },
  eyebrow: { color: colors.gold, fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 1.8 },
  productTitle: { marginTop: 5, color: colors.ink, fontSize: 34, lineHeight: 44, fontWeight: '700' },
  lead: { maxWidth: 560, marginTop: 8, color: colors.inkSoft, fontSize: 14, lineHeight: 24 },
  catalogSummary: { marginTop: 18, flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 12 },
  catalogSummaryItem: { flex: 1, alignItems: 'center' },
  catalogSummaryValue: { color: colors.ink, fontSize: 24, lineHeight: 31, fontWeight: '700' },
  catalogSummaryLabel: { marginTop: 1, color: colors.muted, fontSize: 10, lineHeight: 15 },
  comparison: { marginTop: 16, flexDirection: 'row', gap: 8 },
  comparisonColumn: { flex: 1, minHeight: 86, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  comparisonComplete: { borderColor: colors.ink, backgroundColor: colors.ink },
  comparisonLabel: { color: colors.muted, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  comparisonLabelComplete: { color: '#D6C8A7' },
  comparisonMain: { marginTop: 5, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, fontWeight: '700' },
  comparisonMainComplete: { color: colors.surface },
  comparisonDetail: { marginTop: 3, color: colors.muted, fontSize: 10, lineHeight: 15 },
  comparisonDetailComplete: { color: '#D8D1C4' },
  benefitList: { marginTop: 16, borderTopWidth: 1, borderColor: colors.line },
  benefit: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  benefitTitle: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  benefitBody: { marginTop: 3, color: colors.muted, fontSize: 12, lineHeight: 19 },
  purchasePanel: { width: '100%', padding: 18, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface },
  purchasePanelDesktop: { width: 370, flexShrink: 0, marginTop: 10 },
  purchaseLabel: { color: colors.inkSoft, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  priceRow: { marginTop: 6, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  price: { color: colors.ink, fontSize: 47, lineHeight: 53, fontWeight: '700' },
  tax: { marginBottom: 6, color: colors.muted, fontSize: 12, lineHeight: 18 },
  paymentType: { marginTop: 1, color: colors.gold, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  purchaseTerms: { marginTop: 15, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.paper },
  purchaseTermRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderColor: colors.line },
  purchaseTermRowLast: { borderBottomWidth: 0 },
  purchaseTermLabel: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  purchaseTermValue: { flexShrink: 1, color: colors.ink, fontSize: 12, lineHeight: 18, fontWeight: '700', textAlign: 'right' },
  message: { marginTop: 12, padding: 10, borderRadius: radius.sm, backgroundColor: '#F2EDE3', color: colors.inkSoft, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  primary: { minHeight: 56, marginTop: 15, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.surface, fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  preConfirmation: { marginTop: 6, color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  accountNotice: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: colors.line },
  accountNoticeTitle: { color: colors.ink, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  accountNoticeBody: { marginTop: 3, color: colors.muted, fontSize: 11, lineHeight: 18 },
  restore: { minHeight: 42, marginTop: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  restoreText: { color: colors.inkSoft, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  legalLinks: { marginTop: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  legalText: { color: colors.inkSoft, fontSize: 12, lineHeight: 18, textDecorationLine: 'underline' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: 'rgba(20,18,14,0.48)' },
  confirmationCard: { width: '100%', maxWidth: 420, padding: 22, borderRadius: radius.lg, backgroundColor: colors.surface },
  confirmationTitle: { color: colors.ink, fontSize: 22, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  confirmationRows: { marginTop: 14, borderTopWidth: 1, borderColor: colors.line },
  confirmationRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, borderBottomWidth: 1, borderColor: colors.line },
  confirmationLabel: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  confirmationValue: { flexShrink: 1, color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'right' },
  confirmationNotice: { marginTop: 14, padding: 11, borderRadius: radius.sm, backgroundColor: colors.paper, color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  providerNote: { marginTop: 10, color: colors.muted, fontSize: 11, lineHeight: 18 },
  confirmationLinks: { marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 18 },
  confirmationButton: { minHeight: 52, marginTop: 14, borderRadius: radius.md, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  confirmationButtonText: { color: colors.surface, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  cancelButton: { minHeight: 40, marginTop: 4, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.inkSoft, fontSize: 13, lineHeight: 19, textDecorationLine: 'underline' },
  welcomeCard: { width: '100%', maxWidth: 370, padding: 28, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center' },
  welcomeTitle: { color: colors.ink, fontSize: 23, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
  welcomeBody: { marginTop: 13, color: colors.inkSoft, fontSize: 14, lineHeight: 23, textAlign: 'center' },
  welcomeButton: { alignSelf: 'stretch', minHeight: 52, marginTop: 24, borderRadius: radius.md, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  welcomeButtonText: { color: colors.surface, fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
