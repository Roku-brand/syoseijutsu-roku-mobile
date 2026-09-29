-- Keep public display order as the only ordering source. Legacy internal IDs
-- remain unchanged so routes, saved items, and JSON relations keep working.

alter table public.theories add column if not exists display_id integer;
alter table public.theories add column if not exists draft_display_id integer;
alter table public.theories alter column display_order drop not null;
alter table public.techniques add column if not exists draft_display_order integer;
alter table public.techniques alter column display_order drop not null;
alter table public.personas alter column display_order drop not null;

-- Category keys now come from content_categories instead of a fixed enum-like
-- CHECK list. Keep the category lookup enforced by the owner RPCs and triggers.
alter table public.personas drop constraint if exists personas_category_check;
alter table public.theories drop constraint if exists theories_category_id_check;

create or replace function public.validate_persona_category()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if not exists(select 1 from public.content_categories where kind='technique' and id=new.category) then
    raise exception 'カテゴリを選択してください。' using errcode='23503';
  end if;
  return new;
end;
$$;
drop trigger if exists persona_category_integrity on public.personas;
create trigger persona_category_integrity before insert or update of category on public.personas
for each row execute function public.validate_persona_category();
revoke all on function public.validate_persona_category() from public;

-- Preserve the existing public sequence on first migration. The old theory
-- sequence was category-local, so category order followed by local order is
-- the deterministic global order used by the existing catalogue.
with ranked as (
  select t.id, row_number() over (
    order by coalesce(c.display_order, 2147483647), t.display_order, t.id
  )::integer as next_id
  from public.theories t
  left join public.content_categories c on c.kind='theory' and c.id=t.category_id
  where t.status='published'
)
update public.theories t set display_id=r.next_id, display_order=r.next_id
from ranked r where r.id=t.id;
with ranked as (
  select t.id,row_number() over(
    order by coalesce(c.display_order,2147483647),t.display_order,t.id
  )::integer as next_id
  from public.theories t
  left join public.content_categories c on c.kind='theory' and c.id=t.category_id
  where t.status='draft'
)
update public.theories t set display_id=null,display_order=null,draft_display_id=r.next_id
from ranked r where r.id=t.id;
update public.theories set display_id=null, display_order=null, draft_display_id=null
where status='archived';

-- Public technique rows have dense order per persona. Drafts keep a separate
-- requested position and therefore do not create holes in the reader list.
with ranked as (
  select id, row_number() over (
    partition by persona_id order by display_order, id
  )::integer as next_order
  from public.techniques where status='published'
)
update public.techniques t set display_order=r.next_order
from ranked r where r.id=t.id;
with ranked as (
  select id,row_number() over(
    partition by persona_id order by coalesce(draft_display_order,display_order),id
  )::integer as next_order
  from public.techniques where status='draft'
)
update public.techniques t set display_order=null,draft_display_order=r.next_order
from ranked r where r.id=t.id;
update public.techniques set display_order=null, draft_display_order=null
where status='archived';

-- Category and persona positions are maintained as dense scopes by RPCs.
with ranked as (
  select kind, id, row_number() over(partition by kind order by display_order,id)::integer as next_order
  from public.content_categories
)
update public.content_categories c set display_order=r.next_order
from ranked r where r.kind=c.kind and r.id=c.id;
with ranked as (
  select id, row_number() over(partition by category order by display_order,id)::integer as next_order
  from public.personas where status<>'archived'
)
update public.personas p set display_order=r.next_order from ranked r where r.id=p.id;
update public.personas set display_order=null where status='archived';

create unique index if not exists content_categories_kind_order_uidx
  on public.content_categories(kind,display_order);
create unique index if not exists personas_active_category_order_uidx
  on public.personas(category,display_order) where status<>'archived';
create unique index if not exists techniques_published_persona_order_uidx
  on public.techniques(persona_id,display_order) where status='published';
create unique index if not exists techniques_draft_persona_order_uidx
  on public.techniques(persona_id,draft_display_order) where status='draft';
create unique index if not exists theories_published_display_id_uidx
  on public.theories(display_id) where status='published';
create unique index if not exists theories_draft_display_id_uidx
  on public.theories(draft_display_id) where status='draft';

create or replace function public.sync_theory_legacy_order()
returns trigger language plpgsql set search_path=''
as $$
begin
  if new.status='published' then
    if new.display_id is null then
      raise exception '公開理論には表示IDが必要です。' using errcode='23514';
    end if;
    new.display_order:=new.display_id;
    new.draft_display_id:=null;
  else
    new.display_id:=null;
    new.display_order:=null;
    if new.status='archived' then new.draft_display_id:=null; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists theory_sync_display_id on public.theories;
create trigger theory_sync_display_id before insert or update of status,display_id,display_order
on public.theories for each row execute function public.sync_theory_legacy_order();

