import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const dist = path.resolve('dist');
const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].replaceAll('&amp;', '&'));
const failures = [];
const seenTitles = new Map();
const seenDescriptions = new Map();

const count = (html, pattern) => (html.match(pattern) ?? []).length;
const value = (html, pattern) => html.match(pattern)?.[1] ?? '';
const recordDuplicate = (map, text, url, label) => {
  if (!text) return;
  const previous = map.get(text);
  if (previous) failures.push(`${label} duplicate: ${previous} and ${url}`);
  else map.set(text, url);
};

async function htmlForUrl(url) {
  const pathname = decodeURIComponent(new URL(url).pathname);
  if (pathname === '/') return readFile(path.join(dist, 'index.html'), 'utf8');
  const direct = path.join(dist, `${pathname.slice(1)}.html`);
  try { await access(direct); return readFile(direct, 'utf8'); } catch { return readFile(path.join(dist, pathname.slice(1), 'index.html'), 'utf8'); }
}

for (const url of urls) {
  let html;
  try { html = await htmlForUrl(url); } catch { failures.push(`Sitemap URL has no HTML file: ${url}`); continue; }
  const title = value(html, /<title>(.*?)<\/title>/s);
  const description = value(html, /<meta name="description" content="(.*?)"\/>/s);
  const canonical = value(html, /<link rel="canonical" href="(.*?)"\/>/s);
  const robots = value(html, /<meta name="robots" content="(.*?)"\/>/s);
  if (count(html, /<title\b/g) !== 1) failures.push(`${url}: expected one title`);
  if (count(html, /name="description"/g) !== 1) failures.push(`${url}: expected one description`);
  if (count(html, /rel="canonical"/g) !== 1) failures.push(`${url}: expected one canonical`);
  if (count(html, /property="og:title"/g) !== 1 || count(html, /name="twitter:title"/g) !== 1) failures.push(`${url}: incomplete social metadata`);
  if (count(html, /application\/ld\+json/g) !== 1) failures.push(`${url}: expected one JSON-LD graph`);
  if (!robots.startsWith('index,follow')) failures.push(`${url}: sitemap page is not indexable`);
  if (canonical !== url) failures.push(`${url}: canonical mismatch (${canonical})`);
  if (!html.includes('<h1>')) failures.push(`${url}: no static h1 fallback`);
  recordDuplicate(seenTitles, title, url, 'Title');
  recordDuplicate(seenDescriptions, description, url, 'Description');
  try { JSON.parse(value(html, /<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)); } catch { failures.push(`${url}: invalid JSON-LD`); }
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|tel:|#)/.test(match[1])) continue;
    const pathname = decodeURIComponent(match[1].split(/[?#]/)[0]).replace(/^\//, '');
    if (!pathname) continue;
    const direct = path.join(dist, `${pathname}.html`);
    const nested = path.join(dist, pathname, 'index.html');
    try { await access(direct); } catch {
      try { await access(nested); } catch { failures.push(`${url}: broken internal link ${match[1]}`); }
    }
  }
}

const privateRoutes = ['/auth', '/settings', '/owner/content', '/library', '/my-os', '/learn/case-01'];
for (const route of privateRoutes) {
  const html = await readFile(path.join(dist, `${route.slice(1)}.html`), 'utf8');
  if (!html.includes('content="noindex,follow"')) failures.push(`${route}: private route must be noindex`);
  if (sitemap.includes(`>${`https://shoseijutsuroku.com${route}`}<`)) failures.push(`${route}: private route leaked into sitemap`);
}

const legacyCatalog = await readFile(path.join(dist, 'catalog.html'), 'utf8');
if (!legacyCatalog.includes('content="noindex,follow"')) failures.push('/catalog: compatibility redirect must be noindex');
if (!legacyCatalog.includes('rel="canonical" href="https://shoseijutsuroku.com/discover"')) failures.push('/catalog: canonical must point to /discover');
if (sitemap.includes('>https://shoseijutsuroku.com/catalog<')) failures.push('/catalog: compatibility redirect leaked into sitemap');

const notFound = await readFile(path.join(dist, '404.html'), 'utf8');
if (!notFound.includes('content="noindex,follow"')) failures.push('404.html must be noindex');
if (!notFound.includes('ページが見つかりません')) failures.push('404.html needs an explicit not-found message');

const assetBudgets = [
  ['assets/welcome/welcome-background-desktop.webp', 100_000],
  ['assets/welcome/welcome-background-mobile.webp', 100_000],
  ['assets/home/machiya-night-hero.webp', 250_000],
];
for (const [file, budget] of assetBudgets) {
  const size = (await stat(file)).size;
  if (size > budget) failures.push(`${file}: ${size} bytes exceeds ${budget}-byte performance budget`);
}
for (const file of ['dist/robots.txt', 'dist/sitemap.xml', 'dist/manifest.webmanifest', 'dist/og.png', 'dist/pwa-icon.svg', 'dist/pwa-icon-192.png', 'dist/pwa-icon-512.png']) {
  try { await access(file); } catch { failures.push(`${file}: required SEO/PWA asset is missing`); }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ indexableUrls: urls.length, uniqueTitles: seenTitles.size, uniqueDescriptions: seenDescriptions.size, privateRoutesChecked: privateRoutes.length }, null, 2));
