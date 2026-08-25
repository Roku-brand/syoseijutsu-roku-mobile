import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/import-master336-markdown.mjs <source.md>');

const markdown = (await readFile(sourcePath, 'utf8')).replace(/^\uFEFF/, '').replace(/\r/g, '');
const generatedDir = path.join(root, 'src', 'data', 'generated');
const techniquesPath = path.join(generatedDir, 'techniques.json');
const previous = JSON.parse(await readFile(techniquesPath, 'utf8'));
const previousById = new Map(
  previous.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items)).map((card) => [card.id, card]),
);

const sourceItems = new Map();
let item;
let section;

function finishItem() {
  if (!item) return;
  item.essence = item.essence.trim();
  item.explanation = item.explanation.trim();
  if (!item.essence || !item.explanation) throw new Error(`Missing card content: ${item.id}`);
  if (sourceItems.has(item.id)) throw new Error(`Duplicate technique ID: ${item.id}`);
  sourceItems.set(item.id, item);
  item = undefined;
  section = undefined;
}

for (const line of markdown.split('\n')) {
  let match;
  if ((match = line.match(/^##\s+(.+)$/))) {
    finishItem();
    continue;
  }
  if ((match = line.match(/^###\s+(.+)$/))) {
    finishItem();
    continue;
  }
  if ((match = line.match(/^####\s+(master336-\d{3})\uff5c(.+)$/))) {
    finishItem();
    item = { id: match[1], title: match[2].trim(), essence: '', explanation: '' };
    continue;
  }
  if (!item) continue;
  if (line === '**\u672c\u8cea**') {
    section = 'essence';
    continue;
  }
  if (line === '**\u89e3\u8aac**') {
    section = 'explanation';
    continue;
  }
  if (/^\*\*.+\*\*$/.test(line)) {
    section = undefined;
    continue;
  }
  if (section) item[section] += `${item[section] && line ? '\n' : ''}${line}`;
}
finishItem();

if (sourceItems.size !== 336) throw new Error(`Expected 336 techniques, found ${sourceItems.size}.`);
if (sourceItems.size !== previousById.size || [...sourceItems.keys()].some((id) => !previousById.has(id))) {
  throw new Error('Source and current catalog IDs differ.');
}
const categories = previous.categories.map((category) => ({
  ...category,
  subcategories: category.subcategories.map((persona) => ({
    ...persona,
    items: persona.items.map((previousCard) => {
      const source = sourceItems.get(previousCard.id);
      return { ...previousCard, title: source.title, essence: source.essence, explanation: source.explanation, subtitle: source.essence };
    }),
  })),
}));
const cards = categories.flatMap((entry) => entry.subcategories.flatMap((group) => group.items));

const metadataPath = path.join(generatedDir, 'metadata.json');
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
metadata.source = path.basename(sourcePath);
metadata.techniqueCount = cards.length;
metadata.personaCount = categories.reduce((count, entry) => count + entry.subcategories.length, 0);
metadata.catalogVersion = 'master336';

await writeFile(techniquesPath, `${JSON.stringify({ categories }, null, 2)}\n`, 'utf8');
await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ source: path.basename(sourcePath), categories: categories.length, personas: metadata.personaCount, techniques: cards.length, explanationsImported: cards.length }, null, 2));