create or replace function public.reorder_content(target_kind text,target_scope text,target_ids text[])
returns void language plpgsql security definer set search_path=''
as $$
declare
  actual_count integer;
  full_ids text[];
  next_ids text[]:='{}'::text[];
  item_id text;
  target_index integer:=1;
  item_category text;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if target_ids is null or cardinality(target_ids)=0 or cardinality(target_ids)<>(select count(distinct v) from unnest(target_ids) v)
    or array_position(target_ids,null) is not null then
    raise exception '順序に重複または空のIDがあります。' using errcode='22023';
  end if;

  if target_kind in ('technique-category','theory-category') then
    item_category:=split_part(target_kind,'-',1);
    perform pg_advisory_xact_lock(hashtextextended('category:'||item_category,0));
    select count(*) into actual_count from public.content_categories
      where kind=item_category and id=any(target_ids);
    if actual_count<>cardinality(target_ids) or actual_count<>(select count(*) from public.content_categories where kind=item_category) then
      raise exception 'カテゴリの範囲が一致しません。' using errcode='22023';
    end if;
    update public.content_categories set display_order=-display_order
      where kind=item_category;
    update public.content_categories set display_order=array_position(target_ids,id),updated_at=now()
      where kind=item_category;
  elsif target_kind='persona' then
    perform pg_advisory_xact_lock(hashtextextended('persona:'||target_scope,0));
    select count(*) into actual_count from public.personas
      where category=target_scope and status<>'archived' and id=any(target_ids);
    if actual_count<>cardinality(target_ids) or actual_count<>(select count(*) from public.personas where category=target_scope and status<>'archived') then
      raise exception '人物像の範囲が一致しません。' using errcode='22023';
    end if;
    update public.personas set display_order=-display_order where category=target_scope and status<>'archived';
    update public.personas set display_order=array_position(target_ids,id),updated_at=now() where id=any(target_ids);
  elsif target_kind='technique' then
    perform pg_advisory_xact_lock(hashtextextended('technique:'||target_scope,0));
    select count(*) into actual_count from public.techniques
      where persona_id=target_scope and status='published' and id=any(target_ids);
    if actual_count<>cardinality(target_ids) or actual_count<>(select count(*) from public.techniques where persona_id=target_scope and status='published') then
      raise exception '処世術の範囲が一致しません。' using errcode='22023';
    end if;
    update public.techniques set display_order=-display_order
      where persona_id=target_scope and status='published';
    update public.techniques set display_order=array_position(target_ids,id),updated_at=now()
      where id=any(target_ids);
  elsif target_kind='theory' then
    perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
    select array_agg(id order by display_id) into full_ids from public.theories where status='published';
    if cardinality(target_ids)=coalesce(cardinality(full_ids),0) then
      select count(*) into actual_count from public.theories where status='published' and id=any(target_ids);
      if actual_count<>cardinality(target_ids) then raise exception '理論の一覧が一致しません。' using errcode='22023'; end if;
      next_ids:=target_ids;
    else
      select count(*) into actual_count from public.theories where status='published' and category_id=target_scope and id=any(target_ids);
      if actual_count<>cardinality(target_ids) or actual_count<>(select count(*) from public.theories where status='published' and category_id=target_scope) then
        raise exception '理論カテゴリの一覧が一致しません。' using errcode='22023';
      end if;
      foreach item_id in array full_ids loop
        select category_id into item_category from public.theories where id=item_id;
        if item_category=target_scope then
          next_ids:=array_append(next_ids,target_ids[target_index]); target_index:=target_index+1;
        else next_ids:=array_append(next_ids,item_id); end if;
      end loop;
    end if;
    update public.theories set display_id=-display_id where status='published';
    update public.theories set display_id=array_position(next_ids,id),updated_at=now()
      where status='published' and id=any(next_ids);
  else
    raise exception '順序の対象が不正です。' using errcode='22023';
  end if;
end;
$$;
revoke all on function public.reorder_content(text,text,text[]) from public;
grant execute on function public.reorder_content(text,text,text[]) to authenticated;

create or replace function public.reorder_technique_drafts(target_persona_id text,target_ids text[])
returns void language plpgsql security definer set search_path=''
as $$
declare actual_count integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select count(*) into actual_count from public.techniques
    where persona_id=target_persona_id and status='draft' and id=any(coalesce(target_ids,'{}'::text[]));
  if actual_count<>coalesce(cardinality(target_ids),0)
    or actual_count<>(select count(*) from public.techniques where persona_id=target_persona_id and status='draft') then
    raise exception '下書き処世術の範囲が一致しません。' using errcode='22023';
  end if;
  if actual_count=0 then return; end if;
  update public.techniques set draft_display_order=-draft_display_order
    where persona_id=target_persona_id and status='draft';
  update public.techniques set draft_display_order=array_position(target_ids,id),updated_at=now()
    where persona_id=target_persona_id and status='draft';
end;
$$;
revoke all on function public.reorder_technique_drafts(text,text[]) from public;

create or replace function public.reorder_theory_drafts(target_ids text[])
returns void language plpgsql security definer set search_path=''
as $$
declare actual_count integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select count(*) into actual_count from public.theories
    where status='draft' and id=any(coalesce(target_ids,'{}'::text[]));
  if actual_count<>coalesce(cardinality(target_ids),0)
    or actual_count<>(select count(*) from public.theories where status='draft') then
    raise exception '下書き理論の範囲が一致しません。' using errcode='22023';
  end if;
  if actual_count=0 then return; end if;
  update public.theories set draft_display_id=-draft_display_id where status='draft';
  update public.theories set draft_display_id=array_position(target_ids,id),updated_at=now() where status='draft';
end;
$$;
revoke all on function public.reorder_theory_drafts(text[]) from public;

