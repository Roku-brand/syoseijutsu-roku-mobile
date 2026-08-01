import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/import-complete-markdown.mjs <source.md>');

const categoryMap = new Map([
  ['対人術', 'interpersonal'],
  ['仕事術', 'work'],
  ['人生術', 'life'],
]);

const markdown = await readFile(sourcePath, 'utf8');
const theories = JSON.parse(await readFile(path.join(root, 'src/data/generated/theories.json'), 'utf8'));
const theoryIdByTitle = new Map(theories.map((theory) => [theory.title, theory.tagId]));
let major = '', category = '', persona = '', current = null, body = [];
const cards = [];

const finish = () => {
  if (!current) return;
  cards.push({ ...current, explanation: body.join('\n').trim() });
  current = null;
  body = [];
};

for (const line of markdown.replace(/\r/g, '').split('\n')) {
  if (/^# (?!処世術禄)/.test(line)) { finish(); major = line.slice(2).trim(); continue; }
  if (/^## /.test(line)) { finish(); category = line.slice(3).trim(); continue; }
  if (/^### /.test(line)) { finish(); persona = line.slice(4).trim(); continue; }
  const item = line.match(/^\d+\.\s+(.+)/);
  if (item) { finish(); current = { title: item[1].trim(), subtitle: '', theory: '', major, category, persona }; continue; }
  if (!current) continue;
  if (/^\s*-\s*サブタイトル：/.test(line)) { current.subtitle = line.replace(/^\s*-\s*サブタイトル：/, '').trim(); continue; }
  if (/^\s*-\s*理論カード：/.test(line)) { current.theory = line.replace(/^\s*-\s*理論カード：/, '').trim(); continue; }
  if (/^\s*-\s*explanation：/.test(line)) continue;
  body.push(line);
}
finish();

const groups = new Map();
for (const [index, card] of cards.entries()) {
  const key = categoryMap.get(card.major);
  if (!key) throw new Error(`Unknown major category: ${card.major}`);
  const groupKey = `${key}:${card.category}:${card.persona}`;
  if (!groups.has(groupKey)) {
    groups.set(groupKey, { categoryKey: key, name: card.persona || card.category, articleTitle: card.category, items: [] });
  }
  const theoryTagIds = card.theory
    .split(/[／/]/)
    .map((title) => theoryIdByTitle.get(title.trim()))
    .filter(Boolean);
  groups.get(groupKey).items.push({
    id: `complete-${String(index + 1).padStart(3, '0')}`,
    title: card.title,
    subtitle: card.subtitle,
    explanation: card.explanation,
    theoryTagIds,
    tags: [card.category, card.persona].filter(Boolean),
    status: 'published',
    displayOrder: index + 1,
  });
}

const categories = [...categoryMap.entries()].map(([name, key]) => ({
  key,
  name,
  subcategories: [...groups.values()]
    .filter((group) => group.categoryKey === key)
    .map(({ categoryKey: _, ...group }) => group),
}));

if (cards.length !== 216) throw new Error(`Expected 216 cards, found ${cards.length}`);
await writeFile(
  path.join(root, 'src/data/generated/techniques.json'),
  `${JSON.stringify({ categories }, null, 2)}\n`,
  'utf8',
);
await writeFile(
  path.join(root, 'src/data/generated/metadata.json'),
  `${JSON.stringify({ importedAt: new Date().toISOString(), source: 'shoseijutsuroku_complete_216.md', techniqueCount: cards.length, theoryCount: theories.length }, null, 2)}\n`,
  'utf8',
);
console.log(`Imported ${cards.length} techniques.`);
