-- New sales are 320 JPY; verified historical 280 JPY receipts remain restorable.
update public.products set unit_amount = 320 where id = 'complete-edition';

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
  if target_payment_id is null or target_amount is null or target_amount not in (280, 320) or lower(target_currency) <> 'jpy' then
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

revoke all on function public.grant_complete_edition_access(uuid, text, text, text, text, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.grant_complete_edition_access(uuid, text, text, text, text, integer, text, timestamptz) to service_role;

