import { fetchProducts, finishTransaction, getAvailablePurchases, initConnection,
  purchaseUpdatedListener, purchaseErrorListener, requestPurchase, restorePurchases, type Purchase } from 'expo-iap';
import { supabase } from './supabase';
import { purchaseTimeout } from './purchase-timeout';
import { appleCompleteProductId, isCompleteAppleProduct } from '../../supabase/functions/_shared/apple-products';

export const appleProductId = appleCompleteProductId;
let connection: Promise<boolean> | null = null;
const pending = new Map<string, Promise<boolean>>();
export const APPLE_COMPLETE_EDITION_PRICE_JPY = 320;
export const APPLE_COMPLETE_EDITION_PRICE_LABEL = `${APPLE_COMPLETE_EDITION_PRICE_JPY}円`;

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
let purchaseInProgress = false;
const delivered = new Set<string>();
const ownershipMessage = 'この購入は別の処世術禄アカウントに紐づいています。購入時のアカウントでログインしてください。';

export function formatApplePurchaseError(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code).toLowerCase() : '';
  const message = error instanceof Error ? error.message
    : error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error ?? '');
  if (code.includes('cancel')) return '購入をキャンセルしました。';
  if (code === 'pending' || code === 'deferred-payment') return '購入は承認待ちです。承認後に反映されます。';
  if (code === 'network-error' || code === 'service-disconnected') return 'App Storeとの通信に失敗しました。通信を確認して、もう一度お試しください。';
  if (code === 'already-owned' || code === 'duplicate-purchase') return '購入済みの可能性があります。再購入せず、「購入を復元」をお試しください。';
  if (code === 'item-unavailable' || code === 'sku-not-found') return 'App Storeで商品を購入できません。時間をおいてもう一度お試しください。';
  if (code === 'purchase-error' || code === 'unknown' || /unable to complete request|unexpectedexception/i.test(message)) {
    // A generic native exception does not establish that the user is signed out.
    return 'App Storeから購入結果を取得できませんでした。購入済みの場合は再購入せず、「購入を復元」をお試しください。';
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

async function matchingAppAccount(purchase: Purchase) {
  // StoreKit replays unfinished transactions whenever the connection opens.
  // A transaction belongs to the app account selected when its purchase was
  // initiated, not necessarily the account currently shown on screen. Do not
  // turn that replay into a misleading failure of a new purchase attempt.
  const userId = (await supabase?.auth.getSession())?.data.session?.user?.id;
  if (!userId) return null;
  if (!('appAccountToken' in purchase) || !purchase.appAccountToken) return userId;
  return userId.toLowerCase() === purchase.appAccountToken.toLowerCase() ? userId : null;
}

async function deliverPurchase(purchase: Purchase, requested = false) {
  if (!isCompleteAppleProduct(purchase.productId)) return false;
  const account = await matchingAppAccount(purchase);
  // Ignore background replays for other accounts. A mismatched result of the
  // current request must give a concrete recovery message instead of timing out.
  if (!account) {
    if (requested) throw new Error(ownershipMessage);
    return false;
  }
  if (purchase.purchaseState === 'pending') {
    notifyError('購入は承認待ちです。承認後に反映されます。');
    return false;
  }
  if (purchase.purchaseState !== 'purchased') return false;
  const key = `${account.toLowerCase()}:${purchase.transactionId}`;
  if (delivered.has(key)) return true;
  if (!await verifyApplePurchase(purchase)) return false;
  // Concurrent promise/event results share verification. Notify once after
  // that shared work completes, including when a late event arrives afterwards.
  if (!delivered.has(key)) {
    delivered.add(key);
    if (delivered.size > 128) delivered.delete(delivered.values().next().value!);
    notifyVerified();
  }
  return true;
}

function ensurePurchaseListeners() {
  if (nativeListeners) return;
  const updated = purchaseUpdatedListener(purchase => {
    void deliverPurchase(purchase).catch(error => notifyError(formatApplePurchaseError(error)));
  }, { dedupeTransactionIOS: false });
  const failed = purchaseErrorListener(error => notifyError(formatApplePurchaseError(error)));
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
  if (response?.error === 'transaction_ownership_conflict') throw new Error(ownershipMessage);
  if (error || data?.verified !== true) throw new Error('購入を確認できませんでした。同じアカウントで「購入を復元」をお試しください。');
}
export async function verifyApplePurchase(purchase: Purchase) {
  if (!isCompleteAppleProduct(purchase.productId) || purchase.purchaseState !== 'purchased') return false;
  const account = await matchingAppAccount(purchase);
  if (!account) return false;
  const transactionId = purchase.transactionId;
  if (!transactionId) throw new Error('取引番号を確認できません。購入を復元してください。');
  const key = `${account.toLowerCase()}:${transactionId}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const task = (async () => {
    await invoke({ transactionId,
      environment: 'environmentIOS' in purchase ? purchase.environmentIOS : null });
    // Delivery is committed on the server before the StoreKit queue is finished.
    await finishTransaction({ purchase, isConsumable: false });
    return true;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
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
  if (purchaseInProgress) throw new Error('前回の購入処理を確認中です。購入済みの場合は「購入を復元」をお試しください。');
  // Acquire the lock before awaiting the connection so two taps during
  // initConnection() cannot both reach StoreKit.requestPurchase().
  purchaseInProgress = true;
  try {
    // Fetch again before purchasing: failed product loading must be retryable.
    await loadAppleProduct();
    const result = await requestPurchase({ type: 'in-app', request: { apple: {
      sku: appleProductId,
      quantity: 1,
      appAccountToken: userId,
      andDangerouslyFinishTransactionAutomatically: false,
    } } });
    // expo-iap can deliver via its listener, its promise, or both. Process the
    // returned transaction too, with shared deduplication and server validation.
    let verified = false;
    for (const purchase of Array.isArray(result) ? result : result ? [result] : []) {
      verified = await deliverPurchase(purchase, true) || verified;
    }
    return verified;
  } finally {
    purchaseInProgress = false;
  }
}
export async function restoreApplePurchases() {
  await connectAppleStore();
  await purchaseTimeout(restorePurchases(), 60000);
  const purchases = await purchaseTimeout(getAvailablePurchases({ onlyIncludeActiveItemsIOS: false, alsoPublishToEventListenerIOS: false }));
  for (const purchase of purchases) {
    if (!isCompleteAppleProduct(purchase.productId)) continue;
    // Ignore another app account's StoreKit history; never reassign ownership.
    await verifyApplePurchase(purchase);
  }
  await invoke({ restore: true });
}