create or replace function public.move_technique_order(
  target_technique_id text,target_persona_id text,target_order integer,target_status text
)
returns public.techniques language plpgsql security definer set search_path=''
as $$
declare
  item public.techniques;
  target_persona public.personas;
  source_ids text[];
  destination_ids text[];
  source_draft_ids text[];
  destination_draft_ids text[];
  lock_key bigint;
  target_position integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if target_status not in ('draft','published') then raise exception '公開状態が不正です。' using errcode='22023'; end if;
  select * into item from public.techniques where id=target_technique_id for update;
  if not found then raise exception '処世術が見つかりません。' using errcode='P0002'; end if;
  select * into target_persona from public.personas where name=target_persona_id and status='published' for share;
  if not found then raise exception '所属する人物像を選択してください。' using errcode='23503'; end if;
  for lock_key in
    select distinct hashtextextended('technique:'||v,0) from unnest(array[item.persona_id,target_persona_id]) v order by 1
  loop perform pg_advisory_xact_lock(lock_key); end loop;

  if target_status='draft' then
    select coalesce(array_agg(id order by draft_display_order),'{}'::text[]) into destination_draft_ids
      from public.techniques where persona_id=target_persona_id and status='draft' and id<>target_technique_id;
    target_position:=greatest(1,least(coalesce(target_order,cardinality(destination_draft_ids)+1),cardinality(destination_draft_ids)+1));
    destination_draft_ids:=destination_draft_ids[1:target_position-1]||array[target_technique_id]||destination_draft_ids[target_position:cardinality(destination_draft_ids)];
    if item.status='published' then
      select array_agg(id order by display_order) into source_ids from public.techniques
        where persona_id=item.persona_id and status='published' and id<>target_technique_id;
      update public.techniques set status='draft',persona_id=target_persona_id,category=target_persona.category,
        display_order=null,draft_display_order=-2147483647,updated_at=now(),updated_by=auth.uid()
        where id=target_technique_id;
      if coalesce(cardinality(source_ids),0)>0 then perform public.reorder_content('technique',item.persona_id,source_ids); end if;
    else
      if item.persona_id is distinct from target_persona_id then
        select coalesce(array_agg(id order by draft_display_order),'{}'::text[]) into source_draft_ids
          from public.techniques where persona_id=item.persona_id and status='draft' and id<>target_technique_id;
      end if;
      update public.techniques set status='draft',persona_id=target_persona_id,category=target_persona.category,
        display_order=null,draft_display_order=-2147483647,updated_at=now(),updated_by=auth.uid()
        where id=target_technique_id;
      if item.persona_id is distinct from target_persona_id then perform public.reorder_technique_drafts(item.persona_id,source_draft_ids); end if;
    end if;
    perform public.reorder_technique_drafts(target_persona_id,destination_draft_ids);
  elsif item.status in ('draft','archived') then
    if item.status='draft' then
      select coalesce(array_agg(id order by draft_display_order),'{}'::text[]) into source_draft_ids
        from public.techniques where persona_id=item.persona_id and status='draft' and id<>target_technique_id;
    else
      select coalesce(array_agg(id order by draft_display_order),'{}'::text[]) into source_draft_ids
        from public.techniques where persona_id=item.persona_id and status='draft';
    end if;
    select coalesce(array_agg(id order by display_order),'{}'::text[]) into destination_ids
      from public.techniques where persona_id=target_persona_id and status='published';
    target_position:=greatest(1,least(coalesce(target_order,cardinality(destination_ids)+1),cardinality(destination_ids)+1));
    destination_ids:=destination_ids[1:target_position-1]||array[target_technique_id]||destination_ids[target_position:cardinality(destination_ids)];
    update public.techniques set status='published',persona_id=target_persona_id,category=target_persona.category,
      display_order=-2147483647,draft_display_order=null,updated_at=now(),updated_by=auth.uid()
      where id=target_technique_id;
    perform public.reorder_technique_drafts(item.persona_id,source_draft_ids);
    perform public.reorder_content('technique',target_persona_id,destination_ids);
  elsif item.persona_id=target_persona_id then
    select array_agg(id order by display_order) into destination_ids from public.techniques
      where persona_id=target_persona_id and status='published' and id<>target_technique_id;
    target_position:=greatest(1,least(coalesce(target_order,cardinality(destination_ids)+1),cardinality(destination_ids)+1));
    destination_ids:=destination_ids[1:target_position-1]||array[target_technique_id]||destination_ids[target_position:cardinality(destination_ids)];
    perform public.reorder_content('technique',target_persona_id,destination_ids);
  else
    select array_agg(id order by display_order) into source_ids from public.techniques
      where persona_id=item.persona_id and status='published' and id<>target_technique_id;
    select coalesce(array_agg(id order by display_order),'{}'::text[]) into destination_ids
      from public.techniques where persona_id=target_persona_id and status='published';
    target_position:=greatest(1,least(coalesce(target_order,cardinality(destination_ids)+1),cardinality(destination_ids)+1));
    destination_ids:=destination_ids[1:target_position-1]||array[target_technique_id]||destination_ids[target_position:cardinality(destination_ids)];
    update public.techniques set status='draft',display_order=null,draft_display_order=-2147483647,updated_at=now()
      where id=target_technique_id;
    if coalesce(cardinality(source_ids),0)>0 then perform public.reorder_content('technique',item.persona_id,source_ids); end if;
    update public.techniques set persona_id=target_persona_id,category=target_persona.category,
      status='published',display_order=-2147483647,draft_display_order=null,updated_at=now(),updated_by=auth.uid()
      where id=target_technique_id;
    perform public.reorder_content('technique',target_persona_id,destination_ids);
  end if;
  if target_status='draft' then
    update public.technique_drafts set
      snapshot=jsonb_set(jsonb_set(snapshot,'{persona_id}',to_jsonb(target_persona.name),true),'{category}',to_jsonb(target_persona.category),true),
      updated_at=now(),updated_by=auth.uid()
    where technique_id=target_technique_id;
  end if;
  select * into item from public.techniques where id=target_technique_id;
  return item;
end;
$$;
revoke all on function public.move_technique_order(text,text,integer,text) from public;
grant execute on function public.move_technique_order(text,text,integer,text) to authenticated;

