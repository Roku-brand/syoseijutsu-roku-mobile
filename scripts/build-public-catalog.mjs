import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectPublicContent } from './public-content-selection.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.join(root, 'src', 'data', 'generated');
const readJson = async (name) => JSON.parse(await fs.readFile(path.join(generated, name), 'utf8'));
const writeJson = async (name, value) => fs.writeFile(path.join(generated, name), `${JSON.stringify(value, null, 2)}\n`);

const [techniques, theories, learning, practicalActions, metadata] = await Promise.all([
  readJson('techniques.json'), readJson('theories.json'), readJson('learning.full.json'),
  readJson('practical-actions.json'), readJson('metadata.json'),
]);

const { allTechniques, freeTechniqueIds, freeTheoryIds, freeLearningIds } = selectPublicContent({ techniques, theories, learning });

const HOME_TECHNIQUE_ID = 'master336-014';
const HOME_PERSONA_NAME = '印象がいい人';
const HOME_THEORY_ID = 'kb_014';
const HOME_MAP_TECHNIQUE_ID = 'master336-007';
const techniqueById = new Map(allTechniques.map((item) => [item.id, item]));
const theoryById = new Map(theories.map((item) => [item.tagId, item]));
const mapTechnique = techniqueById.get(HOME_MAP_TECHNIQUE_ID);
const homeTheory = theoryById.get(HOME_THEORY_ID);

if (!mapTechnique || (mapTechnique.relatedTheoryIds ?? mapTechnique.theoryTagIds ?? []).length < 3) {
  throw new Error(`Home theory map requires at least three canonical links: ${HOME_MAP_TECHNIQUE_ID}`);
}
if (!homeTheory) throw new Error(`Unknown canonical home theory: ${HOME_THEORY_ID}`);
if (!freeTheoryIds.has(HOME_THEORY_ID)) {
  throw new Error(`Home theory must be readable in the public edition: ${HOME_THEORY_ID}`);
}

const homeBrandContent = {
  todayTechniqueCandidateIds: [HOME_TECHNIQUE_ID],
  personaCandidateNames: [HOME_PERSONA_NAME],
  theoryCandidateIds: [HOME_THEORY_ID],
  theorySnapshots: [homeTheory],
  techniqueTheoryMap: {
    techniqueId: mapTechnique.id,
    title: mapTechnique.title,
    theories: (mapTechnique.relatedTheoryIds ?? mapTechnique.theoryTagIds).map((id) => {
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
    subcategories: category.subcategories.map((persona) => ({
      ...persona,
      items: persona.items.map((item) => freeTechniqueIds.has(item.id)
        ? item
        : { id: item.id, title: '完全版の処世術', displayOrder: item.displayOrder, status: 'locked' }),
    })),
  })),
};
const publicTheories = theories.map((theory) => freeTheoryIds.has(theory.tagId)
  ? theory
  : { tagId: theory.tagId, title: '完全版の理論', summary: '', categoryId: theory.categoryId, categoryTitle: theory.categoryTitle });

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
