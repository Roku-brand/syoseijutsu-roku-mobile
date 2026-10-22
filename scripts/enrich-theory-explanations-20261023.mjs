import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const base = 'docs/content/theory-depth-';
const before = read(base + 'before-20261023.json');
const current = read('src/data/generated/theories.json');
const body = theory => theory.quotation?.contextNote ?? theory.summary;
const sentenceCount = value => (value.match(/[。！？]/g) ?? []).length;
const md5 = value => createHash('md5').update(value).digest('hex');
const bodyHash = rows => md5([...rows].sort((a, b) => a.tagId.localeCompare(b.tagId))
  .map(t => t.tagId + t.summary + (t.quotation?.contextNote ?? '')).join('|'));
const additions = new Map();
const files = fs.readdirSync('content').filter(name => /^theory-depth-.*20261023\.tsv$/.test(name)).sort();
for (const file of files) {
  for (const line of fs.readFileSync('content/' + file, 'utf8').trim().split(/\r?\n/)) {
    const [id, text, extra] = line.split('\t');
    assert.ok(id && text && !extra && !additions.has(id), 'Invalid or duplicate addition: ' + id);
    assert.ok(text.endsWith('。') && sentenceCount(text) >= 1, 'Incomplete sentence: ' + id);
    assert.ok(!/[\uFFFD]|TODO|TBD/.test(text), 'Unfinished copy: ' + id);
    additions.set(id, text);
  }
}
assert.equal(before.length, 947);
assert.equal(additions.size, 739);
assert.equal(new Set(additions.values()).size, additions.size);
assert.equal(bodyHash(before), '26385ac11b49ad45c54e1bca57b88e50', 'Unexpected editorial baseline');
const changes = [];
const after = before.map(theory => {
  const oldBody = body(theory);
  const addition = additions.get(theory.tagId);
  if (sentenceCount(oldBody) > 1) {
    assert.ok(!addition, 'Existing multi-sentence body must be preserved');
    return theory;
  }
  assert.ok(addition, 'Missing expansion: ' + theory.tagId);
  assert.ok(theory.summary.endsWith(oldBody), 'Quotation body is not the summary suffix');
  const explanation = oldBody + '\n' + addition;
  const quotation = theory.quotation ? { ...theory.quotation, contextNote: explanation } : null;
  const summary = theory.summary.slice(0, -oldBody.length) + explanation;
  const next = { ...theory, summary, ...(quotation ? { quotation } : {}) };
  assert.ok(explanation.length <= 180, 'Explanation too long: ' + theory.tagId);
  assert.ok(sentenceCount(explanation) >= 2);
  changes.push({ id: theory.tagId, title: theory.title, categoryId: theory.categoryId,
    opening: oldBody, addition, explanation, beforeSummary: theory.summary, summary,
    beforeQuotation: theory.quotation ?? null, quotation,
    beforeSentenceCount: sentenceCount(oldBody), afterSentenceCount: sentenceCount(explanation) });
  return next;
});
assert.equal(changes.length, additions.size);
// Reruns are safe; any unrelated or concurrent local change stops the export.
for (let i = 0; i < current.length; i++) {
  assert.ok(JSON.stringify(current[i]) === JSON.stringify(before[i])
    || JSON.stringify(current[i]) === JSON.stringify(after[i]), 'Later local editorial change: ' + current[i].tagId);
}
assert.equal(current.length, after.length);
assert.equal(after.filter(t => sentenceCount(body(t)) < 2).length, 0);

const expectedHash = bodyHash(after);
const counts = Object.fromEntries([...new Set(before.map(t => t.categoryId))]
  .map(category => [category, changes.filter(t => t.categoryId === category).length]));
const lengths = changes.map(t => t.explanation.length).sort((a, b) => a - b);
const review = { date: '2026-10-23', reviewedPublishedCount: before.length, changedCount: changes.length,
  remainingSingleSentenceCount: 0, byCategory: counts,
  medianExplanationLength: lengths[Math.floor(lengths.length / 2)], maximumExplanationLength: lengths.at(-1),
  beforeBodyMd5: bodyHash(before), afterBodyMd5: expectedHash,
  sourceFiles: files.map(file => 'content/' + file),
  editorialRules: [
    '簡潔な最初の定義を残し、理論ごとに場面例・手順・使い分けを1〜2文補う。',
    '補足は編集による例・読み方として書き、同じ定型文を全項目に繰り返さない。',
    '実用語は使い方が分かる具体性を持たせ、心理効果を成功の保証にしない。',
    '引用本文と書誌情報は保持し、古典の補足を原典そのものの発言と混ぜない。',
    '公開ID、分類、無料範囲、関連リンク、出典および既存の複数文の本文は維持する。',
  ],
  references: [
    { url: 'https://dictionary.apa.org/heuristic', use: '判断の手がかりの効率と限界を確認。場面例は編集による例。' },
    { url: 'https://www.nhs.uk/mental-health/talking-therapies-medicine-treatments/talking-therapies-and-counselling/cognitive-behavioural-therapy-cbt/overview/', use: '心理療法の説明を、自己流の治療の指示と混同しないために確認。' },
    { url: 'https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/facing-your-fears/', use: '回避と段階的な取り組みの範囲を確認。' },
    { url: 'https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/cognitive-behavioural-therapy-%28cbt%29', use: '認知・行動・活動への働きかけの違いを確認。各項目の既存出典は保持。' },
  ], changes };
