import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the real Edge handlers with mocked auth and Stripe. No payments or
// network requests are made by this regression check.
function loadFunction(name, { env = {}, user = { id: 'buyer' }, active = false, fetch } = {}) {
  let handler;
  const context = vm.createContext({
    Response, Request, URLSearchParams, console,
    Deno: { env: { get: (key) => env[key] ?? 'test-value' }, serve: (fn) => { handler = fn; } },
    fetch,
    require: (name) => name.includes('supabase-js') ? {
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user }, error: null }) },
        rpc: async () => ({ data: [{ access_status: active ? 'active' : 'none' }], error: null }),
      }),
    } : {
      corsHeaders: {}, json: (body, status = 200) => new Response(JSON.stringify(body), { status }),
      optionsResponse: () => new Response('ok'),
    },
    exports: {},
  });
  const source = fs.readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return { handler, context };
}

async function checkout({ configuredPrice = '', price, user, active } = {}) {
  const calls = [];
  const { handler } = loadFunction('create-checkout', {
    user, active,
    env: { STRIPE_PRICE_ID_30DAY_320: configuredPrice, STRIPE_PRICE_ID_30DAY: 'price_old280' },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify(url.includes('/prices/') ? price : { url: 'https://checkout.stripe.com/test' }));
    },
  });
  return { response: await handler(new Request('https://example.test', { method: 'POST' })), calls };
}

const inline = await checkout();
assert.equal(inline.response.status, 200);
assert.equal(inline.calls.length, 1);
assert.equal(inline.calls[0].options.body.get('line_items[0][price_data][unit_amount]'), '320');
assert.equal(inline.calls[0].options.body.get('line_items[0][price_data][currency]'), 'jpy');
assert.equal(inline.calls[0].options.body.get('mode'), 'payment');
assert.equal(inline.calls[0].options.body.has('line_items[0][price]'), false);
assert.match(inline.calls[0].options.headers['Idempotency-Key'], /-320-buyer-/);
for (const invalid of [
  { active: true, type: 'one_time', currency: 'jpy', unit_amount: 280 },
  { active: true, type: 'recurring', currency: 'jpy', unit_amount: 320 },
  { active: true, type: 'one_time', currency: 'usd', unit_amount: 320 },
]) {
  const result = await checkout({ configuredPrice: 'price_configured', price: invalid });
  assert.equal(result.response.status, 503);
  assert.equal(result.calls.length, 1, 'Invalid prices must never create a session');
}
const configured = await checkout({ configuredPrice: 'price_configured', price: { active: true, type: 'one_time', currency: 'jpy', unit_amount: 320 } });
assert.equal(configured.calls[1].options.body.get('line_items[0][price]'), 'price_configured');
for (const request of [inline.calls[0], configured.calls[1]]) {
  const form = request.options.body;
  assert.equal(form.get('metadata[terms_version]'), '3.4');
  assert.equal(form.get('locale'), 'ja');
  const conditions = form.get('custom_text[submit][message]');
  for (const term of ['完全版アクセス1件', '30×24時間', '一回払い・自動更新なし', '原則直ちに提供', '申込期限なし', '重複決済・未提供・契約不適合・法令上の権利', '/legal/terms', '/legal/commerce', '決済確定前に戻って']) assert.ok(conditions.includes(term), term);
  assert.ok(conditions.length <= 1200);
}
const unauthenticated = await checkout({ user: null });
assert.equal(unauthenticated.response.status, 401);
assert.equal(unauthenticated.calls.length, 0);
const alreadyPaid = await checkout({ active: true });
assert.equal((await alreadyPaid.response.json()).alreadyPaid, true);
assert.equal(alreadyPaid.calls.length, 0);

const { context } = loadFunction('restore-purchase');
for (const amount of [280, 320, 300]) {
  context.payment = { status: 'succeeded', amount_received: amount, currency: 'jpy', metadata: { user_id: 'buyer', product_id: 'complete-edition' }, latest_charge: { paid: true, refunded: false, amount_refunded: 0 } };
  assert.equal(vm.runInContext("isUnrefundedPaymentIntent(payment, 'buyer')", context), amount !== 300);
  assert.equal(vm.runInContext("isUnrefundedPaymentIntent(payment, 'other-account')", context), false);
  context.payment.latest_charge.refunded = true;
  assert.equal(vm.runInContext("isUnrefundedPaymentIntent(payment, 'buyer')", context), false);
  context.payment.latest_charge.refunded = false;
  context.payment.status = 'processing';
  assert.equal(vm.runInContext("isUnrefundedPaymentIntent(payment, 'buyer')", context), false);
}
console.log('Purchase regression passed: 320 JPY one-time checkout, auth, historical receipts, ownership and refunds.');
