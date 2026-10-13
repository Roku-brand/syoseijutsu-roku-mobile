import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) throw new Error('Provide the local generated-image directory.');
await mkdir('assets/features', { recursive: true });
for (const [name, file] of [
  ['coast', 'exec-4470d479-f2a6-4577-8f1c-c29a8df8447e.png'],
  ['forest', 'exec-a74fb24b-4877-4cc2-b96d-8f51f653a93a.png'],
  ['mountain', 'exec-b61b7a27-acd8-4734-9c2f-4d4b23be834a.png'],
]) {
  await sharp(path.join(source, file)).resize({ width: 1440, withoutEnlargement: true }).webp({ quality: 86 }).toFile(`assets/features/${name}.webp`);
  console.log(`Prepared ${name}.webp`);
}