create or replace function public.move_persona_order(target_persona_id text,target_category_id text,target_order integer)
returns public.personas language plpgsql security definer set search_path=''
as $$
declare
  item public.personas;
  source_ids text[];
  destination_ids text[];
  destination_order integer;
  lock_key bigint;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select * into item from public.personas where id=target_persona_id for update;
  if not found or item.status='archived' then raise exception '人物像が見つかりません。' using errcode='P0002'; end if;
  if not exists(select 1 from public.content_categories where kind='technique' and id=target_category_id) then
    raise exception 'カテゴリを選択してください。' using errcode='23503'; end if;
  for lock_key in select distinct hashtextextended('persona:'||v,0)
    from unnest(array[item.category,target_category_id]) v order by 1
  loop perform pg_advisory_xact_lock(lock_key); end loop;
  if item.category=target_category_id then
    select array_agg(id order by display_order) into source_ids from public.personas
      where category=item.category and status<>'archived' and id<>target_persona_id;
    destination_order:=greatest(1,least(coalesce(target_order,cardinality(source_ids)+1),cardinality(source_ids)+1));
    source_ids:=source_ids[1:destination_order-1]||array[target_persona_id]||source_ids[destination_order:cardinality(source_ids)];
    perform public.reorder_content('persona',item.category,source_ids);
  else
    select array_agg(id order by display_order) into source_ids from public.personas
      where category=item.category and status<>'archived' and id<>target_persona_id;
    select coalesce(array_agg(id order by display_order),'{}'::text[]) into destination_ids
      from public.personas where category=target_category_id and status<>'archived';
    destination_order:=greatest(1,least(coalesce(target_order,cardinality(destination_ids)+1),cardinality(destination_ids)+1));
    destination_ids:=destination_ids[1:destination_order-1]||array[target_persona_id]||destination_ids[destination_order:cardinality(destination_ids)];
    update public.personas set category=target_category_id,display_order=-2147483647,updated_at=now()
      where id=target_persona_id;
    if coalesce(cardinality(source_ids),0)>0 then perform public.reorder_content('persona',item.category,source_ids); end if;
    perform public.reorder_content('persona',target_category_id,destination_ids);
  end if;
  select * into item from public.personas where id=target_persona_id;
  return item;
end;
$$;
revoke all on function public.move_persona_order(text,text,integer) from public;
grant execute on function public.move_persona_order(text,text,integer) to authenticated;

create or replace function public.save_persona(target_id text,payload jsonb)
returns public.personas language plpgsql security definer set search_path=''
as $$
declare old_row public.personas; result_row public.personas; next_name text; next_category text; next_status text;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  next_name:=trim(payload->>'name'); next_category:=payload->>'category'; next_status:=coalesce(payload->>'status','draft');
  if nullif(next_name,'') is null then raise exception '人物像名を入力してください。' using errcode='22023'; end if;
  if next_status not in ('published','draft') then raise exception '公開状態が不正です。' using errcode='22023'; end if;
  if not exists(select 1 from public.content_categories where kind='technique' and id=next_category) then raise exception 'カテゴリを選択してください。' using errcode='22023'; end if;
  select * into old_row from public.personas where id=target_id for update;
  if found then
    if next_status<>'published' and (
      exists(select 1 from public.techniques where persona_id=old_row.name and status<>'archived') or
      exists(select 1 from public.technique_drafts d join public.techniques t on t.id=d.technique_id
        where t.status<>'archived' and d.snapshot->>'persona_id'=old_row.name)
    ) then raise exception '所属する処世術を移動または削除してから非公開にしてください。' using errcode='23503'; end if;
    perform public.move_persona_order(target_id,next_category,coalesce((payload->>'display_order')::integer,old_row.display_order,1));
    update public.personas set name=next_name,subtitle=coalesce(payload->>'subtitle',''),
      image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
      access_tier=coalesce(payload->>'access_tier','complete'),status=next_status,
      draft_technique_ids=case when next_status='published' then '[]'::jsonb else coalesce(payload->'related_technique_ids',draft_technique_ids) end,
      updated_at=now()
    where id=target_id returning * into result_row;
    if old_row.name is distinct from next_name then
      update public.techniques set persona_id=next_name,category=next_category,updated_at=now() where persona_id=old_row.name;
      update public.technique_drafts set snapshot=jsonb_set(snapshot,'{persona_id}',to_jsonb(next_name),true)
        where snapshot->>'persona_id'=old_row.name;
    else
      update public.techniques set category=next_category,updated_at=now() where persona_id=next_name and category is distinct from next_category;
    end if;
  else
    insert into public.personas(id,name,category,subtitle,image_path,access_tier,status,draft_technique_ids,display_order)
    values(target_id,next_name,next_category,coalesce(payload->>'subtitle',''),payload->>'image_path',
      coalesce(payload->>'access_tier','complete'),next_status,
      case when next_status='published' then '[]'::jsonb else coalesce(payload->'related_technique_ids','[]'::jsonb) end,
      (select coalesce(max(display_order),0)+1 from public.personas where category=next_category and status<>'archived'))
    returning * into result_row;
    if payload ? 'display_order' then perform public.move_persona_order(target_id,next_category,(payload->>'display_order')::integer); end if;
  end if;
  if result_row.status='published' and payload ? 'related_technique_ids' then
    perform public.set_persona_techniques(result_row.id,array(select jsonb_array_elements_text(payload->'related_technique_ids')));
  end if;
  return result_row;
end;
$$;
revoke all on function public.save_persona(text,jsonb) from public;
grant execute on function public.save_persona(text,jsonb) to authenticated;

