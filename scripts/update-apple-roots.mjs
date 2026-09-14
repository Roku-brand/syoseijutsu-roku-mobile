import { X509Certificate } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const urls = [
  'https://www.apple.com/appleca/AppleIncRootCertificate.cer',
  'https://www.apple.com/certificateauthority/AppleRootCA-G2.cer',
  'https://www.apple.com/certificateauthority/AppleRootCA-G3.cer',
];
const roots = [];
for (const url of urls) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok || new URL(response.url).hostname !== 'www.apple.com') throw new Error('Unexpected certificate source');
  const der = Buffer.from(await response.arrayBuffer());
  const cert = new X509Certificate(der);
  if (!cert.ca || !cert.verify(cert.publicKey) || new Date(cert.validTo) <= new Date()) throw new Error('Invalid Apple root');
  roots.push({ url, sha256: cert.fingerprint256, validTo: cert.validTo, derBase64: der.toString('base64') });
}
await writeFile(new URL('../supabase/functions/_shared/apple-roots.json', import.meta.url), JSON.stringify(roots, null, 2) + '\n');
console.log(roots.map(({ url, sha256, validTo }) => ({ url, sha256, validTo })));
