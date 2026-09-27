import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async (name) => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));
const save = async (name, value) => fs.writeFile(path.join(root, name), `${JSON.stringify(value, null, 2)}\n`);
const theories = await load('src/data/generated/theories.json');
const catalog = await load('src/data/generated/techniques.json');
const primary = await load('src/data/generated/primary-theory-links.json');
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));

const supportPath = path.join(root, 'scripts/master336-wisdom-support-links.mjs');
const supportText = await fs.readFile(supportPath, 'utf8');
await fs.writeFile(supportPath, supportText.replace(/^  kb_(?:67[5-9]|68\d|69\d|700):.*\r?\n/gm, ''));

const prefixes = { psychology: 'P', 'behavioral-science': 'B', 'organization-management': 'O', strategy: 'S', 'practical-wisdom': 'W', 'classics-thought': 'C' };
const counts = {};
const displayById = new Map();
for (const theory of theories) {
  counts[theory.categoryId] = (counts[theory.categoryId] ?? 0) + 1;
  displayById.set(theory.tagId, `${prefixes[theory.categoryId]}－${counts[theory.categoryId]}`);
}
let md = '# master336 処世術→理論 紐づけ（網羅版・二段構成）\n\n';
md += '> 現在公開する理論に合わせて更新。主要理論とあわせて読む理論は、それぞれ理解の入口と補足の視点です。\n\n';
for (const card of cards.filter((item) => /^master336-(?:00[1-9]|0[1-9]\d|[12]\d{2}|3[0-2]\d|33[0-6])$/.test(item.id))) {
  const allMajor = primary[card.id] ?? [];
  const visible = (id) => Number(id.match(/\d+/)?.[0] ?? 0) <= 705;
  const major = allMajor.filter(visible);
  const supplementary = card.relatedTheoryIds.filter((id) => !allMajor.includes(id) && visible(id));
  const line = (id) => {
    const theory = theoryById.get(id);
    if (!theory) throw new Error(`Removed theory remains linked: ${id}`);
    return `- ${displayById.get(id)}｜${theory.title}`;
  };
  md += `## ${card.id}｜${card.title}\n\n### 主要理論\n\n${major.map(line).join('\n') || '- なし'}\n\n`;
  md += `### あわせて読む理論\n\n${supplementary.map(line).join('\n') || '- なし'}\n\n`;
  md += `合計：${major.length + supplementary.length}件（主要${major.length}件・あわせて読む${supplementary.length}件）。\n\n`;
}
await fs.writeFile(path.join(root, 'master336_theory_links_final.md'), md);

const auditPath = 'docs/theory-link-audit/content-review-summary.json';
const audit = await load(auditPath);
const linkedIds = new Set();
const categoryCoverage = Object.fromEntries(Object.entries(counts).map(([id, count]) => [id, { theories: count, linkedTheories: 0, links: 0 }]));
const distribution = {};
const primaryDistribution = {};
const supplementaryDistribution = {};
let links = 0;
let primaryLinks = 0;
for (const card of cards) {
  const ids = card.relatedTheoryIds ?? [];
  const majors = card.primaryTheoryIds ?? [];
  links += ids.length;
  primaryLinks += majors.length;
  distribution[ids.length] = (distribution[ids.length] ?? 0) + 1;
  primaryDistribution[majors.length] = (primaryDistribution[majors.length] ?? 0) + 1;
  supplementaryDistribution[ids.length - majors.length] = (supplementaryDistribution[ids.length - majors.length] ?? 0) + 1;
  for (const id of ids) {
    const category = theoryById.get(id)?.categoryId;
    if (!category) throw new Error(`Missing linked theory: ${id}`);
    categoryCoverage[category].links += 1;
    linkedIds.add(id);
  }
}
for (const id of linkedIds) categoryCoverage[theoryById.get(id).categoryId].linkedTheories += 1;
Object.assign(audit, {
  theories: theories.length,
  links,
  primaryLinks,
  supplementaryLinks: links - primaryLinks,
  linkedTheories: linkedIds.size,
  unlinkedTheories: theories.length - linkedIds.size,
  minimumLinksPerTechnique: Math.min(...cards.map((card) => card.relatedTheoryIds.length)),
  maximumLinksPerTechnique: Math.max(...cards.map((card) => card.relatedTheoryIds.length)),
  distribution,
  primaryDistribution,
  supplementaryDistribution,
  categoryCoverage,
  generatedAt: '2026-09-27',
});
audit.wisdomSupportLinks = categoryCoverage['practical-wisdom'].links + categoryCoverage['classics-thought'].links;
await save(auditPath, audit);
console.log(`Refreshed links for ${cards.length} techniques and ${theories.length} theories.`);
