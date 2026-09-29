-- The three existing content tables remain canonical. The paid_content rows
-- below are a transactionally maintained delivery projection, not an editor.
create table if not exists public.content_categories (
  kind text not null check (kind in ('technique', 'theory')),
  id text not null,
  title text not null check (length(trim(title)) > 0),
  display_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);
insert into public.content_categories(kind,id,title,display_order) values
  ('technique','interpersonal','対人術',1),('technique','work','仕事術',2),('technique','life','人生術',3)
on conflict (kind,id) do nothing;
insert into public.content_categories(kind,id,title,display_order)
select 'theory',category_id,max(category_title),row_number() over (order by min(display_order),category_id)
from public.theories group by category_id on conflict (kind,id) do nothing;
insert into public.content_categories(kind,id,title,display_order) values ('theory','practical-wisdom','実践知',7)
on conflict (kind,id) do nothing;
alter table public.content_categories enable row level security;
create policy "categories are readable" on public.content_categories for select to anon,authenticated using (true);
create policy "owners update categories" on public.content_categories for update to authenticated using (public.is_owner()) with check (public.is_owner());
grant select on public.content_categories to anon,authenticated;
grant update(title,display_order,updated_at) on public.content_categories to authenticated;

alter table public.personas add column if not exists id text;
update public.personas set id='persona-' || substr(md5(name),1,16) where id is null;
alter table public.personas alter column id set default ('persona-' || replace(gen_random_uuid()::text,'-',''));
alter table public.personas alter column id set not null;
create unique index if not exists personas_id_unique on public.personas(id);
alter table public.personas add column if not exists subtitle text not null default '';
alter table public.personas add column if not exists image_path text;
alter table public.personas add column if not exists draft_technique_ids jsonb not null default '[]'::jsonb;
alter table public.personas add column if not exists access_tier text not null default 'complete' check (access_tier in ('free','complete'));
alter table public.personas drop constraint if exists personas_status_check;
alter table public.personas add constraint personas_status_check check (status in ('published','draft','archived'));
update public.personas set access_tier='free' where name in ('印象がいい人','人たらしの人','仕事ができる人','タスク処理がうまい人','充実した人生を過ごせる人','自分らしく生きられる人');

alter table public.techniques add column if not exists image_path text;
alter table public.techniques add column if not exists tags jsonb;
alter table public.techniques add column if not exists access_tier text not null default 'complete' check (access_tier in ('free','complete'));
update public.techniques t set access_tier=case when exists
 (select 1 from public.paid_content p where p.content_type='technique' and p.content_id=t.id)
 then 'complete' else 'free' end;
alter table public.theories add column if not exists image_path text;
alter table public.theories add column if not exists draft_technique_ids jsonb not null default '[]'::jsonb;
alter table public.theories add column if not exists access_tier text not null default 'complete' check (access_tier in ('free','complete'));
update public.theories t set access_tier=case when exists
 (select 1 from public.paid_content p where p.content_type='theory' and p.content_id=t.id)
 then 'complete' else 'free' end;
alter table public.theories drop constraint if exists theories_status_check;
alter table public.theories add constraint theories_status_check check (status in ('published','draft','archived'));

