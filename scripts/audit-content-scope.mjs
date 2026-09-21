import { readFile } from 'node:fs/promises';
import path from 'node:path';

import scope from '../src/data/content-scope.json' with { type: 'json' };
import { mapTheoryDisplayIds } from './public-content-portfolio.mjs';
import { selectPublicContent } from './public-content-selection.mjs';

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
const techniqueLocation = new Map();
for (const category of techniques.categories) for (const persona of category.subcategories) {
  for (const item of persona.items) techniqueLocation.set(item.id, { category: category.key, persona: persona.name, title: item.title });
}
const expectedFreePersonas = new Set(scope.free.personas);
const actualFreePersonas = new Set([...freeTechniqueIds].map((id) => techniqueLocation.get(id)?.persona));
if (actualFreePersonas.size !== expectedFreePersonas.size || [...actualFreePersonas].some((name) => !expectedFreePersonas.has(name))) {
  throw new Error(`Unexpected free personas: ${[...actualFreePersonas].join(', ')}`);
}
for (const category of techniques.categories) for (const persona of category.subcategories) {
  const activeIds = persona.items.filter((item) => techniqueLocation.has(item.id)).map((item) => item.id);
  const selectedCount = activeIds.filter((id) => freeTechniqueIds.has(id)).length;
  if (expectedFreePersonas.has(persona.name) && selectedCount !== activeIds.length) {
    throw new Error(`Free persona is only partially readable: ${persona.name} (${selectedCount}/${activeIds.length})`);
  }
  if (!expectedFreePersonas.has(persona.name) && selectedCount) {
    throw new Error(`Locked persona exposes free techniques: ${persona.name}`);
  }
}

const displayMap = mapTheoryDisplayIds(theories);
const selectedDisplayIds = scope.freeTheoryDisplayIds.filter((id) => freeTheoryIds.has(displayMap.get(id)?.tagId));
if (selectedDisplayIds.length !== scope.free.theories) throw new Error(`Expected ${scope.free.theories} free theories; found ${selectedDisplayIds.length}.`);
const expectedTheoryCategoryCounts = { P: 45, B: 25, O: 20, S: 15, W: 1, C: 35, Q: 9 };
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
if (publicTechniqueIds.size !== scope.free.techniques || [...freeTechniqueIds].some((id) => !publicTechniqueIds.has(id))) throw new Error(`Generated public techniques do not match the selected ${scope.free.techniques}.`);
if (publicTheories.length !== scope.complete.theories || publicTheoryIds.size !== scope.free.theories || [...freeTheoryIds].some((id) => !publicTheoryIds.has(id))) throw new Error('Generated public theories do not match the selected 150.');
if (scope.excludedTechniqueIds.some((id) => publicTechniqueItems.some((item) => item.id === id))) throw new Error('A source-only technique leaked into the active product catalogue.');
if (metadata.productTechniqueCount !== scope.complete.techniques || metadata.productTheoryCount !== scope.complete.theories) throw new Error('Product scope metadata is stale.');

console.log(JSON.stringify({
  complete: { techniques: allTechniques.length, theories: theories.length },
  free: { techniques: freeTechniqueIds.size, theories: freeTheoryIds.size },
  freePersonas: [...actualFreePersonas],
  theoryCategoryCounts: expectedTheoryCategoryCounts,
}, null, 2));
