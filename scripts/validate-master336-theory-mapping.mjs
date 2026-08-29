import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const catalog = readJson('src/data/generated/techniques.json');
const theories = readJson('src/data/generated/theories.json');
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items));
if (cards.length !== 336) throw new Error(`Expected 336 techniques; found ${cards.length}.`);
if (theories.length !== 630) throw new Error(`Expected 630 theories; found ${theories.length}.`);
const cardById = new Map(cards.map((card) => [card.id, card]));
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const prefixes = { psychology: 'P', 'behavioral-science': 'B', 'organization-management': 'O', strategy: 'S', 'classics-thought': 'C', 'maxims-experience': 'Q' };
const counts = new Map();
const theoryByDisplay = new Map();
for (const theory of theories) {
  const n = (counts.get(theory.categoryId) ?? 0) + 1;
  counts.set(theory.categoryId, n);
  theoryByDisplay.set(`${prefixes[theory.categoryId]}－${n}`, theory);
}

const finalText = fs.readFileSync(path.join(root, 'master336_theory_links_final.md'), 'utf8').replace(/\r/g, '');
const blocks = finalText.split(/^##\s+/m).slice(1);
const seenCards = new Set();
const finalEdges = new Set();
for (const block of blocks) {
  const header = block.match(/^(master336-\d{3})｜(.+)\n/);
  if (!header) continue;
  const [, cardId, title] = header;
  const card = cardById.get(cardId);
  if (!card) throw new Error(`Unknown technique: ${cardId}`);
  if (seenCards.has(cardId)) throw new Error(`Duplicate technique block: ${cardId}`);
  if (card.title !== title.trim()) throw new Error(`Technique title mismatch: ${cardId}`);
  seenCards.add(cardId);
  const links = [...block.matchAll(/^-\s+([PBOQCS]－\d+)｜(.+)$/gm)];
  const ids = [];
  for (const [, displayId, theoryTitle] of links) {
    const theory = theoryByDisplay.get(displayId);
    if (!theory) throw new Error(`Unknown theory display ID: ${displayId}`);
    if (theory.title !== theoryTitle.trim()) throw new Error(`Theory title mismatch: ${displayId}`);
    ids.push(theory.tagId);
    finalEdges.add(`${cardId}|${theory.tagId}`);
  }
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate theory link in ${cardId}`);
  if ((card.relatedTheoryIds ?? []).join('|') !== ids.join('|')) throw new Error(`App data diverges from final Markdown: ${cardId}`);
}
if (seenCards.size !== 336) throw new Error(`Final Markdown must contain 336 techniques; found ${seenCards.size}.`);

const batchTheoryIds = new Set();
const secondEdges = new Set();
for (let batch = 1; batch <= 63; batch += 1) {
  const file = path.join(root, `theory_to_master_batch_${String(batch).padStart(2, '0')}.md`);
  if (!fs.existsSync(file)) throw new Error(`Missing second-scan batch: ${file}`);
  let current = null;
  let theoryCount = 0;
  for (const line of fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n')) {
    const header = line.match(/^##\s+([PBOQCS]－\d+)｜(.+)$/);
    if (header) {
      const theory = theoryByDisplay.get(header[1]);
      if (!theory || theory.title !== header[2].trim()) throw new Error(`Batch theory mismatch: ${header[1]}`);
      if (batchTheoryIds.has(theory.tagId)) throw new Error(`Duplicate theory across batches: ${header[1]}`);
      batchTheoryIds.add(theory.tagId); current = theory; theoryCount += 1; continue;
    }
    const link = line.match(/^-\s+(master336-\d{3})｜(.+)$/);
    if (!link || !current) continue;
    const card = cardById.get(link[1]);
    if (!card || card.title !== link[2].trim()) throw new Error(`Batch technique mismatch: ${link[1]}`);
    secondEdges.add(`${link[1]}|${current.tagId}`);
  }
  if (theoryCount !== 10) throw new Error(`Batch ${batch} must contain 10 theories; found ${theoryCount}.`);
}
if (batchTheoryIds.size !== 630) throw new Error(`Second scan must contain 630 theories; found ${batchTheoryIds.size}.`);

const firstSnapshot = readJson('docs/theory-link-audit/first-scan-links.json');
const firstEdges = new Set(firstSnapshot.flatMap((card) => (card.relatedTheoryIds ?? []).map((theoryId) => `${card.id}|${theoryId}`)));
const onlyFirst = [...firstEdges].filter((edge) => !secondEdges.has(edge));
const onlySecond = [...secondEdges].filter((edge) => !firstEdges.has(edge));
const both = [...firstEdges].filter((edge) => secondEdges.has(edge));
const reverseTheoryCounts = new Map(theories.map((theory) => [theory.tagId, 0]));
for (const edge of finalEdges) reverseTheoryCounts.set(edge.split('|')[1], reverseTheoryCounts.get(edge.split('|')[1]) + 1);
if (!finalEdges.has('master336-154|kb_070')) throw new Error('Required link O－20 → master336-154 is missing.');
const report = readJson('theory_to_master_verification.json');
if (report.finalAdoptedLinks !== finalEdges.size) throw new Error('Verification report count diverges from final Markdown.');
console.log(JSON.stringify({
  techniques: seenCards.size,
  theories: theories.length,
  batches: 63,
  secondScanLinks: secondEdges.size,
  firstOnlyLinks: onlyFirst.length,
  secondOnlyLinks: onlySecond.length,
  bothDirectionLinks: both.length,
  finalAdoptedLinks: finalEdges.size,
  unlinkedTheories: [...reverseTheoryCounts.values()].filter((count) => count === 0).length,
  highTechniqueCounts: cards.filter((card) => (card.relatedTheoryIds ?? []).length >= 10).map((card) => [card.id, card.relatedTheoryIds.length]),
  highTheoryCounts: [...reverseTheoryCounts.entries()].filter(([, count]) => count >= 20).length,
}, null, 2));
