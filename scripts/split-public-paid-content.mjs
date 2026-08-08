import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const freeTechniqueIds = new Set([
  'complete-001','complete-002','complete-003','complete-004','complete-005',
  'complete-006','complete-007','complete-008','complete-009','complete-010','complete-011','complete-012','complete-013','complete-014',
  'complete-100','complete-101','complete-102','complete-103','complete-104',
  'complete-161','complete-162','complete-163','complete-164','complete-165',
  'complete-183','complete-184','complete-187','complete-188','complete-189',
]);
const freeTheoryIds = new Set([
  'kb_001','kb_004','kb_005','kb_007','kb_008','kb_009','kb_010','kb_013',
  'kb_130','kb_131','kb_132','kb_133','kb_134','kb_136',
  'kb_221','kb_222','kb_223','kb_224','kb_225','kb_228',
]);
const freeLearningIds = new Set(Array.from({ length: 7 }, (_, index) => `case-${String(index + 1).padStart(2, '0')}`));

const root = process.cwd();
const techniques = JSON.parse(await readFile(path.join(root, 'src/data/generated/techniques.json'), 'utf8'));
const theories = JSON.parse(await readFile(path.join(root, 'src/data/generated/theories.json'), 'utf8'));

async function loadLearningCases() {
  const generatedPath = path.join(root, 'src/data/generated/learning.full.json');
  const generated = await readFile(generatedPath, 'utf8').catch(() => null);
  if (generated) return JSON.parse(generated);

  const publicGeneratedPath = path.join(root, 'src/data/generated/learning.json');
  const publicGenerated = await readFile(publicGeneratedPath, 'utf8').catch(() => null);
  if (publicGenerated) return JSON.parse(publicGenerated);

  const source = await readFile(path.join(root, 'src/data/learning.ts'), 'utf8');
  const match = source.match(/const rawLearningCases:\s*LearningCase\[\]\s*=\s*(\[[\s\S]*?\n\]);/);
  if (!match) throw new Error('Unable to extract learning cases from src/data/learning.ts');
  return Function(`"use strict"; return (${match[1]});`)();
}
const learning = await loadLearningCases();

function sanitizePublicTechnique(item) {
  const ids = Array.isArray(item.theoryTagIds) ? item.theoryTagIds : [];
  const names = Array.isArray(item.theories) ? item.theories : [];
  const keptIndexes = ids.map((id, index) => freeTheoryIds.has(id) ? index : -1).filter((index) => index >= 0);
  return { ...item, theoryTagIds: keptIndexes.map((index) => ids[index]), theories: keptIndexes.map((index) => names[index]).filter(Boolean) };
}

const publicCategories = techniques.categories.map((category) => ({
  ...category,
  subcategories: category.subcategories.map((subcategory) => ({
    ...subcategory,
    items: subcategory.items.filter((item) => freeTechniqueIds.has(item.id)).map(sanitizePublicTechnique),
  })),
}));

const paidRows = [];
let order = 0;
for (const category of techniques.categories) for (const subcategory of category.subcategories) for (const item of subcategory.items) {
  if (!freeTechniqueIds.has(item.id)) paidRows.push({ content_type: 'technique', content_id: item.id, payload: { ...item, categoryKey: category.key, categoryName: category.name, subcategory: subcategory.name, articleTitle: subcategory.articleTitle ?? subcategory.name }, sort_order: order++ });
}
for (const theory of theories) if (!freeTheoryIds.has(theory.tagId)) paidRows.push({ content_type: 'theory', content_id: theory.tagId, payload: theory, sort_order: order++ });
for (const item of learning) if (!freeLearningIds.has(item.id)) paidRows.push({ content_type: 'learning', content_id: item.id, payload: item, sort_order: order++ });

function csvCell(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return `"${text.replaceAll('"', '""')}"`;
}

const outputDir = path.join(root, 'dist-secure-content');
await mkdir(outputDir, { recursive: true });
const publicTechniques = { ...techniques, categories: publicCategories };
const publicTheories = theories.filter((item) => freeTheoryIds.has(item.tagId));
const publicLearning = learning.filter((item) => freeLearningIds.has(item.id));
await writeFile(path.join(outputDir, 'techniques.public.json'), JSON.stringify(publicTechniques, null, 2));
await writeFile(path.join(outputDir, 'theories.public.json'), JSON.stringify(publicTheories, null, 2));
await writeFile(path.join(outputDir, 'learning.public.json'), JSON.stringify(publicLearning, null, 2));
await writeFile(path.join(outputDir, 'learning.full.json'), JSON.stringify(learning, null, 2));
await writeFile(path.join(outputDir, 'paid-content.ndjson'), paidRows.map((row) => JSON.stringify(row)).join('\n'));
await writeFile(path.join(outputDir, 'paid-content.csv'), [
  'content_type,content_id,payload,sort_order',
  ...paidRows.map((row) => [csvCell(row.content_type), csvCell(row.content_id), csvCell(row.payload), String(row.sort_order)].join(',')),
].join('\n'));
await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  public: { techniques: publicCategories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items)).length, theories: publicTheories.length, learning: publicLearning.length },
  paid: paidRows.reduce((counts, row) => ({ ...counts, [row.content_type]: (counts[row.content_type] ?? 0) + 1 }), {}),
}, null, 2));

console.log(`Public techniques: ${publicCategories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items)).length}`);
console.log(`Public theories: ${publicTheories.length}`);
console.log(`Public learning: ${publicLearning.length}`);
console.log(`Paid rows prepared: ${paidRows.length}`);
console.log(`Output: ${outputDir}`);
