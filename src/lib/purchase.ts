import { Linking, Platform } from 'react-native';
import { supabase } from './supabase';

export const COMPLETE_EDITION_PRODUCT_ID = 'complete-edition';
export const COMPLETE_EDITION_PRICE_JPY = 280;

export async function createCompleteEditionCheckout() {
  if (!supabase) throw new Error('購入機能が設定されていません。');
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('購入するにはログインしてください。');

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { productId: COMPLETE_EDITION_PRODUCT_ID },
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
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return 'guest';
  const { data, error } = await supabase.functions.invoke('access', { method: 'GET' });
  if (error) throw error;
  return data?.access === 'paid' ? 'paid' : 'free';
}