write(base + 'review-20261023.json', review);
write('src/data/generated/theories.json', after);

const quote = value => "'" + value.replaceAll("'", "''") + "'";
const payload = changes.map(t => ({ id: t.id, title: t.title, summary: t.summary, quotation: t.quotation }));
const phase = 'theory_depth_20261023';
const sql = [
  'begin;',
  "select pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));",
  'lock table public.theories in share row exclusive mode;',
  'do $guard$ begin',
  "if (select count(*) from public.theories where status='published') <> 947 then raise exception 'Catalogue changed'; end if;",
  "if (select md5(string_agg(to_jsonb(t)::text,'|' order by id)) from public.theories t where status='published') is distinct from 'c29637f918e3ab30b1613958fa26815f' then raise exception 'Reviewed content changed'; end if;",
  'end $guard$;',
  'create temporary table theory_depth_edit (id text primary key,title text,summary text,quotation jsonb) on commit drop;',
  'insert into theory_depth_edit select * from jsonb_populate_recordset(null::theory_depth_edit,' + quote(JSON.stringify(payload)) + '::jsonb);',
  "insert into private.theory_reform_backups(phase,source_table,source_id,snapshot) select '" + phase + "','theories',t.id,to_jsonb(t) from public.theories t join theory_depth_edit e on e.id=t.id;",
  'update public.theories t set summary=e.summary,quotation=e.quotation,updated_at=now() from theory_depth_edit e where e.id=t.id;',
  'do $verify$ begin',
  'if (select count(*) from theory_depth_edit)<>739 then raise exception \'Incomplete expansion\'; end if;',
  'if exists(select 1 from theory_depth_edit e left join public.theories t on t.id=e.id where t.id is null or t.summary is distinct from e.summary or t.quotation is distinct from e.quotation) then raise exception \'Expansion differs\'; end if;',
  "if (select md5(string_agg(id||summary||coalesce(quotation->>'contextNote',''),'|' order by id)) from public.theories where status='published') is distinct from " + quote(expectedHash) + " then raise exception 'Expanded catalogue differs'; end if;",
  "if (select count(*) from public.theories where status='published' and access_tier='free')<>141 then raise exception 'Free scope changed'; end if;",
  "if exists(select 1 from private.theory_reform_backups b join public.theories t on t.id=b.source_id where b.phase='" + phase + "' and (to_jsonb(t)-'summary'-'quotation'-'updated_at') is distinct from (b.snapshot-'summary'-'quotation'-'updated_at')) then raise exception 'Unrelated fields changed'; end if;",
  'end $verify$;',
  'commit;',
].join('\n') + '\n';
fs.writeFileSync(base + 'update-20261023.sql', sql);
const rollback = [
  'begin;',
  "select pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));",
  'lock table public.theories in share row exclusive mode;',
  'do $guard$ begin',
  "if (select md5(string_agg(id||summary||coalesce(quotation->>'contextNote',''),'|' order by id)) from public.theories where status='published') is distinct from " + quote(expectedHash) + " then raise exception 'Later content edits; rollback stopped'; end if;",
  "if (select count(*) from private.theory_reform_backups where phase='" + phase + "')<>739 then raise exception 'Backup incomplete'; end if;",
  'end $guard$;',
  "update public.theories t set summary=b.snapshot->>'summary',quotation=b.snapshot->'quotation',updated_at=now() from private.theory_reform_backups b where b.phase='" + phase + "' and b.source_id=t.id;",
  'commit;',
].join('\n') + '\n';
fs.writeFileSync(base + 'rollback-20261023.sql', rollback);
const report = ['# 理論本文の補足編集（2026-10-23）', '',
  '公開中947件を照合し、1文のみの739件に固有の補足を加えた。既存の複数文208件は保持。', '',
  ...review.editorialRules.map(rule => '- ' + rule), '',
  '本文の長さの中央値：' + review.medianExplanationLength + '文字。最大：' + review.maximumExplanationLength + '文字。', '',
  '| ID | 理論 | 修正後の解説 |', '| --- | --- | --- |',
  ...changes.map(t => '| ' + [t.id, t.title, t.explanation.replaceAll('\n', '<br>')].map(s => s.replaceAll('|', '\\|')).join(' | ') + ' |'), '',
  '## 補足の確認先', '', ...review.references.map(r => '- ' + r.url + '：' + r.use), '',
].join('\n');
fs.writeFileSync(base + 'edit-20261023.md', report);
console.log(JSON.stringify({ reviewed: before.length, changed: changes.length, unchanged: before.length - changes.length,
  remainingSingleSentence: 0, medianLength: review.medianExplanationLength, maxLength: review.maximumExplanationLength,
  afterBodyMd5: expectedHash, sqlCharacters: sql.length, categories: counts }));
