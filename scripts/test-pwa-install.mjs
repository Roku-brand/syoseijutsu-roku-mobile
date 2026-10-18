import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/pwa-install.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function load(os, window) {
  const context = { exports: {}, require: () => ({ Platform: { OS: os } }) };
  if (window !== undefined) context.window = window;
  vm.runInNewContext(code, context);
  return context.exports;
}
// Native defines window, but does not provide browser window event methods.
for (const os of ['ios', 'android']) {
  assert.equal(load(os, {}).getDeferredInstallPrompt(), null);
}
assert.equal(load('web').getDeferredInstallPrompt(), null); // Static rendering.
const events = new Map();
const api = load('web', { addEventListener: (name, callback) => events.set(name, callback) });
let seen;
const unsubscribe = api.subscribeToInstallPrompt(value => { seen = value; });
let prevented = false;
const prompt = { preventDefault() { prevented = true; } };
events.get('beforeinstallprompt')(prompt);
assert.equal(prevented, true);
assert.equal(seen, prompt);
assert.equal(api.getDeferredInstallPrompt(), prompt);
events.get('appinstalled')();
assert.equal(seen, null);
unsubscribe();
console.log('PASS: native startup, Web SSR, browser install prompt and installed event');
