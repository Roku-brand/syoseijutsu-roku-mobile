create table if not exists public.products (
  id text primary key,
  name text not null,
  currency text not null default 'jpy',
  unit_amount integer not null check (unit_amount > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.products (id, name, currency, unit_amount, active)
values ('complete-edition', '処世術禄 完全版', 'jpy', 280, true)
on conflict (id) do update set
  name = excluded.name,
  currency = excluded.currency,
  unit_amount = excluded.unit_amount,
  active = excluded.active,
  updated_at = now();

create table if not exists public.payment_events (
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now(),
  primary key (provider, event_id)
);

create table if not exists public.paid_content (
  content_type text not null check (content_type in ('technique', 'theory', 'learning')),
  content_id text not null,
  payload jsonb not null,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (content_type, content_id)
);

alter table public.products enable row level security;
alter table public.payment_events enable row level security;
alter table public.paid_content enable row level security;

create policy "anyone can read active products"
on public.products for select
to anon, authenticated
using (active = true);

-- payment_events and paid_content intentionally have no client policies.
-- They are accessed only through service-role Edge Functions.

create or replace function public.has_complete_edition(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = target_user_id and p.role = 'owner'
  ) or exists (
    select 1 from public.entitlements e
    where e.user_id = target_user_id
      and e.product_id = 'complete-edition'
      and e.status = 'active'
  );
$$;

revoke all on function public.has_complete_edition(uuid) from public;
grant execute on function public.has_complete_edition(uuid) to service_role;

create index if not exists paid_content_type_sort_idx
on public.paid_content (content_type, sort_order, content_id);
