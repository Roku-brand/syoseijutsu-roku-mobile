import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fullPath = path.join(root, 'src/data/generated/learning.full.json');
const publicPath = path.join(root, 'src/data/generated/learning.json');
const techniquesPath = path.join(root, 'src/data/generated/techniques.json');
const migrationPath = path.join(root, 'supabase/migrations/20260824190000_replace_learning_cases.sql');

const cases = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const techniques = JSON.parse(fs.readFileSync(techniquesPath, 'utf8'));
const techniqueIds = new Set(techniques.categories.flatMap((category) => category.subcategories).flatMap((persona) => persona.items).map((item) => item.id));
const expectedChoiceIds = ['a', 'b', 'c'];

if (cases.length !== 21) throw new Error(`Expected 21 learning cases, found ${cases.length}.`);
for (const [index, item] of cases.entries()) {
  const expectedNumber = index + 1;
  const expectedId = `case-${String(expectedNumber).padStart(2, '0')}`;
  const expectedStage = Math.ceil(expectedNumber / 7);
  if (item.id !== expectedId || item.number !== expectedNumber || item.stage !== expectedStage) {
    throw new Error(`Unexpected identity/order for ${item.id}: number=${item.number}, stage=${item.stage}.`);
  }
  if (!Array.isArray(item.choices) || item.choices.length !== 3) throw new Error(`${item.id} must have three choices.`);
  if (item.choices.map((choice) => choice.id).join(',') !== expectedChoiceIds.join(',')) throw new Error(`${item.id} choices must be a,b,c.`);
  if (!item.choices.some((choice) => choice.id === item.goodChoiceId)) throw new Error(`${item.id} has an invalid goodChoiceId.`);
  for (const choice of item.choices) {
    const reviewLength = [...String(choice.review ?? '')].length;
    if (reviewLength < 35 || reviewLength > 110) throw new Error(`${item.id}/${choice.id} review length is ${reviewLength}; expected 35-110.`);
  }
  if (!Array.isArray(item.relatedCardIds) || item.relatedCardIds.length !== 2) throw new Error(`${item.id} must link two techniques.`);
  for (const id of item.relatedCardIds) if (!techniqueIds.has(id)) throw new Error(`${item.id} links missing technique ${id}.`);
}

const publicCases = cases.slice(0, 7);
fs.writeFileSync(publicPath, `${JSON.stringify(publicCases, null, 2)}\n`);

const sqlValue = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const values = cases.map((item, index) => `('learning', '${item.id}', ${sqlValue(item)}, ${2000 + index})`).join(',\n');
const sql = `-- Replace every learning case with the current 21-case curriculum.\n delete from public.paid_content where content_type = 'learning';\n insert into public.paid_content (content_type, content_id, payload, sort_order) values\n${values}\non conflict (content_type, content_id) do update set payload = excluded.payload, sort_order = excluded.sort_order, updated_at = now();\n`;
fs.writeFileSync(migrationPath, sql);

console.log(`Learning content synchronized: full=${cases.length}, public=${publicCases.length}, migration=${path.basename(migrationPath)}.`);
