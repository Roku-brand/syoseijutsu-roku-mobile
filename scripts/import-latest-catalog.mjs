import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceDir = 'C:/Users/tsuba/Downloads';
const remap = JSON.parse(fs.readFileSync(path.join(sourceDir, 'shoseijutsuroku_525_theory_remap_with_wisdom_final.json'), 'utf8'));
const unified = JSON.parse(fs.readFileSync(path.join(sourceDir, 'theories_unified.json'), 'utf8'));
const previous = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/data/generated/techniques.json'), 'utf8'));

const fieldKeys = { 対人術: 'interpersonal', 仕事術: 'work', 人生術: 'life' };
const previousGroups = new Map(previous.categories.flatMap((category) => category.subcategories.map((group) => [`${category.name}/${group.name}`, group])));
const previousByField = new Map(previous.categories.map((category) => [category.name, category.subcategories]));
const categoryById = new Map(unified.map((theory) => [theory.tagId, theory]));
const usedIds = new Set(remap.usedTheoryMaster.map((theory) => theory.tagId));
const alwaysAdoptCategoryIds = new Set([
  'psychology',
  'behavioral-science',
  'organization-management',
  'strategy',
]);
const adoptedIds = new Set([
  ...usedIds,
  ...unified
    .filter((theory) => alwaysAdoptCategoryIds.has(theory.categoryId))
    .map((theory) => theory.tagId),
]);

if (remap.personas.length !== 40) throw new Error(`Expected 40 personas, found ${remap.personas.length}`);
const totalCards = remap.personas.reduce((sum, persona) => sum + persona.cards.length, 0);
if (totalCards !== 525) throw new Error(`Expected 525 cards, found ${totalCards}`);
if (usedIds.size !== remap.usedTheoryMaster.length) throw new Error('Duplicate used theory IDs');
for (const tagId of adoptedIds) {
  if (!categoryById.has(tagId)) throw new Error(`Missing canonical theory ${tagId}`);
}

const categories = ['interpersonal', 'work', 'life'].map((key) => ({
  key,
  name: Object.entries(fieldKeys).find(([, value]) => value === key)?.[0],
  subcategories: [],
}));
const categoryIndex = new Map(categories.map((category) => [category.name, category]));
const fieldPosition = new Map();
for (const persona of remap.personas) {
  const category = categoryIndex.get(persona.field);
  if (!category) throw new Error(`Unknown field ${persona.field}`);
  const position = fieldPosition.get(persona.field) ?? 0;
  const oldGroup = previousByField.get(persona.field)?.[position];
  fieldPosition.set(persona.field, position + 1);
  category.subcategories.push({
    name: persona.persona,
    articleTitle: oldGroup?.articleTitle ?? persona.persona,
    items: persona.cards.map((card, index) => ({
      id: `latest-${String(categories.reduce((count, c) => count + c.subcategories.reduce((n, group) => n + group.items.length, 0), 0) + index + 1).padStart(3, '0')}`,
      field: persona.field,
      persona: persona.persona,
      title: card.title,
      essence: card.essence,
      explanation: card.explanation,
      relatedTheoryIds: card.relatedTheories.map((theory) => theory.tagId),
      subtitle: card.essence,
      displayOrder: card.no,
      status: 'published',
    })),
  });
}

const theories = [...adoptedIds].map((tagId) => categoryById.get(tagId)).sort((a, b) => a.originalNumber - b.originalNumber);
const outputDir = path.join(repoRoot, 'src/data/generated');
fs.writeFileSync(path.join(outputDir, 'techniques.json'), `${JSON.stringify({ categories }, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'theories.json'), `${JSON.stringify(theories, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'metadata.json'), `${JSON.stringify({ source: 'shoseijutsuroku_525_theory_remap_with_wisdom_final.json + theories_unified.json', techniqueCount: totalCards, theoryCount: theories.length, personaCount: remap.personas.length, adoptedAllSourceCategories: [...alwaysAdoptCategoryIds], categoryCounts: Object.fromEntries([...new Set(theories.map((theory) => theory.categoryId))].map((id) => [id, theories.filter((theory) => theory.categoryId === id).length])) }, null, 2)}\n`);
console.log(JSON.stringify({ personas: remap.personas.length, techniques: totalCards, theories: theories.length }, null, 2));
