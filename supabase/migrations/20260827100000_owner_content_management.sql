-- Owner-managed content.  The client only ever receives published rows; all
-- mutations below are protected by the database, not by UI visibility.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_roles (user_id, role)
select user_id, role from public.profiles
where role in ('user', 'owner')
on conflict (user_id) do update set role = excluded.role, updated_at = now();

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'owner'
  ) or exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'owner'
  );
$$;

revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

create table if not exists public.techniques (
  id text primary key,
  persona_id text not null,
  category text not null,
  title text not null,
  essence text not null default '',
  explanation text not null default '',
  memo text not null default '',
  importance smallint not null default 1 check (importance between 1 and 3),
  practices jsonb not null default '[]'::jsonb,
  examples jsonb not null default '[]'::jsonb,
  cautions jsonb not null default '[]'::jsonb,
  theory_ids jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('published', 'draft')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.technique_drafts (
  technique_id text primary key references public.techniques(id) on delete cascade,
  snapshot jsonb not null,
  base_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users(id)
);

create table if not exists public.technique_revisions (
  revision_id uuid primary key default gen_random_uuid(),
  technique_id text not null references public.techniques(id) on delete cascade,
  snapshot jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id)
);

create index if not exists techniques_status_order_idx
  on public.techniques (status, display_order, id);
create index if not exists technique_revisions_technique_created_idx
  on public.technique_revisions (technique_id, created_at desc);

alter table public.user_roles enable row level security;
alter table public.techniques enable row level security;
alter table public.technique_drafts enable row level security;
alter table public.technique_revisions enable row level security;

drop policy if exists "published techniques are public" on public.techniques;
create policy "published techniques are public"
on public.techniques for select
to anon, authenticated
using (status = 'published' or public.is_owner());

drop policy if exists "owners can insert techniques" on public.techniques;
create policy "owners can insert techniques"
on public.techniques for insert to authenticated
with check (public.is_owner());

drop policy if exists "owners can update techniques" on public.techniques;
create policy "owners can update techniques"
on public.techniques for update to authenticated
using (public.is_owner()) with check (public.is_owner());

drop policy if exists "owners can delete techniques" on public.techniques;
create policy "owners can delete techniques"
on public.techniques for delete to authenticated
using (public.is_owner());

drop policy if exists "owners can manage drafts" on public.technique_drafts;
create policy "owners can manage drafts"
on public.technique_drafts for all to authenticated
using (public.is_owner() and updated_by = auth.uid())
with check (public.is_owner() and updated_by = auth.uid());

drop policy if exists "owners can read revisions" on public.technique_revisions;
create policy "owners can read revisions"
on public.technique_revisions for select to authenticated
using (public.is_owner());

-- Keep only an owner-written copy of the pre-publish state. Publishing is one
-- database operation, so a second editor cannot silently overwrite changes.
create or replace function public.publish_technique(
  target_technique_id text,
  expected_updated_at timestamptz default null
)
returns public.techniques
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.techniques;
  draft_row public.technique_drafts;
  next_version integer;
  payload jsonb;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode = '42501'; end if;

  select * into current_row from public.techniques
  where id = target_technique_id for update;
  if not found then raise exception 'technique_not_found' using errcode = 'P0002'; end if;

  if expected_updated_at is not null and current_row.updated_at is distinct from expected_updated_at then
    raise exception 'content_conflict' using errcode = '40001';
  end if;

  select * into draft_row from public.technique_drafts
  where technique_id = target_technique_id and updated_by = auth.uid();
  if not found then raise exception 'draft_not_found' using errcode = 'P0002'; end if;
  payload := draft_row.snapshot;

  select coalesce(max(version), 0) + 1 into next_version
  from public.technique_revisions where technique_id = target_technique_id;
  insert into public.technique_revisions (technique_id, snapshot, version, created_by)
  values (target_technique_id, to_jsonb(current_row), next_version, auth.uid());

  update public.techniques set
    persona_id = coalesce(payload->>'persona_id', persona_id),
    category = coalesce(payload->>'category', category),
    title = coalesce(payload->>'title', title),
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

revoke all on function public.publish_technique(text, timestamptz) from public;
grant execute on function public.publish_technique(text, timestamptz) to authenticated;

create or replace function public.restore_technique_revision(target_revision_id uuid)
returns public.technique_drafts
language plpgsql
security definer
set search_path = public
as $$
declare
  revision_row public.technique_revisions;
  current_row public.techniques;
  result_row public.technique_drafts;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode = '42501'; end if;
  select * into revision_row from public.technique_revisions
  where revision_id = target_revision_id;
  if not found then raise exception 'revision_not_found' using errcode = 'P0002'; end if;
  select * into current_row from public.techniques where id = revision_row.technique_id;
  insert into public.technique_drafts (technique_id, snapshot, base_updated_at, updated_by)
  values (revision_row.technique_id, revision_row.snapshot, current_row.updated_at, auth.uid())
  on conflict (technique_id) do update set
    snapshot = excluded.snapshot,
    base_updated_at = excluded.base_updated_at,
    updated_at = now(),
    updated_by = auth.uid()
  returning * into result_row;
  return result_row;
end;
$$;

revoke all on function public.restore_technique_revision(uuid) from public;
grant execute on function public.restore_technique_revision(uuid) to authenticated;

-- After the owner account is registered, execute:
-- update public.profiles set role = 'owner' where user_id = '<OWNER_USER_UUID>';
-- insert into public.user_roles (user_id, role) values ('<OWNER_USER_UUID>', 'owner')
-- on conflict (user_id) do update set role = 'owner', updated_at = now();
