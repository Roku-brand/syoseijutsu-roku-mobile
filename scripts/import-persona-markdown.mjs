import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = process.argv[2];

if (!sourcePath) {
  throw new Error('Usage: node scripts/import-persona-markdown.mjs <source.md>');
}

const categoryKeys = new Map([
  ['対人術', 'interpersonal'],
  ['仕事術', 'work'],
  ['人生術', 'life'],
]);

const markdown = (await readFile(sourcePath, 'utf8')).replace(/\r/g, '');
const categories = [];
let category;
let persona;
let item;

function finishItem() {
  if (!item) return;
  if (!item.essence || !item.explanation) {
    throw new Error(`Incomplete card: ${item.category} / ${item.persona} / ${item.title}`);
  }
  persona.items.push(item);
  item = undefined;
}

for (const rawLine of markdown.split('\n')) {
  let match;
  if ((match = rawLine.match(/^##\s+(.+)$/))) {
    finishItem();
    const name = match[1].trim();
    const key = categoryKeys.get(name);
    if (!key) continue;
    category = { key, name, subcategories: [] };
    categories.push(category);
    persona = undefined;
    continue;
  }
  if ((match = rawLine.match(/^###\s+(?:\d+\.\s*)?(.+)$/))) {
    finishItem();
    if (!category) throw new Error(`Persona outside a category: ${rawLine}`);
    persona = { name: match[1].trim(), articleTitle: match[1].trim(), items: [] };
    category.subcategories.push(persona);
    continue;
  }
  if ((match = rawLine.match(/^-\s+(\d+)\.\s+(★+)\s+(.+)$/))) {
    finishItem();
    if (!category || !persona) throw new Error(`Card outside a persona: ${rawLine}`);
    item = {
      category: category.name,
      persona: persona.name,
      number: Number(match[1]),
      importance: match[2].length,
      title: match[3].trim(),
    };
    continue;
  }
  if ((match = rawLine.match(/^\s+\*\*本質：\*\*\s*(.+)$/))) {
    if (!item) throw new Error(`Essence outside a card: ${rawLine}`);
    item.essence = match[1].trim();
    continue;
  }
  if ((match = rawLine.match(/^\s+\*\*解説：\*\*\s*(.+)$/))) {
    if (!item) throw new Error(`Explanation outside a card: ${rawLine}`);
    item.explanation = match[1].trim();
  }
}
finishItem();

const cards = categories.flatMap((entry) => entry.subcategories.flatMap((group) => group.items));
if (categories.length !== 3) throw new Error(`Expected 3 categories, found ${categories.length}`);
if (cards.length !== 473) throw new Error(`Expected 473 cards, found ${cards.length}`);
if (new Set(cards.map((card) => `${card.category}\u0000${card.persona}\u0000${card.title}`)).size !== cards.length) {
  throw new Error('Duplicate category/persona/title card key in source Markdown.');
}

let globalOrder = 0;
for (const entry of categories) {
  for (const group of entry.subcategories) {
    group.items = group.items.map((source) => {
      globalOrder += 1;
      return {
        id: `latest-${String(globalOrder).padStart(3, '0')}`,
        field: source.category,
        persona: source.persona,
        title: source.title,
        essence: source.essence,
        explanation: source.explanation,
        importance: source.importance,
        relatedTheoryIds: [],
        subtitle: source.essence,
        displayOrder: source.number,
        status: 'published',
      };
    });
  }
}

const generated = path.join(root, 'src', 'data', 'generated');
const metadataPath = path.join(generated, 'metadata.json');
const oldMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));
const learningPath = path.join(generated, 'learning.json');
const learning = JSON.parse(await readFile(learningPath, 'utf8')).map((entry) => ({ ...entry, relatedCardIds: [] }));

await writeFile(path.join(generated, 'techniques.json'), `${JSON.stringify({ categories }, null, 2)}\n`, 'utf8');
await writeFile(path.join(generated, 'practical-actions.json'), '[]\n', 'utf8');
await writeFile(learningPath, `${JSON.stringify(learning, null, 2)}\n`, 'utf8');
await writeFile(metadataPath, `${JSON.stringify({
  ...oldMetadata,
  source: path.basename(sourcePath),
  techniqueCount: cards.length,
  personaCount: categories.reduce((count, entry) => count + entry.subcategories.length, 0),
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  source: sourcePath,
  categories: categories.length,
  personas: categories.reduce((count, entry) => count + entry.subcategories.length, 0),
  techniques: cards.length,
  practicalActions: 0,
  learningLinks: 0,
}, null, 2));
