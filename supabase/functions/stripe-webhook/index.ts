import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json } from '../_shared/http.ts';

const encoder = new TextEncoder();

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

  const { error: eventError } = await admin.from('payment_events').insert({
    provider: 'stripe',
    event_id: event.id,
    event_type: event.type,
    payload: event,
  });
  if (eventError?.code === '23505') return json({ received: true, duplicate: true });
  if (eventError) return json({ error: 'event_record_failed' }, 500);

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object;
    const userId = session.metadata?.user_id ?? session.client_reference_id;
    const productId = session.metadata?.product_id;
    if (userId && productId === 'complete-edition' && session.payment_status === 'paid') {
      const { error } = await admin.from('entitlements').upsert({
        user_id: userId,
        product_id: productId,
        status: 'active',
        provider: 'stripe',
        provider_customer_id: typeof session.customer === 'string' ? session.customer : null,
        provider_payment_id: typeof session.payment_intent === 'string' ? session.payment_intent : session.id,
        purchased_at: new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_id' });
      if (error) return json({ error: 'entitlement_write_failed' }, 500);
    }
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const paymentIntent = typeof charge.payment_intent === 'string' ? charge.payment_intent : null;
    if (paymentIntent) {
      await admin.from('entitlements')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('provider', 'stripe')
        .eq('provider_payment_id', paymentIntent);
    }
  }

  return json({ received: true });
});
