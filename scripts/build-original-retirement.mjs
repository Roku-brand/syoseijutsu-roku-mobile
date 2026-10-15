import fs from 'node:fs';
if(!process.argv[2]) throw Error('Provide the privileged pre-retirement snapshot JSON. Never regenerate applied migrations against current data.');
const backup=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const originals=backup.theories.filter(t=>t.provenance?.status==='オリジナル');
if(originals.length!==39) throw Error('Review the authoritative 39-row snapshot before generating.');
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const ids=originals.map(t=>q(t.id)).join(',');
const rankingFill=['初頭効果','プロスペクト理論'].map(title=>backup.theories.find(t=>t.title===title&&t.status==='published')?.id);
if(rankingFill.some(id=>!id)||rankingFill.some(id=>originals.some(t=>t.id===id))) throw Error('Review the ranking fillers.');
const path=fs.readdirSync('supabase/migrations').find(s=>s.endsWith('_retire_original_maxims.sql'));
const validation=backup.functions.find(f=>f.name==='validate_theory_content').definition;
const start=validation.indexOf(" if new.status='published' and (new.provenance");
const end=validation.indexOf(' return new;',start);
if(start<0||end<0) throw Error('Unknown content validator; review instead of replacing it.');
const guard=` if new.status<>'archived' and (new.id in (${ids}) or new.provenance->>'status'='オリジナル') then
  raise exception '独自作成の名言は公開・再利用できません。' using errcode='23514';
 end if;
 if new.status='published' and new.category_id='practical-wisdom' and new.title ~ '^「[^「」]+」$' then
  raise exception '実践知には標語ではなく説明可能な原理・手法を登録してください。' using errcode='23514';
 end if;
`;
const sql=`-- Retire, never repurpose, the reviewed 39 original maxims.
-- Before: 842 published, 36 subcategories. After: 803 published.
-- Existing stable/display/canonical/legacy IDs remain unchanged; A-040+ keep their numbers.
lock table public.theories,public.techniques,public.popular_rankings in share row exclusive mode;
select pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
do $guard$ begin
 if (select md5(string_agg((to_jsonb(t)-'updated_at'-'updated_by')::text,'|' order by id)) from public.theories t)<>'f7277133fd6f44e5ad68492aeb214b69'
 then raise exception 'Canonical snapshot changed; re-review instead of overwriting.';end if;
 if (select count(*) from public.theory_subcategories)<>36 then raise exception 'Expected unchanged 36 subcategories.';end if;
end $guard$;
create table if not exists private.theory_reform_backups(phase text not null,source_table text not null,source_id text not null,snapshot jsonb not null,primary key(phase,source_table,source_id));
alter table private.theory_reform_backups enable row level security;
revoke all on private.theory_reform_backups from public,anon,authenticated;
grant select on private.theory_reform_backups to service_role;
insert into private.theory_reform_backups select 'original-retirement-20261015','theories',id,to_jsonb(t) from public.theories t;
insert into private.theory_reform_backups select 'original-retirement-20261015','techniques',id,to_jsonb(t) from public.techniques t;
insert into private.theory_reform_backups select 'original-retirement-20261015','technique_drafts',technique_id,to_jsonb(t) from public.technique_drafts t;
insert into private.theory_reform_backups select 'original-retirement-20261015','popular_rankings',division,to_jsonb(t) from public.popular_rankings t;
insert into private.theory_reform_backups select 'original-retirement-20261015','functions',p.proname,jsonb_build_object('definition',pg_get_functiondef(p.oid)) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname='validate_theory_content';
create temporary table retired_original_ids(id text primary key) on commit drop;
insert into retired_original_ids values ${originals.map(t=>'('+q(t.id)+')').join(',')};
-- Preserve immutable version/event history. Refuse newly introduced editorial references.
do $guard$ begin
 if exists(select 1 from public.feature_articles f join retired_original_ids r on to_jsonb(f.related_theory_ids)?r.id)
 or exists(select 1 from public.feature_article_drafts f join retired_original_ids r on (f.payload->'related_theory_ids')?r.id)
 or exists(select 1 from public.operation_social_posts p join retired_original_ids r on p.source_theory_id=r.id)
 then raise exception 'An additional feature/social reference needs review before retirement.';end if;
end $guard$;
update public.techniques t set theory_ids=(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(t.theory_ids) with ordinality x(value,ord) where value not in(select id from retired_original_ids)),
 primary_theory_ids=(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(t.primary_theory_ids) with ordinality x(value,ord) where value not in(select id from retired_original_ids))
where exists(select 1 from retired_original_ids r where t.theory_ids?r.id or t.primary_theory_ids?r.id);
update public.technique_drafts d set snapshot=jsonb_set(jsonb_set(snapshot,'{theory_ids}',(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(coalesce(snapshot->'theory_ids','[]')) with ordinality x(value,ord) where value not in(select id from retired_original_ids))),'{primary_theory_ids}',(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(coalesce(snapshot->'primary_theory_ids','[]')) with ordinality x(value,ord) where value not in(select id from retired_original_ids)))
where exists(select 1 from retired_original_ids r where (d.snapshot->'theory_ids')?r.id or (d.snapshot->'primary_theory_ids')?r.id);
update public.theories t set related_theory_ids=(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(t.related_theory_ids) with ordinality x(value,ord) where value not in(select id from retired_original_ids)) where exists(select 1 from retired_original_ids r where t.related_theory_ids?r.id);
-- Preserve the eight remaining entries in their relative order. The existing
-- editorial TOP 10 requires ten entries: append two established concepts,
-- never reuse the retired IDs or substitute new invented/historical maxims.
update public.popular_rankings p set content_ids=(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(p.content_ids) with ordinality x(value,ord) where value not in(select id from retired_original_ids))||${q(JSON.stringify(rankingFill))}::jsonb where division='theory';
update public.theories set status='archived' where id in(select id from retired_original_ids);
${validation.slice(0,start)+guard+validation.slice(end)};
do $verify$ begin
 if (select count(*) from public.theories where status='published')<>803
 or exists(select 1 from public.public_theories t join retired_original_ids r on r.id=t.id)
 or exists(select 1 from public.paid_content p join retired_original_ids r on r.id=p.content_id where p.content_type='theory')
 then raise exception 'Retirement verification failed.';end if;
end $verify$;
`;
fs.writeFileSync('supabase/migrations/'+path,sql);
console.log(path);
