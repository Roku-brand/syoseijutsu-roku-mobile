import { readFileSync } from 'node:fs';

// Run via `eas env:exec <environment> 'node scripts/ios-preflight-profile.mjs <profile>'`.
// Match EAS precedence: the selected profile's explicit env overrides remote env.
const { build } = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
const selected = process.argv[2];
if (!selected || !build[selected]) throw new Error('Specify an existing EAS build profile.');
function resolve(name, seen = new Set()) {
  if (seen.has(name) || !build[name]) throw new Error('Invalid EAS profile inheritance.');
  seen.add(name);
  const profile = build[name];
  return { ...(profile.extends ? resolve(profile.extends, seen) : {}), ...(profile.env || {}) };
}
Object.assign(process.env, resolve(selected));
process.env.EAS_BUILD_PROFILE = selected;
process.env.EAS_BUILD_PLATFORM = 'ios';
await import('./ios-preflight.mjs');
const config = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
if (config.ios.bundleIdentifier !== process.env.IOS_BUNDLE_IDENTIFIER) throw new Error('Bundle ID mismatch.');
if (!/^\d+$/.test(config.ios.buildNumber)) throw new Error('Invalid iOS build number.');
console.log(`Effective profile ${selected}: iOS ${config.version} (${config.ios.buildNumber}).`);