-- Name remains the legacy natural key in URLs and technique.persona_id. The
-- immutable id is the CMS identity; a rename migrates all references together.
create or replace function public.save_persona(target_id text, payload jsonb)
returns public.personas language plpgsql security definer set search_path=public as $$
declare old_row public.personas; result_row public.personas; next_name text; next_category text;
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 next_name := trim(payload->>'name');
 next_category := payload->>'category';
 if nullif(next_name,'') is null then raise exception '人物像名を入力してください。' using errcode='22023'; end if;
 if not exists(select 1 from public.content_categories where kind='technique' and id=next_category) then raise exception 'カテゴリを選択してください。' using errcode='22023'; end if;
 select * into old_row from public.personas where id=target_id for update;
 if found then
   if coalesce(payload->>'status','draft') <> 'published' and (
     exists(select 1 from public.techniques where persona_id=old_row.name and status<>'archived')
     or exists(select 1 from public.technique_drafts d join public.techniques t on t.id=d.technique_id
       where t.status<>'archived' and d.snapshot->>'persona_id'=old_row.name)
   ) then raise exception '所属する処世術を移動または削除してから非公開にしてください。' using errcode='23503'; end if;
   update public.personas set name=next_name,category=next_category,subtitle=coalesce(payload->>'subtitle',''),
     image_path=payload->>'image_path',access_tier=coalesce(payload->>'access_tier','complete'),
     status=coalesce(payload->>'status','draft'),
     draft_technique_ids=case when payload->>'status'='published' then '[]'::jsonb
       else coalesce(payload->'related_technique_ids',draft_technique_ids) end,updated_at=now()
   where id=target_id returning * into result_row;
   if old_row.name is distinct from next_name then
     update public.techniques set persona_id=next_name,category=next_category,updated_at=now() where persona_id=old_row.name;
     update public.technique_drafts set snapshot=jsonb_set(snapshot,'{persona_id}',to_jsonb(next_name),true)
       where snapshot->>'persona_id'=old_row.name;
   elsif old_row.category is distinct from next_category then
     update public.techniques set category=next_category,updated_at=now() where persona_id=next_name;
   end if;
 else
   insert into public.personas(id,name,category,subtitle,image_path,access_tier,status,draft_technique_ids,display_order)
   values(target_id,next_name,next_category,coalesce(payload->>'subtitle',''),payload->>'image_path',
     coalesce(payload->>'access_tier','complete'),coalesce(payload->>'status','draft'),
     case when payload->>'status'='published' then '[]'::jsonb else coalesce(payload->'related_technique_ids','[]'::jsonb) end,
     (select coalesce(max(display_order),0)+1 from public.personas where category=next_category))
   returning * into result_row;
 end if;
 if result_row.status='published' and payload ? 'related_technique_ids' then
   perform public.set_persona_techniques(result_row.id,array(select jsonb_array_elements_text(payload->'related_technique_ids')));
 end if;
 return result_row;
end $$;

-- Drafting a referenced theory must obey the same guard as archiving it.
create or replace function public.validate_theory_relations()
returns trigger language plpgsql security definer set search_path=public as $$
declare linked_id text;
begin
 if new.status<>'published' then
   if exists(select 1 from public.techniques where status<>'archived' and theory_ids ? new.id)
   or exists(select 1 from public.technique_drafts d join public.techniques t on t.id=d.technique_id
     where t.status<>'archived' and (d.snapshot->'theory_ids') ? new.id)
   or exists(select 1 from public.theories where status='published' and id<>new.id and related_theory_ids ? new.id) then
     raise exception 'この理論は処世術・下書き・関連理論から参照されています。先に関連を外してください。' using errcode='23503';
   end if;
   return new;
 end if;
 for linked_id in select jsonb_array_elements_text(new.related_theory_ids) loop
   perform 1 from public.theories where id=linked_id and status='published' for share;
   if not found then raise exception '公開中の関連理論を選択してください。' using errcode='23503'; end if;
 end loop;
 return new;
end $$;
revoke all on function public.save_persona(text,jsonb) from public;
grant execute on function public.save_persona(text,jsonb) to authenticated;

-- Theory labels come from the editable category record, including new drafts.
create or replace function public.validate_theory_content()
returns trigger language plpgsql security definer set search_path=public as $$
declare category_name text;
begin
 select title into category_name from public.content_categories where kind='theory' and id=new.category_id;
 if category_name is null then raise exception '理論カテゴリを選択してください。' using errcode='22023'; end if;
 new.category_title := category_name;
 if new.status='published' and (nullif(trim(new.title),'') is null or nullif(trim(new.summary),'') is null) then
   raise exception 'タイトルと概要は公開に必須です。' using errcode='22023';
 end if;
 if jsonb_typeof(new.aliases)<>'array' or jsonb_typeof(new.related_theory_ids)<>'array' then raise exception '別名と関連理論の形式が不正です。' using errcode='22023'; end if;
 if new.related_theory_ids ? new.id then raise exception '自分自身を関連理論に指定できません。' using errcode='22023'; end if;
 if new.provenance is not null then
   if coalesce(new.provenance->>'status','') not in ('確認済み','書誌確認済み','一部確認','出典不明') then
     raise exception '出典状態を選択してください。' using errcode='22023';
   end if;
   if exists(select 1 from jsonb_array_elements(coalesce(new.provenance->'sources','[]')) s
     where coalesce(s->>'url','') !~ '^https://[^[:space:]]+$' or nullif(trim(s->>'title'),'') is null) then
     raise exception '参照先には名称とhttpsのURLを入力してください。' using errcode='22023';
   end if;
 end if;
 return new;
end $$;

create or replace function public.propagate_category_title()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.kind='theory' and new.title is distinct from old.title then
   update public.theories set category_title=new.title,updated_at=now() where category_id=new.id;
 end if;
 return new;
end $$;
create trigger content_category_title_changed after update of title on public.content_categories
for each row execute function public.propagate_category_title();

