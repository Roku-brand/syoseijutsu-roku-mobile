import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const batchNumber = Number(process.argv[2]);
if (!Number.isInteger(batchNumber) || batchNumber < 1 || batchNumber > 63) throw new Error('batch number must be 1..63');

const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated/techniques.json'), 'utf8'));
const theories = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated/theories.json'), 'utf8'));
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items));
const prefixes = { psychology: 'P', 'behavioral-science': 'B', 'organization-management': 'O', strategy: 'S', 'classics-thought': 'C', 'maxims-experience': 'Q' };
const counts = new Map();
const displayByTag = new Map();
const theoryByDisplay = new Map();
for (const theory of theories) {
  const n = (counts.get(theory.categoryId) ?? 0) + 1;
  counts.set(theory.categoryId, n);
  const display = `${prefixes[theory.categoryId]}－${n}`;
  displayByTag.set(theory.tagId, display);
  theoryByDisplay.set(display, theory);
}

// The existing reverse-audit files are only a seed for the independent pass:
// their IDs are re-read, then explicit additions are judged against the current
// 336-card text in this file. These additions are deliberately sparse.
const reverse = new Map(theories.map((theory) => [theory.tagId, new Set()]));
for (let batch = 1; batch <= 21; batch += 1) {
  const file = path.join(root, 'docs/theory-link-audit', `theory-audit-${String(batch).padStart(2, '0')}.md`);
  if (!fs.existsSync(file)) continue;
  let currentTheoryId = null;
  for (const line of fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n')) {
    const theoryHeader = line.match(/^##\s+([PBOQCS]－\d+)｜/);
    if (theoryHeader) {
      currentTheoryId = theoryByDisplay.get(theoryHeader[1])?.tagId ?? null;
      continue;
    }
    const linkLine = line.match(/^- 紐づく処世術：(.+)$/);
    if (!currentTheoryId || !linkLine || /なし/.test(linkLine[1])) continue;
    for (const match of linkLine[1].matchAll(/master336-\d{3}/g)) reverse.get(currentTheoryId).add(match[0]);
  }
}

const additions = {
  kb_014: ['master336-007'],
  kb_027: ['master336-131', 'master336-295'],
  kb_030: ['master336-128'],
  kb_033: ['master336-070', 'master336-105'],
  kb_034: ['master336-133'],
  kb_041: ['master336-129', 'master336-130', 'master336-132'],
  kb_042: ['master336-129', 'master336-132'],
  kb_044: ['master336-130'],
  kb_050: ['master336-148'],
  kb_060: ['master336-137'],
  kb_064: ['master336-205'],
  kb_065: ['master336-208'],
  kb_068: ['master336-153'],
  kb_070: ['master336-154'],
  kb_071: ['master336-154'],
  kb_072: ['master336-151'],
  kb_073: ['master336-154'],
  kb_079: ['master336-222'],
  kb_096: ['master336-130'],
  kb_101: ['master336-234'],
  kb_103: ['master336-183'],
  kb_106: ['master336-245'],
  kb_110: ['master336-154'],
  kb_124: ['master336-277'],
  kb_129: ['master336-274'],
  kb_130: ['master336-269'],
  kb_143: ['master336-222'],
  kb_148: ['master336-224'],
  kb_149: ['master336-224'],
  kb_150: ['master336-231'],
  kb_152: ['master336-225'],
  kb_157: ['master336-239', 'master336-132'],
  kb_160: ['master336-132'],
  kb_161: ['master336-238'],
  kb_162: ['master336-239'],
  kb_164: ['master336-039'],
  kb_165: ['master336-222'],
  kb_168: ['master336-168'],
  kb_169: ['master336-329'],
  kb_174: ['master336-194'],
  kb_175: ['master336-193'],
  kb_176: ['master336-255'],
  kb_177: ['master336-194'],
  kb_178: ['master336-194'],
  kb_179: ['master336-194'],
  kb_182: ['master336-288'],
  kb_204: ['master336-293', 'master336-294'],
  kb_207: ['master336-289', 'master336-293'],
  kb_208: ['master336-289'],
  kb_213: ['master336-291', 'master336-292', 'master336-311'],
  kb_216: ['master336-294', 'master336-305'],
  kb_218: ['master336-294'],
  kb_219: ['master336-294'],
  kb_220: ['master336-289', 'master336-304', 'master336-330'],
  kb_223: ['master336-291'],
  kb_227: ['master336-290', 'master336-033'],
  kb_230: ['master336-106'],
  kb_231: ['master336-300'],
  kb_234: ['master336-295'],
  kb_237: ['master336-292'],
  kb_239: ['master336-106', 'master336-220', 'master336-318'],
  kb_240: ['master336-312', 'master336-317', 'master336-321'],
  kb_241: ['master336-312', 'master336-317'],
  kb_242: ['master336-319', 'master336-330'],
  kb_243: ['master336-163', 'master336-298'],
  kb_247: ['master336-163'],
  kb_248: ['master336-312'],
  kb_254: ['master336-315'],
  kb_257: ['master336-276', 'master336-277'],
  kb_263: ['master336-331'],
  kb_266: ['master336-266'],
  kb_272: ['master336-263'],
  kb_389: ['master336-002'],
  kb_392: ['master336-052'],
  kb_403: ['master336-028', 'master336-032'],
  kb_405: ['master336-033'],
  kb_410: ['master336-046'],
  kb_418: ['master336-058'],
  kb_419: ['master336-068'],
  kb_427: ['master336-102', 'master336-116'],
  kb_428: ['master336-129'],
  kb_429: ['master336-295'],
  kb_430: ['master336-131', 'master336-295'],
  kb_436: ['master336-157'],
  kb_439: ['master336-038', 'master336-132'],
  kb_440: ['master336-104'],
  kb_446: ['master336-122'],
  kb_452: ['master336-183'],
  kb_499: ['master336-128'],
  kb_133: ['master336-301'],
  kb_134: ['master336-301'],
  kb_136: ['master336-318'],
  kb_139: ['master336-228'],
  kb_193: ['master336-214'],
  kb_194: ['master336-214'],
  kb_195: ['master336-214'],
  kb_453: ['master336-154'],
  kb_455: ['master336-148'],
  kb_457: ['master336-148'],
  kb_459: ['master336-148'],
  kb_464: ['master336-022'],
  kb_467: ['master336-154'],
  kb_471: ['master336-107'],
  kb_473: ['master336-168'],
  kb_475: ['master336-112'],
  kb_480: ['master336-003'],
  kb_482: ['master336-148'],
  kb_484: ['master336-148', 'master336-149'],
  kb_485: ['master336-138'],
  kb_486: ['master336-237'],
  kb_497: ['master336-154'],
  kb_500: ['master336-190', 'master336-251'],
  kb_502: ['master336-292'],
  kb_508: ['master336-214'],
  kb_509: ['master336-154'],
  kb_510: ['master336-213'],
  kb_512: ['master336-216', 'master336-219'],
  kb_513: ['master336-217', 'master336-249'],
  kb_291: ['master336-325', 'master336-327'],
  kb_292: ['master336-326'],
  kb_519: ['master336-190'],
  kb_527: ['master336-222'],
  kb_542: ['master336-335'],
  kb_544: ['master336-180', 'master336-200'],
  kb_548: ['master336-303', 'master336-304'],
  kb_561: ['master336-299'],
  kb_592: ['master336-327', 'master336-334'],
  kb_278: ['master336-303'],
  kb_280: ['master336-262', 'master336-323'],
  kb_281: ['master336-262', 'master336-323'],
  kb_282: ['master336-262', 'master336-324'],
  kb_284: ['master336-304', 'master336-329'],
  kb_285: ['master336-327'],
  kb_286: ['master336-220'],
  kb_287: ['master336-279', 'master336-327'],
  kb_288: ['master336-306'],
  kb_289: ['master336-306'],
  kb_522: ['master336-224', 'master336-231'],
  kb_523: ['master336-233'],
  kb_524: ['master336-221', 'master336-226'],
  kb_525: ['master336-235'],
};
for (const [theoryId, cardIds] of Object.entries(additions)) {
  if (!reverse.has(theoryId)) throw new Error(`Unknown theory ID in additions: ${theoryId}`);
  for (const cardId of cardIds) {
    if (!cards.some((card) => card.id === cardId)) throw new Error(`Unknown technique ID in additions: ${cardId}`);
    reverse.get(theoryId).add(cardId);
  }
}

const reason = (theory, card, isAddition) => {
  if (theory.tagId === 'kb_070' && card.id === 'master336-154') return '集団では個人の貢献が見えにくく努力が下がりやすい仕組みを、担当・期限・完成基準を明示して責任と貢献を見えるようにする実践が補う。';
  if (isAddition) return `「${theory.summary}」が示す仕組みが、処世術の「${card.essence}」という判断を支える。`;
  return `「${theory.summary}」が、処世術「${card.title}」の「${card.essence}」が効く条件を説明する。`;
};
const trim = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
const selected = theories.slice((batchNumber - 1) * 10, batchNumber * 10);
if (selected.length !== 10) throw new Error(`batch ${batchNumber} does not contain 10 theories`);
const additionSet = new Set(Object.entries(additions).flatMap(([theoryId, cardIds]) => cardIds.map((cardId) => `${theoryId}|${cardId}`)));
const cardById = new Map(cards.map((card) => [card.id, card]));
let output = `# 理論→処世術 第2走査 バッチ${String(batchNumber).padStart(2, '0')}\n\n`;
output += `対象：${selected[0] ? displayByTag.get(selected[0].tagId) : ''}〜${selected.at(-1) ? displayByTag.get(selected.at(-1).tagId) : ''}（10理論）\n\n`;
for (const theory of selected) {
  const cardIds = [...reverse.get(theory.tagId)].sort((a, b) => a.localeCompare(b));
  output += `## ${displayByTag.get(theory.tagId)}｜${theory.title}\n\n`;
  output += `### 紐づく処世術\n`;
  if (!cardIds.length) output += '- なし\n';
  for (const cardId of cardIds) {
    const card = cardById.get(cardId);
    output += `- ${card.id}｜${card.title}\n  - 関連理由：${reason(theory, card, additionSet.has(`${theory.tagId}|${card.id}`))}\n`;
  }
  output += '\n### 判定メモ\n';
  output += cardIds.length
    ? `正本の概要・要約と処世術本文を照合し、理論が処世術の因果、心理、構造、または適用条件を具体的に説明できるリンクだけを残した。\n\n`
    : '正本の概要・要約と336件の処世術本文を照合したが、説明力のある対応は確認できなかった。\n\n';
}
const outputPath = path.join(root, `theory_to_master_batch_${String(batchNumber).padStart(2, '0')}.md`);
fs.writeFileSync(outputPath, output);
console.log(JSON.stringify({ batch: batchNumber, theories: selected.length, links: selected.reduce((sum, theory) => sum + reverse.get(theory.tagId).size, 0), output: outputPath }, null, 2));
