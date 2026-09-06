import { readFile } from 'node:fs/promises';
import path from 'node:path';

import scope from '../src/data/content-scope.json' with { type: 'json' };
import { mapTheoryDisplayIds } from './public-content-portfolio.mjs';
import { selectDomainPreviewItems, selectPublicContent } from './public-content-selection.mjs';

const generated = path.resolve('src/data/generated');
const readJson = async (name) => JSON.parse(await readFile(path.join(generated, name), 'utf8'));
const [techniques, theories, learning, publicTechniques, publicTheories, metadata] = await Promise.all([
  readJson('techniques.json'),
  readJson('theories.json'),
  readJson('learning.full.json'),
  readJson('techniques.public.json'),
  readJson('theories.public.json'),
  readJson('metadata.json'),
]);

const { allTechniques, freeTechniqueIds, freeTheoryIds } = selectPublicContent({ techniques, theories, learning });
const legacyTechniqueIds = new Set(techniques.categories.flatMap((category) =>
  selectDomainPreviewItems(category).map((item) => item.id),
));
const additions = allTechniques.filter((item) => freeTechniqueIds.has(item.id) && !legacyTechniqueIds.has(item.id));
const expectedAdditionIds = ['master336-051', 'master336-052', 'master336-053', 'master336-054', 'master336-055'];
const actualAdditionIds = additions.map((item) => item.id);
if (legacyTechniqueIds.size !== 45 || [...legacyTechniqueIds].some((id) => !freeTechniqueIds.has(id))) {
  throw new Error('The original 45 free techniques were not preserved exactly.');
}
if (JSON.stringify(actualAdditionIds) !== JSON.stringify(expectedAdditionIds)) {
  throw new Error(`Unexpected free-technique additions: ${actualAdditionIds.join(', ')}`);
}

const techniqueLocation = new Map();
for (const category of techniques.categories) for (const persona of category.subcategories) {
  for (const item of persona.items) techniqueLocation.set(item.id, { category: category.key, persona: persona.name, title: item.title });
}
const legacyFreePersonas = new Set([...legacyTechniqueIds].map((id) => techniqueLocation.get(id)?.persona));
for (const item of additions) {
  if (!legacyFreePersonas.has(techniqueLocation.get(item.id)?.persona)) throw new Error(`Addition opened a new persona: ${item.id}`);
}

const displayMap = mapTheoryDisplayIds(theories);
const selectedDisplayIds = scope.freeTheoryDisplayIds.filter((id) => freeTheoryIds.has(displayMap.get(id)?.tagId));
if (selectedDisplayIds.length !== scope.free.theories) throw new Error(`Expected ${scope.free.theories} free theories; found ${selectedDisplayIds.length}.`);
const expectedTheoryCategoryCounts = { P: 45, B: 25, O: 20, S: 15, C: 35, Q: 10 };
for (const [prefix, expected] of Object.entries(expectedTheoryCategoryCounts)) {
  const actual = selectedDisplayIds.filter((id) => id.startsWith(`${prefix}-`)).length;
  if (actual !== expected) throw new Error(`Free theory portfolio ${prefix} count is ${actual}; expected ${expected}.`);
}

const publicTechniqueItems = publicTechniques.categories.flatMap((category) =>
  category.subcategories.flatMap((persona) => persona.items),
);
const publicTechniqueIds = new Set(publicTechniqueItems.filter((item) => item.status !== 'locked').map((item) => item.id));
const publicTheoryIds = new Set(publicTheories.filter((item) => item.status !== 'locked' && item.summary).map((item) => item.tagId));
if (publicTechniqueItems.length !== scope.complete.techniques) throw new Error(`Public runtime has ${publicTechniqueItems.length} technique shells; expected ${scope.complete.techniques}.`);
if (publicTechniqueIds.size !== scope.free.techniques || [...freeTechniqueIds].some((id) => !publicTechniqueIds.has(id))) throw new Error('Generated public techniques do not match the selected 50.');
if (publicTheories.length !== scope.complete.theories || publicTheoryIds.size !== scope.free.theories || [...freeTheoryIds].some((id) => !publicTheoryIds.has(id))) throw new Error('Generated public theories do not match the selected 150.');
if (scope.excludedTechniqueIds.some((id) => publicTechniqueItems.some((item) => item.id === id))) throw new Error('A source-only technique leaked into the active product catalogue.');
if (metadata.productTechniqueCount !== scope.complete.techniques || metadata.productTheoryCount !== scope.complete.theories) throw new Error('Product scope metadata is stale.');

console.log(JSON.stringify({
  complete: { techniques: allTechniques.length, theories: theories.length },
  free: { techniques: freeTechniqueIds.size, theories: freeTheoryIds.size },
  preservedTechniqueCount: legacyTechniqueIds.size,
  additions: additions.map((item) => ({ id: item.id, persona: techniqueLocation.get(item.id)?.persona, title: item.title })),
  theoryCategoryCounts: expectedTheoryCategoryCounts,
}, null, 2));
