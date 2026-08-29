import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mappingPath = process.argv[2] ?? path.join(root, 'docs', 'shoseijutsuroku_theory_mapping_master336_final.md');
const techniquesPath = path.join(root, 'src', 'data', 'generated', 'techniques.json');
const theoriesPath = path.join(root, 'src', 'data', 'generated', 'theories.json');
const mapping = fs.readFileSync(mappingPath, 'utf8').replace(/\r/g, '');
const catalog = JSON.parse(fs.readFileSync(techniquesPath, 'utf8'));
const theories = JSON.parse(fs.readFileSync(theoriesPath, 'utf8'));
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
const theoryByDisplayId = new Map();
const prefixes = { psychology: 'P', 'behavioral-science': 'B', 'organization-management': 'O', strategy: 'S', 'classics-thought': 'C', 'maxims-experience': 'Q' };
const counts = new Map();
for (const theory of theories) {
  const next = (counts.get(theory.categoryId) ?? 0) + 1;
  counts.set(theory.categoryId, next);
  theoryByDisplayId.set(`${prefixes[theory.categoryId] ?? '理'}－${next}`, theory);
}
const cardById = new Map(cards.map((card) => [card.id, card]));
const blocks = mapping.split(/^##\s+/m).slice(1);
const seen = new Set();
for (const block of blocks) {
  const header = block.match(/^(master336-\d{3})｜(.+)\n/);
  if (!header) continue;
  const [, id, title] = header;
  const card = cardById.get(id);
  if (!card) throw new Error(`Mapping references unknown technique: ${id}`);
  if (card.title !== title.trim()) throw new Error(`Technique title mismatch for ${id}`);
  if (seen.has(id)) throw new Error(`Duplicate technique block: ${id}`);
  seen.add(id);
  const links = [...block.matchAll(/^-\s+([PBOQCS]－\d+)｜(.+)$/gm)].map((match) => {
    const theory = theoryByDisplayId.get(match[1]);
    if (!theory) throw new Error(`Unknown theory display ID: ${match[1]}`);
    if (theory.title !== match[2].trim()) throw new Error(`Theory title mismatch for ${match[1]}`);
    return theory.tagId;
  });
  if (!links.length) throw new Error(`${id} has no theory links.`);
  if (new Set(links).size !== links.length) throw new Error(`${id} has duplicate theory links.`);
  card.relatedTheoryIds = links;
}
if (seen.size !== 336) throw new Error(`Expected 336 mapping blocks; found ${seen.size}.`);
fs.writeFileSync(techniquesPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(JSON.stringify({ techniques: seen.size, links: cards.reduce((sum, card) => sum + (card.relatedTheoryIds?.length ?? 0), 0), mappingPath }, null, 2));
