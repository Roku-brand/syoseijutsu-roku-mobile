import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/import-master336-markdown.mjs <source.md>');

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
  if (!item.essence) throw new Error(`Missing essence: ${item.field} / ${item.persona} / ${item.title}`);
  persona.items.push(item);
  item = undefined;
}

for (const line of markdown.split('\n')) {
  let match;
  if ((match = line.match(/^##\s+(.+)$/))) {
    finishItem();
    const name = match[1].trim();
    const key = categoryKeys.get(name);
    if (!key) continue;
    category = { key, name, subcategories: [] };
    categories.push(category);
    persona = undefined;
    continue;
  }
  if ((match = line.match(/^###\s+(?:\d+\.\s*)?(.+)$/))) {
    finishItem();
    if (!category) throw new Error(`Persona outside category: ${line}`);
    persona = { name: match[1].trim(), articleTitle: match[1].trim(), items: [] };
    category.subcategories.push(persona);
    continue;
  }
  if ((match = line.match(/^(\d+)\.\s+(★+)\s+(.+)$/))) {
    finishItem();
    if (!category || !persona) throw new Error(`Technique outside persona: ${line}`);
    item = {
      field: category.name,
      persona: persona.name,
      number: Number(match[1]),
      importance: match[2].length,
      title: match[3].trim(),
    };
    continue;
  }
  if ((match = line.match(/^\*\*本質：\*\*\s*(.+)$/))) {
    if (!item) throw new Error(`Essence outside technique: ${line}`);
    item.essence = match[1].trim();
  }
}
finishItem();

const cards = categories.flatMap((entry) => entry.subcategories.flatMap((group) => group.items));
if (categories.length !== 3) throw new Error(`Expected 3 categories, found ${categories.length}.`);
if (cards.length !== 336) throw new Error(`Expected 336 techniques, found ${cards.length}.`);
if (new Set(cards.map((card) => `${card.field}\u0000${card.persona}\u0000${card.title}`)).size !== cards.length) {
  throw new Error('Duplicate category/persona/title technique key in source Markdown.');
}

let globalOrder = 0;
for (const entry of categories) {
  for (const group of entry.subcategories) {
    group.items = group.items.map((source) => {
      globalOrder += 1;
      return {
        id: `master336-${String(globalOrder).padStart(3, '0')}`,
        field: source.field,
        persona: source.persona,
        title: source.title,
        essence: source.essence,
        // The supplied master has no 解説. Never carry forward prose from the
        // replaced catalog, which would make a card contradict its new title.
        explanation: '',
        importance: source.importance,
        relatedTheoryIds: [],
        subtitle: source.essence,
        displayOrder: source.number,
        status: 'published',
      };
    });
  }
}

const generatedDir = path.join(root, 'src', 'data', 'generated');
const metadataPath = path.join(generatedDir, 'metadata.json');
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
metadata.source = path.basename(sourcePath);
metadata.techniqueCount = cards.length;
metadata.personaCount = categories.reduce((count, entry) => count + entry.subcategories.length, 0);
metadata.catalogVersion = 'master336';

await writeFile(path.join(generatedDir, 'techniques.json'), `${JSON.stringify({ categories }, null, 2)}\n`, 'utf8');
await writeFile(path.join(generatedDir, 'practical-actions.json'), '[]\n', 'utf8');
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  source: path.basename(sourcePath),
  categories: categories.length,
  personas: metadata.personaCount,
  techniques: cards.length,
  explanationsImported: 0,
}, null, 2));
