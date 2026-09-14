import { readFileSync } from 'node:fs';
const required = ['IOS_BUNDLE_IDENTIFIER','EXPO_PUBLIC_APPLE_PRODUCT_ID',
  'EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
const missing = required.filter(key => !process.env[key] || /YOUR_|REPLACE|PLACEHOLDER/.test(process.env[key]));
if (missing.length) throw new Error(`未設定: ${missing.join(', ')}。docs/IOS_RELEASE.mdを参照。`);
if (!/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(process.env.IOS_BUNDLE_IDENTIFIER)) throw new Error('Invalid bundle identifier');
if (process.env.EAS_PROJECT_ID && !/^[a-f0-9-]{36}$/i.test(process.env.EAS_PROJECT_ID)) throw new Error('Invalid EAS project UUID');
if (!process.env.EXPO_PUBLIC_SUPABASE_URL.startsWith('https://')) throw new Error('Production API must use HTTPS');
for (const name of ['activity-log','ai-tasks','faq-candidates','inquiries','social-posts']) {
  const source = JSON.parse(readFileSync(new URL(`../operations/${name}.json`, import.meta.url), 'utf8'));
  if (!Array.isArray(source.items) || source.items.length) throw new Error('Native build must not bundle operational records: ' + name);
}
console.log('iOS identifiers configured. Still requires Apple product, backend deployment and device tests.');
