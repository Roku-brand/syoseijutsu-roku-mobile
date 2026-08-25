import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED_PATH = path.join(ROOT, 'src', 'data', 'generated', 'theories.json');
const HISTORY_COMMIT = '4030497';
const BOILERPLATE = /を支える概念。.*作用や判断原理を説明する。$/u;
const MARKDOWN = /\*\*/u;

function readHistory() {
  try {
    const raw = execFileSync('git', ['show', `${HISTORY_COMMIT}:src/data/generated/theories.json`], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    return new Map(JSON.parse(raw).map((record) => [record.tagId, record]));
  } catch {
    return new Map();
  }
}

function cleanSummary(summary) {
  return String(summary ?? '')
    .replace(/\*\*(.*?)\*\*/gu, '$1')
    .replace(/\s+/gu, ' ')
    .trim();
}

function contextSentence(record) {
  const domain = (record.domains ?? []).filter(Boolean).slice(0, 2).join('・') || record.discipline || '日常の判断';
  return `「${record.title}」という視点は、${domain}の場面で、観察する対象と実際に選ぶ行動を切り分けるために使う。`;
}

function isOptimizedRange(record) {
  const number = Number(record.tagId?.replace('kb_', ''));
  return Number.isInteger(number) && number >= 387 && number <= 595;
}

const theories = JSON.parse(fs.readFileSync(GENERATED_PATH, 'utf8'));
const history = readHistory();
let restored = 0;
let cleaned = 0;

for (const record of theories) {
  const previous = history.get(record.tagId);
  if (!previous || (!isOptimizedRange(record) && !BOILERPLATE.test(record.summary ?? ''))) continue;

  record.summary = cleanSummary(previous.summary || record.summary);
  restored += 1;
}

// Related concepts sometimes shared one historical paragraph. Keep the explanation
// accurate, but make the card's reading angle explicit so the pages are not duplicates.
const bySummary = new Map();
for (const record of theories) {
  const list = bySummary.get(record.summary) ?? [];
  list.push(record);
  bySummary.set(record.summary, list);
}
for (const records of bySummary.values()) {
  if (records.length < 2 || !records.some((record) => /^kb_\d+$/u.test(record.tagId))) continue;
  for (const record of records) {
    if (!history.has(record.tagId)) continue;
    record.summary = `${record.summary} ${contextSentence(record)}`;
    cleaned += 1;
  }
}

fs.writeFileSync(GENERATED_PATH, `${JSON.stringify(theories, null, 2)}\n`, 'utf8');
console.log(`Optimized ${restored} boilerplate theory cards; added ${cleaned} duplicate-reading qualifiers.`);
