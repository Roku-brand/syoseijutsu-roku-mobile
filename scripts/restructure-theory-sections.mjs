import fs from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const read = file => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8'));
const write = (file, value) => fs.writeFileSync(new URL(file, root), `${JSON.stringify(value, null, 2)}\n`);
const sourceFile = 'src/data/generated/theories.json';
const snapshotFile = 'docs/content/theory-sections-20261007-before.json';
const rows = read(sourceFile);
const md5 = value => createHash('md5').update(value).digest('hex');
const ordered = [...rows].sort((a, b) => a.tagId.localeCompare(b.tagId, 'en'));
const contentHash = md5(ordered.map(t => `${t.tagId}:${t.title}:${t.summary}:${t.categoryId}`).join('|'));
if (!fs.existsSync(new URL(snapshotFile, root))) {
  write(snapshotFile, {
    contentHash,
    classificationHash: md5(ordered.map(t => `${t.tagId}:${t.subcategoryId}:${t.sortOrder}`).join('|')),
    subcategories: read('src/data/generated/theory-subcategories.json'),
    assignments: rows.map(t => ({ tagId: t.tagId, title: t.title, categoryId: t.categoryId, subcategoryId: t.subcategoryId, sortOrder: t.sortOrder })),
  });
}
const before = read(snapshotFile);
if (contentHash !== before.contentHash) throw Error('Theory content changed; review the snapshot before rebuilding.');
const groups = {
  psychology: [['c', '認知・判断'], ['e', '感情・ストレス'], ['s', '自己理解・成長'], ['i', '人間関係・コミュニケーション'], ['v', '集団心理・社会的影響'], ['m', '記憶・注意']],
  'behavioral-science': [['d', '意思決定・選択'], ['m', '動機づけ・目標達成'], ['h', '習慣・行動設計'], ['l', '学習・強化']],
  'organization-management': [['i', '働き方・キャリア'], ['t', 'チーム・リーダーシップ'], ['o', '組織運営・人材育成'], ['n', '人脈・評判'], ['p', '権力・地位'], ['m', '経営・事業']],
  strategy: [['a', '状況分析・判断'], ['n', '交渉'], ['c', '競争・協力'], ['g', 'ゲーム理論'], ['r', 'リスク・撤退'], ['d', '計画・実行・適応']],
  'practical-wisdom': [['c', '会話・伝え方'], ['r', '人付き合い・距離感'], ['j', '考え方・判断'], ['a', '行動・継続'], ['w', '仕事・キャリア'], ['s', '心と生活の整え方']],
  'classics-thought': [['e', '東洋思想'], ['w', '西洋思想'], ['b', '兵法'], ['p', 'ことわざ・格言'], ['f', '文学']],
};
const subcategories = Object.entries(groups).flatMap(([categoryId, members]) => members.map(([suffix, title], i) => ({ id: `${categoryId}-${suffix}`, categoryId, title, displayOrder: i + 1 })));
const sectionById = new Map(subcategories.map(s => [s.id, s]));
const redirects = {
  'psychology-a': 'psychology-e', 'psychology-g': 'psychology-e', 'psychology-d': 'psychology-s',
  'psychology-u': 'psychology-i', 'psychology-t': 'psychology-e',
  'behavioral-science-x': 'behavioral-science-d', 'behavioral-science-g': 'behavioral-science-m', 'behavioral-science-e': 'behavioral-science-h',
  'organization-management-l': 'organization-management-t', 'organization-management-h': 'organization-management-o',
  'strategy-j': 'strategy-a', 'strategy-e': 'strategy-d',
  'practical-wisdom-t': 'practical-wisdom-j', 'practical-wisdom-k': 'practical-wisdom-w',
  'classics-thought-q': 'classics-thought-p',
};
// Explicit editorial moves: techniques go with their subject, and attention joins memory.
const overrides = Object.fromEntries([
  ['psychology-i', ['kb_403', 'kb_412', 'kb_411', 'kb_051', 'kb_052', 'kb_053', 'kb_024', 'kb_405', 'kb_427', 'kb_097', 'kb_040', 'kb_054', 'kb_099', 'kb_098', 'kb_100']],
  ['psychology-s', ['kb_262']],
].flatMap(([section, ids]) => ids.map(id => [id, section])));
// Resolve attention IDs by exact reviewed titles.
for (const title of ['カクテルパーティー効果', 'ストループ効果', '非注意性盲目', '変化盲', '注意の瞬き']) {
  const item = rows.find(t => t.title === title);
  if (!item) throw Error(`Missing reviewed theory: ${title}`);
  overrides[item.tagId] = 'psychology-m';
}
const originalById = new Map(before.assignments.map(t => [t.tagId, t]));
const assignments = before.assignments.map(t => ({ ...t, subcategoryId: overrides[t.tagId] ?? redirects[t.subcategoryId] ?? t.subcategoryId }));
for (const section of subcategories) {
  assignments.filter(t => t.subcategoryId === section.id).sort((a, b) => {
    const oldOrder = id => before.subcategories.find(s => s.id === originalById.get(id).subcategoryId).displayOrder;
    return oldOrder(a.tagId) - oldOrder(b.tagId) || a.sortOrder - b.sortOrder || a.tagId.localeCompare(b.tagId);
  }).forEach((t, i) => { t.sortOrder = i + 1; t.subcategoryTitle = section.title; });
}
for (const t of assignments) if (sectionById.get(t.subcategoryId)?.categoryId !== t.categoryId) throw Error(`Invalid section: ${t.tagId}`);
const byId = new Map(assignments.map(t => [t.tagId, t]));
const result = rows.map(t => {
  const a = byId.get(t.tagId);
  return { ...t, subcategoryId: a.subcategoryId, subcategoryTitle: a.subcategoryTitle, sortOrder: a.sortOrder };
}).sort((a, b) => subcategories.findIndex(s => s.id === a.subcategoryId) - subcategories.findIndex(s => s.id === b.subcategoryId) || a.sortOrder - b.sortOrder);
write(sourceFile, result);
write('src/data/generated/theory-subcategories.json', subcategories);
write('src/data/generated/theory-subcategory-redirects.json', redirects);
write('docs/content/theory-sections-20261007-plan.json', { contentHash, classificationHash: before.classificationHash, subcategories, redirects, assignments });
const q = value => `'${String(value).replaceAll("'", "''")}'`;
const subcategoryHash = md5([...before.subcategories].sort((a, b) => a.id.localeCompare(b.id, 'en')).map(s => `${s.id}:${s.categoryId}:${s.title}:${s.displayOrder}`).join('|'));
const sql = `-- Broad subject sections; stable IDs, text, access tiers and relationships are preserved.
lock table public.theories, public.theory_subcategories in share row exclusive mode;
select pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
do $guard$ begin
 if (select count(*) from public.theories where status='published')<>${rows.length}
 or (select md5(string_agg(id||':'||title||':'||summary||':'||category_id,'|' order by id)) from public.theories where status='published')<>${q(contentHash)}
 or (select md5(string_agg(id||':'||subcategory_id||':'||taxonomy_order::text,'|' order by id)) from public.theories where status='published')<>${q(before.classificationHash)}
 or (select md5(string_agg(id||':'||category_id||':'||title||':'||display_order::text,'|' order by id)) from public.theory_subcategories)<>${q(subcategoryHash)}
 then raise exception 'Canonical content or classification changed; re-review before applying.'; end if;
end $guard$;
insert into public.theory_taxonomy_backups
 select 'theory-sections-20261007','theories',id,to_jsonb(t) from public.theories t;
insert into public.theory_taxonomy_backups
 select 'theory-sections-20261007','theory_subcategories',id,to_jsonb(s) from public.theory_subcategories s;
update public.theory_subcategories s set title=v.title,display_order=v.display_order
 from (values
${subcategories.map(s => `(${q(s.id)},${q(s.title)},${s.displayOrder})`).join(',\n')}
) v(id,title,display_order) where s.id=v.id;
update public.theories t set subcategory_id=v.subcategory_id,taxonomy_order=v.taxonomy_order,updated_at=now()
 from (values
${assignments.map(t => `(${q(t.tagId)},${q(t.subcategoryId)},${t.sortOrder})`).join(',\n')}
) v(id,subcategory_id,taxonomy_order) where t.id=v.id and t.status='published';
delete from public.theory_subcategories s
 where s.id in (${Object.keys(redirects).map(q).join(',')})
 and not exists(select 1 from public.theories t where t.subcategory_id=s.id);
set constraints all immediate;
do $verify$ begin
 if (select count(*) from public.theory_subcategories)<>${subcategories.length}
 or (select md5(string_agg(id||':'||title||':'||summary||':'||category_id,'|' order by id)) from public.theories where status='published')<>${q(contentHash)}
 or exists(select 1 from public.theories t join public.theory_taxonomy_backups b on b.source_id=t.id and b.source_table='theories' and b.migration_key='theory-sections-20261007'
   where (to_jsonb(t)-'subcategory_id'-'taxonomy_order'-'updated_at')<>(b.snapshot-'subcategory_id'-'taxonomy_order'-'updated_at'))
 or exists(select 1 from public.theories t left join public.theory_subcategories s on s.id=t.subcategory_id where t.status='published' and (s.id is null or s.category_id<>t.category_id))
 or exists(select 1 from public.theories where status='published' group by subcategory_id having min(taxonomy_order)<>1 or max(taxonomy_order)<>count(*) or count(distinct taxonomy_order)<>count(*))
 or exists(select 1 from public.theories t left join public.paid_content p on p.content_type='theory' and p.content_id=t.id left join public.theory_subcategories s on s.id=t.subcategory_id
   where t.status='published' and t.access_tier='complete' and (p.content_id is null or p.payload->>'summary' is distinct from t.summary or p.payload->>'subcategoryId' is distinct from t.subcategory_id or p.payload->>'subcategoryTitle' is distinct from s.title or (p.payload->>'sortOrder')::int is distinct from t.taxonomy_order))
 then raise exception 'Theory section verification failed.'; end if;
end $verify$;
`;
fs.writeFileSync(new URL('docs/content/theory-sections-20261007.sql', root), sql);
console.log(JSON.stringify({ theories: result.length, subcategories: subcategories.length, contentHash, classificationHash: before.classificationHash, groups: subcategories.map(s => ({ title: s.title, count: result.filter(t => t.subcategoryId === s.id).length })) }, null, 2));
