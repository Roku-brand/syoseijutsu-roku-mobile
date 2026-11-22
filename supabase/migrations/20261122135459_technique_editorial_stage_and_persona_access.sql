-- Keep editorial readiness separate from the reader-facing publication status.
alter table public.techniques add column editorial_stage text;

update public.techniques set editorial_stage = case
  when coalesce(essence, '') !~ '[^[:space:]]' then 'title_only'
  when coalesce(explanation, '') !~ '[^[:space:]]' then 'title_essence'
  when status = 'published' then 'publishable'
  else 'title_essence_explanation'
end;

alter table public.techniques
  alter column editorial_stage set default 'title_only',
  alter column editorial_stage set not null,
  add constraint techniques_editorial_stage_check
    check (editorial_stage in ('title_only', 'title_essence', 'title_essence_explanation', 'publishable'));

-- The technique column remains a projection consumed by the existing public
-- view and paid-content trigger, including by already installed apps.
create function public.inherit_technique_persona_access()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare
  persona_tier text;
begin
  select access_tier into persona_tier
  from public.personas
  where name = new.persona_id
  for share;

  new.access_tier := coalesce(persona_tier, 'complete');
  return new;
end;
$$;

revoke all on function public.inherit_technique_persona_access() from public, anon, authenticated;

create trigger inherit_technique_persona_access
before insert or update of persona_id, access_tier on public.techniques
for each row execute function public.inherit_technique_persona_access();

create function public.propagate_persona_technique_access()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  update public.techniques
  set access_tier = new.access_tier, updated_at = now()
  where persona_id = new.name and access_tier is distinct from new.access_tier;
  return new;
end;
$$;

revoke all on function public.propagate_persona_technique_access() from public, anon, authenticated;

create trigger propagate_persona_technique_access
after update of access_tier on public.personas
for each row when (old.access_tier is distinct from new.access_tier)
execute function public.propagate_persona_technique_access();

update public.techniques as technique
set access_tier = persona.access_tier, updated_at = now()
from public.personas as persona
where technique.persona_id = persona.name and technique.access_tier is distinct from persona.access_tier;

-- This RPC already checks is_owner(). Take the same per-persona lock used
-- by technique creation and moves when invoked directly from the list.
create or replace function public.reorder_technique_drafts(target_persona_id text,target_ids text[])
returns void language plpgsql security definer set search_path=''
as $$
declare actual_count integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('technique:' || target_persona_id, 0));
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
revoke all on function public.reorder_technique_drafts(text,text[]) from public, anon;
grant execute on function public.reorder_technique_drafts(text,text[]) to authenticated;

-- The two-argument signature remains available to existing clients.
create function public.reorder_subcategory_theories(target_id text, target_ids text[], target_status text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode = '42501'; end if;
  if target_status is distinct from 'draft' then raise exception '下書きの一覧を指定してください。' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('theory-display-id', 0));

  if target_ids is null
    or cardinality(target_ids) <> (select count(*) from public.theories where status = 'draft' and subcategory_id = target_id)
    or cardinality(target_ids) <> (select count(distinct id) from unnest(target_ids) as input(id))
    or exists (
      select 1 from unnest(target_ids) as input(id)
      where not exists (select 1 from public.theories where id = input.id and status = 'draft' and subcategory_id = target_id)
    ) then
    raise exception '内部分類の下書き理論を重複なく指定してください。' using errcode = '22023';
  end if;

  update public.theories as theory
  set taxonomy_order = input.position, updated_at = now()
  from unnest(target_ids) with ordinality as input(id, position)
  where theory.id = input.id;
end;
$$;

revoke all on function public.reorder_subcategory_theories(text,text[],text) from public, anon;
grant execute on function public.reorder_subcategory_theories(text,text[],text) to authenticated;


