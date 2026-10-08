import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { mapTheoryDisplayIds } from './public-content-portfolio.mjs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const source = 'src/data/generated/theories.json';
const snapshot = 'docs/content/theory-display-id-order-20261008-before.json';
const rows = read(source);
const sections = read('src/data/generated/theory-subcategories.json');
const withoutNumbers = rows.map(({ displayId, displayOrder, ...row }) => row);
const fingerprint = createHash('sha256').update(JSON.stringify(withoutNumbers)).digest('hex');
if (!fs.existsSync(snapshot)) write(snapshot, {
  fingerprint,
  assignments: rows.map(({ tagId, title, categoryId, subcategoryId, sortOrder, displayId }) => ({ tagId, title, categoryId, subcategoryId, sortOrder, displayId })),
});
const before = read(snapshot);
assert.equal(fingerprint, before.fingerprint, 'Content or ordering changed; review before renumbering.');
const previousById = new Map(before.assignments.map(row => [row.tagId,row]));
for (const category of new Set(rows.map(row => row.categoryId))) {
  const ordered = rows.filter(row => row.categoryId === category);
  const sectionOrder = id => sections.find(section => section.id === id)?.displayOrder;
  assert.deepEqual(ordered.map(row => row.tagId), [...ordered].sort((a,b) => sectionOrder(a.subcategoryId) - sectionOrder(b.subcategoryId) || a.sortOrder - b.sortOrder || a.tagId.localeCompare(b.tagId)).map(row => row.tagId));
}
const counts = new Map();
const plan = rows.map(row => {
  const displayId = (counts.get(row.categoryId) ?? 0) + 1;
  counts.set(row.categoryId, displayId);
  return { tagId: row.tagId, title: row.title, categoryId: row.categoryId, subcategoryId: row.subcategoryId, oldDisplayId: previousById.get(row.tagId).displayId, displayId };
});
write('docs/content/theory-display-id-order-20261008-plan.json', plan);
const numbered = rows.map((row,index) => ({ ...row, displayId: plan[index].displayId, ...(row.displayOrder == null ? {} : { displayOrder: plan[index].displayId }) }));
write(source, numbered);
const scope = read('src/data/content-scope.json');
const displayById = new Map([...mapTheoryDisplayIds(numbered)].map(([displayId,row]) => [row.tagId,displayId]));
scope.freeTheoryDisplayIds = scope.freeTheoryIds.map(id => {
  assert.ok(displayById.has(id), 'Unknown free theory identity: ' + id);
  return displayById.get(id);
});
write('src/data/content-scope.json', scope);
console.log(JSON.stringify({ count: rows.length, changed: plan.filter(row => row.displayId !== row.oldDisplayId).length, categories: Object.fromEntries(counts), fingerprint }));
