import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sqlForReview, unchangedFieldsHash } from './apply-practical-theory-openings.mjs';

const dir = 'docs/content/';
const source = 'src/data/generated/theories.json';
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const before = read(dir + 'theory-plain-before-20261021.json');
const byId = new Map(before.map(row => [row.id, row]));
const lines = fs.readFileSync(dir + 'theory-plain-definitions-20261021.tsv', 'utf8').trim().split(/\r?\n/).map(line => line.split('\t'));
const definitions = new Map(lines);
const catalogue = read(source);
assert.equal(catalogue.length, 945);
assert.equal(before.length, 945);
assert.equal(lines.length, 945);
assert.equal(definitions.size, 945);
const changes = [];
const updated = catalogue.map(theory => {
  const old = byId.get(theory.tagId);
  const explanation = definitions.get(theory.tagId);
  assert.ok(old && old.title === theory.title, `Identity changed: ${theory.tagId}`);
  assert.ok(explanation?.endsWith('。'), `Missing explanation: ${theory.tagId}`);
  assert.ok(explanation.length <= 180, `Explanation too long: ${theory.tagId}`);
  const quotation = theory.quotation ? { ...theory.quotation, contextNote: explanation } : null;
  const summary = quotation
    ? `「${quotation.translationText}」\n— ${quotation.author}\n${quotation.work}\n\n${explanation}`
    : explanation;
  assert.ok(theory.summary === old.summary || theory.summary === summary, `New local edit: ${theory.tagId}`);
  assert.deepEqual(theory.quotation ? { ...theory.quotation, contextNote: '' } : null,
    old.quotation ? { ...old.quotation, contextNote: '' } : null);
  const next = { ...theory, summary, ...(quotation ? { quotation } : {}) };
  assert.equal(unchangedFieldsHash(next), unchangedFieldsHash(theory));
  changes.push({ id: theory.tagId, title: theory.title,
    opening: explanation.slice(0, explanation.indexOf('。') + 1), explanation,
    beforeSummary: old.summary, summary, beforeQuotation: old.quotation, quotation,
    unchangedFieldsSha256: unchangedFieldsHash(theory) });
  return next;
});
const lengths = changes.map(row => row.explanation.length).sort((a, b) => a - b);
const review = {
  date: '2026-10-21', reviewedPublishedCount: 945,
  changedCount: changes.filter(row => row.summary !== row.beforeSummary).length,
  quotationCommentaryCount: changes.filter(row => row.quotation).length,
  medianExplanationLength: lengths[Math.floor(lengths.length / 2)], maximumExplanationLength: lengths.at(-1),
  editorialRules: [
    '「〇〇とは」に自然につながる「〜こと」「〜という理論」「〜方法」などの短い定義形にする。',
    '一文目は抽象的な意味を短く答え、専門語で説明を重ねない。',
    '分類や手順が使ううえで大切な理論は、その名前と違いを短く示す。',
    '説明は原則1〜3文とし、繰り返しや専門上の長い留保で読みづらくしない。',
    '見出しの「」、ID、分類、関連リンク、出典、公開範囲、承認済み引用は保持する。',
  ],
  checkedSources: [
    { id: 'kb_036', url: 'https://pubmed.ncbi.nlm.nih.gov/3572722/', point: '安定型・不安型・回避型を含む愛着スタイル' },
    { id: 'kb_936', url: 'https://openstax.org/books/introduction-philosophy/pages/5-5-informal-fallacies', point: '相手の主張を変形し、その別の主張に反論する論法' },
  ], changes,
};
const write = (path, data) => fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
write(source, updated);
write(dir + 'theory-plain-review-20261021.json', review);
fs.writeFileSync(dir + 'theory-plain-update-20261021.sql', sqlForReview(review, false, 'plain_theory_definitions_20261021'));
fs.writeFileSync(dir + 'theory-plain-rollback-20261021.sql', sqlForReview(review, true, 'plain_theory_definitions_20261021'));
const report = ['# 理論の本文再編集：短い定義と使える要点', '',
  ...review.editorialRules.map(rule => '- ' + rule), '',
  `対象945件／変更${review.changedCount}件／解説の中央値${review.medianExplanationLength}文字。`, '',
  '| ID | 理論 | 修正後の本文 |', '| --- | --- | --- |',
  ...changes.map(row => '| ' + [row.id, row.title, row.explanation].map(x => x.replaceAll('|', '\\|')).join(' | ') + ' |'), '',
].join('\n');
fs.writeFileSync(dir + 'theory-plain-edit-20261021.md', report);
console.log(JSON.stringify({ reviewed: 945, changed: review.changedCount,
  medianLength: review.medianExplanationLength, maximumLength: review.maximumExplanationLength }));
