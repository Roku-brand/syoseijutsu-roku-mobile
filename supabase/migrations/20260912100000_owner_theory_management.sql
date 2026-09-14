-- Owner-managed theories. Both the web build and native app read published rows.
create table if not exists public.theories (
  id text primary key,
  title text not null,
  summary text not null default '',
  category_id text not null default 'psychology',
  category_title text not null default '心理学',
  aliases jsonb not null default '[]'::jsonb,
  related_theory_ids jsonb not null default '[]'::jsonb,
  status text not null default 'published' check (status in ('published','archived')),
  display_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.theories enable row level security;
drop policy if exists "published theories are public" on public.theories;
create policy "published theories are public" on public.theories for select to anon, authenticated using (status = 'published' or public.is_owner());
drop policy if exists "owners can manage theories" on public.theories;
create policy "owners can manage theories" on public.theories for all to authenticated using (public.is_owner()) with check (public.is_owner());

create or replace function public.publish_theory(target_theory_id text, payload jsonb)
returns public.theories language plpgsql security definer set search_path = public as $$
declare result_row public.theories;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode = '42501'; end if;
  insert into public.theories (id,title,summary,category_id,category_title,aliases,related_theory_ids,status,display_order,updated_by)
  values (target_theory_id, coalesce(payload->>'title',''), coalesce(payload->>'summary',''), coalesce(payload->>'category_id','psychology'), coalesce(payload->>'category_title','心理学'), coalesce(payload->'aliases','[]'::jsonb), coalesce(payload->'related_theory_ids','[]'::jsonb), 'published', coalesce((payload->>'display_order')::int,0), auth.uid())
  on conflict (id) do update set title=excluded.title, summary=excluded.summary, category_id=excluded.category_id, category_title=excluded.category_title, aliases=excluded.aliases, related_theory_ids=excluded.related_theory_ids, status='published', display_order=excluded.display_order, updated_at=now(), updated_by=auth.uid()
  returning * into result_row;
  return result_row;
end; $$;
revoke all on function public.publish_theory(text,jsonb) from public;
grant execute on function public.publish_theory(text,jsonb) to authenticated;

create or replace function public.archive_theory(target_theory_id text)
returns public.theories language plpgsql security definer set search_path = public as $$
declare result_row public.theories;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode = '42501'; end if;
  update public.theories set status='archived', updated_at=now(), updated_by=auth.uid() where id=target_theory_id returning * into result_row;
  if not found then raise exception 'theory_not_found' using errcode = 'P0002'; end if;
  return result_row;
end; $$;
revoke all on function public.archive_theory(text) from public;
grant execute on function public.archive_theory(text) to authenticated;
