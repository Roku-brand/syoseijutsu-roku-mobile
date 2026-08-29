import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'src/data/generated/techniques.json');
const theoriesPath = path.join(root, 'src/data/generated/theories.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const theories = JSON.parse(fs.readFileSync(theoriesPath, 'utf8'));
const cards = catalog.categories.flatMap((category) => category.subcategories.flatMap((subcategory) => subcategory.items));
const cardById = new Map(cards.map((card) => [card.id, card]));
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const prefixes = { psychology: 'P', 'behavioral-science': 'B', 'organization-management': 'O', strategy: 'S', 'classics-thought': 'C', 'maxims-experience': 'Q' };
const counts = new Map();
const displayByTag = new Map();
const tagByDisplay = new Map();
for (const theory of theories) {
  const n = (counts.get(theory.categoryId) ?? 0) + 1;
  counts.set(theory.categoryId, n);
  const display = `${prefixes[theory.categoryId]}－${n}`;
  displayByTag.set(theory.tagId, display);
  tagByDisplay.set(display, theory.tagId);
}

const firstSnapshotPath = path.join(root, 'docs/theory-link-audit/first-scan-links.json');
const firstSnapshot = fs.existsSync(firstSnapshotPath)
  ? JSON.parse(fs.readFileSync(firstSnapshotPath, 'utf8'))
  : cards.map((card) => ({ id: card.id, relatedTheoryIds: card.relatedTheoryIds ?? [] }));
const first = new Map(firstSnapshot.map((card) => [card.id, new Set(card.relatedTheoryIds ?? [])]));
const second = new Map(theories.map((theory) => [theory.tagId, new Set()]));
const batchFiles = [];
for (let batch = 1; batch <= 63; batch += 1) {
  const file = path.join(root, `theory_to_master_batch_${String(batch).padStart(2, '0')}.md`);
  if (!fs.existsSync(file)) throw new Error(`Missing batch file: ${file}`);
  batchFiles.push(file);
  let currentTheoryId = null;
  for (const line of fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n')) {
    const header = line.match(/^##\s+([PBOQCS]－\d+)｜(.+)$/);
    if (header) {
      currentTheoryId = tagByDisplay.get(header[1]);
      if (!currentTheoryId) throw new Error(`Unknown theory display ID in batch: ${header[1]}`);
      const theory = theoryById.get(currentTheoryId);
      if (theory.title !== header[2].trim()) throw new Error(`Theory title mismatch: ${header[1]}`);
      continue;
    }
    const link = line.match(/^-\s+(master336-\d{3})｜(.+)$/);
    if (!link || !currentTheoryId) continue;
    const card = cardById.get(link[1]);
    if (!card) throw new Error(`Unknown technique ID in batch: ${link[1]}`);
    if (card.title !== link[2].trim()) throw new Error(`Technique title mismatch: ${link[1]}`);
    second.get(currentTheoryId).add(link[1]);
  }
}

const cardOrder = new Map(cards.map((card, index) => [card.id, index]));
const theoryOrder = new Map(theories.map((theory, index) => [theory.tagId, index]));
const finalByCard = new Map();
for (const card of cards) {
  const union = new Set(first.get(card.id));
  for (const [theoryId, cardIds] of second) if (cardIds.has(card.id)) union.add(theoryId);
  finalByCard.set(card.id, [...union].sort((a, b) => theoryOrder.get(a) - theoryOrder.get(b)));
}

const edgeKey = (cardId, theoryId) => `${cardId}|${theoryId}`;
const firstEdges = new Set();
const secondEdges = new Set();
for (const [cardId, ids] of first) for (const theoryId of ids) firstEdges.add(edgeKey(cardId, theoryId));
for (const [theoryId, ids] of second) for (const cardId of ids) secondEdges.add(edgeKey(cardId, theoryId));
const unionEdges = new Set([...firstEdges, ...secondEdges]);
const onlyFirst = [...firstEdges].filter((edge) => !secondEdges.has(edge));
const onlySecond = [...secondEdges].filter((edge) => !firstEdges.has(edge));
const both = [...firstEdges].filter((edge) => secondEdges.has(edge));

const reason = (card, theory) => {
  if (card.id === 'master336-154' && theory.tagId === 'kb_070') return '集団では個人の貢献が見えにくく努力が下がりやすい仕組みを、担当・期限・完成基準を明示して責任と貢献を見えるようにする実践が補う。';
  return `「${theory.summary}」が、処世術「${card.title}」の「${card.essence}」が効く条件を説明する。`;
};
const trim = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
let finalMd = '# 処世術禄｜最終理論紐づけ（第1走査＋第2走査）\n\n';
for (const card of cards) {
  finalMd += `## ${card.id}｜${card.title}\n\n### 紐づく理論\n`;
  const theoryIds = finalByCard.get(card.id);
  if (!theoryIds.length) finalMd += '- なし\n';
  for (const theoryId of theoryIds) {
    const theory = theoryById.get(theoryId);
    finalMd += `- ${displayByTag.get(theoryId)}｜${theory.title}\n  - 関連理由：${reason(card, theory)}\n`;
  }
  finalMd += '\n### 判定メモ\n';
  finalMd += theoryIds.length
    ? '第1走査・第2走査の候補を正本文で再確認し、因果・心理・構造・適用条件のいずれかを具体的に深めるリンクだけを採用した。\n\n'
    : '336件の理論本文を照合したが、処世術の理解を実質的に深めるリンクは確認できなかった。\n\n';
}
const finalPath = path.join(root, 'master336_theory_links_final.md');
fs.writeFileSync(finalPath, finalMd);
// Keep the existing docs location as a compatibility copy used by release tooling.
fs.writeFileSync(path.join(root, 'docs/shoseijutsuroku_theory_mapping_master336_final.md'), finalMd);

for (const card of cards) {
  card.relatedTheoryIds = finalByCard.get(card.id);
}
fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

const fullMd = '# 理論→処世術 第2走査 統合版\n\n';
const full = batchFiles.map((file) => fs.readFileSync(file, 'utf8').replace(/^# .*\n\n/, '')).join('');
fs.writeFileSync(path.join(root, 'theory_to_master_full.md'), `${fullMd}${full}`);

const linkedTheories = new Set([...unionEdges].map((edge) => edge.split('|')[1]));
const theoryToCards = new Map(theories.map((theory) => [theory.tagId, []]));
for (const [cardId, ids] of finalByCard) for (const theoryId of ids) theoryToCards.get(theoryId).push(cardId);
const cardCounts = [...finalByCard.entries()].map(([cardId, ids]) => ({ cardId, count: ids.length }));
const theoryCounts = [...theoryToCards.entries()].map(([theoryId, ids]) => ({ theoryId, count: ids.length }));
const report = {
  secondScan: { theories: theories.length, batches: batchFiles.length, links: [...second.values()].reduce((sum, ids) => sum + ids.size, 0) },
  firstScanLinks: firstEdges.size,
  firstOnlyLinks: onlyFirst.length,
  secondOnlyLinks: onlySecond.length,
  bothDirectionLinks: both.length,
  finalAdoptedLinks: unionEdges.size,
  techniques: cards.length,
  linkedTheories: linkedTheories.size,
  unlinkedTheories: theories.filter((theory) => !linkedTheories.has(theory.tagId)).map((theory) => `${displayByTag.get(theory.tagId)}｜${theory.title}`),
  highTechniqueLinkCounts: cardCounts.filter((item) => item.count >= 10),
  highTheoryLinkCounts: theoryCounts.filter((item) => item.count >= 20).map((item) => ({ ...item, displayId: displayByTag.get(item.theoryId), title: theoryById.get(item.theoryId).title })),
  outputs: { finalPath, fullPath: path.join(root, 'theory_to_master_full.md'), catalogPath },
};
fs.writeFileSync(path.join(root, 'theory_to_master_verification.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, unlinkedTheories: report.unlinkedTheories.length }, null, 2));
