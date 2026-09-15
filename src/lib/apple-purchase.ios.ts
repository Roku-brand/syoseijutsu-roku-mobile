import { fetchProducts, finishTransaction, getAvailablePurchases, initConnection,
  purchaseUpdatedListener, purchaseErrorListener, requestPurchase, restorePurchases, type Purchase } from 'expo-iap';
import { supabase } from './supabase';
import { purchaseTimeout } from './purchase-timeout';

export const appleProductId = process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID ?? '';
let connection: Promise<boolean> | null = null;
const pending = new Map<string, Promise<void>>();

type PurchaseSubscriber = {
  onVerified: () => void;
  onError: (message: string) => void;
};

// expo-iap must have its native listeners installed before initConnection().
// Keep one native pair for the whole app and fan events out to screen-level
// subscribers. Registering a pair per screen can make StoreKit deliver the
// same transaction twice and can also race the first purchase request.
const subscribers = new Set<PurchaseSubscriber>();
let nativeListeners: { updated: { remove: () => void }; failed: { remove: () => void } } | null = null;
let purchaseRequest: Promise<unknown> | null = null;

export function formatApplePurchaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/unable to complete request|unexpectedexception/i.test(message)) {
    return 'App Storeで購入を開始できませんでした。App Storeにサインインしていることを確認して、もう一度お試しください。';
  }
  return message || '購入できませんでした。';
}

function notifyVerified() {
  for (const subscriber of subscribers) {
    try { subscriber.onVerified(); } catch { /* UI callbacks must not stop IAP processing. */ }
  }
}

function notifyError(message: string) {
  for (const subscriber of subscribers) {
    try { subscriber.onError(message); } catch { /* UI callbacks must not stop IAP processing. */ }
  }
}

function ensurePurchaseListeners() {
  if (nativeListeners) return;
  const updated = purchaseUpdatedListener(purchase => {
    if (purchase.productId !== appleProductId) return;
    if (purchase.purchaseState === 'pending') {
      notifyError('購入は承認待ちです。承認後に反映されます。');
      return;
    }
    void verifyApplePurchase(purchase).then(notifyVerified).catch(error => notifyError(formatApplePurchaseError(error)));
  }, { dedupeTransactionIOS: false });
  const failed = purchaseErrorListener(error => notifyError(
    String(error.code).includes('cancel')
      ? '購入をキャンセルしました。'
      : '購入が完了しませんでした。App Storeの状態を確認してください。',
  ));
  nativeListeners = { updated, failed };
}

export function connectAppleStore() {
  // Register listeners first. StoreKit can emit restored/pending purchases as
  // soon as the connection is established.
  ensurePurchaseListeners();
  if (!connection) connection = purchaseTimeout(initConnection()).then(connected => {
    if (!connected) throw new Error('App Storeに接続できません。');
    return connected;
  }).catch(error => { connection = null; throw error; });
  return connection;
}
async function invoke(body: Record<string, unknown>) {
  if (!supabase) throw new Error('購入機能が設定されていません。');
  const { data, error } = await purchaseTimeout(supabase.functions.invoke('apple-purchase', { body }));
  const response = error && 'context' in error && error.context instanceof Response
    ? await error.context.clone().json().catch(() => null) : data;
  if (response?.error === 'sandbox_account_not_allowed') throw new Error('このアカウントはTestFlight購入のテスト対象に登録されていません。運営に登録を依頼してください。');
  if (response?.error === 'transaction_ownership_conflict') throw new Error('この購入は別の処世術禄アカウントに紐づいています。購入時のアカウントでログインしてください。');
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
  const subscriber = { onVerified, onError };
  subscribers.add(subscriber);
  ensurePurchaseListeners();
  return () => { subscribers.delete(subscriber); };
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
  if (!appleProductId) throw new Error('App Storeの商品が設定されていません。');
  if (purchaseRequest) throw new Error('前回の購入処理を確認中です。購入済みの場合は「購入を復元」をお試しください。');
  // Acquire the lock before awaiting the connection so two taps during
  // initConnection() cannot both reach StoreKit.requestPurchase().
  purchaseRequest = (async () => {
    await connectAppleStore();
    return requestPurchase({ type: 'in-app', request: { apple: {
      sku: appleProductId,
      quantity: 1,
      appAccountToken: userId,
      andDangerouslyFinishTransactionAutomatically: false,
    } } });
  })();
  try {
    await purchaseRequest;
  } finally {
    purchaseRequest = null;
  }
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
