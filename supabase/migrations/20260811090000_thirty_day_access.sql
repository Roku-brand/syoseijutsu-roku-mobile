-- Preserve every entitlement sold under the former lifetime offer, then make
-- all future grants explicit, time-bound access records.
alter table public.entitlements
  add column if not exists access_type text,
  add column if not exists access_started_at timestamptz,
  add column if not exists access_expires_at timestamptz,
  add column if not exists provider_checkout_session_id text,
  add column if not exists purchase_amount integer,
  add column if not exists purchase_currency text;

update public.entitlements
set access_type = 'legacy_lifetime',
    access_started_at = coalesce(access_started_at, purchased_at),
    access_expires_at = null,
    purchase_amount = coalesce(purchase_amount, 280),
    purchase_currency = coalesce(purchase_currency, 'jpy')
where access_type is null;

alter table public.entitlements
  alter column access_type set default 'thirty_day',
  alter column access_type set not null;

alter table public.entitlements
  drop constraint if exists entitlements_access_type_check;
alter table public.entitlements
  add constraint entitlements_access_type_check
  check (access_type in ('legacy_lifetime', 'thirty_day'));

create table if not exists public.access_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  access_type text not null check (access_type in ('legacy_lifetime', 'thirty_day')),
  provider text not null,
  provider_customer_id text,
  provider_checkout_session_id text,
  provider_payment_id text not null,
  amount integer not null,
  currency text not null,
  status text not null default 'succeeded' check (status in ('succeeded', 'refunded', 'revoked')),
  completed_at timestamptz not null,
  access_started_at timestamptz not null,
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists access_purchases_provider_payment_uidx
on public.access_purchases (provider, provider_payment_id);

create unique index if not exists access_purchases_provider_session_uidx
on public.access_purchases (provider, provider_checkout_session_id)
where provider_checkout_session_id is not null;

create index if not exists access_purchases_user_completed_idx
on public.access_purchases (user_id, completed_at desc);

alter table public.access_purchases enable row level security;

drop policy if exists "users can read own access purchases" on public.access_purchases;
create policy "users can read own access purchases"
on public.access_purchases for select
to authenticated
using (auth.uid() = user_id);

update public.products
set name = '処世術禄 完全版｜30日間アクセス',
    unit_amount = 280,
    active = true,
    updated_at = now()
where id = 'complete-edition';

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
      and (
        e.access_type = 'legacy_lifetime'
        or (e.access_type = 'thirty_day' and e.access_expires_at > now())
      )
  );
$$;

revoke all on function public.has_complete_edition(uuid) from public;
grant execute on function public.has_complete_edition(uuid) to service_role;

