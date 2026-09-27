import fs from 'node:fs/promises';

const load = async (name) => JSON.parse(await fs.readFile(`src/data/generated/${name}`, 'utf8'));
const [theories, publicTheories, techniques, publicTechniques] = await Promise.all([
  load('theories.json'), load('theories.public.json'), load('techniques.json'), load('techniques.public.json'),
]);
const retired = new Set(Array.from({ length: 26 }, (_, index) => `kb_${675 + index}`));
retired.add('theory-1789343197612-6d9ahj0r');
const failures = [];
for (const [name, catalogue] of [['complete', theories], ['public', publicTheories]]) {
  for (const theory of catalogue) {
    if (retired.has(theory.tagId)) failures.push(`${name}: retired theory ${theory.tagId}`);
    if (theory.categoryId === 'maxims-experience') failures.push(`${name}: retired category ${theory.tagId}`);
    if (theory.categoryId === 'practical-wisdom' && /[『』]|\s—\s/.test(theory.title)) failures.push(`${name}: quotation-like practical heading ${theory.tagId}`);
  }
}
for (const [name, catalogue] of [['complete', techniques], ['public', publicTechniques]]) {
  for (const category of catalogue.categories) for (const persona of category.subcategories) for (const card of persona.items) {
    for (const field of ['relatedTheoryIds', 'primaryTheoryIds', 'theoryTagIds']) {
      for (const id of card[field] ?? []) if (retired.has(id)) failures.push(`${name}: ${card.id}.${field} → ${id}`);
    }
  }
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(`Theory rights audit passed: ${theories.length} complete theories, ${publicTheories.length} public shells, 0 retired references.`);
