import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { master336PrimaryTheoryLinks } from './master336-theory-links.mjs';
import { wisdomSupportTechniqueIdsByTheoryId } from './master336-wisdom-support-links.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const catalog = readJson('src/data/generated/techniques.json');
const theories = readJson('src/data/generated/theories.json');
const comprehensive = readJson('src/data/generated/comprehensive-theory-links.json');
const primary = readJson('src/data/generated/primary-theory-links.json');
const audit = readJson('docs/theory-link-audit/content-review-summary.json');
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items));
const cardById = new Map(cards.map((card) => [card.id, card]));
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const wisdomSupportByTechniqueId = new Map(cards.map((card) => [card.id, []]));

if (cards.length !== 336) throw new Error(`Expected 336 techniques; found ${cards.length}.`);
if (theories.length !== 630) throw new Error(`Expected 630 theories; found ${theories.length}.`);
if (Object.keys(comprehensive).length !== cards.length) throw new Error('Comprehensive map must contain every technique exactly once.');
if (Object.keys(primary).length !== cards.length) throw new Error('Primary map must contain every technique exactly once.');
if (JSON.stringify(primary) !== JSON.stringify(master336PrimaryTheoryLinks)) throw new Error('Primary JSON diverges from its curated source.');

for (const [theoryId, techniqueIds] of Object.entries(wisdomSupportTechniqueIdsByTheoryId)) {
  const theory = theoryById.get(theoryId);
  if (!theory || !['classics-thought', 'maxims-experience'].includes(theory.categoryId)) {
    throw new Error(`Wisdom support entry is not a classical/maxim card: ${theoryId}.`);
  }
  if (new Set(techniqueIds).size !== techniqueIds.length) throw new Error(`Duplicate support target for ${theoryId}.`);
  for (const techniqueId of techniqueIds) {
    if (!cardById.has(techniqueId)) throw new Error(`Missing wisdom support target: ${techniqueId}.`);
    wisdomSupportByTechniqueId.get(techniqueId).push(theoryId);
  }
}

let links = 0;
let primaryLinks = 0;
const linkedTheoryIds = new Set();
const distribution = new Map();
for (const card of cards) {
  const expectedAll = [...new Set([
    ...(comprehensive[card.id] ?? []),
    ...(wisdomSupportByTechniqueId.get(card.id) ?? []),
  ])];
  const expectedPrimary = primary[card.id];
  const actualAll = card.relatedTheoryIds ?? [];
  const actualPrimary = card.primaryTheoryIds ?? [];
  if (!Array.isArray(expectedPrimary)) throw new Error(`Missing primary mapping for ${card.id}.`);
  if (new Set(actualAll).size !== actualAll.length) throw new Error(`Duplicate comprehensive link in ${card.id}.`);
  if (new Set(actualPrimary).size !== actualPrimary.length) throw new Error(`Duplicate primary link in ${card.id}.`);
  if (JSON.stringify(actualAll) !== JSON.stringify(expectedAll)) throw new Error(`Generated comprehensive map diverges for ${card.id}.`);
  if (JSON.stringify(actualPrimary) !== JSON.stringify(expectedPrimary)) throw new Error(`Generated primary map diverges for ${card.id}.`);
  for (const id of actualPrimary) if (!actualAll.includes(id)) throw new Error(`${card.id} has a primary theory outside its comprehensive set: ${id}.`);
  for (const id of actualAll) {
    if (!theoryById.has(id)) throw new Error(`${card.id} references missing theory ${id}.`);
    linkedTheoryIds.add(id);
    links += 1;
  }
  primaryLinks += actualPrimary.length;
  distribution.set(actualAll.length, (distribution.get(actualAll.length) ?? 0) + 1);
}

// 古典・名言は網羅数を稼ぐためではなく、個別に指定した処世術の判断を
// 補強する層として全カードから到達可能にする。
for (const theory of theories.filter((item) => ['classics-thought', 'maxims-experience'].includes(item.categoryId))) {
  if (!linkedTheoryIds.has(theory.tagId)) throw new Error(`Wisdom card remains unreachable: ${theory.tagId} ${theory.title}.`);
}

const expectedPolicy = 'Prefer comprehensive coverage. Primary theories are representative entry points; supplementary theories contain similar, complementary, and alternate perspectives without implying lower importance.';
if (audit.reviewPolicy !== expectedPolicy) throw new Error('Audit policy does not describe the comprehensive two-group review.');
if (audit.links !== links || audit.primaryLinks !== primaryLinks || audit.supplementaryLinks !== links - primaryLinks) {
  throw new Error('Audit link counts diverge from the generated catalogue.');
}
if (audit.linkedTheories !== linkedTheoryIds.size) throw new Error('Audit theory coverage diverges from the generated catalogue.');
if (audit.categoryCoverage?.['classics-thought']?.linkedTheories !== 59) throw new Error('All 59 classical cards must remain reachable.');
if (audit.categoryCoverage?.['maxims-experience']?.linkedTheories !== 76) throw new Error('All 76 maxim cards must remain reachable.');

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
  if (!block.body.includes('### 主要理論') || !block.body.includes('### あわせて読む理論')) {
    throw new Error(`Final mapping Markdown is missing grouped headings for ${card.id}.`);
  }
  const listed = [...block.body.matchAll(/^- [PBOQCS]－\d+｜(.+)$/gm)].map((match) => match[1].trim());
  const supplementaryIds = card.relatedTheoryIds.filter((id) => !card.primaryTheoryIds.includes(id));
  const expectedTitles = [...card.primaryTheoryIds, ...supplementaryIds].map((id) => theoryById.get(id).title);
  if (JSON.stringify(listed) !== JSON.stringify(expectedTitles)) throw new Error(`Final mapping Markdown diverges for ${card.id}.`);
}

const migrationText = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260903113000_comprehensive_theory_link_groups.sql'), 'utf8');
if (!migrationText.includes('comprehensive-groups-20260903') || !migrationText.includes('previous_theory_ids')) {
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
  primaryLinks,
  supplementaryLinks: links - primaryLinks,
  linkedTheories: linkedTheoryIds.size,
  unlinkedTheories: theories.length - linkedTheoryIds.size,
  classicsReachable: 59,
  maximsReachable: 76,
  distribution: Object.fromEntries([...distribution.entries()].sort(([left], [right]) => left - right)),
  rollbackSnapshot: true,
}, null, 2));
