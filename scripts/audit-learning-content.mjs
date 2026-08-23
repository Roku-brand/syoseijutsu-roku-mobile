import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fullPath = path.join(root, 'src/data/generated/learning.full.json');
const publicPath = path.join(root, 'src/data/generated/learning.json');
const techniquesPath = path.join(root, 'src/data/generated/techniques.json');
const migrationPath = path.join(root, 'supabase/migrations/20260824190000_replace_learning_cases.sql');

const fullCases = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
const publicCases = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
const techniques = JSON.parse(fs.readFileSync(techniquesPath, 'utf8'));
const migration = fs.readFileSync(migrationPath, 'utf8');
const techniqueIds = new Set(
  techniques.categories
    .flatMap((category) => category.subcategories)
    .flatMap((persona) => persona.items)
    .map((item) => item.id),
);
const choiceIds = ['a', 'b', 'c'];
const requiredTextFields = ['eyebrow', 'title', 'situation', 'question', 'goodMove', 'why', 'caution'];

if (fullCases.length !== 21) throw new Error(`Expected 21 learning cases, found ${fullCases.length}.`);
if (JSON.stringify(publicCases) !== JSON.stringify(fullCases.slice(0, 7))) {
  throw new Error('Public learning cases must exactly match cases 1-7 of the full curriculum.');
}

const seenReviews = new Set();
for (const [index, item] of fullCases.entries()) {
  const number = index + 1;
  const id = `case-${String(number).padStart(2, '0')}`;
  const stage = Math.ceil(number / 7);
  if (item.id !== id || item.number !== number || item.stage !== stage) {
    throw new Error(`Unexpected identity/order for ${item.id}: number=${item.number}, stage=${item.stage}.`);
  }
  for (const field of requiredTextFields) {
    if (typeof item[field] !== 'string' || item[field].trim().length === 0) {
      throw new Error(`${item.id} is missing ${field}.`);
    }
  }
  if (!Array.isArray(item.choices) || item.choices.length !== 3) throw new Error(`${item.id} must have three choices.`);
  if (item.choices.map((choice) => choice.id).join(',') !== choiceIds.join(',')) throw new Error(`${item.id} choices must be a,b,c.`);
  if (!choiceIds.includes(item.goodChoiceId)) throw new Error(`${item.id} has an invalid goodChoiceId.`);

  for (const choice of item.choices) {
    const review = String(choice.review ?? '').trim();
    const length = [...review].length;
    if (typeof choice.label !== 'string' || choice.label.trim().length === 0) throw new Error(`${item.id}/${choice.id} is missing a label.`);
    if (length < 35 || length > 110) throw new Error(`${item.id}/${choice.id} review length is ${length}; expected 35-110.`);
    if (seenReviews.has(review)) throw new Error(`${item.id}/${choice.id} duplicates another choice review.`);
    seenReviews.add(review);
  }

  if (!Array.isArray(item.relatedCardIds) || item.relatedCardIds.length !== 2 || new Set(item.relatedCardIds).size !== 2) {
    throw new Error(`${item.id} must link two distinct techniques.`);
  }
  for (const cardId of item.relatedCardIds) {
    if (!techniqueIds.has(cardId)) throw new Error(`${item.id} links missing technique ${cardId}.`);
  }
  if (!migration.includes(`'${item.id}'`)) throw new Error(`Migration is missing ${item.id}.`);
}

console.log(`Learning audit passed: ${fullCases.length} cases, ${seenReviews.size} unique choice reviews, all technique links valid.`);
