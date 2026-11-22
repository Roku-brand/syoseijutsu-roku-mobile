import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase';

export type SyncAccount = { id: string; token: string; expiresAt?: number };

export async function personalSyncRpc(account: SyncAccount, rpc: 'sync_personal_records' | 'clear_personal_records' | 'personal_record_recovery' | 'accept_personal_sync_notice' | 'personal_record_sync_epoch', args: object, signal: AbortSignal): Promise<unknown> {
  if (!supabaseUrl || !supabasePublishableKey || (account.expiresAt && account.expiresAt <= Date.now() / 1000)) {
    throw new Error('ログイン状態を確認してください。');
  }
  const response = await fetch(supabaseUrl + '/rest/v1/rpc/' + rpc, {
    method: 'POST',
    headers: {
      apikey: supabasePublishableKey,
      Authorization: 'Bearer ' + account.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...args, p_user: account.id }),
    signal,
  });
  if (!response.ok) throw new Error('通信またはログイン状態を確認して、もう一度お試しください。');
  return response.json();
}
