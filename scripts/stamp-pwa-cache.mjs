import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const inputs = ['src', 'app.json', 'package.json', 'public/manifest.webmanifest', 'public/pwa-icon.svg'];
const files = [];

async function collect(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const entries = await readdir(absolutePath, { withFileTypes: true }).catch(() => null);
  if (!entries) {
    files.push(relativePath);
    return;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    await collect(path.join(relativePath, entry.name));
  }
}

for (const input of inputs) await collect(input);

const hash = createHash('sha256');
for (const file of files.sort()) {
  hash.update(file);
  hash.update(await readFile(path.join(root, file)));
}
const version = `roku-${hash.digest('hex').slice(0, 12)}`;
const serviceWorkerPath = path.join(root, 'public/sw.js');
const source = await readFile(serviceWorkerPath, 'utf8');
const stamped = source.replace(/const VERSION = 'roku-[^']+';/, `const VERSION = '${version}';`);
if (stamped === source && !source.includes(`const VERSION = '${version}';`)) {
  throw new Error('Could not locate the service-worker VERSION declaration.');
}
await writeFile(serviceWorkerPath, stamped);
console.log(`PWA cache version: ${version}`);
