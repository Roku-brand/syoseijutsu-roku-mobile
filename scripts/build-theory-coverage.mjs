import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { coverageRows, coverageSections, developmentMoves } from './theory-coverage-data.mjs';

const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const write = (p, value) => fs.writeFileSync(p, JSON.stringify(value, null, 2) + '\n');
const base = 'docs/content/theory-coverage-20261015';
const previous = read(`${base}-catalog-before.json`);
const production = read(`${base}-before.json`);
const previousTechniques = read(`${base}-techniques-before.json`);
const productionTechniques = read(`${base}-technique-links-before.json`);
const sourceById = new Map(production.map(t => [t.id, t]));
const sourceTechniqueById = new Map(productionTechniques.map(t => [t.id, t]));
const scope = read(`${base}-scope-before.json`);
const categoryTitles = Object.fromEntries(previous.map(t => [t.categoryId, t.categoryTitle]));
const prefix = { psychology: 'P', 'behavioral-science': 'B', 'organization-management': 'O', strategy: 'T', 'practical-wisdom': 'A', 'classics-thought': 'C' };
const sections = read('src/data/generated/theory-subcategories.json').filter(s => !coverageSections.some(n => n.id === s.id)).concat(coverageSections);
const sectionById = new Map(sections.map(s => [s.id, s]));
const cards = structuredClone(previous);
const unique = a => [...new Set(a)];
for (const card of cards) {
  const old = sourceById.get(card.tagId);
  assert.ok(old, `Missing production identity: ${card.tagId}`);
  for (const [local, remote] of [['title', 'title'], ['summary', 'summary'], ['categoryId', 'category_id'], ['aliases', 'aliases'], ['relatedTheoryIds', 'related_theory_ids']]) {
    assert.deepEqual(card[local], old[remote], `Production mismatch: ${card.tagId}.${local}`);
  }
  if (developmentMoves.includes(card.tagId)) {
    card.subcategoryId = 'psychology-life';
    card.subcategoryTitle = sectionById.get(card.subcategoryId).title;
  }
}
for (const { section, techniqueIds: _techniqueIds, ...row } of coverageRows) {
  assert.ok(!cards.some(t => t.tagId === row.tagId), `ID already exists: ${row.tagId}`);
  const sub = sectionById.get(section);
  assert.ok(sub, `Unknown section: ${section}`);
  cards.push({ ...row, categoryId: sub.categoryId, categoryTitle: categoryTitles[sub.categoryId], subcategoryId: section,
    subcategoryTitle: sub.title, canonicalId: row.tagId, legacyIds: [], mergedFromIds: [], accessTier: 'complete' });
}
const byId = new Map(cards.map(t => [t.tagId, t]));
for (const row of coverageRows) for (const id of row.relatedTheoryIds) {
  assert.ok(byId.has(id) && id !== row.tagId, `Dead relation: ${row.tagId}/${id}`);
  const other = byId.get(id);
  other.relatedTheoryIds = unique([...(other.relatedTheoryIds ?? []), row.tagId]);
}
const categoryOrder = Object.keys(prefix);
const ordered = categoryOrder.flatMap(category => sections.filter(s => s.categoryId === category).sort((a, b) => a.displayOrder - b.displayOrder)
  .flatMap(s => {
    const members = cards.filter(t => t.subcategoryId === s.id);
    // Existing records retain relative pedagogical order; new entries follow the reviewed topic sequence.
    members.forEach((t, index) => { t.sortOrder = index + 1; });
    return members;
  }));
