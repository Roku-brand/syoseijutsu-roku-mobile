-- Keep owner-managed content safe when cards are renamed or removed.
--
-- IDs are stable references in drafts, revisions and the audit log. A rename
-- must therefore cascade through those references, while a deletion must not
-- destroy the audit trail. Deletion is represented as an archive instead of
-- a physical DELETE so every published/draft snapshot remains recoverable.

alter table public.techniques
  drop constraint if exists techniques_status_check;
alter table public.techniques
  add constraint techniques_status_check
  check (status in ('published', 'draft', 'archived'));

alter table public.technique_drafts
  drop constraint if exists technique_drafts_technique_id_fkey;
alter table public.technique_drafts
  add constraint technique_drafts_technique_id_fkey
  foreign key (technique_id) references public.techniques(id)
  on delete cascade on update cascade;

alter table public.technique_revisions
  drop constraint if exists technique_revisions_technique_id_fkey;
alter table public.technique_revisions
  add constraint technique_revisions_technique_id_fkey
  foreign key (technique_id) references public.techniques(id)
  on delete restrict on update cascade;

alter table public.technique_change_log
  drop constraint if exists technique_change_log_technique_id_fkey;
alter table public.technique_change_log
  add constraint technique_change_log_technique_id_fkey
  foreign key (technique_id) references public.techniques(id)
  on delete restrict on update cascade;

-- Remember renamed IDs so the deployment importer does not recreate the old
-- bundled row on the next build.
create table if not exists public.technique_id_aliases (
  old_id text primary key,
  current_id text not null references public.techniques(id) on delete restrict on update cascade,
  changed_at timestamptz not null default now()
);
create index if not exists technique_id_aliases_current_idx
  on public.technique_id_aliases (current_id);
alter table public.technique_id_aliases enable row level security;
revoke all on public.technique_id_aliases from anon, authenticated;

-- Physical deletes would erase revision/audit history. Owners use this RPC
-- when they mean "delete"; public queries already expose only published rows.
drop policy if exists "owners can delete techniques" on public.techniques;

create or replace function public.archive_technique(target_technique_id text)
returns public.techniques
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.techniques;
begin
  if not public.is_owner() then
    raise exception 'owner_required' using errcode = '42501';
  end if;

  update public.techniques
  set status = 'archived', updated_at = now(), updated_by = auth.uid()
  where id = target_technique_id
  returning * into result_row;
  if not found then
    raise exception 'technique_not_found' using errcode = 'P0002';
  end if;

  return result_row;
end;
$$;

revoke all on function public.archive_technique(text) from public;
grant execute on function public.archive_technique(text) to authenticated;

-- Renaming is transactional and keeps all draft/revision/audit references in
-- sync through the ON UPDATE CASCADE constraints above.
create or replace function public.rename_technique(
  source_technique_id text,
  target_technique_id text
)
returns public.techniques
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.techniques;
begin
  if not public.is_owner() then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  if nullif(trim(target_technique_id), '') is null then
    raise exception 'technique_id_required' using errcode = '22023';
  end if;
  if source_technique_id = target_technique_id then
    select * into result_row from public.techniques where id = source_technique_id;
    if not found then raise exception 'technique_not_found' using errcode = 'P0002'; end if;
    return result_row;
  end if;
  if exists (select 1 from public.techniques where id = target_technique_id) then
    raise exception 'technique_id_exists' using errcode = '23505';
  end if;

  update public.techniques
  set id = trim(target_technique_id), updated_at = now(), updated_by = auth.uid()
  where id = source_technique_id
  returning * into result_row;
  if not found then
    raise exception 'technique_not_found' using errcode = 'P0002';
  end if;
  insert into public.technique_id_aliases (old_id, current_id, changed_at)
  values (source_technique_id, result_row.id, now())
  on conflict (old_id) do update set current_id = excluded.current_id, changed_at = excluded.changed_at;
  return result_row;
end;
$$;

revoke all on function public.rename_technique(text, text) from public;
grant execute on function public.rename_technique(text, text) to authenticated;