create or replace function public.archive_persona(persona_name text)
returns void language plpgsql security definer set search_path=''
as $$
declare item public.personas; ids text[];
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select * into item from public.personas where name=persona_name for update;
  if not found then raise exception '人物像が見つかりません。' using errcode='P0002'; end if;
  if exists(select 1 from public.techniques where persona_id=persona_name and status<>'archived')
    or exists(select 1 from public.technique_drafts d join public.techniques t on t.id=d.technique_id
      where t.status<>'archived' and d.snapshot->>'persona_id'=persona_name) then
    raise exception '所属する処世術・下書きを別の人物像へ移動するか削除してください。' using errcode='23503'; end if;
  select array_agg(id order by display_order) into ids from public.personas
    where category=item.category and status<>'archived' and id<>item.id;
  update public.personas set status='archived',display_order=null,updated_at=now() where id=item.id;
  if coalesce(cardinality(ids),0)>0 then perform public.reorder_content('persona',item.category,ids); end if;
end;
$$;
revoke all on function public.archive_persona(text) from public;
grant execute on function public.archive_persona(text) to authenticated;

create or replace function public.set_persona_techniques(target_persona_id text,target_technique_ids text[])
returns void language plpgsql security definer set search_path=''
as $$
declare persona_row public.personas; row_data public.techniques; next_order integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select * into persona_row from public.personas where id=target_persona_id and status='published';
  if not found then raise exception '公開中の人物像を選択してください。' using errcode='23503'; end if;
  if exists(select 1 from unnest(target_technique_ids) v where not exists(select 1 from public.techniques where id=v and status<>'archived')) then
    raise exception '処世術が見つかりません。' using errcode='23503'; end if;
  if exists(select 1 from public.techniques where persona_id=persona_row.name and status<>'archived' and not id=any(target_technique_ids)) then
    raise exception '所属を外す処世術には、先に別の人物像を設定してください。' using errcode='23503'; end if;
  for row_data in select * from public.techniques where id=any(target_technique_ids) and persona_id is distinct from persona_row.name order by id for update loop
    if row_data.status='published' then
      select coalesce(max(display_order),0)+1 into next_order from public.techniques where persona_id=persona_row.name and status='published';
      perform public.move_technique_order(row_data.id,persona_row.name,next_order,'published');
    else
      select coalesce(max(draft_display_order),0)+1 into next_order from public.techniques where persona_id=persona_row.name and status='draft';
      perform public.move_technique_order(row_data.id,persona_row.name,next_order,'draft');
    end if;
  end loop;
end;
$$;
revoke all on function public.set_persona_techniques(text,text[]) from public;
grant execute on function public.set_persona_techniques(text,text[]) to authenticated;

create or replace function public.create_technique(target_persona_id text)
returns public.techniques language plpgsql security definer set search_path=''
as $$
declare result public.techniques; persona public.personas; next_order integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select * into persona from public.personas where name=target_persona_id and status='published' for share;
  if not found then raise exception '所属する人物像を選択してください。' using errcode='23503'; end if;
  perform pg_advisory_xact_lock(hashtextextended('technique:'||persona.name,0));
  select coalesce(max(draft_display_order),0)+1 into next_order from public.techniques where persona_id=persona.name and status='draft';
  insert into public.techniques(id,persona_id,category,title,primary_theory_ids,status,display_order,draft_display_order,updated_by)
  values('technique-'||gen_random_uuid()::text,persona.name,persona.category,'','[]'::jsonb,'draft',null,next_order,auth.uid())
  returning * into result;
  return result;
end;
$$;
revoke all on function public.create_technique(text) from public;
grant execute on function public.create_technique(text) to authenticated;

create or replace function public.save_technique_draft(target_technique_id text,target_snapshot jsonb,expected_updated_at timestamptz default null)
returns public.techniques language plpgsql security definer set search_path=''
as $$
declare current_row public.techniques; payload jsonb:=coalesce(target_snapshot,'{}'::jsonb); target_order integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select * into current_row from public.techniques where id=target_technique_id for update;
  if not found then raise exception 'technique_not_found' using errcode='P0002'; end if;
  if expected_updated_at is not null and current_row.updated_at is distinct from expected_updated_at then raise exception 'content_conflict' using errcode='40001'; end if;
  target_order:=coalesce((payload->>'display_order')::integer,current_row.display_order,current_row.draft_display_order,1);
  insert into public.technique_drafts(technique_id,snapshot,base_updated_at,updated_at,updated_by)
  values(target_technique_id,payload,current_row.updated_at,now(),auth.uid())
  on conflict(technique_id) do update set snapshot=excluded.snapshot,base_updated_at=excluded.base_updated_at,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  perform public.move_technique_order(target_technique_id,coalesce(payload->>'persona_id',current_row.persona_id),target_order,'draft');
  update public.techniques set title=coalesce(payload->>'title',''),essence=coalesce(payload->>'essence',''),
    explanation=coalesce(payload->>'explanation',''),memo=coalesce(payload->>'memo',''),
    importance=greatest(1,least(3,coalesce((payload->>'importance')::smallint,1))),
    practices=coalesce(payload->'practices','[]'::jsonb),examples=coalesce(payload->'examples','[]'::jsonb),
    cautions=coalesce(payload->'cautions','[]'::jsonb),theory_ids=coalesce(payload->'theory_ids','[]'::jsonb),
    primary_theory_ids=coalesce(payload->'primary_theory_ids','[]'::jsonb),
    tags=case when payload ? 'tags' then payload->'tags' else tags end,
    image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
    access_tier=coalesce(payload->>'access_tier',access_tier),updated_at=now(),updated_by=auth.uid()
  where id=target_technique_id returning * into current_row;
  return current_row;
