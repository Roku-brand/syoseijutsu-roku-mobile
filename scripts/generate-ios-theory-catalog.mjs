import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'src/data/generated/theories.public.json');
const destinationPath = path.join(root, 'src/data/generated/theories.public.ios.json');

const theories = JSON.parse(await readFile(sourcePath, 'utf8'));
const iosTheories = theories.filter((theory) => theory.categoryId !== 'maxims-experience');

await writeFile(destinationPath, `${JSON.stringify(iosTheories, null, 2)}\n`, 'utf8');
console.log(`Wrote ${iosTheories.length} iOS theories (excluded ${theories.length - iosTheories.length} maxims).`);
