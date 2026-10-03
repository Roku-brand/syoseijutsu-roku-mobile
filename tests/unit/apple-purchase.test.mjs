import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const productId = 'com.shoseijutsuroku.premium.30days.v2';
process.env.EXPO_PUBLIC_APPLE_PRODUCT_ID = productId;
let currentUser = 'current-user';
let updated;
let failed;
let purchaseResult;
let onRequest;
let productError;
let requestError;
let finishError;
let restoreError;
let accessStatus = 'free';
const calls = [];
let response = { data: { verified: true }, error: null };
globalThis.__appleFixture = {
  getSession: async () => ({ data: { session: currentUser ? { user: { id: currentUser } } : null } }),
  invoke: async (_name, args) => { calls.push(['verify', args.body.transactionId]); return response; },
  initConnection: async () => { calls.push(['connect']); return true; },
  purchaseUpdatedListener: callback => { updated = callback; return { remove() {} }; },
  purchaseErrorListener: callback => { failed = callback; return { remove() {} }; },
  finishTransaction: async args => { calls.push(['finish', args.purchase.transactionId]); if (finishError) throw finishError; },
  fetchProducts: async args => { assert.deepEqual(args.skus, [productId]); if (productError) throw productError; return [{ id: productId }]; },
  requestPurchase: async args => {
    assert.equal(args.request.apple.sku, productId);
    calls.push(['request', args.request.apple.appAccountToken]);
    if (requestError) throw requestError;
    await onRequest?.();
    return purchaseResult;
  },
  getAvailablePurchases: async () => { calls.push(['history']); return [foreign, owned]; },
  restorePurchases: async () => { calls.push(['restore-store']); if (restoreError) throw restoreError; },
  fetchVerifiedAccess: async () => { calls.push(['access']); return { status: accessStatus }; },
};
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'expo-iap') return { url: 'data:text/javascript,' + encodeURIComponent(
    Object.keys(globalThis.__appleFixture).filter(name => !['getSession', 'invoke', 'fetchVerifiedAccess'].includes(name))
      .map(name => `export const ${name}=(...args)=>globalThis.__appleFixture.${name}(...args);`).join('')
  ), shortCircuit: true };
  if (specifier === './supabase') return { url: 'data:text/javascript,' + encodeURIComponent(
    'export const supabase={auth:{getSession:globalThis.__appleFixture.getSession},functions:{invoke:globalThis.__appleFixture.invoke}};'
  ), shortCircuit: true };
  if (specifier === './purchase-timeout') return next(new URL('../../src/lib/purchase-timeout.ts', import.meta.url).href, context);
  if (specifier === './purchase') return { url: 'data:text/javascript,' + encodeURIComponent(
    'export const fetchVerifiedAccess=(...args)=>globalThis.__appleFixture.fetchVerifiedAccess(...args);'
  ), shortCircuit: true };
  if (specifier === '../../supabase/functions/_shared/apple-products') return next(new URL('../../supabase/functions/_shared/apple-products.ts', import.meta.url).href, context);
  return next(specifier, context);
} });
const iap = await import('../../src/lib/apple-purchase.ios.ts');
const foreign = { productId, purchaseState: 'purchased', transactionId: '1', appAccountToken: 'other-user' };
const owned = { ...foreign, transactionId: '2', appAccountToken: 'CURRENT-USER' };
const settle = () => new Promise(resolve => setImmediate(resolve));

test('new purchases use the submitted v2 product', () => {
  assert.equal(iap.appleProductId, productId);
});

test('legacy purchases remain verifiable, but the mistaken non-consumable is ignored', async () => {
  calls.length = 0;
  await iap.verifyApplePurchase({ ...owned, productId: 'jp.shoseijutsuroku.app.complete30days', transactionId: 'legacy-restore' });
  assert.deepEqual(calls, [['verify', 'legacy-restore'], ['finish', 'legacy-restore']]);
  calls.length = 0;
  for (const invalid of ['com.shoseijutsuroku.premium.30days', 'unrelated.sku']) {
    assert.equal(await iap.verifyApplePurchase({ ...owned, productId: invalid }), false);
  }
  assert.deepEqual(calls, []);
});

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
  assert.deepEqual(calls.filter(call => call[0] !== 'connect'), [
    ['verify', undefined], ['access'], ['restore-store'], ['history'], ['verify', '2'], ['finish', '2'],
  ]);
});

