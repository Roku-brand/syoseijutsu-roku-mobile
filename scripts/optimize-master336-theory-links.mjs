import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { master336PrimaryTheoryLinks } from './master336-theory-links.mjs';
import { wisdomSupportTechniqueIdsByTheoryId } from './master336-wisdom-support-links.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const techniquesPath = path.join(root, 'src/data/generated/techniques.json');
const theoriesPath = path.join(root, 'src/data/generated/theories.json');
const comprehensiveLinksPath = path.join(root, 'src/data/generated/comprehensive-theory-links.json');
const primaryLinksPath = path.join(root, 'src/data/generated/primary-theory-links.json');
const finalMappingPaths = [
  path.join(root, 'master336_theory_links_final.md'),
  path.join(root, 'docs', 'shoseijutsuroku_theory_mapping_master336_final.md'),
];
const auditPath = path.join(root, 'docs', 'theory-link-audit', 'content-review-summary.json');
const migrationPath = path.join(root, 'supabase', 'migrations', '20260903113000_comprehensive_theory_link_groups.sql');

const catalog = JSON.parse(fs.readFileSync(techniquesPath, 'utf8'));
const theories = JSON.parse(fs.readFileSync(theoriesPath, 'utf8'));
const comprehensiveLinks = JSON.parse(fs.readFileSync(comprehensiveLinksPath, 'utf8'));
const primaryLinks = JSON.parse(fs.readFileSync(primaryLinksPath, 'utf8'));
const validTheoryIds = new Set(theories.map(({ tagId }) => tagId));
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
const wisdomSupportByTechniqueId = new Map(cards.map((card) => [card.id, []]));

for (const [theoryId, techniqueIds] of Object.entries(wisdomSupportTechniqueIdsByTheoryId)) {
  const theory = theoryById.get(theoryId);
  if (!theory || !['classics-thought', 'maxims-experience'].includes(theory.categoryId)) {
    throw new Error(`Wisdom support map references a non-wisdom theory: ${theoryId}.`);
  }
  for (const techniqueId of techniqueIds) {
    const links = wisdomSupportByTechniqueId.get(techniqueId);
    if (!links) throw new Error(`Wisdom support map references a missing technique: ${techniqueId}.`);
    links.push(theoryId);
  }
}

if (cards.length !== 356) throw new Error(`Expected 356 techniques, found ${cards.length}.`);
if (Object.keys(comprehensiveLinks).length !== cards.length) throw new Error('Comprehensive theory-link map and catalog card counts differ.');
if (Object.keys(primaryLinks).length !== cards.length) throw new Error('Primary theory-link map and catalog card counts differ.');
if (JSON.stringify(primaryLinks) !== JSON.stringify(master336PrimaryTheoryLinks)) throw new Error('Primary theory-link JSON diverges from its curated source.');

for (const card of cards) {
  const allLinks = [...new Set([
    ...comprehensiveLinks[card.id],
    ...(wisdomSupportByTechniqueId.get(card.id) ?? []),
  ])];
  const representativeLinks = primaryLinks[card.id];
  if (!allLinks || !representativeLinks) throw new Error(`Missing grouped theory links for ${card.id}: ${card.title}`);
  if (new Set(allLinks).size !== allLinks.length) throw new Error(`${card.id} has duplicate comprehensive theory links.`);
  if (new Set(representativeLinks).size !== representativeLinks.length) throw new Error(`${card.id} has duplicate primary theory links.`);
  for (const id of allLinks) if (!validTheoryIds.has(id)) throw new Error(`${card.id} references missing theory ${id}.`);
  for (const id of representativeLinks) if (!allLinks.includes(id)) throw new Error(`${card.id} primary theory ${id} is absent from the comprehensive map.`);
  card.relatedTheoryIds = allLinks;
  card.primaryTheoryIds = representativeLinks;
}

fs.writeFileSync(techniquesPath, `${JSON.stringify(catalog, null, 2)}\n`);

const displayPrefixes = {
  psychology: 'P',
  'behavioral-science': 'B',
  'organization-management': 'O',
  strategy: 'S',
  'classics-thought': 'C',
  'maxims-experience': 'Q',
};
const categoryCounts = new Map();
const displayIdByTheoryId = new Map();
for (const theory of theories) {
  const next = (categoryCounts.get(theory.categoryId) ?? 0) + 1;
  categoryCounts.set(theory.categoryId, next);
  displayIdByTheoryId.set(theory.tagId, `${displayPrefixes[theory.categoryId] ?? '理'}－${next}`);
}

