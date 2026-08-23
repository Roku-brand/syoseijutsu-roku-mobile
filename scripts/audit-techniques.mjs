import fs from 'node:fs';

const source = JSON.parse(fs.readFileSync('src/data/generated/techniques.json', 'utf8'));
const cards = source.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items));
const failures = [];
const ids = new Set();
const cardKeys = new Set();

for (const category of source.categories) {
  for (const persona of category.subcategories) {
    if (persona.items.length > 20) failures.push(`${category.name} / ${persona.name} exceeds the 20-card limit.`);
  }
}

for (const card of cards) {
  if (ids.has(card.id)) failures.push(`Duplicate id: ${card.id}`);
  ids.add(card.id);
  const cardKey = `${card.field}\u0000${card.persona}\u0000${card.title}`;
  if (cardKeys.has(cardKey)) failures.push(`Duplicate card within persona: ${card.title}`);
  cardKeys.add(cardKey);
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
