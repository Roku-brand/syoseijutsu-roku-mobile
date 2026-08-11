import { Linking, Platform } from 'react-native';
import { supabase } from './supabase';

export const COMPLETE_EDITION_PRODUCT_ID = 'complete-edition';
export const COMPLETE_EDITION_PRICE_JPY = 280;
export const COMPLETE_EDITION_ACCESS_DAYS = 30;
const ACCESS_CHECK_TIMEOUT_MS = 12_000;

export type AccessStatus = 'free' | 'active' | 'expired' | 'processing';
export type AccessType = 'legacy_lifetime' | 'thirty_day' | null;
export type VerifiedAccess = {
  status: AccessStatus;
  accessType: AccessType;
  accessStartedAt: string | null;
  accessExpiresAt: string | null;
  purchasedAt: string | null;
  purchaseAmount: number | null;
  purchaseCurrency: string | null;
  serverNow: string | null;
};

export const FREE_ACCESS: VerifiedAccess = {
  status: 'free', accessType: null, accessStartedAt: null, accessExpiresAt: null,
  purchasedAt: null, purchaseAmount: null, purchaseCurrency: null, serverNow: null,
};

function normalizeAccess(data: Record<string, unknown> | null | undefined): VerifiedAccess {
  const rawStatus = data?.access;
  const status: AccessStatus = rawStatus === 'active' || rawStatus === 'expired' || rawStatus === 'processing'
    ? rawStatus
    : 'free';
  return {
    status,
    accessType: data?.accessType === 'legacy_lifetime' || data?.accessType === 'thirty_day' ? data.accessType : null,
    accessStartedAt: typeof data?.accessStartedAt === 'string' ? data.accessStartedAt : null,
    accessExpiresAt: typeof data?.accessExpiresAt === 'string' ? data.accessExpiresAt : null,
    purchasedAt: typeof data?.purchasedAt === 'string' ? data.purchasedAt : null,
    purchaseAmount: typeof data?.purchaseAmount === 'number' ? data.purchaseAmount : null,
    purchaseCurrency: typeof data?.purchaseCurrency === 'string' ? data.purchaseCurrency : null,
    serverNow: typeof data?.serverNow === 'string' ? data.serverNow : null,
  };
}

export function isPremiumActive(access: VerifiedAccess) {
  return access.status === 'active';
}

export function getRemainingAccessTime(expiresAt: string | null, now = new Date()) {
  if (!expiresAt) return null;
  const milliseconds = new Date(expiresAt).getTime() - now.getTime();
  return {
    milliseconds,
    days: Math.max(0, Math.ceil(milliseconds / 86_400_000)),
    hours: Math.max(0, Math.ceil(milliseconds / 3_600_000)),
  };
}

export function formatRemainingAccess(expiresAt: string | null, now = new Date()) {
  const remaining = getRemainingAccessTime(expiresAt, now);
  if (!remaining || remaining.milliseconds <= 0) return '利用期間終了';
  if (remaining.milliseconds < 6 * 3_600_000) return '本日終了';
  if (remaining.milliseconds < 24 * 3_600_000) return `残り${remaining.hours}時間`;
  return `残り${remaining.days}日`;
}

export function getAccessExpiryNotice(expiresAt: string | null, now = new Date()) {
  const remaining = getRemainingAccessTime(expiresAt, now);
  if (!remaining || remaining.milliseconds <= 0) return null;
  if (remaining.milliseconds <= 24 * 3_600_000) return '完全版は24時間以内に終了します';
  if (remaining.days <= 3) return `完全版はあと${remaining.days}日で終了します`;
  if (remaining.days <= 7) return `完全版はあと${remaining.days}日利用できます`;
  return null;
}

export function formatAccessDateTime(value: string | null, includeTime = true) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(new Date(value));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timeout); resolve(value); },
      (error) => { clearTimeout(timeout); reject(error); },
    );
  });
}

/**
 * Uses the access token returned by signup immediately, so Checkout does not
 * depend on browser session storage or React auth state finishing an update.
 */
export async function createCompleteEditionCheckout(accessToken?: string) {
  if (!supabase) throw new Error('購入機能が設定されていません。');
  const token = accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('購入するにはログインしてください。');

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { productId: COMPLETE_EDITION_PRODUCT_ID },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw new Error(error.message || '購入画面を開けませんでした。');
  if (data?.alreadyPaid) return { alreadyPaid: true as const };
  if (!data?.url) throw new Error('購入URLを取得できませんでした。');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(data.url);
  } else {
    await Linking.openURL(data.url);
  }
  return { alreadyPaid: false as const };
}

export async function fetchVerifiedAccess(): Promise<VerifiedAccess> {
  if (!supabase) return FREE_ACCESS;
  const { data: sessionData } = await withTimeout(
    supabase.auth.getSession(),
    ACCESS_CHECK_TIMEOUT_MS,
    'ログイン状態の確認がタイムアウトしました。',
  );
  if (!sessionData.session) return FREE_ACCESS;
  const { data, error } = await withTimeout(
    supabase.functions.invoke('access', { method: 'GET' }),
    ACCESS_CHECK_TIMEOUT_MS,
    '利用状態の確認がタイムアウトしました。',
  );
  if (error) throw error;
  return normalizeAccess(data);
}

export async function reconcileCompleteEditionPurchase(sessionId?: string): Promise<VerifiedAccess | null> {
  if (!supabase) throw new Error('購入機能が設定されていません。');
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('購入に使用したアカウントでログインしてください。');
  const { data, error } = await withTimeout(
    supabase.functions.invoke('restore-purchase', {
      body: sessionId ? { sessionId } : {},
      headers: { Authorization: `Bearer ${token}` },
    }),
    ACCESS_CHECK_TIMEOUT_MS,
    '購入履歴の確認がタイムアウトしました。',
  );
  if (error) throw new Error(error.message || '購入履歴を確認できませんでした。');
  if (data?.restored !== true) return data?.access ? normalizeAccess({
    access: data.access.access_status,
    accessType: data.access.access_type,
    accessStartedAt: data.access.access_started_at,
    accessExpiresAt: data.access.access_expires_at,
    purchasedAt: data.access.purchased_at,
    purchaseAmount: data.access.purchase_amount,
    purchaseCurrency: data.access.purchase_currency,
    serverNow: data.access.server_now,
  }) : null;
  return data?.access ? normalizeAccess({
    access: data.access.access_status,
    accessType: data.access.access_type,
    accessStartedAt: data.access.access_started_at,
    accessExpiresAt: data.access.access_expires_at,
    purchasedAt: data.access.purchased_at,
    purchaseAmount: data.access.purchase_amount,
    purchaseCurrency: data.access.purchase_currency,
    serverNow: data.access.server_now,
  }) : await fetchVerifiedAccess();
}
