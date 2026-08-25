import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(ROOT, 'src', 'data', 'generated', 'theories.json');
const theories = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const boilerplate = /を支える概念。.*作用や判断原理を説明する。$/u;
const markdown = /\*\*/u;
const short = theories.filter((record) => (record.summary ?? '').trim().length < 80);
const optimizedRange = theories.filter((record) => {
  const number = Number(record.tagId?.replace('kb_', ''));
  return Number.isInteger(number) && number >= 387 && number <= 595;
});
const shortOptimized = optimizedRange.filter((record) => (record.summary ?? '').trim().length < 55);
const boiler = theories.filter((record) => boilerplate.test(record.summary ?? ''));
const markdownArtifacts = theories.filter((record) => markdown.test(record.summary ?? ''));
const summaries = new Map();
for (const record of theories) {
  const list = summaries.get(record.summary) ?? [];
  list.push(record.tagId);
  summaries.set(record.summary, list);
}
const duplicateGroups = [...summaries.values()].filter((ids) => ids.length > 1);

console.log(JSON.stringify({
  total: theories.length,
  boilerplate: boiler.length,
  shortSummaries: short.length,
  shortOptimizedSummaries: shortOptimized.length,
  markdownArtifacts: markdownArtifacts.length,
  duplicateSummaryGroups: duplicateGroups.length,
  duplicateCards: duplicateGroups.reduce((total, ids) => total + ids.length, 0),
}, null, 2));

if (boiler.length || shortOptimized.length || markdownArtifacts.length) {
  process.exitCode = 1;
}
