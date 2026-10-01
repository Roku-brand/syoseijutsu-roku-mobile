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

function base64Url(value: string | Uint8Array) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function pemBytes(value: string) {
  const encoded = value.replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  if (!encoded) throw new Error('apple_not_configured');
  return Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
}

async function authorizationToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({
    alg: 'ES256',
    kid: required('APPLE_IAP_KEY_ID'),
    typ: 'JWT',
  }));
  const payload = base64Url(JSON.stringify({
    iss: required('APPLE_IAP_ISSUER_ID'),
    iat: now,
    exp: now + 300,
    aud: 'appstoreconnect-v1',
    bid: required('APPLE_BUNDLE_ID'),
  }));
  const signingInput = `${header}.${payload}`;
  // The official Node library rejects Deno's standards-compliant P-256 key
  // metadata because Deno names the curve "P-256" instead of OpenSSL's
  // alias "prime256v1". Sign the same Apple JWT with Web Crypto so the key
  // never leaves the Edge Function and no curve-name alias is involved.
  const key = await crypto.subtle.importKey('pkcs8', pemBytes(required('APPLE_IAP_PRIVATE_KEY')),
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput),
  ));
  return `${signingInput}.${base64Url(signature)}`;
}

class AppleApiError extends Error {
  constructor(public httpStatusCode: number, public apiError: number | null) {
    super(`apple_api_error_${httpStatusCode}${apiError === null ? '' : `_${apiError}`}`);
    this.name = 'AppleApiError';
  }
}

async function transactionInfo(transactionId: string, value: AppleEnvironment) {
  const host = value === 'Sandbox' ? 'api.storekit-sandbox.apple.com' : 'api.storekit.apple.com';
  const response = await fetch(`https://${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${await authorizationToken()}`,
    },
  });
  const body = await response.json().catch(() => ({})) as {
    signedTransactionInfo?: unknown;
    errorCode?: unknown;
  };
  if (!response.ok) {
    throw new AppleApiError(response.status, typeof body.errorCode === 'number' ? body.errorCode : null);
  }
  if (typeof body.signedTransactionInfo !== 'string') throw new Error('missing_transaction');
  return body.signedTransactionInfo;
}
async function fetchVerifiedTransaction(transactionId: string, environmentHint: unknown) {
  let lastError: unknown = new Error('missing_transaction');
  for (const value of appleEnvironmentCandidates(environmentHint)) {
    try {
      const signedTransactionInfo = await transactionInfo(transactionId, value);
      const transaction = verifyAppleTransaction(signedTransactionInfo, value,
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
  // Sandbox purchases are already constrained by Apple's signed transaction
  // and the authenticated appAccountToken above. Do not require a manually
  // maintained allowlist: app users may create accounts freely, and requiring
  // their UUID here makes every new TestFlight tester fail until an operator
  // edits a production secret. If an allowlist is configured, retain it as an
  // optional extra restriction for private test cohorts.
  const sandboxUserIds = Deno.env.get('APPLE_SANDBOX_USER_IDS')
    ?.toLowerCase().split(',').map(v => v.trim()).filter(Boolean) ?? [];
  if (value === 'Sandbox' && sandboxUserIds.length > 0 && !sandboxUserIds.includes(owner)) {
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
