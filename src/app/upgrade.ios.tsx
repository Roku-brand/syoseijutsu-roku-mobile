import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { AppText } from '@/components/ui';
import { UpgradeLanding } from '@/components/upgrade-landing';
import { buyAppleProduct, formatApplePurchaseError, listenToApplePurchases, loadAppleProduct, restoreApplePurchases } from '@/lib/apple-purchase.ios';
import { fetchVerifiedAccess, formatAccessDateTime } from '@/lib/purchase';
export default function AppleUpgradeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPaid, accessState, accessInfo, refreshAccess } = useAccess();
  const [storePrice, setStorePrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    if (isPaid || accessState === 'checking') return;
    setMessage('');
    void loadAppleProduct().then((product) => setStorePrice(product.displayPrice)).catch((error) => setMessage(formatApplePurchaseError(error)));
  }, [isPaid, accessState]);

  useEffect(load, [load]);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => { setBusy(false); setMessage('購入結果を確認できていません。購入済みの場合は再購入せず、「購入を復元」をお試しください。'); }, 60000);
    return () => clearTimeout(timer);
  }, [busy]);
  useEffect(() => listenToApplePurchases(() => {
    void refreshAccess()
      .then((state) => {
        if (state === 'paid') router.replace('/(tabs)');
        else setMessage('購入履歴を確認しました。利用期間が終了している場合は再購入できます。');
      })
      .catch((error) => setMessage(formatApplePurchaseError(error)))
      .finally(() => setBusy(false));
  }, (error) => { setMessage(error); setBusy(false); }), [refreshAccess, router]);

  async function purchase() {
    if (!user) { router.push({ pathname: '/auth', params: { intent: 'checkout', mode: 'signup' } }); return; }
    setBusy(true); setMessage('App Storeで購入を確認してください。');
    try {
      const current = await fetchVerifiedAccess();
      if (current.status === 'active') {
        const state = await refreshAccess();
        setBusy(false);
        if (state === 'paid') router.replace('/(tabs)');
        return;
      }
      if (current.status === 'processing') throw new Error('既存の購入を確認中です。通信を確認して購入を復元してください。');
      await buyAppleProduct(user.id);
    } catch (error) { setMessage(formatApplePurchaseError(error)); setBusy(false); }
  }

  async function restore() {
    if (!user) { router.push('/auth'); return; }
    setBusy(true); setMessage('購入を確認しています…');
    try { await restoreApplePurchases(); const state = await refreshAccess(); setMessage(state === 'paid' ? '有効な購入を復元しました。' : '有効な購入がありません。購入時と同じアカウントでログインしてください。'); }
    catch (error) { setMessage(formatApplePurchaseError(error)); }
    finally { setBusy(false); }
  }

  const primaryLabel = isPaid ? '完全版を開く' : busy ? '購入を確認中…' : '完全版を購入する';
  return <View style={styles.safe}><UpgradeLanding
    isPaid={isPaid}
    price={storePrice || '¥320'}
    onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
    onPurchase={() => isPaid ? router.replace('/(tabs)') : void purchase()}
    onRestore={() => void restore()}
    onTerms={() => router.push('/legal/terms')}
    onCommerce={() => router.push('/legal/commerce')}
    purchaseLabel={primaryLabel}
    disabled={busy || (!isPaid && !storePrice)}
    message={message || (isPaid && accessInfo.accessExpiresAt ? '利用期限：' + formatAccessDateTime(accessInfo.accessExpiresAt) : '')}
    statusActions={!storePrice && !isPaid ? <Pressable accessibilityRole="button" disabled={busy} onPress={load} style={styles.reload}><AppText style={styles.reloadText}>商品情報を再読み込み</AppText></Pressable> : undefined}
  /></View>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0 },
  reload: { minHeight: 40, justifyContent: 'center' },
  reloadText: { color: '#E7D9C3', fontSize: 12, lineHeight: 18, textDecorationLine: 'underline' },
});