create or replace function public.get_complete_edition_access(target_user_id uuid)
returns table (
  access_status text,
  access_type text,
  access_started_at timestamptz,
  access_expires_at timestamptz,
  purchased_at timestamptz,
  purchase_amount integer,
  purchase_currency text,
  server_now timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  entitlement public.entitlements%rowtype;
  owner_access boolean;
begin
  select exists (
    select 1 from public.profiles p
    where p.user_id = target_user_id and p.role = 'owner'
  ) into owner_access;

  if owner_access then
    return query select
      'active'::text,
      'legacy_lifetime'::text,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz,
      null::integer,
      null::text,
      now();
    return;
  end if;

  select * into entitlement
  from public.entitlements e
  where e.user_id = target_user_id and e.product_id = 'complete-edition';

  if not found then
    return query select 'free'::text, null::text, null::timestamptz,
      null::timestamptz, null::timestamptz, null::integer, null::text, now();
    return;
  end if;

  return query select
    case
      when entitlement.status = 'active' and entitlement.access_type = 'legacy_lifetime' then 'active'
      when entitlement.status = 'active' and entitlement.access_type = 'thirty_day'
        and entitlement.access_expires_at > now() then 'active'
      when entitlement.access_type = 'thirty_day'
        and entitlement.access_expires_at is not null
        and entitlement.access_expires_at <= now() then 'expired'
      else 'free'
    end::text,
    entitlement.access_type,
    entitlement.access_started_at,
    entitlement.access_expires_at,
    entitlement.purchased_at,
    entitlement.purchase_amount,
    entitlement.purchase_currency,
    now();
end;
$$;

revoke all on function public.get_complete_edition_access(uuid) from public;
grant execute on function public.get_complete_edition_access(uuid) to service_role;

create or replace function public.grant_complete_edition_access(
  target_user_id uuid,
  target_access_type text,
  target_customer_id text,
  target_checkout_session_id text,
  target_payment_id text,
  target_amount integer,
  target_currency text,
  target_completed_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
  target_expires_at timestamptz;
begin
  if target_access_type not in ('legacy_lifetime', 'thirty_day') then
    raise exception 'invalid_access_type';
  end if;
  if target_payment_id is null or target_amount <> 280 or lower(target_currency) <> 'jpy' then
    raise exception 'invalid_purchase';
  end if;

  target_expires_at := case
    when target_access_type = 'thirty_day' then target_completed_at + interval '30 days'
    else null
  end;

  insert into public.access_purchases (
    user_id, product_id, access_type, provider, provider_customer_id,
    provider_checkout_session_id, provider_payment_id, amount, currency,
    status, completed_at, access_started_at, access_expires_at
  ) values (
    target_user_id, 'complete-edition', target_access_type, 'stripe', target_customer_id,
    target_checkout_session_id, target_payment_id, target_amount, lower(target_currency),
    'succeeded', target_completed_at, target_completed_at, target_expires_at
  ) on conflict do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return false;
  end if;

  -- A customer who previously bought the lifetime edition can never be
  -- downgraded by a later event or an old Checkout tab.
  if exists (
    select 1 from public.entitlements e
    where e.user_id = target_user_id
      and e.product_id = 'complete-edition'
      and e.access_type = 'legacy_lifetime'
      and e.status = 'active'
  ) then
    return true;
  end if;

  insert into public.entitlements (
    user_id, product_id, status, provider, provider_customer_id,
    provider_payment_id, purchased_at, updated_at, access_type,
    access_started_at, access_expires_at, provider_checkout_session_id,
    purchase_amount, purchase_currency
  ) values (
    target_user_id, 'complete-edition', 'active', 'stripe', target_customer_id,
    target_payment_id, target_completed_at, now(), target_access_type,
    target_completed_at, target_expires_at, target_checkout_session_id,
    target_amount, lower(target_currency)
  ) on conflict (user_id, product_id) do update set
    status = 'active',
    provider = excluded.provider,
    provider_customer_id = excluded.provider_customer_id,
    provider_payment_id = excluded.provider_payment_id,
    purchased_at = excluded.purchased_at,
    updated_at = now(),
    access_type = excluded.access_type,
    access_started_at = excluded.access_started_at,
    access_expires_at = excluded.access_expires_at,
    provider_checkout_session_id = excluded.provider_checkout_session_id,
    purchase_amount = excluded.purchase_amount,
    purchase_currency = excluded.purchase_currency;

  return true;
end;
$$;

revoke all on function public.grant_complete_edition_access(uuid, text, text, text, text, integer, text, timestamptz) from public;
grant execute on function public.grant_complete_edition_access(uuid, text, text, text, text, integer, text, timestamptz) to service_role;

create or replace function public.refund_complete_edition_purchase(target_payment_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.access_purchases
  set status = 'refunded', updated_at = now()
  where provider = 'stripe' and provider_payment_id = target_payment_id;

  update public.entitlements
  set status = 'refunded', updated_at = now()
  where provider = 'stripe' and provider_payment_id = target_payment_id;
end;
$$;

revoke all on function public.refund_complete_edition_purchase(text) from public;
grant execute on function public.refund_complete_edition_purchase(text) to service_role;
