import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(ROOT, 'src', 'data', 'generated');
const BASE_URL = 'https://roku-brand.github.io/syoseizyutsu-roku/data';

const sourceFiles = {
  techniques: `${BASE_URL}/techniques/all-techniques.js`,
  cognition: `${BASE_URL}/foundation/cognition.js`,
  behavior: `${BASE_URL}/foundation/behavior.js`,
  social: `${BASE_URL}/foundation/social.js`,
  structure: `${BASE_URL}/foundation/structure.js`,
  wisdom: `${BASE_URL}/foundation/wisdom.js`,
};

async function fetchExport(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const source = await response.text();
  const jsonStart = source.indexOf('{');
  const jsonEnd = source.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd < jsonStart) {
    throw new Error(`Unexpected source format: ${url}`);
  }
  return JSON.parse(source.slice(jsonStart, jsonEnd + 1));
}

const [techniques, ...foundationCategories] = await Promise.all(
  Object.values(sourceFiles).map(fetchExport),
);

const theories = foundationCategories.flatMap((category) =>
  category.items.map((item) => ({
    ...item,
    categoryId: category.id,
    categoryTitle: category.title,
  })),
);

const metadata = {
  importedAt: new Date().toISOString(),
  source: 'https://roku-brand.github.io/syoseizyutsu-roku/',
  techniqueCount: techniques.categories.reduce(
    (total, category) =>
      total +
      category.subcategories.reduce(
        (categoryTotal, subcategory) => categoryTotal + subcategory.items.length,
        0,
      ),
    0,
  ),
  theoryCount: theories.length,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await Promise.all([
  writeFile(
    path.join(OUTPUT_DIR, 'techniques.json'),
    `${JSON.stringify(techniques, null, 2)}\n`,
    'utf8',
  ),
  writeFile(
    path.join(OUTPUT_DIR, 'theories.json'),
    `${JSON.stringify(theories, null, 2)}\n`,
    'utf8',
  ),
  writeFile(
    path.join(OUTPUT_DIR, 'metadata.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    'utf8',
  ),
]);

console.log(
  `Imported ${metadata.techniqueCount} techniques and ${metadata.theoryCount} theories.`,
);