test('a server-verified active subscription restores even if device StoreKit restoration would fail', async () => {
  calls.length = 0;
  accessStatus = 'active';
  restoreError = new Error('UnexpectedException: Unable to Complete Request');
  try {
    await iap.restoreApplePurchases();
    assert.deepEqual(calls, [['verify', undefined], ['access']]);
  } finally {
    accessStatus = 'free';
    restoreError = undefined;
  }
});

test('restoration never trusts existing access when server Apple verification fails', async () => {
  calls.length = 0;
  accessStatus = 'active';
  response = { data: { verified: false }, error: null };
  try {
    await assert.rejects(iap.restoreApplePurchases(), /購入を確認できませんでした/);
    assert.deepEqual(calls, [['verify', undefined]]);
  } finally {
    accessStatus = 'free';
    response = { data: { verified: true }, error: null };
  }
});

test('expired access still attempts recovery of an unrecorded owned StoreKit purchase', async () => {
  calls.length = 0;
  accessStatus = 'expired';
  try {
    await iap.restoreApplePurchases();
    assert.deepEqual(calls.filter(call => call[0] !== 'connect'), [
      ['verify', undefined], ['access'], ['restore-store'], ['history'], ['verify', '2'], ['finish', '2'],
    ]);
  } finally { accessStatus = 'free'; }
});

test('simultaneous taps dispatch one purchase with the current account token', async () => {
  calls.length = 0;
  const first = iap.buyAppleProduct('current-user');
  await assert.rejects(iap.buyAppleProduct('current-user'), /前回の購入処理/);
  await first;
  assert.deepEqual(calls.filter(call => call[0] === 'request'), [['request', 'current-user']]);
});

test('a returned purchase is verified and finished even without a native event', async () => {
  calls.length = 0;
  purchaseResult = { ...owned, transactionId: 'return-only' };
  let verified = 0;
  const remove = iap.listenToApplePurchases(() => verified++, assert.fail);
  assert.equal(await iap.buyAppleProduct('current-user'), true);
  assert.deepEqual(calls.filter(call => call[0] !== 'request'), [['verify', 'return-only'], ['finish', 'return-only']]);
  assert.equal(verified, 1);
  remove();
  purchaseResult = undefined;
});

test('a simultaneous native event and returned purchase deliver once', async () => {
  calls.length = 0;
  const purchase = { ...owned, transactionId: 'both-results' };
  purchaseResult = [purchase];
  onRequest = () => updated(purchase);
  let verified = 0;
  const remove = iap.listenToApplePurchases(() => verified++, assert.fail);
  assert.equal(await iap.buyAppleProduct('current-user'), true);
  await settle();
  assert.deepEqual(calls.filter(call => call[0] !== 'request'), [['verify', 'both-results'], ['finish', 'both-results']]);
  assert.equal(verified, 1);
  remove();
  purchaseResult = onRequest = undefined;
});

test('a returned result after its event was delivered does not deliver again', async () => {
  calls.length = 0;
  const purchase = { ...owned, transactionId: 'event-first' };
  purchaseResult = purchase;
  onRequest = async () => { updated(purchase); await settle(); };
  let verified = 0;
  const remove = iap.listenToApplePurchases(() => verified++, assert.fail);
  assert.equal(await iap.buyAppleProduct('current-user'), true);
  updated(purchase);
  await settle();
  assert.deepEqual(calls.filter(call => call[0] !== 'request'), [['verify', 'event-first'], ['finish', 'event-first']]);
  assert.equal(verified, 1);
  remove();
  purchaseResult = onRequest = undefined;
});

test('a foreign request result reports the account conflict without finishing it', async () => {
  calls.length = 0;
  purchaseResult = foreign;
  await assert.rejects(iap.buyAppleProduct('current-user'), /別の処世術禄アカウント/);
  assert.deepEqual(calls, [['request', 'current-user']]);
  purchaseResult = undefined;
});

test('failed delivery can be retried and only finishes after server verification', async () => {
  calls.length = 0;
  purchaseResult = { ...owned, transactionId: 'retry' };
  response = { data: { verified: false }, error: null };
  await assert.rejects(iap.buyAppleProduct('current-user'), /購入を確認できませんでした/);
  assert.equal(calls.some(call => call[0] === 'finish'), false);
  response = { data: { verified: true }, error: null };
  assert.equal(await iap.buyAppleProduct('current-user'), true);
  assert.deepEqual(calls.filter(call => call[0] !== 'request'), [['verify', 'retry'], ['verify', 'retry'], ['finish', 'retry']]);
  purchaseResult = undefined;
});

