import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mappingPath = path.join(root, 'docs', 'shoseijutsuroku_theory_mapping_master336_final.md');
const auditPath = path.join(root, 'docs', 'shoseijutsuroku_theory_mapping_audit.md');
const batchDir = path.join(root, 'docs', 'theory-link-audit');
const techniquesPath = path.join(root, 'src', 'data', 'generated', 'techniques.json');
const theoriesPath = path.join(root, 'src', 'data', 'generated', 'theories.json');
const mapping = fs.readFileSync(mappingPath, 'utf8').replace(/\r/g, '');
const audit = fs.readFileSync(auditPath, 'utf8').replace(/\r/g, '');
const catalog = JSON.parse(fs.readFileSync(techniquesPath, 'utf8'));
const theories = JSON.parse(fs.readFileSync(theoriesPath, 'utf8'));
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const prefixes = { psychology: 'P', 'behavioral-science': 'B', 'organization-management': 'O', strategy: 'S', 'classics-thought': 'C', 'maxims-experience': 'Q' };
const displayIdByTagId = new Map();
const counts = new Map();
for (const theory of theories) {
  const next = (counts.get(theory.categoryId) ?? 0) + 1;
  counts.set(theory.categoryId, next);
  displayIdByTagId.set(theory.tagId, `${prefixes[theory.categoryId] ?? '理'}－${next}`);
}
const blocks = mapping.split(/^##\s+/m).slice(1);
const cardById = new Map(cards.map((card) => [card.id, card]));
const seenCards = new Set();
const reverse = new Map();
let edgeCount = 0;
for (const block of blocks) {
  const header = block.match(/^(master336-\d{3})｜(.+)\n/);
  if (!header) continue;
  const [, cardId, title] = header;
  const card = cardById.get(cardId);
  if (!card) throw new Error(`Unknown technique in final mapping: ${cardId}`);
  if (seenCards.has(cardId)) throw new Error(`Duplicate technique block: ${cardId}`);
  if (card.title !== title.trim()) throw new Error(`Technique title mismatch: ${cardId}`);
  seenCards.add(cardId);
  const links = [...block.matchAll(/^-\s+([PBOQCS]－\d+)｜(.+)$/gm)].map((match) => {
    const theory = [...displayIdByTagId.entries()].find(([, displayId]) => displayId === match[1]);
    if (!theory) throw new Error(`Unknown theory display ID: ${match[1]}`);
    const item = theoryById.get(theory[0]);
    if (item.title !== match[2].trim()) throw new Error(`Theory title mismatch: ${match[1]}`);
    return item.tagId;
  });
  if (!links.length) throw new Error(`${cardId} has no theory links.`);
  if (new Set(links).size !== links.length) throw new Error(`${cardId} has duplicate theory links.`);
  if (links.join('|') !== (card.relatedTheoryIds ?? []).join('|')) throw new Error(`${cardId} diverges from generated app data.`);
  edgeCount += links.length;
  for (const theoryId of links) reverse.set(theoryId, [...(reverse.get(theoryId) ?? []), cardId]);
}
if (seenCards.size !== 336) throw new Error(`Final mapping must contain 336 technique blocks; found ${seenCards.size}.`);
if (theories.length !== 630) throw new Error(`Theory catalog must contain 630 records; found ${theories.length}.`);
const auditTheorySection = audit.slice(audit.indexOf('## 理論起点監査'));
for (const theory of theories) {
  const displayId = displayIdByTagId.get(theory.tagId);
  if (!auditTheorySection.includes(`${displayId}｜${theory.title}`)) throw new Error(`Theory audit is missing ${displayId}｜${theory.title}.`);
}
for (let batch = 1; batch <= 24; batch += 1) {
  if (!fs.existsSync(path.join(batchDir, `technique-audit-${String(batch).padStart(2, '0')}.md`))) throw new Error(`Missing technique audit batch ${batch}.`);
}
for (let batch = 1; batch <= 21; batch += 1) {
  if (!fs.existsSync(path.join(batchDir, `theory-audit-${String(batch).padStart(2, '0')}.md`))) throw new Error(`Missing theory audit batch ${batch}.`);
}
const distribution = { '0件': 0, '1件': 0, '2件': 0, '3〜5件': 0, '6件以上': 0 };
for (const card of cards) {
  const count = card.relatedTheoryIds?.length ?? 0;
  if (count === 0) distribution['0件'] += 1;
  else if (count === 1) distribution['1件'] += 1;
  else if (count === 2) distribution['2件'] += 1;
  else if (count <= 5) distribution['3〜5件'] += 1;
  else distribution['6件以上'] += 1;
}
const linkedTheoryCount = reverse.size;
console.log(JSON.stringify({ techniques: seenCards.size, theories: theories.length, links: edgeCount, linkedTheories: linkedTheoryCount, unusedTheories: theories.length - linkedTheoryCount, distribution }, null, 2));
