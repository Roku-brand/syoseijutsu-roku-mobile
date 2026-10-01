import fs from 'node:fs/promises';
import { auditTheoryRights } from './theory-rights-contract.mjs';

const load = async (name) => JSON.parse(await fs.readFile(`src/data/generated/${name}`, 'utf8'));
const [theories, publicTheories, techniques, publicTechniques] = await Promise.all([
  load('theories.json'), load('theories.public.json'), load('techniques.json'), load('techniques.public.json'),
]);
const old = JSON.parse(await fs.readFile('docs/content/practical-wisdom-retired-20261002.json', 'utf8'));
const retiredIds = [...old.map((item) => item.tagId), ...Array.from({ length: 26 }, (_, i) => `kb_${675 + i}`), 'theory-1789343197612-6d9ahj0r'];
for (const [name, catalogue, source] of [['complete', theories, techniques], ['public', publicTheories, publicTechniques]]) {
  const cards = source.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
  const failures = auditTheoryRights({ theories: catalogue, techniques: cards, retiredIds });
  if (failures.length) throw new Error(failures.join('\n'));
  console.log(`Theory rights audit passed (${name}): ${catalogue.length} theories, ${catalogue.filter((item) => item.categoryId === 'practical-wisdom').length} original practical titles; dense IDs, 0 retired/dead references.`);
}