end;
$$;
revoke all on function public.save_technique_draft(text,jsonb,timestamptz) from public;
grant execute on function public.save_technique_draft(text,jsonb,timestamptz) to authenticated;

create or replace function public.save_and_publish_technique(target_technique_id text,target_snapshot jsonb,expected_updated_at timestamptz default null)
returns public.techniques language plpgsql security definer set search_path=''
as $$
declare current_row public.techniques; next_version integer; payload jsonb:=coalesce(target_snapshot,'{}'::jsonb); target_order integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select * into current_row from public.techniques where id=target_technique_id for update;
  if not found then raise exception 'technique_not_found' using errcode='P0002'; end if;
  if expected_updated_at is not null and current_row.updated_at is distinct from expected_updated_at then raise exception 'content_conflict' using errcode='40001'; end if;
  if nullif(trim(payload->>'title'),'') is null then raise exception 'title_required' using errcode='22023'; end if;
  target_order:=coalesce((payload->>'display_order')::integer,current_row.display_order,current_row.draft_display_order,1);
  select coalesce(max(version),0)+1 into next_version from public.technique_revisions where technique_id=target_technique_id;
  insert into public.technique_revisions(technique_id,snapshot,version,created_by) values(target_technique_id,to_jsonb(current_row),next_version,auth.uid());
  perform public.move_technique_order(target_technique_id,coalesce(payload->>'persona_id',current_row.persona_id),target_order,'published');
  update public.techniques set title=payload->>'title',essence=coalesce(payload->>'essence',''),
    explanation=coalesce(payload->>'explanation',''),memo=coalesce(payload->>'memo',''),
    importance=greatest(1,least(3,coalesce((payload->>'importance')::smallint,1))),
    practices=coalesce(payload->'practices','[]'::jsonb),examples=coalesce(payload->'examples','[]'::jsonb),
    cautions=coalesce(payload->'cautions','[]'::jsonb),theory_ids=coalesce(payload->'theory_ids','[]'::jsonb),
    primary_theory_ids=coalesce(payload->'primary_theory_ids',primary_theory_ids),
    tags=case when payload ? 'tags' then payload->'tags' else tags end,
    image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
    access_tier=coalesce(payload->>'access_tier',access_tier),updated_at=now(),updated_by=auth.uid()
  where id=target_technique_id returning * into current_row;
  delete from public.technique_drafts where technique_id=target_technique_id and updated_by=auth.uid();
  return current_row;
end;
$$;
revoke all on function public.save_and_publish_technique(text,jsonb,timestamptz) from public;
grant execute on function public.save_and_publish_technique(text,jsonb,timestamptz) to authenticated;

create or replace function public.archive_technique(target_technique_id text)
returns public.techniques language plpgsql security definer set search_path=''
as $$
declare result public.techniques; source_scope text; source_status text; ids text[]; draft_ids text[];
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select persona_id,status into source_scope,source_status from public.techniques where id=target_technique_id for update;
  if not found then raise exception 'technique_not_found' using errcode='P0002'; end if;
  if source_status='published' then
    select array_agg(id order by display_order) into ids from public.techniques
      where persona_id=source_scope and status='published' and id<>target_technique_id;
  elsif source_status='draft' then
    select coalesce(array_agg(id order by draft_display_order),'{}'::text[]) into draft_ids from public.techniques
      where persona_id=source_scope and status='draft' and id<>target_technique_id;
  end if;
  update public.techniques set status='archived',display_order=null,draft_display_order=null,updated_at=now(),updated_by=auth.uid()
    where id=target_technique_id returning * into result;
  if coalesce(cardinality(ids),0)>0 then perform public.reorder_content('technique',source_scope,ids); end if;
  if source_status='draft' then perform public.reorder_technique_drafts(source_scope,draft_ids); end if;
  return result;
end;
$$;
revoke all on function public.archive_technique(text) from public;
grant execute on function public.archive_technique(text) to authenticated;