test('pending purchases end waiting with an approval message without granting access', async () => {
  calls.length = 0;
  purchaseResult = { ...owned, transactionId: 'approval', purchaseState: 'pending' };
  const errors = [];
  const remove = iap.listenToApplePurchases(assert.fail, error => errors.push(error));
  assert.equal(await iap.buyAppleProduct('current-user'), false);
  assert.deepEqual(calls, [['request', 'current-user']]);
  assert.match(errors[0], /承認待ち/);
  remove();
  purchaseResult = undefined;
});

test('listener-only results remain supported when the request returns no purchase', async () => {
  calls.length = 0;
  const purchase = { ...owned, transactionId: 'listener-only' };
  let verified = 0;
  const remove = iap.listenToApplePurchases(() => verified++, assert.fail);
  assert.equal(await iap.buyAppleProduct('current-user'), false);
  updated(purchase);
  await settle();
  assert.equal(verified, 1);
  assert.deepEqual(calls.filter(call => call[0] !== 'request'), [['verify', 'listener-only'], ['finish', 'listener-only']]);
  remove();
});

test('native error codes guide recovery without treating generic errors as signed out', () => {
  const errors = [];
  const remove = iap.listenToApplePurchases(assert.fail, error => errors.push(error));
  failed({ code: 'user-cancelled', message: 'Native cancellation' });
  assert.match(errors[0], /キャンセル/);
  assert.match(iap.formatApplePurchaseError({ code: 'network-error' }), /通信/);
  assert.match(iap.formatApplePurchaseError({ code: 'already-owned' }), /購入を復元/);
  const message = iap.formatApplePurchaseError(new Error('UnexpectedException: Unable to Complete Request'));
  assert.doesNotMatch(message, /サインイン/);
  assert.match(message, /購入を復元/);
  remove();
});

test('a native request failure gives recovery guidance without exposing debug fields', async () => {
  requestError = Object.assign(new Error('UnexpectedException: Unable to Complete Request'), {
    code: 'ERR_UNEXPECTED', debugMessage: 'private native payload', appAccountToken: 'private-account-token',
  });
  await assert.rejects(iap.buyAppleProduct('current-user'), error => {
    const message = iap.formatApplePurchaseError(error);
    assert.match(message, /購入を復元/);
    assert.doesNotMatch(message, /サインイン|private/);
    return true;
  });
  requestError = undefined;
});

test('product loading failure prevents purchase dispatch and allows retry', async () => {
  calls.length = 0;
  productError = Object.assign(new Error('Unable to Complete Request'), { code: 'ERR_UNEXPECTED' });
  await assert.rejects(iap.buyAppleProduct('current-user'), /Unable to Complete Request/);
  assert.equal(calls.some(call => call[0] === 'request'), false);
  productError = undefined;
  await iap.buyAppleProduct('current-user');
  assert.deepEqual(calls, [['request', 'current-user']]);
});

test('finish failure does not mark delivery complete and allows retry', async () => {
  calls.length = 0;
  purchaseResult = { ...owned, transactionId: 'finish-retry' };
  let verified = 0;
  const remove = iap.listenToApplePurchases(() => verified++, assert.fail);
  finishError = Object.assign(new Error('Native failure'), { code: 'service-error' });
  await assert.rejects(iap.buyAppleProduct('current-user'), /Native failure/);
  assert.equal(verified, 0);
  finishError = undefined;
  assert.equal(await iap.buyAppleProduct('current-user'), true);
  assert.equal(verified, 1);
  assert.deepEqual(calls.filter(call => call[0] !== 'request'), [
    ['verify', 'finish-retry'], ['finish', 'finish-retry'],
    ['verify', 'finish-retry'], ['finish', 'finish-retry'],
  ]);
  remove();
  purchaseResult = undefined;
});

test('error formatting does not display arbitrary native code or debug fields', async () => {
  requestError = { code: 'private-account@example.test', message: 'Unable to Complete Request', debugMessage: 'secret' };
  await assert.rejects(iap.buyAppleProduct('current-user'), error => {
    const message = iap.formatApplePurchaseError(error);
    assert.match(message, /購入を復元/);
    assert.doesNotMatch(message, /example\.test|secret/);
    return true;
  });
  requestError = undefined;
});
