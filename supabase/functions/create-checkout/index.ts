import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, optionsResponse } from '../_shared/http.ts';

const PRODUCT_ID = 'complete-edition';
const UNIT_AMOUNT = 280;
const ACCESS_TYPE = 'thirty_day';
const CURRENCY = 'jpy';
// Return through the app shell instead of a generated route HTML file. The
// root route is the most reliable GitHub Pages entry point, and forwards the
// checkout query to the in-app upgrade screen after Expo Router has loaded.
const CHECKOUT_RETURN_URL = 'https://shoseijutsuroku.com/';

async function validateConfiguredPrice(secretKey: string, priceId: string) {
  if (!/^price_[A-Za-z0-9]+$/.test(priceId)) return false;
  const response = await fetch(`https://api.stripe.com/v1/prices/${encodeURIComponent(priceId)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!response.ok) return false;
  const price = await response.json();
  return price.active === true
    && price.type === 'one_time'
    && price.currency === CURRENCY
    && price.unit_amount === UNIT_AMOUNT;
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
  if (accessError) return json({ error: 'access_check_failed' }, 500);
  const currentAccess = Array.isArray(accessRows) ? accessRows[0] : accessRows;
  if (currentAccess?.access_status === 'active') {
    return json({ alreadyPaid: true, access: currentAccess });
  }

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', `${CHECKOUT_RETURN_URL}?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set('cancel_url', `${CHECKOUT_RETURN_URL}?checkout=cancelled`);
  form.set('client_reference_id', userData.user.id);
  // The Supabase account email is not required to associate a purchase: the
  // immutable user id below does that. Avoid sending it as `customer_email`,
  // because Stripe can reject an invalid or legacy auth-profile email before
  // Checkout opens. Checkout will collect a valid receipt email itself.
  form.set('metadata[user_id]', userData.user.id);
  form.set('metadata[product_id]', PRODUCT_ID);
  form.set('metadata[access_type]', ACCESS_TYPE);
  form.set('line_items[0][quantity]', '1');
  // Deliberately do not send payment_method_types. Stripe Checkout then uses
  // the account's Dashboard payment-method configuration to show every
  // eligible method for this JPY one-time payment. This keeps card checkout
  // working while PayPay is pending review, and lets PayPay appear after it is
  // enabled in Stripe without a code or deployment change.
  const configuredPriceId = Deno.env.get('STRIPE_PRICE_ID_30DAY');
  if (configuredPriceId) {
    if (!(await validateConfiguredPrice(stripeSecretKey, configuredPriceId))) {
      return json({ error: 'invalid_30day_price_configuration' }, 503);
    }
    form.set('line_items[0][price]', configuredPriceId);
  } else {
    // Safe fallback for the first deployment. Configure STRIPE_PRICE_ID_30DAY
    // to use the dedicated, one-time Stripe Price without changing code.
    form.set('line_items[0][price_data][currency]', CURRENCY);
    form.set('line_items[0][price_data][unit_amount]', String(UNIT_AMOUNT));
    form.set('line_items[0][price_data][product_data][name]', '処世術禄 完全版｜30日間アクセス');
    form.set('line_items[0][price_data][product_data][description]', '購入完了から30日間。自動更新・継続課金なし。');
  }
  form.set('payment_intent_data[metadata][user_id]', userData.user.id);
  form.set('payment_intent_data[metadata][product_id]', PRODUCT_ID);
  form.set('payment_intent_data[metadata][access_type]', ACCESS_TYPE);

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      // Repeated taps and concurrent requests within Stripe's idempotency
      // window resolve to the same Checkout Session.
      'Idempotency-Key': `complete-edition-30day-v1-${userData.user.id}-${currentAccess?.access_expires_at ?? 'first'}`,
    },
    body: form,
  });
  const stripeBody = await stripeResponse.json();
  if (!stripeResponse.ok || !stripeBody.url) {
    console.error('Stripe checkout creation failed', stripeBody);
    return json({ error: 'checkout_creation_failed' }, 502);
  }

  return new Response(JSON.stringify({ url: stripeBody.url }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
});
