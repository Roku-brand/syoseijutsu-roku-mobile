import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, optionsResponse } from '../_shared/http.ts';

const PRODUCT_ID = 'complete-edition';
const UNIT_AMOUNT = 280;
// Return through the app shell instead of a generated route HTML file. The
// root route is the most reliable GitHub Pages entry point, and forwards the
// checkout query to the in-app upgrade screen after Expo Router has loaded.
const CHECKOUT_RETURN_URL = 'https://roku-brand.github.io/syoseijutsu-roku-mobile/';

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
  const { data: alreadyPaid } = await admin.rpc('has_complete_edition', {
    target_user_id: userData.user.id,
  });
  if (alreadyPaid) return json({ alreadyPaid: true });

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
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'jpy');
  form.set('line_items[0][price_data][unit_amount]', String(UNIT_AMOUNT));
  form.set('line_items[0][price_data][product_data][name]', '処世術禄 完全版');
  form.set('payment_intent_data[metadata][user_id]', userData.user.id);
  form.set('payment_intent_data[metadata][product_id]', PRODUCT_ID);

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
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
