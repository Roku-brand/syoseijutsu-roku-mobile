import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { master336TheoryLinks } from './master336-theory-links.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const techniquesPath = path.join(root, 'src/data/generated/techniques.json');
const theoriesPath = path.join(root, 'src/data/generated/theories.json');
const finalMappingPaths = [
  path.join(root, 'master336_theory_links_final.md'),
  path.join(root, 'docs', 'shoseijutsuroku_theory_mapping_master336_final.md'),
];
const auditPath = path.join(root, 'docs', 'theory-link-audit', 'content-review-summary.json');
const migrationPath = path.join(root, 'supabase', 'migrations', '20260903100000_content_based_theory_link_optimization.sql');

const catalog = JSON.parse(fs.readFileSync(techniquesPath, 'utf8'));
const theories = JSON.parse(fs.readFileSync(theoriesPath, 'utf8'));
const validTheoryIds = new Set(theories.map(({ tagId }) => tagId));
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));

if (cards.length !== 336) throw new Error(`Expected 336 techniques, found ${cards.length}.`);
if (Object.keys(master336TheoryLinks).length !== cards.length) throw new Error('Theory-link map and catalog card counts differ.');

for (const card of cards) {
  const links = master336TheoryLinks[card.id];
  if (!links) throw new Error(`Missing curated theory links for ${card.id}: ${card.title}`);
  if (new Set(links).size !== links.length) throw new Error(`${card.id} has duplicate theory links.`);
  for (const id of links) if (!validTheoryIds.has(id)) throw new Error(`${card.id} references missing theory ${id}.`);
  card.relatedTheoryIds = links;
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
  '# master336 処世術→理論 紐づけ（内容基準・最適化版）',
  '',
  '> 件数の下限・上限・目標値は設けず、処世術の作用を直接説明し、かつ他の採用理論と役割が重複しない理論だけを掲載する。',
  '',
];
for (const card of cards) {
  markdown.push(`## ${card.id}｜${card.title}`, '');
  for (const id of card.relatedTheoryIds ?? []) {
    const theory = theoryById.get(id);
    markdown.push(`- ${displayIdByTheoryId.get(id)}｜${theory.title}`);
  }
  markdown.push('', `判定：${card.relatedTheoryIds.length}件。件数ではなく内容の必要性で採用。`, '');
}
for (const outputPath of finalMappingPaths) fs.writeFileSync(outputPath, `${markdown.join('\n')}\n`);

const counts = cards.map((card) => card.relatedTheoryIds.length);
const distribution = Object.fromEntries([...new Set(counts)].sort((a, b) => a - b).map((count) => [String(count), counts.filter((value) => value === count).length]));
const linkedTheoryIds = new Set(cards.flatMap((card) => card.relatedTheoryIds));
const audit = {
  reviewPolicy: 'No target, minimum, or maximum count. Keep only direct and materially distinct explanatory links.',
  techniques: cards.length,
  theories: theories.length,
  links: counts.reduce((sum, count) => sum + count, 0),
  linkedTheories: linkedTheoryIds.size,
  unlinkedTheories: theories.length - linkedTheoryIds.size,
  minimumLinksPerTechnique: Math.min(...counts),
  maximumLinksPerTechnique: Math.max(...counts),
  distribution,
  generatedAt: '2026-09-03',
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

const sqlQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const valueRows = cards.map((card) => `    (${sqlQuote(card.id)}, ${sqlQuote(JSON.stringify(card.relatedTheoryIds))}::jsonb)`).join(',\n');
const migration = `-- Content-based theory-link review for all 336 techniques.\n-- The pre-change values are retained in the same database for a lossless rollback.\ncreate table if not exists public.theory_link_optimization_backups (\n  optimization_key text not null,\n  technique_id text not null references public.techniques(id) on delete cascade,\n  previous_theory_ids jsonb not null,\n  optimized_theory_ids jsonb not null,\n  backed_up_at timestamptz not null default now(),\n  primary key (optimization_key, technique_id)\n);\n\nalter table public.theory_link_optimization_backups enable row level security;\nrevoke all on table public.theory_link_optimization_backups from anon, authenticated;\n\nwith optimized(technique_id, theory_ids) as (\n  values\n${valueRows}\n)\ninsert into public.theory_link_optimization_backups (optimization_key, technique_id, previous_theory_ids, optimized_theory_ids)\nselect 'content-review-20260903', technique.id, technique.theory_ids, optimized.theory_ids\nfrom optimized\njoin public.techniques as technique on technique.id = optimized.technique_id\non conflict (optimization_key, technique_id) do nothing;\n\nwith optimized(technique_id, theory_ids) as (\n  values\n${valueRows}\n)\nupdate public.techniques as technique\nset theory_ids = optimized.theory_ids, updated_at = now()\nfrom optimized\nwhere technique.id = optimized.technique_id\n  and technique.theory_ids is distinct from optimized.theory_ids;\n`;
fs.writeFileSync(migrationPath, migration);

console.log(`Optimized ${cards.length} technique→theory links using content necessity only.`);
console.log(JSON.stringify(audit, null, 2));
