import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { useAuth } from '@/auth/auth-state';
import { AppText } from '@/components/ui';
import { COMPLETE_EDITION_PRICE_JPY, createCompleteEditionCheckout, formatRemainingAccess } from '@/lib/purchase';
import { colors } from '@/constants/theme';
import { UpgradeLanding } from '@/components/upgrade-landing';

export default function UpgradeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkout?: string; session_id?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { isPaid, accessInfo, accessStatus, refreshAccess, restorePurchase } = useAccess();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [showCheckoutConfirmation, setShowCheckoutConfirmation] = useState(false);
  const checkoutReturnHandled = useRef(false);
  const returnHome = useCallback(() => {
    // Both root entries share the same URL. Explicitly clear the return
    // parameters so the root stops rendering the purchase screen.
    router.setParams({ checkout: undefined, session_id: undefined });
    router.replace('/');
  }, [router]);

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
        returnHome();
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
      if (restored && params.checkout === 'success') {
        returnHome();
        return;
      }
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
    if (authLoading) return;
    if (params.checkout === 'success') {
      if (!user) {
        setMessage('決済を確認しました。決済に使用したメールアドレスでログインすると、完全版を有効にできます。');
        return;
      }
      if (checkoutReturnHandled.current) return;
      checkoutReturnHandled.current = true;
      setMessage('決済を確認しています。完了までこの画面を閉じずにお待ちください。');
      void restorePurchase(params.session_id).then((restored) => {
        if (restored) {
          // Return only after server reconciliation grants active access.
          // Clearing the checkout query also restores the normal home chrome.
          returnHome();
          return;
        }
        setMessage('決済の反映を待っています。しばらくしてから「購入を復元」を押してください。');
      }).catch(() => {
        setMessage('決済の反映を待っています。「購入を復元」を押してください。');
      });
    } else if (params.checkout === 'cancelled') {
      setMessage('購入はキャンセルされました。完全版の利用権は付与されていません。');
    }
  }, [authLoading, params.checkout, params.session_id, restorePurchase, returnHome, user]);

  const primaryLabel = isPaid
    ? '完全版を開く'
    : submitting
      ? '決済画面を開いています…'
      : accessStatus === 'expired'
        ? 'もう一度、完全版を購入する'
        : '完全版を購入する';

  return (
    <View testID="upgrade-single-screen" style={styles.safe}>
      <UpgradeLanding
        isPaid={isPaid}
        price={`¥${COMPLETE_EDITION_PRICE_JPY}`}
        onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        onPurchase={() => isPaid ? router.replace('/(tabs)') : setShowCheckoutConfirmation(true)}
        onTerms={() => router.push('/legal/terms')}
        onCommerce={() => router.push('/legal/commerce')}
        onRestore={() => void restore()}
        purchaseLabel={primaryLabel}
        disabled={submitting || accessStatus === 'processing'}
        message={message || (isPaid ? `完全版を利用中${accessInfo.accessType === 'thirty_day' ? `・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : ''}` : '')}
        statusActions={params.checkout === 'success' && !user && params.session_id ? <Pressable accessibilityRole="button" disabled={submitting} onPress={() => router.push({ pathname: '/auth', params: { intent: 'claim', session_id: params.session_id, mode: 'signin' } })} style={styles.claimButton}><AppText style={styles.claimButtonText}>決済に使ったメールアドレスでログインして完全版を有効にする</AppText></Pressable> : null}
      />

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

    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0, backgroundColor: '#FBF9F4' },
  claimButton: { minHeight: 42, marginBottom: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#B49C68', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  claimButtonText: { color: '#F2E8D1', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  pressed: { opacity: 0.8 },
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
});