create or replace function public.sync_canonical_paid_content()
returns trigger language plpgsql security definer set search_path=public as $$
declare payload jsonb; content_kind text; content_key text;
begin
 content_kind := case TG_TABLE_NAME when 'techniques' then 'technique' else 'theory' end;
 if TG_OP='DELETE' then content_key:=old.id; else content_key:=new.id; end if;
 if TG_OP='DELETE' then
   delete from public.paid_content where content_type=content_kind and content_id=content_key;
   return old;
 end if;
 if new.status<>'published' or new.access_tier<>'complete' then
   delete from public.paid_content where content_type=content_kind and content_id=content_key;
   return new;
 end if;
 if content_kind='technique' then
   payload := jsonb_build_object('id',new.id,'title',new.title,'essence',new.essence,
     'explanation',new.explanation,'memo',new.memo,'importance',new.importance,
     'primaryTheoryIds',coalesce(new.primary_theory_ids,'[]'::jsonb),
     'relatedTheoryIds',new.theory_ids,'categoryKey',new.category,
     'categoryName',(select title from public.content_categories where kind='technique' and id=new.category),
     'subcategory',new.persona_id,'articleTitle',new.persona_id,
     'practicalActions',jsonb_build_object('todayActions',new.practices,'examples',new.examples,'cautions',new.cautions),
     'displayOrder',new.display_order,'imagePath',new.image_path,'accessTier',new.access_tier,'tags',new.tags);
 else
   payload := jsonb_build_object('tagId',new.id,'title',new.title,'summary',new.summary,
     'categoryId',new.category_id,'categoryTitle',new.category_title,'aliases',new.aliases,
     'relatedTheoryIds',new.related_theory_ids,'provenance',new.provenance,
     'displayOrder',new.display_order,'imagePath',new.image_path,'accessTier',new.access_tier);
 end if;
 insert into public.paid_content(content_type,content_id,payload,sort_order,updated_at)
 values(content_kind,content_key,payload,new.display_order,now())
 on conflict(content_type,content_id) do update set payload=excluded.payload,sort_order=excluded.sort_order,updated_at=now();
 return new;
end $$;
drop trigger if exists sync_canonical_paid_technique on public.techniques;
create trigger sync_canonical_paid_technique after insert or update or delete on public.techniques
for each row execute function public.sync_canonical_paid_content();
drop trigger if exists sync_canonical_paid_theory on public.theories;
create trigger sync_canonical_paid_theory after insert or update or delete on public.theories
for each row execute function public.sync_canonical_paid_content();
-- Existing complete edition rows are reprojected from the canonical tables.
update public.techniques set updated_at=updated_at where access_tier='complete';
update public.theories set updated_at=updated_at where access_tier='complete';

create or replace function public.reorder_content(target_kind text,target_scope text,target_ids text[])
returns void language plpgsql security definer set search_path=public as $$
declare actual_count integer;
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 if cardinality(target_ids)=0 or cardinality(target_ids)<> (select count(distinct value) from unnest(target_ids) value) then
   raise exception '順序に重複または空のIDがあります。' using errcode='22023'; end if;
 if target_kind='persona' then
   select count(*) into actual_count from public.personas where category=target_scope and status<>'archived' and id=any(target_ids);
   if actual_count<>cardinality(target_ids) then raise exception '人物像の範囲が一致しません。' using errcode='22023'; end if;
   update public.personas set display_order=array_position(target_ids,id),updated_at=now() where id=any(target_ids);
 elsif target_kind='technique' then
   select count(*) into actual_count from public.techniques where persona_id=target_scope and status<>'archived' and id=any(target_ids);
   if actual_count<>cardinality(target_ids) then raise exception '処世術の範囲が一致しません。' using errcode='22023'; end if;
   update public.techniques set display_order=array_position(target_ids,id),updated_at=now() where id=any(target_ids);
 elsif target_kind='theory' then
   select count(*) into actual_count from public.theories where category_id=target_scope and status<>'archived' and id=any(target_ids);
   if actual_count<>cardinality(target_ids) then raise exception '理論の範囲が一致しません。' using errcode='22023'; end if;
   update public.theories set display_order=array_position(target_ids,id),updated_at=now() where id=any(target_ids);
 elsif target_kind in ('technique-category','theory-category') then
   select count(*) into actual_count from public.content_categories where kind=split_part(target_kind,'-',1) and id=any(target_ids);
   if actual_count<>cardinality(target_ids) then raise exception 'カテゴリの範囲が一致しません。' using errcode='22023'; end if;
   update public.content_categories set display_order=array_position(target_ids,id),updated_at=now()
     where kind=split_part(target_kind,'-',1) and id=any(target_ids);
 else raise exception '順序の対象が不正です。' using errcode='22023'; end if;
