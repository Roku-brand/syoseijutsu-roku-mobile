import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const before = JSON.parse(execFileSync('git', ['show', '9bdb57e:src/data/generated/theories.json'], { encoding: 'utf8' }));
const after = JSON.parse(await fs.readFile('src/data/generated/theories.json', 'utf8'));
const byId = new Map(after.map((item) => [item.tagId, item]));
const replacements = new Map();
for (const old of before) {
  const current = byId.get(old.tagId);
  if (current?.title !== old.title) replacements.set(old.title, current?.title ?? `[削除済み理論 ${old.tagId}]`);
}
const files = execFileSync('git', ['ls-files', '-z', '*.md', '*.json'], { encoding: 'utf8' }).split('\0').filter(Boolean);
let changed = 0;
for (const file of files) {
  if (file.startsWith('src/data/generated/') || file.startsWith('docs/content/theory-rights-removal-report-')) continue;
  let text = await fs.readFile(file, 'utf8');
  const original = text;
  for (const [oldTitle, newTitle] of replacements) text = text.replaceAll(oldTitle, newTitle);
  if (text !== original) {
    await fs.writeFile(file, text);
    changed += 1;
  }
}
console.log(`Updated ${changed} historical Markdown/JSON files to remove retired quotation headings.`);
