-- Additive Apple ledger. Existing Stripe grant/refund procedures are unchanged.
create table public.apple_transactions (
  environment text not null check (environment in ('Production', 'Sandbox')),
  transaction_id text not null,
  original_transaction_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  purchased_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  signed_at timestamptz not null,
  verified_at timestamptz not null default now(),
  primary key(environment, transaction_id),
  check (expires_at = purchased_at + interval '720 hours')
);
alter table public.apple_transactions enable row level security;
-- No client writes/reads. Deletion erases this ledger. Apple's signed
-- appAccountToken still binds any replay to the original, deleted auth UUID.
revoke all on public.apple_transactions from anon, authenticated;
grant all on public.apple_transactions to service_role;
create index apple_transactions_user_idx on public.apple_transactions(user_id, expires_at);

create function public.record_apple_transaction(
  p_environment text, p_transaction_id text, p_original_transaction_id text,
  p_user_id uuid, p_product_id text, p_purchased_at timestamptz,
  p_revoked_at timestamptz, p_signed_at timestamptz
) returns void language plpgsql security definer set search_path = public as $$
declare existing public.apple_transactions%rowtype;
begin
  if p_transaction_id !~ '^[0-9]{1,32}$' or p_user_id is null
     or p_purchased_at > now() + interval '5 minutes' then
    raise exception 'invalid_transaction';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_environment || ':' || p_transaction_id, 0));
  select * into existing from public.apple_transactions
    where environment = p_environment and transaction_id = p_transaction_id for update;
  if found then
    if existing.user_id is distinct from p_user_id
       or existing.product_id <> p_product_id or existing.purchased_at <> p_purchased_at then
      raise exception 'transaction_ownership_conflict';
    end if;
    -- Out-of-order events must never reverse a newer revocation.
    update public.apple_transactions set revoked_at = case when signed_at = p_signed_at
      then coalesce(revoked_at, p_revoked_at) else p_revoked_at end,
      signed_at = p_signed_at, verified_at = now()
      where environment = p_environment and transaction_id = p_transaction_id
      and signed_at <= p_signed_at;
  else
    insert into public.apple_transactions(environment, transaction_id, original_transaction_id,
      user_id, product_id, purchased_at, expires_at, revoked_at, signed_at)
    values(p_environment, p_transaction_id, p_original_transaction_id, p_user_id,
      p_product_id, p_purchased_at, p_purchased_at + interval '720 hours', p_revoked_at, p_signed_at);
  end if;
end;
$$;
revoke all on function public.record_apple_transaction(text,text,text,uuid,text,timestamptz,timestamptz,timestamptz) from public;
grant execute on function public.record_apple_transaction(text,text,text,uuid,text,timestamptz,timestamptz,timestamptz) to service_role;

-- Preserve exact legacy resolution, including lifetime and owner accounts.
alter function public.get_complete_edition_access(uuid) rename to get_web_complete_edition_access;
create function public.get_complete_edition_access(target_user_id uuid)
returns table(access_status text, access_type text, access_started_at timestamptz,
  access_expires_at timestamptz, purchased_at timestamptz, purchase_amount integer,
  purchase_currency text, server_now timestamptz)
language sql stable security definer set search_path = public as $$
  with candidates as (
    select * from public.get_web_complete_edition_access(target_user_id)
    union all
    select case when a.revoked_at is not null then 'free'
                when a.expires_at <= now() then 'expired'
                when a.verified_at + interval '24 hours' <= now() then 'processing'
                else 'active' end,
      'thirty_day', a.purchased_at, a.expires_at, a.purchased_at,
      null::integer, null::text, now()
    from public.apple_transactions a where a.user_id = target_user_id
  ) select * from candidates order by
    (access_status = 'active') desc,
    (access_status = 'active' and access_type = 'legacy_lifetime') desc,
    access_expires_at desc nulls last limit 1;
$$;
revoke all on function public.get_complete_edition_access(uuid) from public;
grant execute on function public.get_complete_edition_access(uuid) to service_role;
create or replace function public.has_complete_edition(target_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.get_complete_edition_access(target_user_id) where access_status = 'active');
$$;
revoke all on function public.has_complete_edition(uuid) from public;
grant execute on function public.has_complete_edition(uuid) to service_role;

-- Deleting an author must not delete the published catalogue or block account
-- deletion. Existing author values and ownership policies remain unchanged.
alter table public.techniques drop constraint techniques_updated_by_fkey;
alter table public.techniques add constraint techniques_updated_by_fkey foreign key(updated_by) references auth.users(id) on delete set null;
alter table public.technique_drafts drop constraint technique_drafts_updated_by_fkey;
alter table public.technique_drafts alter column updated_by drop not null;
alter table public.technique_drafts add constraint technique_drafts_updated_by_fkey foreign key(updated_by) references auth.users(id) on delete set null;
alter table public.technique_revisions drop constraint technique_revisions_created_by_fkey;
alter table public.technique_revisions alter column created_by drop not null;
alter table public.technique_revisions add constraint technique_revisions_created_by_fkey foreign key(created_by) references auth.users(id) on delete set null;
alter table public.technique_change_log drop constraint technique_change_log_created_by_fkey;
alter table public.technique_change_log add constraint technique_change_log_created_by_fkey foreign key(created_by) references auth.users(id) on delete set null;
