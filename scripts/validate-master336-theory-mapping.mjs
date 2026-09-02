import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { master336TheoryLinks } from './master336-theory-links.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const catalog = readJson('src/data/generated/techniques.json');
const theories = readJson('src/data/generated/theories.json');
const audit = readJson('docs/theory-link-audit/content-review-summary.json');
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items));
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));

if (cards.length !== 336) throw new Error(`Expected 336 techniques; found ${cards.length}.`);
if (theories.length !== 630) throw new Error(`Expected 630 theories; found ${theories.length}.`);
if (Object.keys(master336TheoryLinks).length !== cards.length) throw new Error('Reviewed map must contain every technique exactly once.');

let links = 0;
const linkedTheoryIds = new Set();
const distribution = new Map();
for (const card of cards) {
  const expected = master336TheoryLinks[card.id];
  const actual = card.relatedTheoryIds ?? [];
  if (!Array.isArray(expected)) throw new Error(`Missing reviewed mapping for ${card.id}.`);
  if (new Set(expected).size !== expected.length) throw new Error(`Duplicate reviewed link in ${card.id}.`);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Generated catalogue diverges from reviewed map: ${card.id}.`);
  for (const id of actual) {
    if (!theoryById.has(id)) throw new Error(`${card.id} references missing theory ${id}.`);
    linkedTheoryIds.add(id);
    links += 1;
  }
  distribution.set(actual.length, (distribution.get(actual.length) ?? 0) + 1);
}

// The review has no quota. A varied distribution is expected as a consequence
// of judging each card independently and guards against accidental rebalancing.
if (distribution.size < 3) throw new Error('Theory-link counts look artificially uniform.');
if (audit.reviewPolicy !== 'No target, minimum, or maximum count. Keep only direct and materially distinct explanatory links.') {
  throw new Error('Audit policy does not describe the content-only review.');
}
if (audit.links !== links || audit.linkedTheories !== linkedTheoryIds.size) throw new Error('Audit summary diverges from generated catalogue.');

const finalText = fs.readFileSync(path.join(root, 'master336_theory_links_final.md'), 'utf8').replace(/\r/g, '');
const finalBlocks = new Map(finalText.split(/^## /m).slice(1).map((block) => {
  const newline = block.indexOf('\n');
  const header = block.slice(0, newline);
  return [header.split('｜')[0], { header, body: block.slice(newline + 1) }];
}));
for (const card of cards) {
  const block = finalBlocks.get(card.id);
  if (!block) throw new Error(`Final mapping Markdown is missing ${card.id}.`);
  if (block.header !== `${card.id}｜${card.title}`) throw new Error(`Final mapping Markdown title diverges for ${card.id}.`);
  const listed = [...block.body.matchAll(/^- [PBOQCS]－\d+｜(.+)$/gm)].map((match) => match[1].trim());
  const expectedTitles = card.relatedTheoryIds.map((id) => theoryById.get(id).title);
  if (JSON.stringify(listed) !== JSON.stringify(expectedTitles)) throw new Error(`Final mapping Markdown diverges for ${card.id}.`);
}

const migrationText = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260903100000_content_based_theory_link_optimization.sql'), 'utf8');
if (!migrationText.includes('content-review-20260903') || !migrationText.includes('previous_theory_ids')) {
  throw new Error('Database migration is missing its rollback snapshot.');
}
for (const card of cards) {
  const occurrences = migrationText.split(`('${card.id}',`).length - 1;
  if (occurrences !== 2) throw new Error(`Database migration must carry ${card.id} in backup and update datasets.`);
}

console.log(JSON.stringify({
  techniques: cards.length,
  theories: theories.length,
  links,
  linkedTheories: linkedTheoryIds.size,
  unlinkedTheories: theories.length - linkedTheoryIds.size,
  distribution: Object.fromEntries([...distribution.entries()].sort(([left], [right]) => left - right)),
  rollbackSnapshot: true,
}, null, 2));
