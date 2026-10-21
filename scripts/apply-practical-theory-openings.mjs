import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(root, 'docs/content');
const sourcePath = path.join(root, 'src/data/generated/theories.json');
const phase = 'practical_theory_openings_20261021';

// Keep the first sentence general. Explain technical distinctions in the
// continuation when removing jargon from the opening would hide the concept.
const continuations = {
  kb_813: '誰が何をしたかの記録や、相手から見た情報を加えると、貢献の見積もりを確かめられる。',
  kb_710: '予測を確率で記録し、実際の結果と比べることで、見積もりの癖を確かめられる。',
  kb_721: '相手が同じように理解し実行できるよう、前提と手順を言葉にして伝える。',
  kb_814: '誰と比べているかを明確にし、実際の結果でも確かめる。',
  kb_711: '成功談を参考にするときは、同じことをして失敗した事例も含めて確かめる。',
  kb_530: '準備や選ぶ手間を減らすと、取りかかりやすくなる。',
  kb_724: '開放性・誠実性・外向性・協調性・神経症傾向を、それぞれ強い・弱いの連続した尺度で見る。',
  kb_726: '正直さ・謙虚さ、情動性、外向性、協調性、誠実性、開放性の六つの軸で見る。ビッグ・ファイブとの大きな違いは、正直さ・謙虚さを独立した軸に置く点にある。',
  kb_817: 'マキャベリアニズム、自己愛、サイコパシーの三つを指す。短い印象だけで人を決めつけず、継続した行動から考える。',
  kb_862: '利害が完全に対立する一定の条件のもとでは、二つの考え方が同じ解に結びつく。',
  kb_899: '生理・安全・所属・承認・自己実現などの階層で整理する。満たされていない基礎的な欲求が行動を動かすと考え、複数の欲求の重なりや例外も扱う。',
  kb_751: '成功への期待、結果の価値、衝動の強さ、結果を得るまでの時間から考える。締切が近づくことで、行動への意欲が高まる場合がある。',
  kb_756: '起こり得る各結果の満足を確率に応じて足し合わせ、合計の最も大きい案を選ぶ。',
  kb_987: '焦り、落胆、怒りなどを区別して捉える。',
  kb_469: '兎を捕り終えた猟犬が不要になるという故事に、目的達成後の立場の変化を重ねている。',
  kb_468: '獲物がいなくなると弓がしまわれるという故事を、役割の必要性が変わることに重ねている。',
};
const redundantSecondSentenceIds = new Set([
  'kb_223', 'kb_560', 'kb_592', 'kb_955', 'kb_269', 'kb_033', 'kb_1009',
  'kb_595', 'kb_956', 'kb_718', 'kb_207', 'kb_412',
  'theory-8bc430c4-f80e-4e74-bb04-aca4a0d9c8bf',
  'theory-ba3eb39f-7dd4-4795-8eb0-c17c2b34fd1e',
]);

export function unchangedFieldsHash(theory) {
  const { summary: _summary, quotation, ...metadata } = theory;
  if (quotation) {
    const { contextNote: _contextNote, ...approvedQuotation } = quotation;
    metadata.quotation = approvedQuotation;
  }
  return createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
}

export function rewriteExplanation(text, opening, id) {
  const boundary = text.indexOf('。');
  assert.ok(boundary >= 0, `No opening sentence: ${id}`);
  assert.ok(opening.endsWith('。') && opening.split('。').length === 2, `Invalid opening: ${id}`);
  let continuation = text.slice(boundary + 1);
  if (redundantSecondSentenceIds.has(id)) continuation = continuation.slice(continuation.indexOf('。') + 1);
  return opening + (continuations[id] ?? continuation);
}

export function sqlForReview(review, rollback = false, backupPhase = phase) {
  assert.match(backupPhase, /^[a-z0-9_]+$/);
  const rows = review.changes.map(row => ({
    id: row.id, title: row.title,
    before: rollback ? row.summary : row.beforeSummary,
    after: rollback ? row.beforeSummary : row.summary,
    before_q: rollback ? row.quotation : row.beforeQuotation,
    after_q: rollback ? row.beforeQuotation : row.quotation,
  }));
  const payload = JSON.stringify(rows).replaceAll("'", "''");
  const backup = rollback ? '' : `
  insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
  select '${backupPhase}','theories',t.id,to_jsonb(t)
  from public.theories t join jsonb_to_recordset(edits) e(id text) on t.id=e.id
  on conflict(phase,source_table,source_id) do nothing;`;
  return `-- Reviewed general openings for all 945 published theories.
-- Only explanation text and quotation.contextNote are edited.
do $editorial$
declare edits jsonb := '${payload}'::jsonb;
begin
  if jsonb_array_length(edits)<>945 or
    (select count(distinct x->>'id') from jsonb_array_elements(edits) x)<>945 then
    raise exception 'Expected 945 unique reviewed theories';
  end if;
  if (select count(*) from public.theories where status='published')<>945 then
    raise exception 'Published catalogue changed since review';
  end if;
  perform t.id from public.theories t join jsonb_to_recordset(edits) e(id text) on t.id=e.id for update of t;
  if (select count(*) from public.theories t join jsonb_to_recordset(edits) e(id text) on t.id=e.id where t.status='published')<>945
    or exists(select 1 from public.theories t join jsonb_to_recordset(edits)
      e(id text,title text,before text,after text,before_q jsonb,after_q jsonb) on t.id=e.id
      where t.title is distinct from e.title or not (
        (t.summary is not distinct from e.before and t.quotation is not distinct from e.before_q) or
        (t.summary is not distinct from e.after and t.quotation is not distinct from e.after_q))) then
    raise exception 'Reviewed explanation changed; refusing to overwrite a newer edit';
  end if;${backup}
  update public.theories t set summary=e.after,quotation=e.after_q,updated_at=now()
  from jsonb_to_recordset(edits) e(id text,after text,after_q jsonb)
  where t.id=e.id and (t.summary is distinct from e.after or t.quotation is distinct from e.after_q);
end $editorial$;
`;
}

