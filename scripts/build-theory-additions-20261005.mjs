import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { additions } from './theory-additions-20261005.mjs';
import { wisdomSupportTechniqueIdsByTheoryId } from './master336-wisdom-support-links.mjs';

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
// Rebuild this dated release from its immutable, reviewed baseline, never from
// an already expanded working copy or an older historical catalog.
const readBaseline = p => JSON.parse(execFileSync('git', ['show', `a6ad8f1f9e3fcc2a0020aac11da98ede9527c2bf:${p}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
const write = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
const before = read('docs/content/theory-expansion-20261005-before.json');
const previous = readBaseline('src/data/generated/theories.json');
const previousById = new Map(previous.map(t => [t.tagId, t]));
const subcategories = readBaseline('src/data/generated/theory-subcategories.json');
const sourceById = new Map(before.theories.map(t => [t.id, t]));
assert.equal(additions.length, 40);
assert.equal(before.counts.published, 754);
for (const t of before.theories.filter(t => t.status === 'published')) {
  const local = previousById.get(t.id);
  assert.ok(local && local.title === t.title && local.summary === t.summary, `Canonical source drift: ${t.id}`);
}
assert.equal(previous.length, 754, 'Run once against the reviewed production snapshot.');
subcategories.push({ id: 'psychology-d', categoryId: 'psychology', title: '発達', displayOrder: 11 });
const bySection = new Map(subcategories.map(s => [s.id, s]));
const categoryTitles = Object.fromEntries(previous.map(t => [t.categoryId, t.categoryTitle]));
const nextDisplay = new Map(Object.keys(categoryTitles).map(category => [category,
  Math.max(0, ...before.theories.filter(t => t.category_id === category).flatMap(t => [t.display_id ?? 0, t.draft_display_id ?? 0])) + 1,
]));
const nextId = Math.max(...before.theories.map(t => Number(t.id.match(/^kb_(\d+)$/)?.[1] ?? 0))) + 1;
assert.equal(nextId, 869);
const added = additions.map((r, i) => {
  const [title, sectionId, anchorId, relatedTheoryIds, aliases, summary, attribution, period, work, url, note, techniqueIds] = r;
  const section = bySection.get(sectionId);
  assert.ok(section, title);
  if (anchorId) assert.equal(previousById.get(anchorId)?.subcategoryId, sectionId, `Wrong anchor section: ${title}`);
  const tagId = `kb_${nextId + i}`;
  const displayId = nextDisplay.get(section.categoryId);
  nextDisplay.set(section.categoryId, displayId + 1);
  return {
    card: { tagId, title, summary, categoryId: section.categoryId, categoryTitle: categoryTitles[section.categoryId],
      subcategoryId: section.id, subcategoryTitle: section.title, displayId, aliases, relatedTheoryIds: [...relatedTheoryIds],
      canonicalId: tagId, legacyIds: [], mergedFromIds: [], accessTier: 'complete',
      provenance: { status: title === 'カリギュラ効果' ? '一部確認' : '書誌確認済み', attribution, period, works: [work], sources: [{ title: '参照文献・原著の確認先', url }], note },
    }, anchorId, techniqueIds,
  };
});
const all = [...previous, ...added.map(r => r.card)];
const byId = new Map(all.map(t => [t.tagId, t]));
const byTitle = new Map(all.map(t => [t.title, t]));
// Explicit links between newly added concepts with different mechanisms.
for (const [a, b] of [
  ['非注意性盲目', '変化盲'], ['注意の瞬き', '非注意性盲目'],
  ['誤情報効果', 'ソースモニタリング'], ['ジェームズ＝ランゲ理論', 'キャノン＝バード理論'],
  ['感情の二要因理論', 'ジェームズ＝ランゲ理論'], ['感情の二要因理論', 'キャノン＝バード理論'],
  ['ピアジェの認知発達理論', '最近接発達領域'], ['SECIモデル', 'ダブルループ学習'],
]) {
  byTitle.get(a).relatedTheoryIds.push(byTitle.get(b).tagId);
  byTitle.get(b).relatedTheoryIds.push(byTitle.get(a).tagId);
}
for (const { card } of added) for (const id of card.relatedTheoryIds) {
  const other = byId.get(id);
  assert.ok(other, `${card.title} -> ${id}`);
  other.relatedTheoryIds = [...new Set([...other.relatedTheoryIds ?? [], card.tagId])];
}
const ordered = [];
for (const section of subcategories) {
  const old = previous.filter(t => t.subcategoryId === section.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const candidates = added.filter(t => t.card.subcategoryId === section.id);
  // New foundational sections/analyses precede the existing sequence.
  const members = candidates.filter(t => !t.anchorId).map(t => t.card);
  for (const card of old) members.push(card, ...candidates.filter(t => t.anchorId === card.tagId).map(t => t.card));
  members.forEach((t, i) => { t.sortOrder = i + 1; });
  ordered.push(...members);
}
const techniqueTree = readBaseline('src/data/generated/techniques.json');
const techniques = techniqueTree.categories.flatMap(c => c.subcategories.flatMap(s => s.items));
const productionTechniquesBefore = read('docs/content/theory-expansion-20261005-techniques-before.json');
const oldTechniqueLinks = new Map(productionTechniquesBefore.map(t => [t.id, t.theory_ids]));
const comprehensive = readBaseline('src/data/generated/comprehensive-theory-links.json');
const techniqueLinks = [];
for (const { card, techniqueIds } of added) for (const id of techniqueIds) {
  const technique = techniques.find(t => t.id === id);
  assert.ok(technique, `${card.title} -> ${id}`);
  technique.relatedTheoryIds = [...new Set([...technique.relatedTheoryIds ?? [], card.tagId])];
  comprehensive[id] = [...new Set([...comprehensive[id] ?? [], card.tagId])];
  techniqueLinks.push({ theoryId: card.tagId, theory: card.title, techniqueId: id, technique: technique.title });
}
for (const technique of techniques) {
  const wisdom = Object.entries(wisdomSupportTechniqueIdsByTheoryId).filter(([, ids]) => ids.includes(technique.id)).map(([id]) => id);
  technique.relatedTheoryIds = [...new Set([...comprehensive[technique.id], ...wisdom])];
}
// Full-catalog collision/link/order audit, including retained aliases and old IDs.
const normalize = s => s.normalize('NFKC').toLocaleLowerCase('ja').trim();
const names = new Map();
for (const t of ordered) for (const name of [t.title, ...t.aliases ?? []]) {
  const key = normalize(name);
  assert.ok(!names.has(key) || names.get(key) === t.tagId, `Name collision: ${name}`);
  names.set(key, t.tagId);
}
assert.equal(byId.size, ordered.length);
assert.equal(ordered.length, 794);
for (const t of ordered) {
  assert.equal(bySection.get(t.subcategoryId).categoryId, t.categoryId);
  for (const id of t.relatedTheoryIds ?? []) assert.ok(byId.has(id) && id !== t.tagId, `Invalid theory link: ${t.tagId}/${id}`);
}
for (const t of techniques) for (const id of [...t.relatedTheoryIds ?? [], ...t.primaryTheoryIds ?? []]) assert.ok(byId.has(id), `Invalid technique link: ${id}`);
const redirects = read('src/data/generated/theory-id-redirects.json');
for (const t of before.theories) assert.ok(byId.has(redirects[t.id] ?? t.id), `Lost legacy ID: ${t.id}`);
const scope = readBaseline('src/data/content-scope.json');
scope.complete.theories = ordered.length;
const metadata = readBaseline('src/data/generated/metadata.json');
metadata.theoryCount = metadata.productTheoryCount = ordered.length;
metadata.categoryCounts = Object.fromEntries(Object.keys(categoryTitles).map(id => [id, ordered.filter(t => t.categoryId === id).length]));
write('src/data/generated/theories.json', ordered);
write('src/data/generated/theory-subcategories.json', subcategories);
write('src/data/generated/techniques.json', techniqueTree);
write('src/data/generated/comprehensive-theory-links.json', comprehensive);
write('src/data/generated/metadata.json', metadata);
write('src/data/content-scope.json', scope);
const categories = Object.keys(categoryTitles).map(id => ({ id, title: categoryTitles[id], before: previous.filter(t => t.categoryId === id).length,
  added: added.filter(t => t.card.categoryId === id).length, after: metadata.categoryCounts[id],
  sections: subcategories.filter(s => s.categoryId === id).map(s => ({ title: s.title, count: ordered.filter(t => t.subcategoryId === s.id).length })),
}));
const audit = { source: 'Supabase psfexomjhivqieehcrzx / public.theories', date: '2026-10-05', before: 754, added: 40, after: 794, physicalAfter: 799,
  retiredCompatibilityRows: 5, free: 151, completeOnly: 643, merges: 0, deletions: 0, unclassified: 0, nameConflicts: 0, idConflicts: 0, linkFailures: 0,
  subcategories: subcategories.length, categories, additions: added.map(t => t.card), techniqueLinks,
};
write('docs/content/theory-expansion-20261005-audit.json', audit);

const q = s => s == null ? 'null' : "'" + String(s).replaceAll("'", "''") + "'";
const json = v => q(JSON.stringify(v)) + '::jsonb';
const changed = previous.filter(t => {
  const src = sourceById.get(t.tagId);
  return src.taxonomy_order !== t.sortOrder || JSON.stringify(src.related_theory_ids) !== JSON.stringify(t.relatedTheoryIds);
});
let sql = `-- Reviewed content release: 754 -> 794; no schema or access policy changes.\nbegin;\nlock table public.theories, public.techniques, public.theory_subcategories in share row exclusive mode;\nselect pg_advisory_xact_lock(hashtextextended('theory-display-id',0));\ndo $guard$ begin\n if (select count(*) from public.theories where status='published')<>754 or (select md5(string_agg(id||':'||title||':'||summary||':'||category_id,'|' order by id)) from public.theories where status='published')<>'4e8c2bba7a2f8266c70b58e0c6c77829' then raise exception 'Production catalog changed; re-review required'; end if;\n`;
for (const t of changed) sql += ` if not exists(select 1 from public.theories where id=${q(t.tagId)} and updated_at=${q(sourceById.get(t.tagId).updated_at)}::timestamptz) then raise exception 'Concurrent theory edit: ${t.tagId}';end if;\n`;
sql += `end $guard$;\ninsert into public.theory_subcategories(id,category_id,title,display_order) values('psychology-d','psychology','発達',11);\n`;
// Insert all identities first so relation validation can safely link new cards.
sql += `insert into public.theories(id,title,summary,category_id,category_title,subcategory_id,taxonomy_order,canonical_id,legacy_ids,display_id,aliases,related_theory_ids,provenance,access_tier,status) values\n`;
sql += added.map(({ card: t }) => `(${q(t.tagId)},${q(t.title)},${q(t.summary)},${q(t.categoryId)},${q(t.categoryTitle)},${q(t.subcategoryId)},${t.sortOrder},${q(t.tagId)},'[]',${t.displayId},${json(t.aliases)},'[]',${json(t.provenance)},'complete','published')`).join(',\n') + ';\n';
for (const { card: t } of added) sql += `update public.theories set related_theory_ids=${json(t.relatedTheoryIds)},updated_at=now() where id=${q(t.tagId)};\n`;
for (const t of changed) sql += `update public.theories set taxonomy_order=${t.sortOrder},related_theory_ids=${json(t.relatedTheoryIds)},updated_at=now() where id=${q(t.tagId)};\n`;
for (const id of new Set(techniqueLinks.map(t => t.techniqueId))) {
  const t = techniques.find(t => t.id === id);
  const old = oldTechniqueLinks.get(id);
  assert.ok(old && old.every(theoryId => t.relatedTheoryIds.includes(theoryId)), `Lost production link: ${id}`);
  sql += `do $guard$ begin if not exists(select 1 from public.techniques where id=${q(id)} and theory_ids=${json(old)}) then raise exception 'Concurrent technique edit: ${id}';end if;end $guard$;\n`;
  sql += `update public.techniques set theory_ids=${json(t.relatedTheoryIds)},updated_at=now() where id=${q(id)};\n`;
}
sql += `do $verify$ begin\n if (select count(*) from public.theories where status='published')<>794 then raise exception 'Published count mismatch';end if;\n if (select count(*) from public.theories)<>799 then raise exception 'Physical count mismatch';end if;\n if (select count(*) from public.theories where status='published' and access_tier='free')<>151 then raise exception 'Free tier changed';end if;\n if exists(select 1 from public.theories t left join public.theory_subcategories s on s.id=t.subcategory_id where t.status='published' and (s.id is null or s.category_id<>t.category_id or t.taxonomy_order is null)) then raise exception 'Unclassified theory';end if;\n if exists(select 1 from public.theories where status='published' group by category_id,display_id having count(*)>1) then raise exception 'Display ID collision';end if;\n if exists(select 1 from public.theories where status='published' group by subcategory_id,taxonomy_order having count(*)>1) then raise exception 'Taxonomy order collision';end if;\n if exists(select 1 from public.theories t where t.id ~ '^kb_(869|8[7-9][0-9]|90[0-8])$' and not exists(select 1 from public.paid_content p where p.content_type='theory' and p.content_id=t.id and p.payload->>'summary'=t.summary and p.payload->>'subcategoryId'=t.subcategory_id)) then raise exception 'Paid projection mismatch';end if;\nend $verify$;\ncommit;\n`;
fs.writeFileSync('docs/content/theory-expansion-20261005.sql', sql);
const report = ['# 理論追加・公開報告（2026年10月5日）', '',
  '正本：Supabase `psfexomjhivqieehcrzx` の `public.theories`。公開754件を確認してから40件を追加し、794件へ増加。旧ID互換用の非公開5行を含む物理行数は799。今回の統合・削除は0件。無料151件を保持し、新規40件は完全版。', '',
  '## 画像との照合', '', '| 理論 | 対応 |', '|---|---|',
  '| カリギュラ効果 | kb_898として追加。俗称であり、原著は関連する禁止・検閲の実験。命名の初出は未確認と明記。 |',
  '| プロテウス効果 | kb_869として追加。VR・アバターの研究対象と、現実の外見への一般化を区別。 |',
  '| ツァイガルニク効果 | 既存kb_531を保持。追加登録しない。 |',
  '| ダニング＝クルーガー効果 | 既存kb_706を保持。追加登録しない。 |',
  '| ピグマリオン効果 | 既存kb_123を保持。追加登録しない。 |', '',
  '## 分類別件数', '', '| 大分類 | 変更前 | 追加 | 変更後 | 内部分類別件数 |', '|---|---:|---:|---:|---|',
  ...categories.map(c => `| ${c.title} | ${c.before} | ${c.added} | ${c.after} | ${c.sections.map(s => `${s.title} ${s.count}`).join('、')} |`), '',
  '発達を追加し、内部分類は48。ピアジェ、エリクソン、最近接発達領域を配置。既存カードは大分類・表示ID・タイトル・本文・アクセス区分を保持し、内部分類内の並び順だけを挿入位置に応じて振り直す。新しい基礎概念を関連する既存概念の近くへ置き、五十音順にはしない。', '',
  '## 追加した40件', '', '| ID | 理論名 | 大分類 > 内部分類 | 参照文献 |', '|---|---|---|---|',
  ...added.map(({ card: t }) => `| ${t.tagId} | ${t.title} | ${t.categoryTitle} > ${t.subcategoryTitle} | [${t.provenance.period}](${t.provenance.sources[0].url}) |`), '',
  '各カードにオリジナルの説明、表記別名、参照著者・刊行時期・著作・URL・出典上の注意を付けた。書誌確認済みは文献の同定を示し、全理論の妥当性や原著全文の査読を保証する表示ではない。医療技法は対象に応じた評価と支援に触れ、一般読者向けの診断手順は追加しない。', '',
  '## 統合せずに保持する概念', '', '| A | B | 判定 | 理由 |', '|---|---|---|---|',
  ...[
    ['カリギュラ効果','心理的リアクタンス','禁止された情報への関心という場面と、自由への反発一般。俗称の由来・同義扱いの範囲は未確認のため、現状は別カードで保持して統合しない。'],
    ['非注意性盲目','変化盲','予期しない対象と、既に提示された場面の変化。'],
    ['気分一致記憶','状態依存記憶','現在の気分と情報の感情価の一致と、学習時・想起時の状態の一致。'],
    ['検索誘導性忘却','検索練習効果','未練習の競合項目への影響と、練習した項目の保持の向上。'],
    ['テロ管理理論','死の顕現性','理論の枠組みと、その検討に使う概念。'],
    ['過剰正当化効果','自己決定理論','個別現象と、動機づけに関する広い理論。'],
    ['処理流暢性','流暢性の錯覚','処理のしやすさと、それを習熟度だと誤解する現象。'],
    ['コミットメントのエスカレーション','サンクコスト効果','責任や自己正当化を含む追加投入の過程と、埋没費用の影響。'],
    ['SECIモデル','組織学習','暗黙知・形式知の変換モデルと、広い組織の学習過程。'],
    ['ダブルループ学習','組織学習','前提を問い直す学習と、その親概念。'],
    ['フィードラーのコンティンジェンシー理論','状況対応型リーダーシップ','モデルが扱うスタイルと状況の変数が異なる。'],
    ['職務要求度・コントロールモデル','職務要求資源モデル','要求と裁量の二軸と、多様な職務資源を扱うモデル。'],
    ['感情の二要因理論','ハーズバーグの二要因理論','感情経験と職務動機づけという対象が異なる。'],
    ['ジェームズ＝ランゲ理論','キャノン＝バード理論','身体反応と感情経験の関係について対照的な説明。'],
  ].map(([a, b, reason]) => `| ${a} | ${b} | ${a === 'カリギュラ効果' ? '要確認' : '別理論として維持'} | ${reason} |`), '',
  '## 処世術への関連追加', '', '| 理論 | 処世術 |', '|---|---|', ...techniqueLinks.map(p => `| ${p.theoryId}: ${p.theory} | ${p.techniqueId}: ${p.technique} |`), '',
  '主要理論の選定は変更せず、明確に対応する7組だけを「あわせて読む」へ追加した。その他は関連理論から辿れ、処世術リンクの件数合わせは行わない。', '',
  '対象5処世術の本番DBと既存リポジトリの間に、既存理論リンク26組の未反映も見つかった。この5件について、既存の本番リンクをすべて保持し、リポジトリの確認済みリンク集合へ同期する。新規理論の7組とは分けて記録し、変更前の本番リンクはtechniques-before.jsonに保存する。', '',
  '## 監査・反映', '',
  '全794件についてID、表示ID、名称・別名の競合、分類の所属、旧ID解決、理論・処世術リンク、連続した並び順を検査した。未分類・その他・ID競合・名称競合・リンク切れは0。公開SQLには正本ハッシュ、編集時刻、対象処世術の元リンク集合を確認するガードを入れ、変更を一つのトランザクションで適用する。完全版本文は既存トリガーでpaid_contentへ投影する。', '',
  '今回新たな統合やID移行は不要。フロントは既存の内部分類見出し、全件検索、詳細・出典・関連リンクへ自動反映する。CMSの分類編集と新規作成も既存機構を使う。公開用JSONには新規タイトル・分類・別名を入れ、完全版本文と出典は匿名向けバンドルへ含めない。', '',
  '## 人間レビューとして残す項目', '', '| ID | 理論名 | 論点 | 現行扱い |', '|---|---|---|---|',
  '| kb_898 | カリギュラ効果 | 日本語俗称の初出・命名者 | 一部確認。関連研究と命名の証拠を区別。 |',
  '| kb_885 / kb_886 / kb_905 | 感情の歴史的理論 | 現代の神経科学への単純な一般化 | 歴史的モデルと明記し、それぞれ別カードで保持。 |',
  '| kb_902 / kb_903 | 発達段階の理論 | 年齢・文化・課題による違い | 固定した診断基準として扱わない。 |', '',
  '公開と実行した検証の結果は同日のvalidationファイルに記録する。Web公開の完了と、App Storeの新しいバイナリ配信は別工程である。',
];
fs.writeFileSync('docs/content/theory-expansion-20261005-report.md', report.join('\n') + '\n');
console.log(JSON.stringify({ before: audit.before, added: audit.added, after: audit.after, categories, techniqueLinks: techniqueLinks.length, changedExistingRows: changed.length }));
