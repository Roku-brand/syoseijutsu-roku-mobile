import { fetchProducts, finishTransaction, getAvailablePurchases, initConnection,
  purchaseUpdatedListener, purchaseErrorListener, requestPurchase, restorePurchases, type Purchase } from 'expo-iap';
import { supabase } from './supabase';
import { purchaseTimeout } from './purchase-timeout';

export const appleProductId = process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID ?? '';
let connection: Promise<boolean> | null = null;
const pending = new Map<string, Promise<void>>();
export function connectAppleStore() {
  if (!connection) connection = purchaseTimeout(initConnection()).then(connected => {
    if (!connected) throw new Error('App Storeに接続できません。');
    return connected;
  }).catch(error => { connection = null; throw error; });
  return connection;
}
async function invoke(body: Record<string, unknown>) {
  if (!supabase) throw new Error('購入機能が設定されていません。');
  const { data, error } = await purchaseTimeout(supabase.functions.invoke('apple-purchase', { body }));
  if (error || data?.verified !== true) throw new Error('購入を確認できませんでした。同じアカウントで「購入を復元」をお試しください。');
}
export async function verifyApplePurchase(purchase: Purchase) {
  if (purchase.productId !== appleProductId || purchase.purchaseState !== 'purchased') return;
  const transactionId = purchase.transactionId;
  if (!transactionId) throw new Error('取引番号を確認できません。購入を復元してください。');
  if (pending.has(transactionId)) return pending.get(transactionId);
  const task = (async () => {
    await invoke({ transactionId,
      environment: 'environmentIOS' in purchase ? purchase.environmentIOS : null });
    // Delivery is committed on the server before the StoreKit queue is finished.
    await finishTransaction({ purchase, isConsumable: false });
  })();
  pending.set(transactionId, task);
  try { await task; } finally { pending.delete(transactionId); }
}
export function listenToApplePurchases(onVerified: () => void, onError: (message: string) => void) {
  const updated = purchaseUpdatedListener(purchase => {
    if (purchase.productId !== appleProductId) return;
    if (purchase.purchaseState === 'pending') { onError('購入は承認待ちです。承認後に反映されます。'); return; }
    void verifyApplePurchase(purchase).then(onVerified).catch(error => onError(error.message));
  }, { dedupeTransactionIOS: false });
  const failed = purchaseErrorListener(error => onError(
    String(error.code).includes('cancel') ? '購入をキャンセルしました。' : '購入が完了しませんでした。App Storeの状態を確認してください。',
  ));
  return () => { updated.remove(); failed.remove(); };
}
export async function loadAppleProduct() {
  if (!appleProductId) throw new Error('App Storeの商品が設定されていません。');
  await connectAppleStore();
  const products = await purchaseTimeout(fetchProducts({ skus: [appleProductId], type: 'all' }));
  const product = products?.find(item => item.id === appleProductId);
  if (!product) throw new Error('商品情報を取得できません。通信を確認して再試行してください。');
  return product;
}
export async function buyAppleProduct(userId: string) {
  await connectAppleStore();
  await requestPurchase({ type: 'in-app', request: { apple: {
    sku: appleProductId, appAccountToken: userId,
    andDangerouslyFinishTransactionAutomatically: false,
  } } });
}
export async function restoreApplePurchases() {
  await connectAppleStore();
  await purchaseTimeout(restorePurchases(), 60000);
  const purchases = await purchaseTimeout(getAvailablePurchases({ onlyIncludeActiveItemsIOS: false, alsoPublishToEventListenerIOS: false }));
  for (const purchase of purchases) {
    if (purchase.productId !== appleProductId) continue;
    // Ignore another app account's StoreKit history; never reassign ownership.
    const user = (await supabase?.auth.getSession())?.data.session?.user;
    if ('appAccountToken' in purchase && purchase.appAccountToken?.toLowerCase() !== user?.id.toLowerCase()) continue;
    await verifyApplePurchase(purchase);
  }
  await invoke({ restore: true });
}