const markdown = [
  '# master336 処世術→理論 紐づけ（網羅版・二段構成）',
  '',
  '> 網羅性を優先し、理解の入口となる代表理論を「主要理論」、類似理論・補完理論・別視点の理論を「あわせて読む理論」として整理する。後者は重要度が低いことを意味しない。',
  '',
];
for (const card of cards) {
  markdown.push(`## ${card.id}｜${card.title}`, '');
  markdown.push('### 主要理論', '');
  for (const id of card.primaryTheoryIds ?? []) {
    const theory = theoryById.get(id);
    markdown.push(`- ${displayIdByTheoryId.get(id)}｜${theory.title}`);
  }
  const supplementary = card.relatedTheoryIds.filter((id) => !card.primaryTheoryIds.includes(id));
  markdown.push('', '### あわせて読む理論', '');
  if (supplementary.length) {
    for (const id of supplementary) {
      const theory = theoryById.get(id);
      markdown.push(`- ${displayIdByTheoryId.get(id)}｜${theory.title}`);
    }
  } else {
    markdown.push('- なし');
  }
  markdown.push('', `合計：${card.relatedTheoryIds.length}件（主要${card.primaryTheoryIds.length}件・あわせて読む${supplementary.length}件）。`, '');
}
for (const outputPath of finalMappingPaths) fs.writeFileSync(outputPath, `${markdown.join('\n')}\n`);

const counts = cards.map((card) => card.relatedTheoryIds.length);
const primaryCounts = cards.map((card) => card.primaryTheoryIds.length);
const supplementaryCounts = cards.map((card) => card.relatedTheoryIds.length - card.primaryTheoryIds.length);
const distribution = Object.fromEntries([...new Set(counts)].sort((a, b) => a - b).map((count) => [String(count), counts.filter((value) => value === count).length]));
const linkedTheoryIds = new Set(cards.flatMap((card) => card.relatedTheoryIds));
const categoryCoverage = Object.fromEntries(
  [...new Set(theories.map((theory) => theory.categoryId))].map((categoryId) => {
    const categoryTheories = theories.filter((theory) => theory.categoryId === categoryId);
    const categoryIds = new Set(categoryTheories.map((theory) => theory.tagId));
    const categoryLinks = cards.reduce(
      (sum, card) => sum + card.relatedTheoryIds.filter((id) => categoryIds.has(id)).length,
      0,
    );
    return [categoryId, {
      theories: categoryTheories.length,
      linkedTheories: categoryTheories.filter((theory) => linkedTheoryIds.has(theory.tagId)).length,
      links: categoryLinks,
    }];
  }),
);
const audit = {
  reviewPolicy: 'Prefer comprehensive coverage. Primary theories are representative entry points; supplementary theories contain similar, complementary, and alternate perspectives without implying lower importance.',
  techniques: cards.length,
  theories: theories.length,
  links: counts.reduce((sum, count) => sum + count, 0),
  primaryLinks: primaryCounts.reduce((sum, count) => sum + count, 0),
  supplementaryLinks: supplementaryCounts.reduce((sum, count) => sum + count, 0),
  linkedTheories: linkedTheoryIds.size,
  unlinkedTheories: theories.length - linkedTheoryIds.size,
  minimumLinksPerTechnique: Math.min(...counts),
  maximumLinksPerTechnique: Math.max(...counts),
  distribution,
  primaryDistribution: Object.fromEntries([...new Set(primaryCounts)].sort((a, b) => a - b).map((count) => [String(count), primaryCounts.filter((value) => value === count).length])),
  supplementaryDistribution: Object.fromEntries([...new Set(supplementaryCounts)].sort((a, b) => a - b).map((count) => [String(count), supplementaryCounts.filter((value) => value === count).length])),
  wisdomSupportLinks: Object.values(wisdomSupportTechniqueIdsByTheoryId).reduce((sum, ids) => sum + ids.length, 0),
  categoryCoverage,
  generatedAt: '2026-09-03',
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

const sqlQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const valueRows = cards.map((card) => `    (${sqlQuote(card.id)}, ${sqlQuote(JSON.stringify(card.relatedTheoryIds))}::jsonb)`).join(',\n');
const migration = `-- Restore comprehensive coverage and keep the 513-link version as a rollback snapshot.\nwith comprehensive(technique_id, theory_ids) as (\n  values\n${valueRows}\n)\ninsert into public.theory_link_optimization_backups (optimization_key, technique_id, previous_theory_ids, optimized_theory_ids)\nselect 'comprehensive-groups-20260903', technique.id, technique.theory_ids, comprehensive.theory_ids\nfrom comprehensive\njoin public.techniques as technique on technique.id = comprehensive.technique_id\non conflict (optimization_key, technique_id) do nothing;\n\nwith comprehensive(technique_id, theory_ids) as (\n  values\n${valueRows}\n)\nupdate public.techniques as technique\nset theory_ids = comprehensive.theory_ids, updated_at = now()\nfrom comprehensive\nwhere technique.id = comprehensive.technique_id\n  and technique.theory_ids is distinct from comprehensive.theory_ids;\n`;
fs.writeFileSync(migrationPath, migration);

console.log(`Grouped ${cards.length} technique→theory links for comprehensive reading.`);
console.log(JSON.stringify(audit, null, 2));
