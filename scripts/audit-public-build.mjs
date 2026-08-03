import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const paidFile = path.join(root, 'dist-secure-content', 'paid-content.ndjson');

async function collectFiles(directory) {
  const result = [];
  for (const name of await readdir(directory)) {
    const filePath = path.join(directory, name);
    const info = await stat(filePath);
    if (info.isDirectory()) result.push(...await collectFiles(filePath));
    else result.push(filePath);
  }
  return result;
}

const rows = (await readFile(paidFile, 'utf8'))
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const candidates = new Map();
function addCandidate(value, label) {
  if (typeof value !== 'string') return;
  const normalized = value.trim();
  if (normalized.length < 18) return;
  candidates.set(normalized, label);
}

for (const row of rows) {
  const payload = row.payload ?? {};
  addCandidate(payload.title, `${row.content_type}:${row.content_id}:title`);
  addCandidate(payload.subtitle, `${row.content_type}:${row.content_id}:subtitle`);
  addCandidate(payload.explanation, `${row.content_type}:${row.content_id}:explanation`);
  addCandidate(payload.summary, `${row.content_type}:${row.content_id}:summary`);
  addCandidate(payload.definition, `${row.content_type}:${row.content_id}:definition`);
  addCandidate(payload.situation, `${row.content_type}:${row.content_id}:situation`);
  addCandidate(payload.why, `${row.content_type}:${row.content_id}:why`);
}

const files = await collectFiles(distDir);
const text = (await Promise.all(files
  .filter((file) => /\.(html|js|json|map|txt|css)$/i.test(file))
  .map((file) => readFile(file, 'utf8').catch(() => '')))).join('\n');

const leaks = [];
for (const [candidate, label] of candidates) {
  if (text.includes(candidate)) leaks.push(label);
  if (leaks.length >= 25) break;
}

if (leaks.length > 0) {
  console.error('Paid content leakage detected in public build:');
  leaks.forEach((leak) => console.error(`- ${leak}`));
  process.exit(1);
}

console.log(`Public build audit passed. Checked ${candidates.size} paid text fingerprints across ${files.length} files.`);
