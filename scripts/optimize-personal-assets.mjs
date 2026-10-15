import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';

// Derive UI-sized files from existing ranking/home art without changing originals.
await mkdir('assets/categories', { recursive: true });
const assets = [
  ['assets/home/interpersonal-v2.webp', 'assets/categories/interpersonal.webp', 384, 72],
  ['assets/home/work-office.webp', 'assets/categories/work.webp', 384, 72],
  ['assets/home/life-crossroads.webp', 'assets/categories/life.webp', 384, 72],
  ['assets/rankings/categories.webp', 'assets/categories/theory-sheet.webp', 768, 72],
  ['assets/my-page/personal-principle-scroll-refined.png', 'assets/my-page/personal-principle-scroll-refined.webp', 1536, 80],
  ...['five-guidelines', 'meta-comments', 'the-secret-behind-age', 'be-broken', 'verbalization', 'metacognition'].map(name => [`assets/features/${name}-cover.webp`, `assets/categories/${name}-thumb.webp`, 256, 68]),
];
for (const [source, target, width, quality] of assets) {
  await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6 }).toFile(target);
}
const categoryBytes = (await Promise.all(assets.slice(0, 4).map(async ([, target]) => (await stat(target)).size))).reduce((a, b) => a + b, 0);
if (categoryBytes > 128 * 1024) throw new Error(`Category artwork exceeds 128KiB: ${categoryBytes}`);
console.log(`Optimized ${assets.length} personal UI assets; nine category views share ${categoryBytes} bytes.`);
