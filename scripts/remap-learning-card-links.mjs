import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const techniquesPath = path.join(root, 'src/data/generated/techniques.json');
const learningPath = path.join(root, 'src/data/generated/learning.full.json');
const publicLearningPath = path.join(root, 'src/data/generated/learning.json');
const reportPath = path.join(root, '.learning-card-remap-report.json');

function cardsOf(catalog) {
  return catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
}

function normalized(value = '') {
  return value.normalize('NFKC').replace(/[\s、。・「」『』（）()【】\[\]{}〈〉《》!?！？:：;；,，.．…—―ー]/g, '');
}

function grams(value) {
  const text = normalized(value);
  const values = new Map();
  for (const size of [2, 3]) {
    for (let index = 0; index <= text.length - size; index += 1) {
      const gram = text.slice(index, index + size);
      values.set(gram, (values.get(gram) ?? 0) + 1);
    }
  }
  return values;
}

function merge(parts) {
  const result = new Map();
  for (const [value, weight] of parts) {
    for (const [term, count] of grams(value)) result.set(term, (result.get(term) ?? 0) + count * weight);
  }
  return result;
}

function cosine(left, right) {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (const value of left.values()) leftMagnitude += value * value;
  for (const value of right.values()) rightMagnitude += value * value;
  for (const [term, value] of left) dot += value * (right.get(term) ?? 0);
  return leftMagnitude && rightMagnitude ? dot / Math.sqrt(leftMagnitude * rightMagnitude) : 0;
}

function vector(card) {
  return merge([[card.title, 8], [card.essence, 4], [card.subtitle, 2]]);
}

const currentCatalog = JSON.parse(fs.readFileSync(techniquesPath, 'utf8'));
const legacyCatalog = JSON.parse(execFileSync('git', [
  '-c', `safe.directory=${root.replaceAll('\\', '/')}`,
  'show', 'HEAD:src/data/generated/techniques.json',
], { cwd: root, encoding: 'utf8' }));
const learningLegacyRef = process.env.LEARNING_LEGACY_REF ?? 'HEAD';
const learning = JSON.parse(execFileSync('git', [
  '-c', `safe.directory=${root.replaceAll('\\', '/')}`,
  'show', `${learningLegacyRef}:src/data/generated/learning.full.json`,
], { cwd: root, encoding: 'utf8' }));
const currentCards = cardsOf(currentCatalog);
const legacyById = new Map(cardsOf(legacyCatalog).map((card) => [card.id, card]));
const currentById = new Map(currentCards.map((card) => [card.id, card]));
const currentVectors = new Map(currentCards.map((card) => [card.id, vector(card)]));
const report = [];
// The 21 scenarios retain their learning purpose, but a handful of the new
// master titles express that purpose differently. Keep those links editorially
// chosen rather than accepting a weak text-similarity match.
const editorialOverrides = new Map([
  ['case-02:latest-035', 'master336-032'],
  ['case-06:latest-172', 'master336-044'],
  ['case-07:latest-145', 'master336-106'],
  ['case-08:latest-233', 'master336-152'],
  ['case-08:latest-234', 'master336-154'],
  ['case-09:leadership-14', 'master336-153'],
  ['case-09:leadership-03', 'master336-154'],
  ['case-11:latest-321', 'master336-224'],
  ['case-12:leadership-03', 'master336-155'],
  ['case-12:leadership-08', 'master336-154'],
  ['case-13:leadership-05', 'master336-156'],
  ['case-13:leadership-04', 'master336-153'],
  ['case-14:latest-298', 'master336-178'],
  ['case-15:latest-419', 'master336-293'],
  ['case-15:latest-413', 'master336-291'],
  ['case-18:latest-439', 'master336-316'],
  ['case-19:latest-462', 'master336-329'],
  ['case-20:latest-466', 'master336-323'],
  ['case-21:latest-473', 'master336-056'],
]);

for (const item of learning) {
  const used = new Set();
  const mapped = item.relatedCardIds.map((legacyId) => {
    const legacy = legacyById.get(legacyId);
    if (!legacy) throw new Error(`${item.id} links an unknown legacy technique: ${legacyId}`);
    const overrideId = editorialOverrides.get(`${item.id}:${legacyId}`);
    if (overrideId) {
      const override = currentById.get(overrideId);
      if (!override) throw new Error(`Missing editorial override target: ${overrideId}`);
      if (used.has(override.id)) throw new Error(`${item.id} has duplicate editorial link: ${override.id}`);
      used.add(override.id);
      report.push({ caseId: item.id, legacyId, legacyTitle: legacy.title, id: override.id, title: override.title, score: 'editorial', needsReview: false });
      return override.id;
    }
    const legacyVector = vector(legacy);
    const candidates = currentCards
      .filter((card) => card.field === legacy.field && !used.has(card.id))
      .map((card) => ({
        card,
        score: cosine(legacyVector, currentVectors.get(card.id)) + (card.persona === legacy.persona ? 0.06 : 0),
      }))
      .sort((left, right) => right.score - left.score);
    const best = candidates[0];
    if (!best) throw new Error(`Unable to remap ${item.id}: ${legacy.title}.`);
    used.add(best.card.id);
    report.push({ caseId: item.id, legacyId, legacyTitle: legacy.title, id: best.card.id, title: best.card.title, score: Number(best.score.toFixed(4)), needsReview: best.score < 0.12 });
    return best.card.id;
  });
  item.relatedCardIds = mapped;
}

if (new Set(learning.flatMap((item) => item.relatedCardIds)).size < 21) {
  throw new Error('Learning links collapsed onto too few current techniques.');
}

fs.writeFileSync(learningPath, `${JSON.stringify(learning, null, 2)}\n`);
fs.writeFileSync(publicLearningPath, `${JSON.stringify(learning.slice(0, 7), null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({ remappedAt: new Date().toISOString(), learningLegacyRef, mappings: report }, null, 2)}\n`);
console.log(`Remapped ${report.length} learning links across ${learning.length} cases.`);