create or replace function public.save_technique_draft(target_technique_id text,target_snapshot jsonb,expected_updated_at timestamptz default null)
returns public.techniques language plpgsql security definer set search_path=''
as $$
declare current_row public.techniques; payload jsonb := coalesce(target_snapshot, '{}'::jsonb) - 'examples' - 'access_tier';
  destination_persona text; target_order integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select * into current_row from public.techniques where id=target_technique_id for update;
  if not found then raise exception 'technique_not_found' using errcode='P0002'; end if;
  if expected_updated_at is not null and current_row.updated_at is distinct from expected_updated_at then raise exception 'content_conflict' using errcode='40001'; end if;
  destination_persona := coalesce(payload->>'persona_id', current_row.persona_id);
  target_order := (payload->>'display_order')::integer;
  if target_order is null and destination_persona = current_row.persona_id then
    target_order := coalesce(current_row.display_order, current_row.draft_display_order);
  end if;
  insert into public.technique_drafts(technique_id,snapshot,base_updated_at,updated_at,updated_by)
  values(target_technique_id,payload,current_row.updated_at,now(),auth.uid())
  on conflict(technique_id) do update set snapshot=excluded.snapshot,base_updated_at=excluded.base_updated_at,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  perform public.move_technique_order(target_technique_id,destination_persona,target_order,'draft');
  update public.techniques set title=coalesce(payload->>'title',''),essence=coalesce(payload->>'essence',''),
    explanation=coalesce(payload->>'explanation',''),memo=coalesce(payload->>'memo',''),
    importance=greatest(1,least(3,coalesce((payload->>'importance')::smallint,1))),
    practices=coalesce(payload->'practices','[]'::jsonb),
    cautions=coalesce(payload->'cautions','[]'::jsonb),theory_ids=coalesce(payload->'theory_ids','[]'::jsonb),
    primary_theory_ids=coalesce(payload->'primary_theory_ids','[]'::jsonb),
    tags=case when payload ? 'tags' then payload->'tags' else tags end,
    image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
    editorial_stage=coalesce(payload->>'editorial_stage',editorial_stage),updated_at=now(),updated_by=auth.uid()
  where id=target_technique_id returning * into current_row;
  return current_row;
end;
$$;

create or replace function public.save_and_publish_technique(target_technique_id text,target_snapshot jsonb,expected_updated_at timestamptz default null)
returns public.techniques language plpgsql security definer set search_path=''
as $$
declare current_row public.techniques; next_version integer; payload jsonb := coalesce(target_snapshot, '{}'::jsonb) - 'examples' - 'access_tier';
  destination_persona text; target_order integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  select * into current_row from public.techniques where id=target_technique_id for update;
  if not found then raise exception 'technique_not_found' using errcode='P0002'; end if;
  if expected_updated_at is not null and current_row.updated_at is distinct from expected_updated_at then raise exception 'content_conflict' using errcode='40001'; end if;
  if nullif(trim(payload->>'title'),'') is null then raise exception 'title_required' using errcode='22023'; end if;
  destination_persona := coalesce(payload->>'persona_id', current_row.persona_id);
  target_order := (payload->>'display_order')::integer;
  if target_order is null and destination_persona = current_row.persona_id then
    target_order := coalesce(current_row.display_order, current_row.draft_display_order);
  end if;
  select coalesce(max(version),0)+1 into next_version from public.technique_revisions where technique_id=target_technique_id;
  insert into public.technique_revisions(technique_id,snapshot,version,created_by) values(target_technique_id,to_jsonb(current_row),next_version,auth.uid());
  perform public.move_technique_order(target_technique_id,destination_persona,target_order,'published');
  update public.techniques set title=payload->>'title',essence=coalesce(payload->>'essence',''),
    explanation=coalesce(payload->>'explanation',''),memo=coalesce(payload->>'memo',''),
    importance=greatest(1,least(3,coalesce((payload->>'importance')::smallint,1))),
    practices=coalesce(payload->'practices','[]'::jsonb),
    cautions=coalesce(payload->'cautions','[]'::jsonb),theory_ids=coalesce(payload->'theory_ids','[]'::jsonb),
    primary_theory_ids=coalesce(payload->'primary_theory_ids',primary_theory_ids),
    tags=case when payload ? 'tags' then payload->'tags' else tags end,
    image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
    editorial_stage=coalesce(payload->>'editorial_stage',editorial_stage),updated_at=now(),updated_by=auth.uid()
  where id=target_technique_id returning * into current_row;
  delete from public.technique_drafts where technique_id=target_technique_id and updated_by=auth.uid();
  return current_row;
end;
$$;

-- Publish stored drafts through the same write path as the current editor.
create or replace function public.publish_technique(
  target_technique_id text, expected_updated_at timestamptz default null
)
returns public.techniques language plpgsql security definer set search_path = ''
as $$
declare
  current_row public.techniques;
  draft_snapshot jsonb;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode = '42501'; end if;
  select * into current_row from public.techniques where id = target_technique_id for update;
  if not found then raise exception 'technique_not_found' using errcode = 'P0002'; end if;
  if expected_updated_at is not null and current_row.updated_at is distinct from expected_updated_at then
    raise exception 'content_conflict' using errcode = '40001';
  end if;
  select snapshot into draft_snapshot from public.technique_drafts
  where technique_id = target_technique_id and updated_by = auth.uid();
  if not found then raise exception 'draft_not_found' using errcode = 'P0002'; end if;

  return public.save_and_publish_technique(
    target_technique_id, jsonb_build_object('title', current_row.title) || (draft_snapshot - 'display_order'), expected_updated_at
  );
end;
$$;

