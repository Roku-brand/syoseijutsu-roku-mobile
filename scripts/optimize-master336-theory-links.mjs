import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { master336TheoryLinks } from './master336-theory-links.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const techniquesPath = path.join(root, 'src/data/generated/techniques.json');
const theoriesPath = path.join(root, 'src/data/generated/theories.json');

const catalog = JSON.parse(fs.readFileSync(techniquesPath, 'utf8'));
const theories = JSON.parse(fs.readFileSync(theoriesPath, 'utf8'));
const validTheoryIds = new Set(theories.map(({ tagId }) => tagId));
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));

if (cards.length !== 336) throw new Error(`Expected 336 techniques, found ${cards.length}.`);
if (Object.keys(master336TheoryLinks).length !== cards.length) throw new Error('Theory-link map and catalog card counts differ.');

for (const card of cards) {
  const links = master336TheoryLinks[card.id];
  if (!links) throw new Error(`Missing curated theory links for ${card.id}: ${card.title}`);
  if (!links.length) throw new Error(`${card.id} must have at least one theory link.`);
  if (new Set(links).size !== links.length) throw new Error(`${card.id} has duplicate theory links.`);
  for (const id of links) if (!validTheoryIds.has(id)) throw new Error(`${card.id} references missing theory ${id}.`);
  card.relatedTheoryIds = links;
}

fs.writeFileSync(techniquesPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Optimized ${cards.length} technique→theory links using the curated 336-card map.`);
