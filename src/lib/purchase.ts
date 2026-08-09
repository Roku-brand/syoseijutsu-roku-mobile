import { Linking, Platform } from 'react-native';
import { supabase } from './supabase';

export const COMPLETE_EDITION_PRODUCT_ID = 'complete-edition';
export const COMPLETE_EDITION_PRICE_JPY = 280;
const ACCESS_CHECK_TIMEOUT_MS = 12_000;

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

export async function fetchVerifiedAccess(): Promise<'guest' | 'free' | 'paid'> {
  if (!supabase) return 'guest';
  const { data: sessionData } = await withTimeout(
    supabase.auth.getSession(),
    ACCESS_CHECK_TIMEOUT_MS,
    'ログイン状態の確認がタイムアウトしました。',
  );
  if (!sessionData.session) return 'guest';
  const { data, error } = await withTimeout(
    supabase.functions.invoke('access', { method: 'GET' }),
    ACCESS_CHECK_TIMEOUT_MS,
    '利用状態の確認がタイムアウトしました。',
  );
  if (error) throw error;
  return data?.access === 'paid' ? 'paid' : 'free';
}

export async function reconcileCompleteEditionPurchase(sessionId?: string): Promise<boolean> {
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
  return data?.restored === true;
}
