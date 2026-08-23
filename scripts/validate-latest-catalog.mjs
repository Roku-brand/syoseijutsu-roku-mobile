import fs from 'node:fs';

const source = JSON.parse(fs.readFileSync('src/data/generated/techniques.json', 'utf8'));
const theories = JSON.parse(fs.readFileSync('src/data/generated/theories.json', 'utf8'));
const personas = source.categories.flatMap((category) => category.subcategories.map((group) => ({ field: category.name, persona: group.name, items: group.items })));
const cards = personas.flatMap((persona) => persona.items);
const theoryIds = new Set(theories.map((theory) => theory.tagId));
const referencedTheoryIds = new Set(cards.flatMap((card) => card.relatedTheoryIds ?? []));
// Titles may intentionally recur under different personas. Only an exact duplicate
// within the same field and persona indicates a catalog error.
const duplicateCardKeys = cards.length - new Set(cards.map((card) => `${card.field}\u0000${card.persona}\u0000${card.title}`)).size;
const deadLinks = [...referencedTheoryIds].filter((id) => !theoryIds.has(id));
const requiredCategoryIds = new Set(['psychology', 'behavioral-science', 'organization-management', 'strategy']);
const sourceTheoryMaster = JSON.parse(fs.readFileSync('C:/Users/tsuba/Downloads/theories_unified.json', 'utf8'));
const sourceRequiredIds = new Set(sourceTheoryMaster.filter((theory) => requiredCategoryIds.has(theory.categoryId)).map((theory) => theory.tagId));
const missingRequiredSourceTheories = [...sourceRequiredIds].filter((id) => !theoryIds.has(id));

const checks = {
  personaCount: personas.length,
  techniqueCount: cards.length,
  duplicateCardKeys,
  missingEssence: cards.filter((card) => !card.essence).length,
  missingExplanation: cards.filter((card) => !card.explanation).length,
  techniquesWithoutRelatedTheory: cards.filter((card) => !card.relatedTheoryIds?.length).length,
  theoryCount: theories.length,
  deadLinkCount: deadLinks.length,
  missingRequiredSourceTheories: missingRequiredSourceTheories.length,
  categoryCounts: Object.fromEntries([...new Set(theories.map((theory) => theory.categoryId))].map((id) => [id, theories.filter((theory) => theory.categoryId === id).length])),
};
console.log(JSON.stringify(checks, null, 2));
if (checks.personaCount !== 26 || checks.techniqueCount !== 473 || checks.duplicateCardKeys || checks.missingEssence || checks.missingExplanation || checks.techniquesWithoutRelatedTheory || checks.missingRequiredSourceTheories || checks.deadLinkCount) {
  throw new Error('Latest catalog validation failed');
}