assert.equal(ordered.length, previous.length + coverageRows.length);
for (const category of categoryOrder) ordered.filter(t => t.categoryId === category).forEach((t, index) => { t.displayId = index + 1; });
scope.complete.theories = ordered.length;
scope.freeTheoryDisplayIds = scope.freeTheoryIds.map(id => {
  const t = byId.get(id);
  assert.ok(t, `Unknown free ID: ${id}`);
  return `${prefix[t.categoryId]}-${String(t.displayId).padStart(3, '0')}`;
});
const names = new Map();
for (const t of ordered) for (const name of [t.title, ...t.aliases ?? []]) {
  const key = name.normalize('NFKC').trim().toLowerCase();
  assert.ok(!names.has(key) || names.get(key) === t.tagId, `Name collision: ${name}`);
  names.set(key, t.tagId);
}
const techniqueTree = structuredClone(previousTechniques);
const techniques = techniqueTree.categories.flatMap(c => c.subcategories.flatMap(s => s.items));
const techniqueById = new Map(techniques.map(t => [t.id, t]));
const techniqueLinks = [];
for (const row of coverageRows) for (const id of row.techniqueIds) {
  const t = techniqueById.get(id);
  assert.ok(t, `Unknown technique: ${id}`);
  // The CMS is authoritative; preserve all existing published relationships.
  const remote = sourceTechniqueById.get(id);
  assert.ok(remote, `Missing published technique: ${id}`);
  // Local historical links and current owner-edited CMS links can differ.
  // Append to each baseline independently; never restore CMS links removed by the owner.
}
for (const row of coverageRows) for (const id of row.techniqueIds) {
  const t = techniqueById.get(id);
  t.relatedTheoryIds = unique([...(t.relatedTheoryIds ?? t.theoryTagIds ?? []), row.tagId]);
  if (t.theoryTagIds) t.theoryTagIds = t.relatedTheoryIds;
  techniqueLinks.push({ theoryId: row.tagId, techniqueId: id });
}
const comprehensive = read('src/data/generated/comprehensive-theory-links.json');
for (const id of new Set(techniqueLinks.map(p => p.techniqueId))) comprehensive[id] = techniqueById.get(id).relatedTheoryIds;
write('src/data/generated/theories.json', ordered);
write('src/data/generated/theory-subcategories.json', sections);
write('src/data/generated/techniques.json', techniqueTree);
write('src/data/generated/comprehensive-theory-links.json', comprehensive);
write('src/data/content-scope.json', scope);

