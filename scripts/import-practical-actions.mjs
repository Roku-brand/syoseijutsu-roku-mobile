import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = process.argv[2] ?? path.join(root, 'docs/content/shoseijutsuroku_practical_actions_525.md');
const outputPath = path.join(root, 'src/data/generated/practical-actions.json');

const markdown = (await readFile(sourcePath, 'utf8')).replace(/\r/g, '');
const source = JSON.parse(await readFile(path.join(root, 'src/data/generated/techniques.json'), 'utf8'));
const techniques = source.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items));
const expected = new Map(techniques.map((technique) => [technique.id, technique.title]));
const blocks = markdown.split(/(?=^## \[)/m).filter((block) => /^## \[/.test(block));
const items = [];

for (const block of blocks) {
  const header = block.match(/^## \[([^\]]+)\] (.+)$/m);
  if (!header) continue;
  const sections = new Map();
  let currentSection = null;
  for (const line of block.split('\n').slice(1)) {
    const section = line.match(/^### (.+)$/);
    if (section) {
      currentSection = section[1].trim();
      sections.set(currentSection, []);
      continue;
    }
    const bullet = line.match(/^[-*] (.+)$/);
    if (bullet && currentSection) sections.get(currentSection).push(bullet[1].trim());
  }
  items.push({
    id: header[1].trim(),
    title: header[2].trim(),
    todayActions: sections.get('今日からできる実践') ?? [],
    examples: sections.get('具体例') ?? [],
    cautions: sections.get('注意点') ?? [],
  });
}

const failures = [];
const seen = new Set();
items.forEach((item, index) => {
  if (seen.has(item.id)) failures.push(`duplicate id: ${item.id}`);
  seen.add(item.id);
  if (!expected.has(item.id)) failures.push(`unknown id: ${item.id}`);
  if (expected.get(item.id) !== item.title) failures.push(`title mismatch: ${item.id}`);
  if (item.id !== techniques[index]?.id) failures.push(`order mismatch at ${index + 1}: ${item.id}`);
  if (item.todayActions.length === 0) failures.push(`${item.id} has no todayActions`);
  if (item.examples.length === 0) failures.push(`${item.id} has no examples`);
  if (item.cautions.length === 0) failures.push(`${item.id} has no cautions`);
});
for (const technique of techniques) if (!seen.has(technique.id)) failures.push(`missing id: ${technique.id}`);
if (items.length !== techniques.length) failures.push(`count mismatch: expected ${techniques.length}, found ${items.length}`);
if (failures.length) throw new Error(failures.join('\n'));

await writeFile(outputPath, `${JSON.stringify(items, null, 2)}\n`, 'utf8');
console.log(`Imported ${items.length} practical-action entries to ${outputPath}`);
