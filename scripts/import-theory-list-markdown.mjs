import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = process.argv[2];
if (!sourcePath) throw new Error('Usage: node scripts/import-theory-list-markdown.mjs <source.md>');

const categoryMap = new Map([
  ['心理学', { id: 'psychology', title: '心理学' }],
  ['行動科学', { id: 'behavioral-science', title: '行動科学' }],
  ['組織・経営論', { id: 'organization-management', title: '組織・経営論' }],
  ['戦略', { id: 'strategy', title: '戦略論' }],
  ['古典・思想', { id: 'classics-thought', title: '古典・思想' }],
  ['格言', { id: 'maxims-experience', title: '格言・経験則・作品' }],
]);

const markdown = (await readFile(sourcePath, 'utf8')).replace(/^\uFEFF/, '').replace(/\r/g, '');
const generatedPath = path.join(ROOT, 'src', 'data', 'generated', 'theories.json');
const current = JSON.parse(await readFile(generatedPath, 'utf8'));
const currentById = new Map(current.map((item) => [item.tagId, item]));

function normalizeTitle(value) {
  return value
    .replace(/[『』「」]/g, '')
    .replace(/\s+/g, '')
    .replace(/\s*[—–-]\s*[^—–-]+$/, '')
    .trim();
}

const currentByNormalizedTitle = new Map();
for (const item of current) {
  const key = normalizeTitle(item.title);
  if (!currentByNormalizedTitle.has(key)) currentByNormalizedTitle.set(key, item);
}

const sourceItems = [];
let sourceCategory = '';
let currentItem = null;
for (const line of markdown.split('\n')) {
  const category = line.match(/^##\s+(.+)$/);
  if (category) {
    sourceCategory = category[1].trim();
    continue;
  }
  const title = line.match(/^-\s+[A-Z]－(\d+)｜(.+)$/);
  if (title) {
    const categoryInfo = categoryMap.get(sourceCategory);
    if (!categoryInfo) throw new Error(`Unknown theory category: ${sourceCategory}`);
    currentItem = {
      categoryInfo,
      categoryNumber: Number(title[1]),
      title: title[2].trim(),
      summary: '',
    };
    sourceItems.push(currentItem);
    continue;
  }
  const summary = line.match(/^\s+-\s+概要：(.+)$/);
  if (summary && currentItem) currentItem.summary = summary[1].trim();
}

if (sourceItems.length !== 630) throw new Error(`Expected 630 theories, found ${sourceItems.length}`);

const maxTagNumber = Math.max(
  0,
  ...current.map((item) => Number(String(item.tagId).replace(/^kb_/, '')) || 0),
);
const usedTagIds = new Set();
let nextTagNumber = maxTagNumber + 1;
const imported = sourceItems.map((sourceItem, index) => {
  const existing = currentByNormalizedTitle.get(normalizeTitle(sourceItem.title));
  const base = existing ?? {
    tagId: `kb_${String(nextTagNumber++).padStart(3, '0')}`,
    originalNumber: maxTagNumber + index + 1,
    summary: '',
    sourceType: sourceItem.categoryInfo.title,
    discipline: sourceItem.categoryInfo.title,
    conceptType: '概念・フレームワーク',
    sourceName: null,
    sourceDetail: null,
    domains: [],
    principles: [],
    relatedIds: [],
    reliability: '学術的位置づけ要確認',
    status: 'seed',
    notes: '添付の6分類・630タイトル一覧から追加。',
  };
  if (usedTagIds.has(base.tagId)) throw new Error(`Duplicate mapped theory id: ${base.tagId}`);
  usedTagIds.add(base.tagId);
  return {
    ...base,
    title: sourceItem.title,
    summary: sourceItem.summary || base.summary || `${sourceItem.title}に関する考え方・概念。`,
    categoryId: sourceItem.categoryInfo.id,
    categoryTitle: sourceItem.categoryInfo.title,
  };
});

await writeFile(generatedPath, `${JSON.stringify(imported, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  source: path.basename(sourcePath),
  imported: imported.length,
  reusedExistingIds: imported.filter((item) => currentById.has(item.tagId)).length,
  addedIds: imported.filter((item) => !currentById.has(item.tagId)).length,
  summariesFromSource: sourceItems.filter((item) => item.summary).length,
  categoryCounts: imported.reduce((counts, item) => {
    counts[item.categoryTitle] = (counts[item.categoryTitle] ?? 0) + 1;
    return counts;
  }, {}),
}, null, 2));
