import { Buffer } from 'node:buffer';
// The package has no bundled TypeScript declarations; its runtime surface is
// deliberately narrowed below before use.
// @ts-ignore npm package has no bundled declarations
import jsrsasign from 'npm:jsrsasign@11.1.5';
import appleRoots from './apple-roots.json' with { type: 'json' };

const { KJUR, X509 } = jsrsasign as {
  KJUR: any;
  X509: new () => any;
};

type AppleEnvironment = 'Production' | 'Sandbox';
type ApplePayload = Record<string, any>;

const pinnedRoots = new Set(appleRoots.map(root => Buffer.from(root.derBase64, 'base64').toString('hex')));

function decodePart(value: string): ApplePayload {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function parseCertificateDate(value: string) {
  const match = /^(\d{2}|\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(value);
  if (!match) throw new Error('invalid_certificate_date');
  let year = Number(match[1]);
  if (match[1].length === 2) year += year >= 50 ? 1900 : 2000;
  return new Date(Date.UTC(year, Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6])));
}

function checkCertificateDate(certificate: any, effectiveDate: Date) {
  const skew = 60_000;
  const notBefore = parseCertificateDate(certificate.getNotBefore()).getTime();
  const notAfter = parseCertificateDate(certificate.getNotAfter()).getTime();
  if (notBefore > effectiveDate.getTime() + skew || notAfter < effectiveDate.getTime() - skew) {
    throw new Error('invalid_certificate_date');
  }
}

function certificate(hex: string) {
  const value = new X509();
  value.readCertHex(hex);
  return value;
}

/**
 * Verifies Apple's ES256 JWS using a pinned Apple root and pure JavaScript
 * certificate primitives that work in the Supabase Edge Deno runtime.
 */
export function verifyAppleJws(token: string): ApplePayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('invalid_jws');
  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);
  if (header.alg !== 'ES256' || !Array.isArray(header.x5c) || header.x5c.length !== 3
      || header.x5c.some((item: unknown) => typeof item !== 'string')) throw new Error('invalid_jws_header');

  const [leafHex, intermediateHex, rootHex] = header.x5c.map((item: string) => Buffer.from(item, 'base64').toString('hex'));
  if (!pinnedRoots.has(rootHex)) throw new Error('untrusted_apple_root');

  const leaf = certificate(leafHex);
  const intermediate = certificate(intermediateHex);
  const root = certificate(rootHex);
  if (leaf.getIssuerHex() !== intermediate.getSubjectHex()
      || intermediate.getIssuerHex() !== root.getSubjectHex()
      || !leaf.verifySignature(intermediate.getPublicKey())
      || !intermediate.verifySignature(root.getPublicKey())
      || intermediate.getExtBasicConstraints()?.cA !== true
      || !leaf.getExtInfo('1.2.840.113635.100.6.11.1')
      || !intermediate.getExtInfo('1.2.840.113635.100.6.2.1')) throw new Error('invalid_apple_certificate_chain');

  const signedDate = Number(payload.signedDate);
  if (!Number.isFinite(signedDate)) throw new Error('invalid_signed_date');
  const effectiveDate = new Date(signedDate);
  checkCertificateDate(leaf, effectiveDate);
  checkCertificateDate(intermediate, effectiveDate);
  checkCertificateDate(root, effectiveDate);

  if (!KJUR.jws.JWS.verify(token, leaf.getPublicKey(), ['ES256'])) throw new Error('invalid_apple_signature');
  return payload;
}

export function verifyAppleNotification(token: string, expectedEnvironment: AppleEnvironment,
    bundleId: string, appAppleId: number) {
  const payload = verifyAppleJws(token);
  const identity = payload.data ?? payload.summary ?? payload.externalPurchaseToken ?? payload.appData;
  if (!identity || identity.bundleId !== bundleId) throw new Error('invalid_app_identifier');
  const environment = payload.externalPurchaseToken
    ? (String(identity.externalPurchaseId ?? '').startsWith('SANDBOX') ? 'Sandbox' : 'Production')
    : identity.environment;
  if (environment !== expectedEnvironment) throw new Error('invalid_environment');
  if (expectedEnvironment === 'Production' && identity.appAppleId !== appAppleId) throw new Error('invalid_app_identifier');
  return payload;
}

export function verifyAppleTransaction(token: string, expectedEnvironment: AppleEnvironment, bundleId: string) {
  const payload = verifyAppleJws(token);
  if (payload.bundleId !== bundleId) throw new Error('invalid_app_identifier');
  if (payload.environment !== expectedEnvironment) throw new Error('invalid_environment');
  return payload;
}