const q = s => s == null ? 'null' : "'" + String(s).replaceAll("'", "''") + "'";
const json = v => q(JSON.stringify(v)) + '::jsonb';
const fingerprint = createHash('md5').update(production.map(t => `${t.id}:${t.title}:${t.summary}:${t.category_id}`).join('|')).digest('hex');
assert.equal(fingerprint, '186d7298d9cf5729a531fc7ebf507132');
let sql = `-- Reviewed content expansion. Existing stable IDs, text, access tiers and source metadata are preserved.\nbegin;\nlock table public.theories, public.techniques, public.theory_subcategories in share row exclusive mode;\nselect pg_advisory_xact_lock(hashtextextended('theory-display-id',0));\ndo $guard$ begin\n if (select count(*) from public.theories where status='published')<>${previous.length}\n or (select md5(string_agg(id||':'||title||':'||summary||':'||category_id,'|' order by id)) from public.theories where status='published')<>${q(fingerprint)} then raise exception 'Published content changed; re-review required';end if;\n`;
for (const t of production) sql += ` if not exists(select 1 from public.theories where id=${q(t.id)} and status='published' and updated_at=${q(t.updated_at)}::timestamptz) then raise exception 'Concurrent theory edit: ${t.id}';end if;\n`;
for (const id of new Set(techniqueLinks.map(p => p.techniqueId))) {
  const t = sourceTechniqueById.get(id);
  sql += ` if not exists(select 1 from public.techniques where id=${q(id)} and status='published' and updated_at=${q(t.updated_at)}::timestamptz and theory_ids=${json(t.theory_ids)}) then raise exception 'Concurrent technique edit: ${id}';end if;\n`;
}
sql += `end $guard$;\ninsert into public.theory_taxonomy_backups select 'theory-coverage-20261015','theories',id,to_jsonb(t) from public.theories t;\ninsert into public.theory_taxonomy_backups select 'theory-coverage-20261015','techniques',id,to_jsonb(t) from public.techniques t;\ninsert into public.theory_taxonomy_backups select 'theory-coverage-20261015','theory_subcategories',id,to_jsonb(t) from public.theory_subcategories t;\n`;
sql += `insert into public.theory_subcategories(id,category_id,title,display_order) values\n${coverageSections.map(s => `(${q(s.id)},${q(s.categoryId)},${q(s.title)},${s.displayOrder})`).join(',\n')};\n`;
sql += `-- Avoid transient category-local display ID collisions; existing constraints remain enabled.\nupdate public.theories set display_id=-display_id where status='published';\n`;
sql += `-- Insert every identity before publishing relationships between new entries.\ninsert into public.theories(id,title,summary,category_id,category_title,subcategory_id,taxonomy_order,canonical_id,legacy_ids,display_id,aliases,related_theory_ids,provenance,access_tier,status) values\n`;
sql += coverageRows.map(row => { const t = byId.get(row.tagId); return `(${q(t.tagId)},${q(t.title)},${q(t.summary)},${q(t.categoryId)},${q(t.categoryTitle)},${q(t.subcategoryId)},${t.sortOrder},${q(t.tagId)},'[]',${t.displayId},${json(t.aliases)},'[]',${json(t.provenance)},'complete','published')`; }).join(',\n') + ';\n';
for (const t of ordered) sql += `update public.theories set display_id=${t.displayId},subcategory_id=${q(t.subcategoryId)},taxonomy_order=${t.sortOrder},related_theory_ids=${json(t.relatedTheoryIds ?? [])},updated_at=now() where id=${q(t.tagId)};\n`;
for (const id of new Set(techniqueLinks.map(p => p.techniqueId))) {
  const links = unique([...sourceTechniqueById.get(id).theory_ids, ...techniqueLinks.filter(p => p.techniqueId === id).map(p => p.theoryId)]);
  sql += `update public.techniques set theory_ids=${json(links)},updated_at=now() where id=${q(id)};\n`;
}
sql += `do $verify$ begin\n if (select count(*) from public.theories where status='published')<>${ordered.length} then raise exception 'Published count mismatch';end if;\n if (select count(*) from public.theories where status='published' and access_tier='free')<>${scope.free.theories} then raise exception 'Free count mismatch';end if;\n if exists(select 1 from public.theories t join public.theory_taxonomy_backups b on b.source_id=t.id and b.source_table='theories' and b.migration_key='theory-coverage-20261015' where t.title is distinct from (b.snapshot->>'title') or t.summary is distinct from (b.snapshot->>'summary') or t.provenance is distinct from nullif(b.snapshot->'provenance','null'::jsonb) or t.access_tier is distinct from (b.snapshot->>'access_tier') or not (t.related_theory_ids @> (b.snapshot->'related_theory_ids'))) then raise exception 'Existing content changed';end if;\n if exists(select 1 from public.theories t left join public.theory_subcategories s on s.id=t.subcategory_id where t.status='published' and (s.id is null or s.category_id<>t.category_id)) then raise exception 'Classification mismatch';end if;\n if exists(select 1 from public.theories where status='published' group by subcategory_id having min(taxonomy_order)<>1 or max(taxonomy_order)<>count(*) or count(distinct taxonomy_order)<>count(*)) then raise exception 'Section order mismatch';end if;\n if exists(select 1 from (select t.display_id,row_number() over(partition by t.category_id order by s.display_order,t.taxonomy_order,t.id) expected from public.theories t join public.theory_subcategories s on s.id=t.subcategory_id where t.status='published') x where x.display_id<>x.expected) then raise exception 'Display order mismatch';end if;\n if exists(select 1 from public.theories t left join public.paid_content p on p.content_type='theory' and p.content_id=t.id where t.status='published' and t.access_tier='complete' and (p.content_id is null or p.payload->>'summary' is distinct from t.summary or p.payload->>'subcategoryId' is distinct from t.subcategory_id or (p.payload->>'displayId')::integer is distinct from t.display_id)) then raise exception 'Paid projection mismatch';end if;\nend $verify$;\ncommit;\n`;
fs.writeFileSync(`${base}.sql`, sql);
const report = { date: '2026-10-15', before: previous.length, added: coverageRows.length, after: ordered.length,
  free: scope.free.theories, completeOnly: ordered.length - scope.free.theories, sections: sections.length,
  moved: developmentMoves, techniqueLinks: techniqueLinks.length, relatedTheoryLinks: coverageRows.reduce((n, t) => n + t.relatedTheoryIds.length, 0),
  categories: categoryOrder.map(id => ({ id, title: categoryTitles[id], before: previous.filter(t => t.categoryId === id).length, after: ordered.filter(t => t.categoryId === id).length })),
  additions: coverageRows.map(t => ({ id: t.tagId, title: t.title, section: sectionById.get(t.section).title })),
};
write(`${base}-audit.json`, report);
fs.writeFileSync(`${base}-report.md`, [
  '# 理論カードの網羅性拡充（2026年10月15日）', '',
  `収録 ${report.before}件 → ${report.after}件（${report.added}件追加）。無料${report.free}件、完全版限定${report.completeOnly}件。`, '',
  '発達・人生の時間軸、脳・学習の基盤、論理・因果推論を新たな入口として設けた。エリクソン、ピアジェ、最近接発達領域は発達の分類へ移した。親概念・作用機序・支援方法・歴史的思想を区別し、単なる名前の追加で件数を増やさない。', '',
  'ダモクレスの剣は古典の寓話、社会的時計は社会的な年齢期待、脳の可塑性は神経系の性質、ロミオとジュリエット効果は追試で支持が一様でない仮説として説明した。全追加カードに原著・研究論文・提唱者の解説・学術論考の確認先を付けた。本文と具体例は独自に記述し、出典本文を転載していない。', '',
  `関連理論${report.relatedTheoryLinks}組を双方向で補い、処世術への関連${report.techniqueLinks}組を追加した。既存のタイトル・本文・出典・無料対象・保存用IDは保持。分類順で表示番号を再計算し、無料対象の表示番号リストも同じIDから更新した。`, '',
  '## 今回補った領域', '',
  '| 分類 | 追加カード |', '|---|---|',
  ...[...new Set(coverageRows.map(t => t.section))].map(id => `| ${sectionById.get(id).title} | ${coverageRows.filter(t => t.section === id).map(t => t.title).join('、')} |`), '',
  '## 読み進め方', '',
  '人生の焦り：社会的時計 → ライフコース理論 → 社会情動的選択性理論。',
  '学び直し：脳の可塑性 → 敏感期・長期増強 → 睡眠と記憶の固定化 → 検索練習・間隔効果。',
  '関係の反発：ロミオとジュリエット効果 → 心理的リアクタンス → 成人愛着スタイル・投資モデル。',
  '判断の点検：演繹・帰納・アブダクション → 必要条件・十分条件 → 反証可能性 → 相関と因果 → シンプソンのパラドックス。', '',
  '## 範囲と残る課題', '',
  '「網羅性」は日常の判断・学習・対人関係に役立つ主要概念のカバレッジを改善する意味であり、全学問の完全収録を意味しない。神経科学は基盤概念、論理は基本推論と代表的誤謬、倫理学は主要な対照軸を優先した。今後は文化心理、発達の実証知見、論理的誤謬の残り、因果研究の設計を追加候補として検討できる。', '',
  '## 配信と検証', '',
  '公開JSONには追加タイトル・分類・別名・関連IDのみを入れ、完全版本文・出典は既存の購入者向け配信へ投影する。SQLは編集時刻・内容ハッシュ・元リンクを確認し、バックアップと一つのトランザクションで適用する。実行結果は別の検証記録に残す。',
].join('\n') + '\n');
console.log(JSON.stringify(report, null, 2));
