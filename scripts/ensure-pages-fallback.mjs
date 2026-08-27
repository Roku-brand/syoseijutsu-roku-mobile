import { copyFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve('dist');
const indexPath = resolve(dist, 'index.html');
const fallbackPath = resolve(dist, '404.html');

await access(indexPath, constants.F_OK);
await copyFile(indexPath, fallbackPath);
console.log('GitHub Pages SPA fallback written to dist/404.html');
