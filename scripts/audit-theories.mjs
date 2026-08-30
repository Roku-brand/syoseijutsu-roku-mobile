import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const theories = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'generated', 'theories.json'), 'utf8'));
const techniques = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'generated', 'techniques.json'), 'utf8'));
const cards = techniques.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items));

const expectedCategories = new Map([
  ['心理学', 'psychology'],
  ['行動科学', 'behavioral-science'],
  ['組織・経営論', 'organization-management'],
  ['戦略論', 'strategy'],
  ['古典・思想', 'classics-thought'],
  ['格言・経験則・作品', 'maxims-experience'],
]);
const errors = [];
const ids = new Set();
const referencedIds = new Set(cards.flatMap((card) => card.relatedTheoryIds ?? []));
const allowedTheoryKeys = new Set(['tagId', 'title', 'summary', 'categoryId', 'categoryTitle', 'provenance']);

for (const theory of theories) {
  if (ids.has(theory.tagId)) errors.push(`Duplicate id: ${theory.tagId}`);
  ids.add(theory.tagId);
  if (!theory.title?.trim()) errors.push(`Missing title: ${theory.tagId}`);
  if (!theory.summary?.trim()) errors.push(`Missing summary: ${theory.tagId}`);
  for (const key of Object.keys(theory)) {
    if (!allowedTheoryKeys.has(key)) errors.push(`Unexpected theory field: ${theory.tagId}.${key}`);
  }
  if (expectedCategories.get(theory.categoryTitle) !== theory.categoryId) {
    errors.push(`Category mismatch: ${theory.tagId} (${theory.categoryTitle} / ${theory.categoryId})`);
  }
}

for (const id of referencedIds) {
  if (!ids.has(id)) errors.push(`Dead related theory link: ${id}`);
}

for (const card of cards) {
  const links = card.relatedTheoryIds ?? [];
  if (new Set(links).size !== links.length) errors.push(`Duplicate theory link: ${card.id}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const counts = theories.reduce((result, theory) => {
  result[theory.categoryId] = (result[theory.categoryId] ?? 0) + 1;
  return result;
}, {});
console.log('Theory category counts', counts);
console.log(`Theory audit passed: ${theories.length} compact cards, ${referencedIds.size} referenced by ${cards.length} techniques, 0 dead or duplicate links.`);
