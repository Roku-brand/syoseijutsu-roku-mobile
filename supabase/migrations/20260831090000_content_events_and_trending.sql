create table if not exists public.content_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_session_id text not null,
  content_type text not null check (content_type in ('technique', 'theory')),
  content_id text not null,
  event_type text not null check (event_type in ('view', 'save', 'revisit')),
  created_at timestamptz not null default now()
);

create index if not exists content_events_recent_idx
  on public.content_events (created_at desc, content_type, content_id);
create index if not exists content_events_actor_idx
  on public.content_events (anonymous_session_id, content_type, content_id, created_at desc);

alter table public.content_events enable row level security;

create or replace function public.record_content_event(
  p_anonymous_session_id text,
  p_content_type text,
  p_content_id text,
  p_event_type text default 'view'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor text := left(trim(coalesce(p_anonymous_session_id, '')), 96);
  v_event_type text := p_event_type;
  v_today timestamptz := date_trunc('day', now());
begin
  if length(v_actor) < 12
    or p_content_type not in ('technique', 'theory')
    or p_event_type not in ('view', 'save')
    or length(trim(coalesce(p_content_id, ''))) < 2
    or length(p_content_id) > 128 then
    return;
  end if;

  if p_event_type = 'view' then
    if exists (
      select 1 from public.content_events
      where anonymous_session_id = v_actor
        and content_type = p_content_type
        and content_id = p_content_id
        and event_type in ('view', 'revisit')
        and created_at >= v_today
    ) then
      return;
    end if;

    if exists (
      select 1 from public.content_events
      where anonymous_session_id = v_actor
        and content_type = p_content_type
        and content_id = p_content_id
        and event_type in ('view', 'revisit')
        and created_at >= now() - interval '14 days'
    ) then
      v_event_type := 'revisit';
    end if;
  elsif exists (
    select 1 from public.content_events
    where anonymous_session_id = v_actor
      and content_type = p_content_type
      and content_id = p_content_id
      and event_type = 'save'
      and created_at >= now() - interval '24 hours'
  ) then
    return;
  end if;

  insert into public.content_events (
    user_id,
    anonymous_session_id,
    content_type,
    content_id,
    event_type
  ) values (
    auth.uid(),
    v_actor,
    p_content_type,
    trim(p_content_id),
    v_event_type
  );
end;
$$;

create or replace function public.get_trending_content(p_limit integer default 12)
returns table (
  content_type text,
  content_id text,
  score double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    events.content_type,
    events.content_id,
    sum(
      (case events.event_type
        when 'save' then 3.0
        when 'revisit' then 3.0
        else 1.0
      end)
      * (case
        when events.created_at >= now() - interval '24 hours' then 1.5
        when events.created_at >= now() - interval '7 days' then 1.0
        else 0.5
      end)
    )::double precision as score
  from public.content_events as events
  where events.created_at >= now() - interval '14 days'
  group by events.content_type, events.content_id
  order by score desc, max(events.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 12), 40));
$$;

revoke all on public.content_events from anon, authenticated;
grant execute on function public.record_content_event(text, text, text, text) to anon, authenticated;
grant execute on function public.get_trending_content(integer) to anon, authenticated;

comment on table public.content_events is
  'Privacy-minimized interaction events used only for the rolling 14-day trending section.';
comment on function public.get_trending_content(integer) is
  'Scores views (+1), saves (+3), and distinct-day revisits (+3 including the revisit view) with 14-day time decay.';
