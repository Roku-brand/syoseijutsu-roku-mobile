import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID = 'complete30days';
let currentUser = 'current-user';
let updated;
const calls = [];
let response = { data: { verified: true }, error: null };
globalThis.__appleFixture = {
  getSession: async () => ({ data: { session: currentUser ? { user: { id: currentUser } } : null } }),
  invoke: async (_name, args) => { calls.push(['verify', args.body.transactionId]); return response; },
  initConnection: async () => { calls.push(['connect']); return true; },
  purchaseUpdatedListener: callback => { updated = callback; return { remove() {} }; },
  purchaseErrorListener: () => ({ remove() {} }),
  finishTransaction: async args => { calls.push(['finish', args.purchase.transactionId]); },
  fetchProducts: async () => [{ id: 'complete30days' }],
  requestPurchase: async args => { calls.push(['request', args.request.apple.appAccountToken]); },
  getAvailablePurchases: async () => [foreign, owned],
  restorePurchases: async () => {},
};
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'expo-iap') return { url: 'data:text/javascript,' + encodeURIComponent(
    Object.keys(globalThis.__appleFixture).filter(name => !['getSession', 'invoke'].includes(name))
      .map(name => `export const ${name}=(...args)=>globalThis.__appleFixture.${name}(...args);`).join('')
  ), shortCircuit: true };
  if (specifier === './supabase') return { url: 'data:text/javascript,' + encodeURIComponent(
    'export const supabase={auth:{getSession:globalThis.__appleFixture.getSession},functions:{invoke:globalThis.__appleFixture.invoke}};'
  ), shortCircuit: true };
  if (specifier === './purchase-timeout') return next(new URL('../../src/lib/purchase-timeout.ts', import.meta.url).href, context);
  return next(specifier, context);
} });
const iap = await import('../../src/lib/apple-purchase.ios.ts');
const foreign = { productId: 'complete30days', purchaseState: 'purchased', transactionId: '1', appAccountToken: 'other-user' };
const owned = { ...foreign, transactionId: '2', appAccountToken: 'CURRENT-USER' };
const settle = () => new Promise(resolve => setImmediate(resolve));

test('foreign StoreKit replay never verifies, finishes, or fails the current purchase', async () => {
  calls.length = 0;
  let verified = 0;
  const errors = [];
  const remove = iap.listenToApplePurchases(() => verified++, error => errors.push(error));
  updated(foreign);
  updated({ ...foreign, purchaseState: 'pending' });
  await settle();
  await iap.verifyApplePurchase(foreign);
  assert.deepEqual(calls, []);
  assert.equal(verified, 0);
  assert.deepEqual(errors, []);
  updated(owned);
  await settle();
  assert.deepEqual(calls, [['verify', '2'], ['finish', '2']]);
  assert.equal(verified, 1);
  remove();
});

test('no signed-in account means no replay verification', async () => {
  calls.length = 0;
  currentUser = null;
  await iap.verifyApplePurchase({ ...owned, appAccountToken: undefined });
  assert.deepEqual(calls, []);
  currentUser = 'current-user';
});

test('failed server verification leaves the transaction unfinished and reports ownership', async () => {
  calls.length = 0;
  response = { data: null, error: { context: new Response(JSON.stringify({ error: 'transaction_ownership_conflict' }), { status: 400 }) } };
  await assert.rejects(iap.verifyApplePurchase(owned), /別の処世術禄アカウント/);
  assert.deepEqual(calls, [['verify', '2']]);
  response = { data: { verified: true }, error: null };
});

test('restoration skips foreign history and delivers owned history before finishing', async () => {
  calls.length = 0;
  await iap.restoreApplePurchases();
  assert.deepEqual(calls.filter(call => call[0] !== 'connect'), [['verify', '2'], ['finish', '2'], ['verify', undefined]]);
});

test('simultaneous taps dispatch one purchase with the current account token', async () => {
  calls.length = 0;
  const first = iap.buyAppleProduct('current-user');
  await assert.rejects(iap.buyAppleProduct('current-user'), /前回の購入処理/);
  await first;
  assert.deepEqual(calls.filter(call => call[0] === 'request'), [['request', 'current-user']]);
});