function main() {
  const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const catalogue = readJson(sourcePath);
  const before = readJson(path.join(contentDir, 'theory-practical-before-20261021.json'));
  const beforeById = new Map(before.map(row => [row.id, row]));
  const titleReviewPath = path.join(contentDir, 'theory-saying-titles-review-20261021.json');
  const titleReviews = new Map(fs.existsSync(titleReviewPath)
    ? readJson(titleReviewPath).changes.map(row => [row.id, row]) : []);
  const reviewPath = path.join(contentDir, 'theory-practical-review-20261021.json');
  const previousById = new Map(fs.existsSync(reviewPath)
    ? readJson(reviewPath).changes.map(row => [row.id, row]) : []);
  const drafts = fs.readFileSync(path.join(contentDir, 'theory-practical-openings-20261021.tsv'), 'utf8')
    .trim().split(/\r?\n/).map(line => line.split('\t'));
  const openings = new Map(drafts);
  assert.equal(catalogue.length, 945);
  assert.equal(before.length, 945);
  assert.equal(drafts.length, 945);
  assert.equal(openings.size, 945);
  const changes = [];
  const result = catalogue.map(theory => {
    const old = beforeById.get(theory.tagId);
    assert.ok(old && (old.title === theory.title || (titleReviews.get(theory.tagId)?.beforeTitle === old.title && titleReviews.get(theory.tagId)?.title === theory.title)), `Identity changed: ${theory.tagId}`);
    const opening = openings.get(theory.tagId);
    assert.ok(opening, `Missing opening: ${theory.tagId}`);
    const beforeText = old.quotation?.contextNote ?? old.summary;
    const explanation = rewriteExplanation(beforeText, opening, theory.tagId);
    const quotation = old.quotation ? { ...old.quotation, contextNote: explanation } : null;
    const summary = quotation
      ? `「${quotation.translationText}」\n— ${quotation.author}\n${quotation.work}\n\n${explanation}`
      : explanation;
    const previous = previousById.get(theory.tagId);
    assert.ok(theory.summary === old.summary || theory.summary === summary || theory.summary === previous?.summary, `New local edit: ${theory.tagId}`);
    assert.ok(JSON.stringify(theory.quotation ?? null) === JSON.stringify(old.quotation) ||
      JSON.stringify(theory.quotation ?? null) === JSON.stringify(quotation) ||
      JSON.stringify(theory.quotation ?? null) === JSON.stringify(previous?.quotation), `New quotation edit: ${theory.tagId}`);
    const next = { ...theory, summary, ...(quotation ? { quotation } : {}) };
    assert.equal(unchangedFieldsHash(next), unchangedFieldsHash(theory));
    assert.notEqual(summary, old.summary, `Unchanged explanation: ${theory.tagId}`);
    changes.push({ id: theory.tagId, title: theory.title, opening, beforeSummary: old.summary, summary,
      beforeQuotation: old.quotation, quotation, unchangedFieldsSha256: unchangedFieldsHash(theory) });
    return next;
  });
  const review = {
    date: '2026-10-21', reviewedPublishedCount: 945, changedCount: changes.length,
    quotationCommentaryCount: changes.filter(row => row.quotation).length,
    editorialRules: [
      '一文目は具体場面や行動の指示から始めず、一般化した原理や見方を伝える。',
      '難しい用語を平易な言葉にし、その考えが何に目を向けるものかを明確にする。',
      '効果の条件・例外・出典上の留保は保持し、必要な用語は二文目以降で補う。',
      '格言の原文・訳文・著者・権利情報は保持し、解説部分のみを編集する。',
    ],
    continuationEditedIds: [...new Set([...Object.keys(continuations), ...redundantSecondSentenceIds])], changes,
  };
  const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
  writeJson(sourcePath, result);
  writeJson(path.join(contentDir, 'theory-practical-review-20261021.json'), review);
  fs.writeFileSync(path.join(contentDir, 'theory-practical-update-20261021.sql'), sqlForReview(review));
  fs.writeFileSync(path.join(contentDir, 'theory-practical-rollback-20261021.sql'), sqlForReview(review, true));
  const report = ['# 理論解説の本文編集（2026-10-21）', '',
    '対象：現在公開中の945件。前回の画面変更は取り消し、本文のみを編集。', '',
    ...review.editorialRules.map(rule => '- ' + rule), '',
    '## 全945件の書き出し比較', '', '| ID | 理論 | 編集前の一文目 | 編集後の一文目 |', '| --- | --- | --- | --- |',
    ...changes.map(row => {
      const oldText = row.beforeQuotation?.contextNote ?? row.beforeSummary;
      const cells = [row.id, row.title, oldText.slice(0, oldText.indexOf('。') + 1), row.opening];
      return '| ' + cells.map(s => s.replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ') + ' |';
    }), '',
  ].join('\n');
  fs.writeFileSync(path.join(contentDir, 'theory-practical-edit-20261021.md'), report);
  console.log(`Edited ${changes.length} explanations, including ${review.quotationCommentaryCount} quotation commentaries.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