end $$;
revoke all on function public.reorder_content(text,text,text[]) from public;
grant execute on function public.reorder_content(text,text,text[]) to authenticated;

create or replace function public.set_theory_techniques(target_theory_id text,target_technique_ids text[])
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 if not exists(select 1 from public.theories where id=target_theory_id and status='published') then raise exception '公開中の理論を選択してください。' using errcode='23503'; end if;
 if exists(select 1 from unnest(target_technique_ids) v where not exists(select 1 from public.techniques where id=v and status<>'archived')) then raise exception '処世術が見つかりません。' using errcode='23503'; end if;
 update public.techniques t set
   theory_ids=case when t.id=any(target_technique_ids)
     then case when t.theory_ids ? target_theory_id then t.theory_ids else t.theory_ids || to_jsonb(target_theory_id) end
     else (select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) from jsonb_array_elements_text(t.theory_ids) with ordinality x(value,ord) where value<>target_theory_id) end,
   primary_theory_ids=case when t.id=any(target_technique_ids) then t.primary_theory_ids
     else (select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) from jsonb_array_elements_text(coalesce(t.primary_theory_ids,'[]'::jsonb)) with ordinality x(value,ord) where value<>target_theory_id) end,
   updated_at=now(),updated_by=auth.uid()
 where t.status<>'archived' and (t.theory_ids ? target_theory_id or t.id=any(target_technique_ids));
end $$;
revoke all on function public.set_theory_techniques(text,text[]) from public;
grant execute on function public.set_theory_techniques(text,text[]) to authenticated;

create or replace function public.set_persona_techniques(target_persona_id text,target_technique_ids text[])
returns void language plpgsql security definer set search_path=public as $$
declare persona_row public.personas;
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 select * into persona_row from public.personas where id=target_persona_id and status='published';
 if not found then raise exception '公開中の人物像を選択してください。' using errcode='23503'; end if;
 if exists(select 1 from unnest(target_technique_ids) v where not exists(select 1 from public.techniques where id=v and status<>'archived')) then raise exception '処世術が見つかりません。' using errcode='23503'; end if;
 if exists(select 1 from public.techniques where persona_id=persona_row.name and status<>'archived' and not id=any(target_technique_ids)) then
   raise exception '所属を外す処世術には、先に別の人物像を設定してください。' using errcode='23503';
 end if;
 update public.techniques set persona_id=persona_row.name,category=persona_row.category,updated_at=now(),updated_by=auth.uid()
 where id=any(target_technique_ids) and persona_id is distinct from persona_row.name;
end $$;
revoke all on function public.set_persona_techniques(text,text[]) from public;
grant execute on function public.set_persona_techniques(text,text[]) to authenticated;

-- The existing atomic editor RPC also carries the newly managed media and
-- edition fields. Old clients omit these keys and retain the current values.
create or replace function public.save_technique_draft(
 target_technique_id text,target_snapshot jsonb,expected_updated_at timestamptz default null)
returns public.techniques language plpgsql security definer set search_path=public as $$
declare current_row public.techniques; payload jsonb:=coalesce(target_snapshot,'{}'::jsonb);
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 select * into current_row from public.techniques where id=target_technique_id for update;
 if not found then raise exception 'technique_not_found' using errcode='P0002'; end if;
 if expected_updated_at is not null and current_row.updated_at is distinct from expected_updated_at then raise exception 'content_conflict' using errcode='40001'; end if;
 insert into public.technique_drafts(technique_id,snapshot,base_updated_at,updated_at,updated_by)
 values(target_technique_id,payload,current_row.updated_at,now(),auth.uid())
 on conflict(technique_id) do update set snapshot=excluded.snapshot,base_updated_at=excluded.base_updated_at,
   updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 update public.techniques set persona_id=coalesce(payload->>'persona_id',persona_id),category=coalesce(payload->>'category',category),
 title=coalesce(payload->>'title',''),essence=coalesce(payload->>'essence',''),explanation=coalesce(payload->>'explanation',''),
 memo=coalesce(payload->>'memo',''),importance=greatest(1,least(3,coalesce((payload->>'importance')::smallint,1))),
 practices=coalesce(payload->'practices','[]'::jsonb),examples=coalesce(payload->'examples','[]'::jsonb),
 cautions=coalesce(payload->'cautions','[]'::jsonb),theory_ids=coalesce(payload->'theory_ids','[]'::jsonb),
 primary_theory_ids=coalesce(payload->'primary_theory_ids','[]'::jsonb),
 tags=case when payload ? 'tags' then payload->'tags' else tags end,
 image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
 access_tier=coalesce(payload->>'access_tier',access_tier),status='draft',updated_at=now(),updated_by=auth.uid()
 where id=target_technique_id returning * into current_row;
 return current_row;
