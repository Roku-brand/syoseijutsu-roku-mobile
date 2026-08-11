import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json, optionsResponse } from '../_shared/http.ts';

const PRODUCT_ID = 'complete-edition';
const UNIT_AMOUNT = 280;
const CURRENCY = 'jpy';

type StripePayment = {
  id?: string;
  status?: string;
  payment_status?: string;
  amount?: number;
  amount_received?: number;
  amount_total?: number;
  currency?: string;
  created?: number;
  client_reference_id?: string | null;
  payment_intent?: string | null;
  latest_charge?: string | {
    created?: number;
    paid?: boolean;
    refunded?: boolean;
    amount_refunded?: number;
  } | null;
  metadata?: Record<string, string>;
};

function isMatchingPayment(payment: StripePayment, userId: string) {
  const linkedUserId = payment.metadata?.user_id ?? payment.client_reference_id;
  const amount = payment.amount_received ?? payment.amount_total ?? payment.amount;
  const paid = payment.status === 'succeeded' || payment.payment_status === 'paid';
  return linkedUserId === userId
    && payment.metadata?.product_id === PRODUCT_ID
    && paid
    && amount === UNIT_AMOUNT
    && payment.currency === CURRENCY;
}

function isUnrefundedPaymentIntent(payment: StripePayment, userId: string) {
  const charge = typeof payment.latest_charge === 'object' ? payment.latest_charge : null;
  return isMatchingPayment(payment, userId)
    && charge?.paid === true
    && charge.refunded !== true
    && (charge.amount_refunded ?? 0) === 0;
}

async function retrieveCheckoutSession(secretKey: string, sessionId: string) {
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return null;
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('stripe_session_lookup_failed');
  return await response.json() as StripePayment;
}

async function retrievePaymentIntent(secretKey: string, paymentIntentId: string) {
  if (!/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) return null;
  const params = new URLSearchParams({ 'expand[]': 'latest_charge' });
  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(paymentIntentId)}?${params}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('stripe_payment_lookup_failed');
  return await response.json() as StripePayment;
}

async function searchPaymentIntents(secretKey: string, userId: string) {
  const params = new URLSearchParams({
    query: `status:'succeeded' AND metadata['user_id']:'${userId}' AND metadata['product_id']:'${PRODUCT_ID}'`,
    limit: '10',
  });
  const response = await fetch(`https://api.stripe.com/v1/payment_intents/search?${params}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) throw new Error('stripe_payment_search_failed');
  const body = await response.json() as { data?: StripePayment[] };
  return body.data ?? [];
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !stripeSecretKey) {
    return json({ error: 'server_not_configured' }, 503);
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData.user) return json({ error: 'authentication_required' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: accessRows, error: accessError } = await admin.rpc('get_complete_edition_access', {
    target_user_id: userData.user.id,
  });
  if (accessError) return json({ error: 'entitlement_lookup_failed' }, 500);
  const existingAccess = Array.isArray(accessRows) ? accessRows[0] : accessRows;
  if (existingAccess?.access_status === 'active') {
    return json({ restored: true, source: 'entitlement', access: existingAccess });
  }

  let requestedSessionId = '';
  try {
    const body = await request.json();
    requestedSessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  } catch {
    // A session id is optional. Manual restoration falls back to a metadata search.
  }

  try {
    const session = requestedSessionId
      ? await retrieveCheckoutSession(stripeSecretKey, requestedSessionId)
      : null;
    if (session && !isMatchingPayment(session, userData.user.id)) return json({ restored: false });
    const candidates = session ? [] : await searchPaymentIntents(stripeSecretKey, userData.user.id);
    const candidate = session ?? candidates.find((item) => isMatchingPayment(item, userData.user.id));
    const paymentIntentId = session?.payment_intent ?? candidate?.id;
    const payment = paymentIntentId
      ? await retrievePaymentIntent(stripeSecretKey, paymentIntentId)
      : null;
    if (!payment?.id || !isUnrefundedPaymentIntent(payment, userData.user.id)) return json({ restored: false });

    const charge = typeof payment.latest_charge === 'object' ? payment.latest_charge : null;
    const accessType = payment.metadata?.access_type === 'thirty_day' ? 'thirty_day' : 'legacy_lifetime';
    const completedAt = new Date((charge?.created ?? payment.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
    const { error: entitlementError } = await admin.rpc('grant_complete_edition_access', {
      target_user_id: userData.user.id,
      target_access_type: accessType,
      target_customer_id: null,
      target_checkout_session_id: session?.id ?? null,
      target_payment_id: payment.id,
      target_amount: payment.amount_received ?? payment.amount_total ?? payment.amount,
      target_currency: payment.currency,
      target_completed_at: completedAt,
    });
    if (entitlementError) return json({ error: 'entitlement_write_failed' }, 500);
    const { data: refreshedRows, error: refreshedError } = await admin.rpc('get_complete_edition_access', {
      target_user_id: userData.user.id,
    });
    if (refreshedError) return json({ error: 'entitlement_lookup_failed' }, 500);
    const refreshedAccess = Array.isArray(refreshedRows) ? refreshedRows[0] : refreshedRows;
    return json({
      restored: refreshedAccess?.access_status === 'active',
      source: session ? 'checkout_session' : 'payment_intent',
      access: refreshedAccess,
    });
  } catch (error) {
    console.error('Purchase restoration failed', error);
    return json({ error: 'purchase_restore_failed' }, 502);
  }
});
