import { supabase } from './supabase';
export async function acceptNativeAuthCallback(value: string) {
  if (!supabase) return;
  const url = new URL(value);
  if (url.protocol !== 'shoseijutsuroku:' || url.hostname !== 'auth') return;
  const fragment = new URLSearchParams(url.hash.slice(1));
  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } else {
    const access_token = fragment.get('access_token');
    const refresh_token = fragment.get('refresh_token');
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
    }
  }
}