create or replace function public.move_theory_display_id(target_theory_id text,target_display_id integer,target_status text,target_category_id text default null)
returns public.theories language plpgsql security definer set search_path=''
as $$
declare
  item public.theories;
  ids text[];
  next_ids text[];
  draft_ids text[];
  next_draft_ids text[];
  requested integer;
  current_count integer;
  draft_count integer;
  draft_position integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if target_status not in ('draft','published') then raise exception '公開状態が不正です。' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
  select * into item from public.theories where id=target_theory_id for update;
  if not found then raise exception 'theory_not_found' using errcode='P0002'; end if;
  if target_category_id is not null and not exists(select 1 from public.content_categories where kind='theory' and id=target_category_id) then
    raise exception '理論カテゴリを選択してください。' using errcode='23503';
  end if;
  select coalesce(array_agg(id order by display_id),'{}'::text[]) into ids
    from public.theories where status='published' and id<>target_theory_id;
  current_count:=cardinality(ids);
  select coalesce(array_agg(id order by draft_display_id),'{}'::text[]) into draft_ids
    from public.theories where status='draft' and id<>target_theory_id;
  draft_count:=cardinality(draft_ids);
  if target_status='draft' then
    draft_position:=greatest(1,least(coalesce(target_display_id,item.draft_display_id,item.display_id,draft_count+1),draft_count+1));
    next_draft_ids:=draft_ids[1:draft_position-1]||array[target_theory_id]||draft_ids[draft_position:draft_count];
    if item.status='published' then
      update public.theories set status='draft',display_id=null,display_order=null,
        draft_display_id=-2147483647,
        category_id=coalesce(target_category_id,category_id),updated_at=now(),updated_by=auth.uid()
      where id=target_theory_id;
      if current_count>0 then perform public.reorder_content('theory','',ids); end if;
    else
      update public.theories set status='draft',display_id=null,display_order=null,
        draft_display_id=-2147483647,
        category_id=coalesce(target_category_id,category_id),updated_at=now(),updated_by=auth.uid()
      where id=target_theory_id;
    end if;
    perform public.reorder_theory_drafts(next_draft_ids);
  else
    requested:=greatest(1,least(coalesce(target_display_id,item.draft_display_id,item.display_id,current_count+1),current_count+1));
    next_ids:=ids[1:requested-1]||array[target_theory_id]||ids[requested:current_count];
    if item.status='published' then
      update public.theories set display_id=-display_id where status='published';
      update public.theories set category_id=coalesce(target_category_id,category_id),display_id=-2147483647,
        updated_at=now(),updated_by=auth.uid() where id=target_theory_id;
    else
      -- Free all occupied unique values before inserting a draft/archived row
      -- into the published sequence. The final dense write happens below.
      update public.theories set display_id=-display_id where status='published';
      update public.theories set category_id=coalesce(target_category_id,category_id),status='published',display_id=-2147483647,
        draft_display_id=null,updated_at=now(),updated_by=auth.uid() where id=target_theory_id;
      perform public.reorder_theory_drafts(draft_ids);
    end if;
    update public.theories set display_id=array_position(next_ids,id),updated_at=now()
      where status='published' and id=any(next_ids);
  end if;
  select * into item from public.theories where id=target_theory_id;
  return item;
end;
$$;
revoke all on function public.move_theory_display_id(text,integer,text,text) from public;
grant execute on function public.move_theory_display_id(text,integer,text,text) to authenticated;

create or replace function public.create_theory_draft(target_category_id text)
returns public.theories language plpgsql security definer set search_path=''
as $$
declare result public.theories; new_id text;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if not exists(select 1 from public.content_categories where kind='theory' and id=target_category_id) then
    raise exception '理論カテゴリを選択してください。' using errcode='23503'; end if;
  new_id:='theory-'||gen_random_uuid()::text;
  insert into public.theories(id,title,summary,category_id,category_title,aliases,related_theory_ids,status,display_order,display_id,draft_display_id,updated_by)
  values(new_id,'','',target_category_id,(select title from public.content_categories where kind='theory' and id=target_category_id),
    '[]'::jsonb,'[]'::jsonb,'draft',null,null,(select count(*)+1 from public.theories where status='draft'),auth.uid())
  returning * into result;
  return result;
end;
$$;
revoke all on function public.create_theory_draft(text) from public;
grant execute on function public.create_theory_draft(text) to authenticated;

create or replace function public.save_theory_draft(target_theory_id text,payload jsonb)
returns public.theories language plpgsql security definer set search_path=''
as $$
declare result public.theories;
begin
  perform public.move_theory_display_id(target_theory_id,coalesce((payload->>'display_id')::integer,(payload->>'draft_display_id')::integer,(payload->>'display_order')::integer),'draft',payload->>'category_id');
  update public.theories set title=coalesce(payload->>'title',''),summary=coalesce(payload->>'summary',''),
    category_title=(select title from public.content_categories where kind='theory' and id=category_id),
    aliases=coalesce(payload->'aliases','[]'::jsonb),related_theory_ids=coalesce(payload->'related_theory_ids','[]'::jsonb),
    provenance=nullif(payload->'provenance','null'::jsonb),image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
    access_tier=coalesce(payload->>'access_tier',access_tier),draft_technique_ids=coalesce(payload->'draft_technique_ids','[]'::jsonb),
    updated_at=now(),updated_by=auth.uid()
  where id=target_theory_id returning * into result;
  return result;
end;
$$;
revoke all on function public.save_theory_draft(text,jsonb) from public;
grant execute on function public.save_theory_draft(text,jsonb) to authenticated;

create or replace function public.publish_theory(target_theory_id text,payload jsonb)
returns public.theories language plpgsql security definer set search_path=''
as $$
declare result public.theories;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if nullif(trim(payload->>'title'),'') is null or nullif(trim(payload->>'summary'),'') is null then
    raise exception 'タイトルと概要を入力してください。' using errcode='22023'; end if;
  if not exists(select 1 from public.content_categories where kind='theory' and id=payload->>'category_id') then
    raise exception '理論カテゴリを選択してください。' using errcode='23503'; end if;
  -- Apply the publishable body while the row is still a draft. The integrity
  -- trigger validates published fields during a status transition.
  update public.theories set title=trim(payload->>'title'),summary=trim(payload->>'summary'),
    category_id=payload->>'category_id',
    category_title=(select title from public.content_categories where kind='theory' and id=payload->>'category_id'),
    aliases=coalesce(payload->'aliases','[]'::jsonb),related_theory_ids=coalesce(payload->'related_theory_ids','[]'::jsonb),
    provenance=case when payload ? 'provenance' then nullif(payload->'provenance','null'::jsonb) else provenance end,
    image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
    access_tier=coalesce(payload->>'access_tier',access_tier),draft_technique_ids='[]'::jsonb,
    updated_at=now(),updated_by=auth.uid()
  where id=target_theory_id returning * into result;
  if not found then raise exception 'theory_not_found' using errcode='P0002'; end if;
  perform public.move_theory_display_id(target_theory_id,
    coalesce((payload->>'display_id')::integer,(payload->>'draft_display_id')::integer,(payload->>'display_order')::integer),
    'published',payload->>'category_id');
  select * into result from public.theories where id=target_theory_id;
  if payload ? 'related_technique_ids' then
    perform public.set_theory_techniques(result.id,array(select jsonb_array_elements_text(payload->'related_technique_ids')));
  end if;
  return result;