end $$;
revoke all on function public.save_technique_draft(text,jsonb,timestamptz) from public;
grant execute on function public.save_technique_draft(text,jsonb,timestamptz) to authenticated;

create or replace function public.save_and_publish_technique(
 target_technique_id text,target_snapshot jsonb,expected_updated_at timestamptz default null)
returns public.techniques language plpgsql security definer set search_path=public as $$
declare current_row public.techniques; next_version integer; payload jsonb:=coalesce(target_snapshot,'{}'::jsonb);
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 select * into current_row from public.techniques where id=target_technique_id for update;
 if not found then raise exception 'technique_not_found' using errcode='P0002'; end if;
 if expected_updated_at is not null and current_row.updated_at is distinct from expected_updated_at then raise exception 'content_conflict' using errcode='40001'; end if;
 if nullif(trim(payload->>'title'),'') is null then raise exception 'title_required' using errcode='22023'; end if;
 select coalesce(max(version),0)+1 into next_version from public.technique_revisions where technique_id=target_technique_id;
 insert into public.technique_revisions(technique_id,snapshot,version,created_by) values(target_technique_id,to_jsonb(current_row),next_version,auth.uid());
 update public.techniques set persona_id=coalesce(payload->>'persona_id',persona_id),category=coalesce(payload->>'category',category),
 title=payload->>'title',essence=coalesce(payload->>'essence',''),explanation=coalesce(payload->>'explanation',''),
 memo=coalesce(payload->>'memo',''),importance=greatest(1,least(3,coalesce((payload->>'importance')::smallint,1))),
 practices=coalesce(payload->'practices','[]'::jsonb),examples=coalesce(payload->'examples','[]'::jsonb),
 cautions=coalesce(payload->'cautions','[]'::jsonb),theory_ids=coalesce(payload->'theory_ids','[]'::jsonb),
 primary_theory_ids=coalesce(payload->'primary_theory_ids',primary_theory_ids),
 tags=case when payload ? 'tags' then payload->'tags' else tags end,
 image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
 access_tier=coalesce(payload->>'access_tier',access_tier),status='published',updated_at=now(),updated_by=auth.uid()
 where id=target_technique_id returning * into current_row;
 delete from public.technique_drafts where technique_id=target_technique_id and updated_by=auth.uid();
 return current_row;
end $$;

create or replace function public.publish_theory(target_theory_id text,payload jsonb)
returns public.theories language plpgsql security definer set search_path=public as $$
declare result public.theories;
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 insert into public.theories(id,title,summary,category_id,category_title,aliases,related_theory_ids,provenance,
   image_path,access_tier,status,draft_technique_ids,display_order,updated_by)
 values(target_theory_id,trim(payload->>'title'),trim(payload->>'summary'),payload->>'category_id','',
   coalesce(payload->'aliases','[]'::jsonb),coalesce(payload->'related_theory_ids','[]'::jsonb),nullif(payload->'provenance','null'::jsonb),
   payload->>'image_path',coalesce(payload->>'access_tier','complete'),'published','[]'::jsonb,
   coalesce((payload->>'display_order')::int,0),auth.uid())
 on conflict(id) do update set title=excluded.title,summary=excluded.summary,category_id=excluded.category_id,
   category_title=excluded.category_title,aliases=excluded.aliases,related_theory_ids=excluded.related_theory_ids,
   provenance=case when payload ? 'provenance' then excluded.provenance else public.theories.provenance end,
   image_path=case when payload ? 'image_path' then excluded.image_path else public.theories.image_path end,
   access_tier=coalesce(payload->>'access_tier',public.theories.access_tier),status='published',draft_technique_ids='[]'::jsonb,
   display_order=excluded.display_order,updated_at=now(),updated_by=auth.uid()
 returning * into result;
 if payload ? 'related_technique_ids' then
   perform public.set_theory_techniques(result.id,array(select jsonb_array_elements_text(payload->'related_technique_ids')));
 end if;
 return result;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('content-images','content-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "owners upload content images" on storage.objects for insert to authenticated
with check(bucket_id='content-images' and public.is_owner());
create policy "owners remove content images" on storage.objects for delete to authenticated
using(bucket_id='content-images' and public.is_owner());
