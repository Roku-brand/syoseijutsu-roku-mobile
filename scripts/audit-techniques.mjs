import fs from 'node:fs';

const source = JSON.parse(fs.readFileSync('src/data/generated/techniques.json', 'utf8'));
const cards = source.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items));
const failures = [];
const ids = new Set();
const titles = new Set();

for (const card of cards) {
  if (ids.has(card.id)) failures.push(`Duplicate id: ${card.id}`);
  ids.add(card.id);
  if (titles.has(card.title)) failures.push(`Duplicate title: ${card.title}`);
  titles.add(card.title);
  if (!String(card.essence ?? '').trim()) failures.push(`${card.id} has no essence.`);
  if (!String(card.explanation ?? '').trim()) failures.push(`${card.id} has no explanation.`);
  if (!Array.isArray(card.relatedTheoryIds) || card.relatedTheoryIds.length === 0) {
    failures.push(`${card.id} has no related theory ids.`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

const lengths = cards.map((card) => card.explanation.length);
console.log(`Technique audit passed: ${cards.length} current-master cards, ${Math.min(...lengths)}-${Math.max(...lengths)} explanation chars.`);
