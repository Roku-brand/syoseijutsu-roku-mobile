import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json } from '../_shared/http.ts';

const encoder = new TextEncoder();
const SUCCESSFUL_CHECKOUT_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
]);
const FAILED_ASYNC_CHECKOUT_EVENT = 'checkout.session.async_payment_failed';

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));
  const expected = hex(digest);
  return signatures.some((signature) => safeEqual(signature, expected));
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) return json({ error: 'server_not_configured' }, 503);

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';
  if (!(await verifyStripeSignature(payload, signature, webhookSecret))) {
    return json({ error: 'invalid_signature' }, 400);
  }

  const event = JSON.parse(payload);
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: existingEvent, error: existingError } = await admin.from('payment_events')
    .select('event_id')
    .eq('provider', 'stripe')
    .eq('event_id', event.id)
    .maybeSingle();
  if (existingError) return json({ error: 'event_lookup_failed' }, 500);
  if (existingEvent) return json({ received: true, duplicate: true });

  // Apply the entitlement first. Recording the event only after the side effect
  // succeeds ensures Stripe retries transient database failures safely. Both
  // card and redirect methods such as PayPay reach this method-independent
  // path only after Stripe reports the Checkout Session as paid.
  if (SUCCESSFUL_CHECKOUT_EVENTS.has(event.type)) {
    const session = event.data.object;
    const userId = session.metadata?.user_id ?? session.client_reference_id;
    const productId = session.metadata?.product_id;
    const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : null;
    const accessType = session.metadata?.access_type === 'thirty_day' ? 'thirty_day' : 'legacy_lifetime';
    if (userId && productId === 'complete-edition' && paymentIntentId && session.payment_status === 'paid') {
      const { error } = await admin.rpc('grant_complete_edition_access', {
        target_user_id: userId,
        target_access_type: accessType,
        target_customer_id: typeof session.customer === 'string' ? session.customer : null,
        target_checkout_session_id: session.id,
        target_payment_id: paymentIntentId,
        target_amount: session.amount_total,
        target_currency: session.currency,
        // The Stripe event timestamp records when Stripe confirmed the
        // completion event; the browser or device clock is never trusted.
        target_completed_at: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      });
      if (error) return json({ error: 'entitlement_write_failed' }, 500);
    }
  }

  // A failed asynchronous method must never grant access. Keep a verified
  // event record for support/auditing, while leaving the existing entitlement
  // untouched so the customer can retry Checkout safely.
  if (event.type === FAILED_ASYNC_CHECKOUT_EVENT) {
    console.info('Stripe asynchronous Checkout payment failed', { eventId: event.id });
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
    if (paymentIntent) {
      const { error } = await admin.rpc('refund_complete_edition_purchase', {
        target_payment_id: paymentIntent,
      });
      if (error) return json({ error: 'refund_entitlement_write_failed' }, 500);
    }
  }

  const { error: eventError } = await admin.from('payment_events').insert({
    provider: 'stripe',
    event_id: event.id,
    event_type: event.type,
    payload: event,
  });
  if (eventError?.code === '23505') return json({ received: true, duplicate: true });
  if (eventError) return json({ error: 'event_record_failed' }, 500);

  return json({ received: true });
});
