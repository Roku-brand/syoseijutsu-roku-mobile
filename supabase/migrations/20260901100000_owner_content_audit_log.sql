-- Durable audit trail for every owner edit. Store complete snapshots rather
-- than individual diffs so wording and links can always be reconstructed.
create table if not exists public.technique_change_log (
  log_id uuid primary key default gen_random_uuid(),
  technique_id text not null references public.techniques(id) on delete cascade,
  event_type text not null check (event_type in ('draft_saved', 'published')),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index if not exists technique_change_log_technique_created_idx
  on public.technique_change_log (technique_id, created_at desc);

alter table public.technique_change_log enable row level security;
drop policy if exists "owners can read change log" on public.technique_change_log;
create policy "owners can read change log"
on public.technique_change_log for select to authenticated
using (public.is_owner());

create or replace function public.log_technique_draft_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.technique_change_log (technique_id, event_type, snapshot, created_by)
  values (new.technique_id, 'draft_saved', new.snapshot, coalesce(new.updated_by, auth.uid()));
  return new;
end;
$$;

drop trigger if exists technique_draft_change_log on public.technique_drafts;
create trigger technique_draft_change_log
after insert or update of snapshot, base_updated_at on public.technique_drafts
for each row execute function public.log_technique_draft_change();

create or replace function public.log_technique_publish_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' then
    insert into public.technique_change_log (technique_id, event_type, snapshot, created_by)
    values (new.id, 'published', to_jsonb(new), coalesce(new.updated_by, auth.uid()));
  end if;
  return new;
end;
$$;

drop trigger if exists technique_publish_change_log on public.techniques;
create trigger technique_publish_change_log
after update on public.techniques
for each row execute function public.log_technique_publish_change();

revoke all on function public.log_technique_draft_change() from public;
revoke all on function public.log_technique_publish_change() from public;

