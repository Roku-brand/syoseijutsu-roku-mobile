-- Applied and verified in production on 2026-10-02.
-- Apply in a staging clone first; verify profile upserts and both payment paths.
-- No deletion or modification of purchase/user records is required.
begin;

-- Ownership RLS alone does not prevent self-escalation through profiles.role.
revoke insert, update on public.profiles from public, anon, authenticated;
revoke insert (role), update (role) on public.profiles from public, anon, authenticated;
grant insert (user_id, display_name, avatar_url) on public.profiles to authenticated;
-- PostgREST upserts include the unchanged primary key in the UPDATE payload.
-- Existing auth.uid() ownership policies still constrain both old/new rows.
grant update (user_id, display_name, avatar_url) on public.profiles to authenticated;

-- Only verified server functions may read another account's entitlement or
-- mutate the Apple/Stripe purchase ledgers. Keep service_role access explicit.
do $$
declare f record;
begin
  for f in select oid::regprocedure as signature from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in ('record_apple_transaction', 'refund_complete_edition_purchase',
        'get_complete_edition_access', 'get_web_complete_edition_access',
        'grant_complete_edition_access')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end $$;

commit;

