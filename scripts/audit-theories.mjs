import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const theories = JSON.parse(
  await readFile(
    path.join(ROOT, 'src', 'data', 'generated', 'theories.json'),
    'utf8',
  ),
);

const expectedCategories = new Map([
  ['心理学', 'psychology'],
  ['行動科学', 'behavioral-science'],
  ['組織・経営論', 'organization-management'],
  ['戦略論', 'strategy'],
  ['古典・思想', 'classics-thought'],
  ['格言・経験則・作品', 'maxims-experience'],
]);

const errors = [];
const warnings = [];
const ids = new Set();
const titles = new Map();

for (const theory of theories) {
  if (ids.has(theory.tagId)) errors.push(`ID重複: ${theory.tagId}`);
  ids.add(theory.tagId);

  const normalizedTitle = theory.title
    .normalize('NFKC')
    .replace(/[\s・＝=\-ー]/g, '')
    .toLocaleLowerCase();
  const sameTitle = titles.get(normalizedTitle) ?? [];
  sameTitle.push(theory);
  titles.set(normalizedTitle, sameTitle);

  const expected = expectedCategories.get(theory.sourceType);
  if (!expected || expected !== theory.categoryId) {
    errors.push(
      `分類不整合: ${theory.tagId} ${theory.title} (${theory.sourceType} / ${theory.categoryId})`,
    );
  }

  if (/要付与|要確認|未確認/.test(theory.reliability ?? '')) {
    warnings.push(`公開前確認: ${theory.tagId} ${theory.title}`);
  }
}

for (const group of titles.values()) {
  if (group.length > 1) {
    errors.push(
      `タイトル重複: ${group.map((item) => `${item.tagId}:${item.title}`).join(' / ')}`,
    );
  }
}

const counts = theories.reduce((result, theory) => {
  result[theory.categoryId] = (result[theory.categoryId] ?? 0) + 1;
  return result;
}, {});

console.log('理論分類件数', counts);
console.log(`内部確認が残る理論: ${warnings.length}件`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`構造監査完了: ${theories.length}件、ID・分類・完全重複に問題なし`);
}
