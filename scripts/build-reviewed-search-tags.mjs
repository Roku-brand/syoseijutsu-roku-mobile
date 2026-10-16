import fs from 'node:fs';
import {createHash} from 'node:crypto';

const catalogPath = 'src/data/generated/techniques.json';
const reviewPath = 'docs/content/search-tags-review-20261016.json';
const migrationPath = 'supabase/migrations/20261016150453_curate_search_tags.sql';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const cards = catalog.categories.flatMap(c => c.subcategories.flatMap(p => p.items));
const rows = fs.readFileSync('content/search-technique-tags.tsv', 'utf8').trim().split(/\r?\n/).slice(1).map(line => {
  const [id, text] = line.split('\t');
  const card = cards.find(card => card.id === id);
  if (!card) throw new Error(`Unknown reviewed technique: ${id}`);
  const tags = text.split('|');
  if (tags.length < 3 || tags.length > 6 || new Set(tags).size !== tags.length || tags.some(tag => !tag || tag.length > 24)) throw new Error(`Invalid tags: ${id}`);
  return {id, tags, source_hash: createHash('md5').update([card.title, card.essence ?? '', card.explanation ?? ''].join('|')).digest('hex')};
});
if (rows.length !== 356 || new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('Expected exactly 356 reviewed stable IDs.');
const snapshotPath = '.local-theory-backups/search-before-20261016.json';
if (fs.existsSync(snapshotPath)) {
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  for (const row of rows) {
    const card = snapshot.techniques.find(card => card.id === row.id && card.status === 'published');
    if (!card || createHash('md5').update([card.title, card.essence ?? '', card.explanation ?? ''].join('|')).digest('hex') !== row.source_hash) throw new Error(`Canonical text changed: ${row.id}`);
  }
}
const sql = `-- Reviewed tags only. Stable IDs, text, relations and entitlement are unchanged.
set local lock_timeout = '5s';
select pg_advisory_xact_lock(hashtextextended('search-tags-editorial',0));
lock table public.techniques, public.paid_content in share row exclusive mode;
create temporary table reviewed_search_tags on commit drop as
select * from jsonb_to_recordset('${JSON.stringify(rows).replaceAll("'", "''")}') as x(id text,tags jsonb,source_hash text);
do $guard$
begin
 if (select count(*) from reviewed_search_tags) <> 356 then raise exception 'Incomplete search-tag review';end if;
 if exists(select 1 from reviewed_search_tags r left join public.techniques t on t.id=r.id
   where t.id is null or t.status <> 'published' or md5(t.title||'|'||coalesce(t.essence,'')||'|'||coalesce(t.explanation,'')) <> r.source_hash
   or (coalesce(t.tags,'null'::jsonb)<>'null'::jsonb and t.tags is distinct from r.tags)) then raise exception 'Source text or owner tags changed; review before applying';end if;
end $guard$;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'search-tags-20261016','techniques',t.id,to_jsonb(t)||jsonb_build_object('_tags_sql_null',t.tags is null) from public.techniques t join reviewed_search_tags r on r.id=t.id
on conflict(phase,source_table,source_id) do nothing;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'search-tags-20261016','paid_content',p.content_type||'|'||p.content_id,to_jsonb(p) from public.paid_content p join reviewed_search_tags r on r.id=p.content_id where p.content_type='technique'
on conflict(phase,source_table,source_id) do nothing;
update public.techniques t set tags=r.tags,updated_at=now() from reviewed_search_tags r where t.id=r.id and t.tags is distinct from r.tags;
update public.paid_content p set payload=jsonb_set(p.payload,'{tags}',r.tags,true),updated_at=now() from reviewed_search_tags r where p.content_type='technique' and p.content_id=r.id and p.payload->'tags' is distinct from r.tags;
do $verify$
begin
 if (select count(*) from public.techniques t join reviewed_search_tags r on r.id=t.id where t.tags=r.tags)<>356 then raise exception 'Tags were not fully applied';end if;
 if exists(select 1 from private.theory_reform_backups b join public.techniques t on t.id=b.source_id
  where b.phase='search-tags-20261016' and b.source_table='techniques' and (b.snapshot-'tags'-'updated_at'-'_tags_sql_null') is distinct from (to_jsonb(t)-'tags'-'updated_at')) then raise exception 'Unexpected technique content change';end if;
 if exists(select 1 from public.paid_content p join reviewed_search_tags r on r.id=p.content_id where p.content_type='technique' and p.payload->'tags' is distinct from r.tags) then raise exception 'Complete-edition tags differ';end if;
 if exists(select 1 from private.theory_reform_backups b join public.paid_content p on b.source_id=p.content_type||'|'||p.content_id
  where b.phase='search-tags-20261016' and b.source_table='paid_content' and ((b.snapshot->'payload')-'tags') is distinct from (p.payload-'tags')) then raise exception 'Unexpected paid body change';end if;
end $verify$;
`;
if (process.argv.includes('--write')) {
  fs.writeFileSync(reviewPath, JSON.stringify({phase:'search-tags-20261016',reviewedCount:rows.length,techniques:rows}, null, 2)+'\n');
  fs.writeFileSync(migrationPath, sql);
  for (const row of rows) cards.find(card => card.id === row.id).tags = row.tags;
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2)+'\n');
  console.log(`Prepared ${rows.length} reviewed tags; canonical SQL guard and backups included.`);
} else {
  const review = JSON.parse(fs.readFileSync(reviewPath, 'utf8'));
  if (JSON.stringify(review.techniques) !== JSON.stringify(rows) || fs.readFileSync(migrationPath, 'utf8').replace(/\r\n/g, '\n') !== sql.replace(/\r\n/g, '\n')) throw new Error('Search-tag review/migration differ from reviewed source.');
  console.log(`Search-tag review matches ${rows.length} stable IDs.`);
}
