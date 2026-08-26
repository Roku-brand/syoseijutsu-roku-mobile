-- Publish the content currently visible in the editor in one transaction.
-- The former client flow saved a draft and then invoked publish in a second
-- request, so an interrupted web confirmation could make publishing appear
-- to do nothing.

create or replace function public.save_and_publish_technique(
  target_technique_id text,
  target_snapshot jsonb,
  expected_updated_at timestamptz default null
)
returns public.techniques
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.techniques;
  next_version integer;
  payload jsonb := coalesce(target_snapshot, '{}'::jsonb);
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode = '42501'; end if;

  select * into current_row from public.techniques
  where id = target_technique_id for update;
  if not found then raise exception 'technique_not_found' using errcode = 'P0002'; end if;

  if expected_updated_at is not null and current_row.updated_at is distinct from expected_updated_at then
    raise exception 'content_conflict' using errcode = '40001';
  end if;

  if coalesce(trim(payload->>'title'), '') = '' then
    raise exception 'title_required' using errcode = '22023';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.technique_revisions where technique_id = target_technique_id;
  insert into public.technique_revisions (technique_id, snapshot, version, created_by)
  values (target_technique_id, to_jsonb(current_row), next_version, auth.uid());

  update public.techniques set
    persona_id = coalesce(payload->>'persona_id', persona_id),
    category = coalesce(payload->>'category', category),
    title = payload->>'title',
    essence = coalesce(payload->>'essence', ''),
    explanation = coalesce(payload->>'explanation', ''),
    memo = coalesce(payload->>'memo', ''),
    importance = greatest(1, least(3, coalesce((payload->>'importance')::smallint, 1))),
    practices = coalesce(payload->'practices', '[]'::jsonb),
    examples = coalesce(payload->'examples', '[]'::jsonb),
    cautions = coalesce(payload->'cautions', '[]'::jsonb),
    theory_ids = coalesce(payload->'theory_ids', '[]'::jsonb),
    status = 'published',
    updated_at = now(),
    updated_by = auth.uid()
  where id = target_technique_id
  returning * into current_row;

  delete from public.technique_drafts
  where technique_id = target_technique_id and updated_by = auth.uid();
  return current_row;
end;
$$;

revoke all on function public.save_and_publish_technique(text, jsonb, timestamptz) from public;
grant execute on function public.save_and_publish_technique(text, jsonb, timestamptz) to authenticated;
