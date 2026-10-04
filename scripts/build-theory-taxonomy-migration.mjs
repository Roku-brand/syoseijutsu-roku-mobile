import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const plan=read('docs/content/theory-taxonomy-plan.json');
// This title change belongs to the later polish migration; keep the applied base immutable.
delete plan.rename.kb_730;
const rows=read('docs/content/theory-taxonomy-after.json');
const before=read('docs/content/theory-taxonomy-before.json');
const functions=read('docs/content/theory-taxonomy-functions-before.json');
const guards=read('docs/content/theory-guards-before.json');
const q=s=>s==null?'null':"'"+String(s).replaceAll("'","''")+"'";
const json=v=>v==null?'null':q(JSON.stringify(v))+'::jsonb';
let sql=`-- Canonical source: production public.theories, 759 published rows.
-- IDs are stable; five retired rows remain as aliases, never physically deleted.
lock table public.theories, public.techniques in share row exclusive mode;
select pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
do $guard$ begin
 if (select count(*) from public.theories where status='published')<>759
 or (select md5(string_agg(id||':'||title||':'||summary||':'||category_id,'|' order by id)) from public.theories where status='published')<>'041403168f4b650ab737b95454c42ffa'
 then raise exception 'Canonical snapshot changed; re-review instead of overwriting.'; end if;
end $guard$;
create table public.theory_taxonomy_backups (
 migration_key text not null, source_table text not null, source_id text not null, snapshot jsonb not null,
 primary key(migration_key,source_table,source_id));
alter table public.theory_taxonomy_backups enable row level security;
create policy taxonomy_backup_owner on public.theory_taxonomy_backups for select to authenticated using(public.is_owner());
grant select on public.theory_taxonomy_backups to authenticated;
insert into public.theory_taxonomy_backups select '20261004125754','theories',id,to_jsonb(t) from public.theories t;
insert into public.theory_taxonomy_backups select '20261004125754','techniques',id,to_jsonb(t) from public.techniques t;
insert into public.theory_taxonomy_backups select '20261004125754','technique_drafts',technique_id,to_jsonb(t) from public.technique_drafts t;
insert into public.theory_taxonomy_backups select '20261004125754','popular_rankings',division,to_jsonb(t) from public.popular_rankings t;
insert into public.theory_taxonomy_backups select '20261004125754','operation_social_posts',id,to_jsonb(t) from public.operation_social_posts t;
create table public.theory_subcategories (
 id text primary key, category_id text not null, title text not null check(length(trim(title))>0),
 display_order integer not null check(display_order>0), unique(id,category_id));
alter table public.theory_subcategories enable row level security;
create policy taxonomy_read on public.theory_subcategories for select to anon,authenticated using(true);
create policy taxonomy_owner on public.theory_subcategories for all to authenticated using(public.is_owner()) with check(public.is_owner());
grant select on public.theory_subcategories to anon,authenticated;
grant insert,update,delete on public.theory_subcategories to authenticated;
alter table public.theories add column subcategory_id text references public.theory_subcategories(id),
 add column taxonomy_order integer check(taxonomy_order>0),
 add column canonical_id text references public.theories(id),
 add column legacy_ids jsonb not null default '[]'::jsonb check(jsonb_typeof(legacy_ids)='array');
create index theories_subcategory_order_idx on public.theories(subcategory_id,taxonomy_order) where status='published';
create index theories_canonical_id_idx on public.theories(canonical_id);
create index theory_subcategories_category_idx on public.theory_subcategories(category_id,display_order);
insert into public.theory_subcategories(id,category_id,title,display_order) values
${plan.subcategories.map(s=>`(${q(s.id)},${q(s.categoryId)},${q(s.title)},${s.displayOrder})`).join(',\n')};
create function public.resolve_theory_id(target_id text) returns text language sql stable security definer set search_path='' as $fn$
 select coalesce((select canonical_id from public.theories where id=target_id),target_id); $fn$;
create function public.resolve_theory_ids(ids jsonb) returns jsonb language sql stable security definer set search_path='' as $fn$
 select coalesce(jsonb_agg(id order by first_position),'[]'::jsonb) from (
 select public.resolve_theory_id(value) id,min(ord) first_position from jsonb_array_elements_text(coalesce(ids,'[]')) with ordinality v(value,ord)
 group by public.resolve_theory_id(value)) deduplicated; $fn$;
revoke all on function public.resolve_theory_id(text),public.resolve_theory_ids(jsonb) from public;
grant execute on function public.resolve_theory_id(text),public.resolve_theory_ids(jsonb) to anon,authenticated;
`;
// Keep validation of original creative works while allowing externally sourced practical methods.
let validate=guards.find(f=>f.proname==='validate_theory_content').definition.replaceAll('\r','');
validate=validate.replace(/ if new.category_id='practical-wisdom' and new.status='draft'[\s\S]*?\n end if;/,'');
validate=validate.replace("if new.category_id='practical-wisdom' and new.status='published' then",()=>"if new.status='published' and (new.provenance->>'status'='オリジナル' or (new.category_id='practical-wisdom' and new.title ~ '^「[^「」]+」$')) then");
sql+=validate+';\n';
sql+=`-- New projection preserves aliases for previously released clients and protects paid text.
create or replace view public.public_theories with(security_barrier=true) as
 select t.id,t.title,
 case when t.access_tier='free' or public.can_read_complete_content() then t.summary else '' end as summary,
 t.category_id,t.category_title,t.aliases,t.related_theory_ids,
 case when t.access_tier='free' or public.can_read_complete_content() then t.provenance else null::jsonb end as provenance,
 t.status,t.display_order,t.display_id,t.image_path,t.access_tier,t.subcategory_id,s.title subcategory_title,t.taxonomy_order,
 coalesce(t.canonical_id,t.id) canonical_id,t.legacy_ids
 from public.theories t left join public.theory_subcategories s on s.id=t.subcategory_id where t.status='published'
 union all
 select a.id,t.title,case when t.access_tier='free' or public.can_read_complete_content() then t.summary else '' end,
 t.category_id,t.category_title,t.aliases,t.related_theory_ids,
 case when t.access_tier='free' or public.can_read_complete_content() then t.provenance else null::jsonb end,
 'published',t.display_order,t.display_id,t.image_path,t.access_tier,t.subcategory_id,s.title,t.taxonomy_order,t.id,t.legacy_ids
 from public.theories a join public.theories t on t.id=a.canonical_id and t.id<>a.id
 left join public.theory_subcategories s on s.id=t.subcategory_id where t.status='published';
grant select on public.public_theories to anon,authenticated;
create function public.sync_taxonomy_paid_theory() returns trigger language plpgsql security definer set search_path='' as $fn$
declare t public.theories; data jsonb; alias_id text;
begin
 if tg_op='DELETE' then delete from public.paid_content where content_type='theory' and content_id=old.id;return old;end if;
 select * into t from public.theories where id=coalesce(new.canonical_id,new.id);
 if t.status<>'published' or t.access_tier<>'complete' then
  delete from public.paid_content where content_type='theory' and (content_id=new.id or content_id in(select id from public.theories where canonical_id=t.id));return new;
 end if;
 data:=jsonb_build_object('tagId',t.id,'canonicalId',t.id,'title',t.title,'summary',t.summary,
 'categoryId',t.category_id,'categoryTitle',t.category_title,'subcategoryId',t.subcategory_id,
 'subcategoryTitle',(select title from public.theory_subcategories where id=t.subcategory_id),'sortOrder',t.taxonomy_order,
 'aliases',t.aliases,'legacyIds',t.legacy_ids,'mergedFromIds',t.legacy_ids,'relatedTheoryIds',t.related_theory_ids,
 'provenance',t.provenance,'displayId',t.display_id,'displayOrder',t.display_order,'imagePath',t.image_path,'accessTier',t.access_tier);
 for alias_id in select id from public.theories where id=t.id or canonical_id=t.id loop
 insert into public.paid_content(content_type,content_id,payload,sort_order,updated_at)
 values('theory',alias_id,data||jsonb_build_object('tagId',alias_id),coalesce(t.taxonomy_order,t.display_order),now())
 on conflict(content_type,content_id) do update set payload=excluded.payload,sort_order=excluded.sort_order,updated_at=now();
 end loop;return new;
end $fn$;
drop trigger sync_canonical_paid_theory on public.theories;
create trigger sync_canonical_paid_theory after insert or update or delete on public.theories for each row execute function public.sync_taxonomy_paid_theory();
-- Stage display IDs outside both existing and future ranges without disabling integrity triggers.
update public.theories set display_id=display_id+100000 where status='published';
update public.theories set canonical_id=id;
${plan.merges.map(m=>`update public.theories set canonical_id=${q(m.canonicalId)} where id=${q(m.legacyId)};`).join('\n')}
update public.techniques set theory_ids=public.resolve_theory_ids(theory_ids),primary_theory_ids=public.resolve_theory_ids(primary_theory_ids);
update public.technique_drafts set snapshot=jsonb_set(jsonb_set(snapshot,'{theory_ids}',public.resolve_theory_ids(snapshot->'theory_ids')),'{primary_theory_ids}',public.resolve_theory_ids(snapshot->'primary_theory_ids'));
update public.theories t set related_theory_ids=(select coalesce(jsonb_agg(r.id),'[]'::jsonb) from jsonb_array_elements_text(public.resolve_theory_ids(t.related_theory_ids)) r(id) where r.id<>t.id);
update public.popular_rankings set content_ids=public.resolve_theory_ids(content_ids) where division='theory';
update public.operation_social_posts set source_theory_id=public.resolve_theory_id(source_theory_id) where source_theory_id is not null;
${plan.merges.map(m=>`update public.theories set status='archived' where id=${q(m.legacyId)};`).join('\n')}
with assignments(id,subcategory_id,taxonomy_order,display_id) as (values
${rows.map(t=>`(${q(t.tagId)},${q(t.subcategoryId)},${t.sortOrder},${t.displayId})`).join(',\n')})
update public.theories t set subcategory_id=a.subcategory_id,taxonomy_order=a.taxonomy_order,
 category_id=s.category_id,display_id=a.display_id,category_title=(select title from public.content_categories where kind='theory' and id=s.category_id)
from assignments a join public.theory_subcategories s on s.id=a.subcategory_id where t.id=a.id;
${rows.filter(t=>plan.rename[t.tagId]||t.legacyIds.length).map(t=>`update public.theories set title=${q(t.title)},aliases=${json(t.aliases)},legacy_ids=${json(t.legacyIds)},related_theory_ids=${json(t.relatedTheoryIds)},provenance=${json(t.provenance??null)} where id=${q(t.tagId)};`).join('\n')}
create function public.check_theory_taxonomy() returns trigger language plpgsql security definer set search_path='' as $fn$
declare t public.theories;begin
 select * into t from public.theories where id=new.id;
 if t.status='published' and (t.subcategory_id is null or t.taxonomy_order is null or not exists(select 1 from public.theory_subcategories where id=t.subcategory_id and category_id=t.category_id)) then
 raise exception '大分類に属する内部分類と並び順を指定してください。' using errcode='23514';end if;
 return new;end $fn$;
create constraint trigger theory_taxonomy_integrity after insert or update on public.theories deferrable initially deferred for each row execute function public.check_theory_taxonomy();
create function public.place_theory_in_subcategory(target_id text,target_subcategory text,target_order integer) returns void
language plpgsql security definer set search_path='' as $fn$
declare item public.theories;ids text[];requested integer;begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
 select * into item from public.theories where id=target_id for update;
 if item.canonical_id is not null and item.canonical_id<>item.id then raise exception '統合済みIDは編集できません。';end if;
 if not exists(select 1 from public.theory_subcategories where id=target_subcategory and category_id=item.category_id) then raise exception 'この大分類の内部分類を選択してください。' using errcode='23503';end if;
 if target_order is not null and target_order<1 then raise exception '並び順は1以上の整数にしてください。';end if;
 select coalesce(array_agg(id order by taxonomy_order nulls last,display_id,id),'{}') into ids from public.theories where subcategory_id=target_subcategory and status=item.status and id<>target_id;
 requested:=greatest(1,least(coalesce(target_order,cardinality(ids)+1),cardinality(ids)+1));
 ids:=ids[1:requested-1]||array[target_id]||ids[requested:cardinality(ids)];
 update public.theories t set subcategory_id=target_subcategory,taxonomy_order=x.ord,updated_at=now() from unnest(ids) with ordinality x(id,ord) where t.id=x.id;
 with ranked as (select id,row_number() over(partition by subcategory_id,status order by taxonomy_order nulls last,id) ord from public.theories where subcategory_id in(target_subcategory,item.subcategory_id) and status in('published','draft'))
 update public.theories t set taxonomy_order=r.ord from ranked r where t.id=r.id and t.taxonomy_order is distinct from r.ord;
end $fn$;
create function public.reorder_subcategory_theories(target_id text,target_ids text[]) returns void language plpgsql security definer set search_path='' as $fn$
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
 if cardinality(target_ids)<>(select count(*) from public.theories where status='published' and subcategory_id=target_id)
 or cardinality(target_ids)<>(select count(distinct id) from unnest(target_ids) id)
 or exists(select 1 from unnest(target_ids) requested(id) where not exists(select 1 from public.theories t where t.id=requested.id and t.subcategory_id=target_id and t.status='published')) then raise exception '内部分類の全理論を重複なく指定してください。';end if;
 update public.theories t set taxonomy_order=x.ord,updated_at=now() from unnest(target_ids) with ordinality x(id,ord) where t.id=x.id;
end $fn$;
create function public.save_theory_subcategory(target_id text,target_category text,target_title text,target_order integer) returns void language plpgsql security definer set search_path='' as $fn$
declare ids text[];requested integer;begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
 if nullif(trim(target_id),'') is null or nullif(trim(target_title),'') is null or target_order is null or target_order<1 or not exists(select 1 from public.content_categories where kind='theory' and id=target_category) then raise exception '大分類、名称、並び順を指定してください。';end if;
 if exists(select 1 from public.theory_subcategories where id=target_id and category_id<>target_category) then raise exception '内部分類の所属大分類は変更できません。';end if;
 if exists(select 1 from public.theory_subcategories where category_id=target_category and title=trim(target_title) and id<>target_id) then raise exception '同じ大分類内の名称は重複できません。';end if;
 select coalesce(array_agg(id order by display_order,id),'{}') into ids from public.theory_subcategories where category_id=target_category and id<>target_id;
 requested:=greatest(1,least(target_order,cardinality(ids)+1));
 ids:=ids[1:requested-1]||array[target_id]||ids[requested:cardinality(ids)];
 insert into public.theory_subcategories(id,category_id,title,display_order) values(target_id,target_category,trim(target_title),target_order)
 on conflict(id) do update set title=excluded.title,display_order=excluded.display_order;
 update public.theory_subcategories s set display_order=x.ord from unnest(ids) with ordinality x(id,ord) where s.id=x.id;
 -- Refresh secure projections when the section is renamed.
 update public.theories set updated_at=now() where subcategory_id=target_id;
end $fn$;
create function public.delete_theory_subcategory(target_id text) returns void language plpgsql security definer set search_path='' as $fn$
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
 if exists(select 1 from public.theories where subcategory_id=target_id) then raise exception '先に理論を別の内部分類へ移動してください。';end if;
 delete from public.theory_subcategories where id=target_id;
end $fn$;
`;
for(const name of ['publish_theory','save_theory_draft']){
 let def=functions.find(f=>f.name===name).definition;
 const check=`
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if exists(select 1 from public.theories where id=target_theory_id and canonical_id<>id) then raise exception '統合済みIDは編集できません。'; end if;
  if not exists(select 1 from public.theory_subcategories where id=payload->>'subcategory_id' and category_id=payload->>'category_id') then raise exception '大分類に属する内部分類を選択してください。' using errcode='23503'; end if;
`;
 def=def.replace('begin\n','begin\n'+check);
 def=def.replace('  return result;',`  perform public.place_theory_in_subcategory(target_theory_id,payload->>'subcategory_id',(payload->>'taxonomy_order')::integer);
  select * into result from public.theories where id=target_theory_id;
  return result;`);
 sql+=def+';\n';
}
sql+=`
revoke all on function public.sync_taxonomy_paid_theory(),public.check_theory_taxonomy(),public.place_theory_in_subcategory(text,text,integer),public.reorder_subcategory_theories(text,text[]),public.save_theory_subcategory(text,text,text,integer),public.delete_theory_subcategory(text) from public;
grant execute on function public.place_theory_in_subcategory(text,text,integer),public.reorder_subcategory_theories(text,text[]),public.save_theory_subcategory(text,text,text,integer),public.delete_theory_subcategory(text) to authenticated;
set constraints all immediate;
do $audit$ begin
 if (select count(*) from public.theories where status='published')<>754 then raise exception 'Published count mismatch';end if;
 if (select count(*) from public.theories where status='archived' and canonical_id<>id)<>5 then raise exception 'Alias count mismatch';end if;
 if exists(select 1 from public.theories t where status='published' and (subcategory_id is null or taxonomy_order is null)) then raise exception 'Unclassified theory';end if;
 if exists(select 1 from public.techniques t cross join lateral jsonb_array_elements_text(t.theory_ids) r(id) left join public.theories k on k.id=r.id where t.status<>'archived' and (k.id is null or k.status<>'published')) then raise exception 'Technique relation broken';end if;
 if exists(select 1 from public.theories t cross join lateral jsonb_array_elements_text(t.related_theory_ids) r(id) left join public.theories k on k.id=r.id where t.status='published' and (k.id is null or k.status<>'published' or t.id=r.id)) then raise exception 'Theory relation broken';end if;
 if (select count(*) from public.public_theories)<>759 then raise exception 'Old client compatibility mismatch';end if;
end $audit$;
`;
const destination='supabase/migrations/20261004133610_theory_internal_taxonomy.sql';
if(fs.existsSync(destination)&&fs.readFileSync(destination,'utf8').trim() && fs.readFileSync(destination,'utf8').replaceAll('\r\n','\n')!==sql) throw Error('Applied migration is immutable. Create a follow-up migration for changes.');
fs.writeFileSync(destination,sql);
console.log({bytes:Buffer.byteLength(sql),assignments:rows.length});
