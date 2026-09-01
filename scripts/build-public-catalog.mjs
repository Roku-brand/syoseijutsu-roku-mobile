import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { orderPersonasForDisplay, selectPublicContent } from './public-content-selection.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.join(root, 'src', 'data', 'generated');
const readJson = async (name) => JSON.parse(await fs.readFile(path.join(generated, name), 'utf8'));
const writeJson = async (name, value) => fs.writeFile(path.join(generated, name), `${JSON.stringify(value, null, 2)}\n`);

const [techniques, theories, learning, practicalActions, metadata] = await Promise.all([
  readJson('techniques.json'), readJson('theories.json'), readJson('learning.full.json'),
  readJson('practical-actions.json'), readJson('metadata.json'),
]);

const { allTechniques, freeTechniqueIds, freeTheoryIds, freeLearningIds } = selectPublicContent({ techniques, theories, learning });

const HOME_MAP_TECHNIQUE_ID = 'master336-071';
const HOME_MAP_THEORY_IDS = ['kb_002', 'kb_029', 'kb_401', 'kb_514'];
const techniqueById = new Map(allTechniques.map((item) => [item.id, item]));
const theoryById = new Map(theories.map((item) => [item.tagId, item]));
const mapTechnique = techniqueById.get(HOME_MAP_TECHNIQUE_ID);

if (!mapTechnique) {
  throw new Error(`Unknown home theory map technique: ${HOME_MAP_TECHNIQUE_ID}`);
}

if (HOME_MAP_THEORY_IDS.length !== 4 || new Set(HOME_MAP_THEORY_IDS).size !== HOME_MAP_THEORY_IDS.length) {
  throw new Error('Home theory map requires four distinct theories.');
}

const dailyCandidates = {};
const fallbackTechniqueSnapshots = {};
const fallbackPersonaSnapshots = {};
for (const category of techniques.categories) {
  const publicPersonas = orderPersonasForDisplay(category).map((persona) => ({
    persona,
    items: persona.items.filter((item) => freeTechniqueIds.has(item.id)),
  })).filter(({ items }) => items.length > 0);
  const publicItems = publicPersonas.flatMap(({ items }) => items);
  const theoryIds = [...new Set(publicItems.flatMap((item) =>
    item.relatedTheoryIds ?? item.theoryTagIds ?? [],
  ).filter((id) => freeTheoryIds.has(id)))];
  if (!publicItems.length || !publicPersonas.length || !theoryIds.length) {
    throw new Error(`Home daily candidates are incomplete for ${category.key}.`);
  }

  const firstPersona = publicPersonas[0];
  dailyCandidates[category.key] = {
    techniqueIds: publicItems.map((item) => item.id),
    personaNames: publicPersonas.map(({ persona }) => persona.name),
    theoryIds,
  };
  fallbackTechniqueSnapshots[category.key] = {
    ...publicItems[0],
    categoryKey: category.key,
    categoryName: category.name,
    subcategory: firstPersona.persona.name,
    articleTitle: firstPersona.persona.articleTitle ?? firstPersona.persona.name,
  };
  fallbackPersonaSnapshots[category.key] = {
    categoryKey: category.key,
    categoryName: category.name,
    name: firstPersona.persona.name,
    description: `${firstPersona.persona.articleTitle ?? firstPersona.persona.name}を形づくる、${category.name}の実践知。`,
    techniqueCount: firstPersona.items.length,
  };
}

const dailyTheoryIds = [...new Set(Object.values(dailyCandidates).flatMap((group) => group.theoryIds))];
const theorySnapshots = dailyTheoryIds.map((id) => {
  const theory = theoryById.get(id);
  if (!theory) throw new Error(`Unknown daily home theory: ${id}`);
  return theory;
});

const homeBrandContent = {
  dailyCandidates,
  fallbackTechniqueSnapshots,
  fallbackPersonaSnapshots,
  theorySnapshots,
  techniqueTheoryMap: {
    techniqueId: mapTechnique.id,
    title: mapTechnique.title,
    theories: HOME_MAP_THEORY_IDS.map((id) => {
      const theory = theoryById.get(id);
      if (!theory) throw new Error(`Unknown canonical theory in home map: ${id}`);
      return {
        tagId: theory.tagId,
        title: theory.title,
        categoryId: theory.categoryId,
        categoryTitle: theory.categoryTitle,
      };
    }),
  },
};

const publicTechniques = {
  ...techniques,
  categories: techniques.categories.map((category) => ({
    ...category,
    subcategories: orderPersonasForDisplay(category).map((persona) => ({
      ...persona,
      items: persona.items.map((item) => freeTechniqueIds.has(item.id)
        ? item
        : { id: item.id, title: '完全版の処世術', displayOrder: item.displayOrder, status: 'locked' }),
    })),
  })),
};
const publicTheories = theories.map((theory) => freeTheoryIds.has(theory.tagId)
  ? theory
  : { tagId: theory.tagId, title: theory.title, summary: '', categoryId: theory.categoryId, categoryTitle: theory.categoryTitle, status: 'locked' });

metadata.categoryCounts = Object.fromEntries(
  theories.map((theory) => theory.categoryId).filter((id, index, ids) => ids.indexOf(id) === index)
    .map((id) => [id, theories.filter((theory) => theory.categoryId === id).length]),
);

await Promise.all([
  writeJson('techniques.public.json', publicTechniques),
  writeJson('theories.public.json', publicTheories),
  writeJson('learning.public.json', learning.filter((item) => freeLearningIds.has(item.id))),
  writeJson('practical-actions.public.json', practicalActions.filter((item) => freeTechniqueIds.has(item.id))),
  writeJson('home-brand-content.json', homeBrandContent),
  writeJson('metadata.json', metadata),
]);

console.log(JSON.stringify({
  public: { techniques: freeTechniqueIds.size, theories: freeTheoryIds.size, learning: freeLearningIds.size },
  lockedShells: { techniques: allTechniques.length - freeTechniqueIds.size, theories: theories.length - freeTheoryIds.size },
}, null, 2));