end;
$$;
revoke all on function public.publish_theory(text,jsonb) from public;
grant execute on function public.publish_theory(text,jsonb) to authenticated;

create or replace function public.archive_theory(target_theory_id text)
returns public.theories language plpgsql security definer set search_path=''
as $$
declare result public.theories; ids text[]; draft_ids text[]; source_status text;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
  select status into source_status from public.theories where id=target_theory_id for update;
  if not found then raise exception 'theory_not_found' using errcode='P0002'; end if;
  select coalesce(array_agg(id order by display_id),'{}'::text[]) into ids
    from public.theories where status='published' and id<>target_theory_id;
  if source_status='draft' then
    select coalesce(array_agg(id order by draft_display_id),'{}'::text[]) into draft_ids
      from public.theories where status='draft' and id<>target_theory_id;
  end if;
  update public.theories set status='archived',display_id=null,display_order=null,draft_display_id=null,
    updated_at=now(),updated_by=auth.uid() where id=target_theory_id returning * into result;
  if cardinality(ids)>0 then perform public.reorder_content('theory','',ids); end if;
  if source_status='draft' then perform public.reorder_theory_drafts(draft_ids); end if;
  return result;
end;
$$;
revoke all on function public.archive_theory(text) from public;
grant execute on function public.archive_theory(text) to authenticated;

create or replace function public.save_content_category(target_kind text,target_id text,target_title text)
returns public.content_categories language plpgsql security definer set search_path=''
as $$
declare result public.content_categories; category_order integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if target_kind not in ('technique','theory') or target_id !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or nullif(trim(target_title),'') is null then
    raise exception 'カテゴリ名またはIDが不正です。' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('category:'||target_kind,0));
  select display_order into category_order from public.content_categories where kind=target_kind and id=target_id for update;
  if not found then
    select coalesce(max(display_order),0)+1 into category_order from public.content_categories where kind=target_kind;
    update public.content_categories set display_order=-display_order where kind=target_kind;
    insert into public.content_categories(kind,id,title,display_order) values(target_kind,target_id,trim(target_title),-2147483647);
    update public.content_categories set display_order=case when id=target_id then category_order else -display_order end
      where kind=target_kind;
  else
    update public.content_categories set title=trim(target_title),updated_at=now()
      where kind=target_kind and id=target_id;
  end if;
  select * into result from public.content_categories where kind=target_kind and id=target_id;
  return result;
end;
$$;
revoke all on function public.save_content_category(text,text,text) from public;
grant execute on function public.save_content_category(text,text,text) to authenticated;

-- Keep cached complete-edition labels in step with edited category names.
create or replace function public.propagate_category_title()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.kind='theory' and new.title is distinct from old.title then
    update public.theories set category_title=new.title,updated_at=now() where category_id=new.id;
  elsif new.kind='technique' and new.title is distinct from old.title then
    update public.techniques set updated_at=now() where category=new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.propagate_category_title() from public;

create or replace function public.delete_content_category(target_kind text,target_id text)
returns void language plpgsql security definer set search_path=''
as $$
declare ids text[];
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('category:'||target_kind,0));
  if target_kind='technique' then
    if exists(select 1 from public.personas where category=target_id) or exists(select 1 from public.techniques where category=target_id) then
      raise exception 'このカテゴリには人物像または処世術が残っています。先に移動してください。' using errcode='23503'; end if;
  elsif target_kind='theory' then
    if exists(select 1 from public.theories where category_id=target_id) then
      raise exception 'このカテゴリには理論が残っています。先に移動してください。' using errcode='23503'; end if;
  else raise exception 'カテゴリ種別が不正です。' using errcode='22023'; end if;
  select array_agg(id order by display_order) into ids from public.content_categories where kind=target_kind and id<>target_id;
  delete from public.content_categories where kind=target_kind and id=target_id;
  if not found then raise exception 'カテゴリが見つかりません。' using errcode='P0002'; end if;
  if cardinality(ids)>0 then perform public.reorder_content(target_kind||'-category','',ids); end if;
end;
$$;
revoke all on function public.delete_content_category(text,text) from public;
grant execute on function public.delete_content_category(text,text) to authenticated;

-- Keep the secure projection and the public table on the same human-facing ID.
-- The canonical projection trigger is named sync_canonical_paid_theory and runs
-- before this trigger, so the JSON update is applied to its freshly written row.
create or replace function public.sync_paid_theory_display_id()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.status='published' and new.access_tier='complete' and new.display_id is not null then
    update public.paid_content
      set payload=payload||jsonb_build_object('displayId',new.display_id),
          sort_order=new.display_id,updated_at=now()
      where content_type='theory' and content_id=new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists zz_sync_paid_theory_display_id on public.theories;
create trigger zz_sync_paid_theory_display_id after insert or update on public.theories
for each row execute function public.sync_paid_theory_display_id();
revoke all on function public.sync_paid_theory_display_id() from public;

-- Refresh all existing complete theory payloads with the new ID field.
update public.paid_content p
set payload=p.payload||jsonb_build_object('displayId',t.display_id),
    sort_order=t.display_id,updated_at=now()
from public.theories t
where p.content_type='theory' and p.content_id=t.id
  and t.status='published' and t.access_tier='complete' and t.display_id is not null;
