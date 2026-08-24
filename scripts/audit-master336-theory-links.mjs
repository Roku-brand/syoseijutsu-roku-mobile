import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { master336TheoryLinks } from './master336-theory-links.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated/techniques.json'), 'utf8'));
const theories = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated/theories.json'), 'utf8'));
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const reverse = new Map();
let edgeCount = 0;

if (cards.length !== 336 || Object.keys(master336TheoryLinks).length !== 336) {
  throw new Error('The 336-card catalog and curated map must both be complete.');
}

for (const card of cards) {
  const actual = card.relatedTheoryIds ?? [];
  const expected = master336TheoryLinks[card.id];
  if (!expected) throw new Error(`No curated source-of-truth entry for ${card.id}.`);
  if (actual.length < 1 || actual.length > 2) throw new Error(`${card.id} has ${actual.length} theory links; expected 1–2.`);
  if (actual.join('|') !== expected.join('|')) throw new Error(`${card.id} diverges from its curated theory links.`);
  if (new Set(actual).size !== actual.length) throw new Error(`${card.id} has duplicate theory links.`);
  for (const theoryId of actual) {
    if (!theoryById.has(theoryId)) throw new Error(`${card.id} references missing theory ${theoryId}.`);
    const linkedCards = reverse.get(theoryId) ?? [];
    linkedCards.push(card);
    reverse.set(theoryId, linkedCards);
    edgeCount += 1;
  }
}

for (const [theoryId, linkedCards] of reverse) {
  if (linkedCards.length > 12) {
    throw new Error(`${theoryId} is linked to ${linkedCards.length} techniques; review for an overly broad relation.`);
  }
  for (const card of linkedCards) {
    if (!master336TheoryLinks[card.id].includes(theoryId)) {
      throw new Error(`Reverse-link verification failed for ${theoryId} ↔ ${card.id}.`);
    }
  }
}

const uniqueTheories = reverse.size;
console.log(`Bidirectional theory-link audit passed: ${cards.length} techniques, ${edgeCount} curated edges, ${uniqueTheories} linked theories.`);
