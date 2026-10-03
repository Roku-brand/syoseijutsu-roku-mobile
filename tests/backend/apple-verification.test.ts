import {
  verifyAppleJws,
  verifyAppleNotification,
  verifyAppleTransaction,
} from '../../supabase/functions/_shared/apple-jws.ts';
import {
  appleEnvironmentCandidates,
  normalizeAppleEnvironment,
} from '../../supabase/functions/_shared/apple.ts';
import { appleCompleteProductId, isCompleteAppleProduct } from '../../supabase/functions/_shared/apple-products.ts';

Deno.test('only the v2 product and existing legacy purchases are recognized', () => {
  if (appleCompleteProductId !== 'com.shoseijutsuroku.premium.30days.v2') throw new Error('Wrong new purchase product');
  for (const id of [appleCompleteProductId, 'jp.shoseijutsuroku.app.complete30days']) {
    if (!isCompleteAppleProduct(id)) throw new Error('Known purchase cannot be restored');
  }
  for (const id of [undefined, null, '', 'com.shoseijutsuroku.premium.30days', `${appleCompleteProductId}.other`]) {
    if (isCompleteAppleProduct(id)) throw new Error('Unrecognized product accepted');
  }
});

const encode = (value: unknown) => btoa(JSON.stringify(value))
  .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const forgedPayloads = [
  'not-a-jws',
  `${encode({ alg: 'none' })}.${encode({ bundleId: 'test.bundle', environment: 'Sandbox', signedDate: Date.now() })}.`,
  `${encode({ alg: 'ES256', x5c: ['ZmFrZQ==', 'ZmFrZQ==', 'ZmFrZQ=='] })}.${encode({
    bundleId: 'test.bundle', environment: 'Sandbox', signedDate: Date.now(),
  })}.ZmFrZQ`,
];

Deno.test('production Apple verifier rejects unsigned and untrusted JWS payloads', () => {
  for (const signed of forgedPayloads) {
    for (const verify of [
      () => verifyAppleJws(signed),
      () => verifyAppleTransaction(signed, 'Sandbox', 'test.bundle'),
      () => verifyAppleNotification(signed, 'Sandbox', 'test.bundle', 123456),
    ]) {
      let rejected = false;
      try { verify(); } catch { rejected = true; }
      if (!rejected) throw new Error('Forged Apple payload accepted');
    }
  }
});

Deno.test('Apple environment hint is normalized and safely falls back', () => {
  if (normalizeAppleEnvironment('sandbox') !== 'Sandbox') throw new Error('sandbox normalization failed');
  if (normalizeAppleEnvironment(' Production ') !== 'Production') throw new Error('production normalization failed');
  if (normalizeAppleEnvironment('Xcode') !== null) throw new Error('unknown environment accepted');
  const sandbox = appleEnvironmentCandidates('Sandbox');
  if (sandbox.join(',') !== 'Sandbox,Production') throw new Error('sandbox fallback order is wrong');
  const missing = appleEnvironmentCandidates(null);
  if (missing.join(',') !== 'Production,Sandbox') throw new Error('missing fallback order is wrong');
});
