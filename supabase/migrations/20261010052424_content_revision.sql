-- A single public counter: no content, user data, catalogue scans or Realtime.
create table if not exists public.content_revision (
  id boolean primary key default true check (id),
  revision bigint not null default 1 check (revision > 0)
);
insert into public.content_revision (id) values (true) on conflict (id) do nothing;
alter table public.content_revision enable row level security;
revoke all on public.content_revision from public, anon, authenticated;
grant select on public.content_revision to anon, authenticated;
grant all on public.content_revision to service_role;
drop policy if exists content_revision_read on public.content_revision;
create policy content_revision_read on public.content_revision for select to anon, authenticated using (true);

-- Internal trigger only, in the existing non-exposed schema. Content writes
-- still require their original RLS/owner checks; clients cannot bump the counter.
create or replace function private.bump_content_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  before_row jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  after_row jsonb := case when tg_op = 'DELETE' then '{}'::jsonb else to_jsonb(new) end;
  before_content jsonb;
  after_content jsonb;
begin
  if tg_table_schema <> 'public' or tg_table_name not in
    ('techniques','theories','personas','content_categories','theory_subcategories','paid_content') then
    raise exception 'Unsupported revision source';
  end if;
  if tg_table_name in ('techniques','theories','personas') and
    coalesce(before_row->>'status','') <> 'published' and coalesce(after_row->>'status','') <> 'published' then
    return null;
  end if;
  -- Technique/theory projections are already represented by their canonical
  -- rows. Only learning payload changes need a paid_content notification.
  if tg_table_name = 'paid_content' then
    if coalesce(before_row->>'content_type','') <> 'learning' and coalesce(after_row->>'content_type','') <> 'learning' then
      return null;
    end if;
  end if;
  -- Ignore timestamp-only saves and draft edits that do not change publication.
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into before_content
    from jsonb_each(before_row) where key <> 'updated_at' and left(key,6) <> 'draft_';
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into after_content
    from jsonb_each(after_row) where key <> 'updated_at' and left(key,6) <> 'draft_';
  if before_content is distinct from after_content then
    update public.content_revision set revision = revision + 1 where id = true;
  end if;
  return null;
end;
$$;
revoke all on function private.bump_content_revision() from public, anon, authenticated;

do $$ declare source_table text; begin
  foreach source_table in array array['techniques','theories','personas','content_categories','theory_subcategories','paid_content'] loop
    execute format('drop trigger if exists content_revision_changed on public.%I', source_table);
    execute format('create trigger content_revision_changed after insert or update or delete on public.%I for each row execute function private.bump_content_revision()', source_table);
  end loop;
end $$;
