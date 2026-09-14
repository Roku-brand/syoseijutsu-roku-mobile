import { AppStoreServerAPIClient, Environment } from 'npm:@apple/app-store-server-library@3.1.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAppleNotification, verifyAppleTransaction } from './apple-jws.ts';

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error('apple_not_configured');
  return value;
}
export function adminClient() {
  return createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'));
}
export async function authenticatedUser(request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) throw new Error('authentication_required');
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) throw new Error('authentication_required');
  return data.user;
}
export type AppleEnvironment = 'Production' | 'Sandbox';

export function normalizeAppleEnvironment(value: unknown): AppleEnvironment | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'production') return 'Production';
  if (normalized === 'sandbox') return 'Sandbox';
  return null;
}

export function appleEnvironmentCandidates(value: unknown): AppleEnvironment[] {
  const hint = normalizeAppleEnvironment(value);
  return hint
    ? [hint, hint === 'Production' ? 'Sandbox' : 'Production']
    : ['Production', 'Sandbox'];
}

function environment(value: AppleEnvironment) {
  if (value === 'Production') return Environment.PRODUCTION;
  if (value === 'Sandbox') return Environment.SANDBOX;
  throw new Error('invalid_environment');
}
function api(value: AppleEnvironment) {
  return new AppStoreServerAPIClient(required('APPLE_IAP_PRIVATE_KEY').replace(/\\n/g, '\n'),
    required('APPLE_IAP_KEY_ID'), required('APPLE_IAP_ISSUER_ID'), required('APPLE_BUNDLE_ID'), environment(value));
}
async function fetchVerifiedTransaction(transactionId: string, environmentHint: unknown) {
  let lastError: unknown = new Error('missing_transaction');
  for (const value of appleEnvironmentCandidates(environmentHint)) {
    try {
      const response = await api(value).getTransactionInfo(transactionId);
      if (!response.signedTransactionInfo) throw new Error('missing_transaction');
      const transaction = verifyAppleTransaction(response.signedTransactionInfo, value,
        required('APPLE_BUNDLE_ID'));
      return { transaction, value };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export async function verifyAndRecord(transactionId: string, environmentHint?: unknown, userId?: string) {
  if (!/^[0-9]{1,32}$/.test(transactionId)) throw new Error('invalid_transaction');
  // StoreKit normally supplies the environment, but interrupted/restored
  // transactions can omit it on some bridge versions. Apple remains the
  // authority: try the hinted endpoint first, then verify the signed JWS on
  // the other endpoint instead of trusting or requiring the client hint.
  const { transaction, value } = await fetchVerifiedTransaction(transactionId, environmentHint);
  if (transaction.transactionId !== transactionId || transaction.productId !== required('APPLE_PRODUCT_ID')
      || transaction.type !== 'Non-Renewing Subscription' || transaction.quantity !== 1
      || !transaction.purchaseDate || !transaction.signedDate || !transaction.originalTransactionId
      || !transaction.appAccountToken) throw new Error('invalid_transaction');
  const owner = transaction.appAccountToken.toLowerCase();
  if (userId && owner !== userId.toLowerCase()) throw new Error('transaction_ownership_conflict');
  if (value === 'Sandbox' && !required('APPLE_SANDBOX_USER_IDS').toLowerCase().split(',').map(v => v.trim()).includes(owner)) {
    throw new Error('sandbox_account_not_allowed');
  }
  const admin = adminClient();
  const { data } = await admin.auth.admin.getUserById(owner);
  // Account deletion must not be undone by a delayed Apple notification.
  if (!data.user) throw new Error('account_deleted');
  const { error } = await admin.rpc('record_apple_transaction', {
    p_environment: value, p_transaction_id: transactionId,
    p_original_transaction_id: transaction.originalTransactionId, p_user_id: owner,
    p_product_id: transaction.productId, p_purchased_at: new Date(transaction.purchaseDate).toISOString(),
    p_revoked_at: transaction.revocationDate ? new Date(transaction.revocationDate).toISOString() : null,
    p_signed_at: new Date(transaction.signedDate).toISOString(),
  });
  if (error) throw new Error('transaction_record_failed');
}
export async function verifyNotification(signedPayload: string) {
  // Environment is not trusted from the unverified payload. Try both complete
  // certificate/bundle/environment verifiers; never skip signature validation.
  const failures: string[] = [];
  for (const value of ['Production', 'Sandbox']) {
    try {
      const decoded = verifyAppleNotification(signedPayload, value as 'Production' | 'Sandbox',
        required('APPLE_BUNDLE_ID'), Number(required('APPLE_APP_ID')));
      const signed = decoded.data?.signedTransactionInfo;
      if (!signed) return { value, transactionId: null };
      const transaction = verifyAppleTransaction(signed, value as 'Production' | 'Sandbox', required('APPLE_BUNDLE_ID'));
      return { value, transactionId: transaction.transactionId ?? null };
    } catch (error) {
      const detail = error as Error & { status?: number; cause?: { code?: string } };
      failures.push(`${value}:${typeof detail?.status === 'number' ? detail.status : 'na'}:${detail?.cause?.code ?? 'na'}`);
    }
  }
  throw new Error(`invalid_notification:${failures.join(',')}`);
}
export async function refreshAppleTransactions(userId: string, force = false) {
  const admin = adminClient();
  let query = admin.from('apple_transactions').select('transaction_id, environment')
    .eq('user_id', userId).gt('expires_at', new Date().toISOString());
  if (!force) query = query.lt('verified_at', new Date(Date.now() - 6 * 3600000).toISOString());
  const { data, error } = await query.limit(100);
  if (error) throw new Error('apple_history_failed');
  for (const row of data ?? []) await verifyAndRecord(row.transaction_id, row.environment, userId);
}
