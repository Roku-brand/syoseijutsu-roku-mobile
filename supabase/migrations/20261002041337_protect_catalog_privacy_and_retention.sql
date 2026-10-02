begin;
-- Safe discovery views expose paid identifiers/titles, never paid article bodies.
create function public.can_read_complete_content() returns boolean language sql stable security definer set search_path=public as $$
 select public.is_owner() or coalesce(public.has_complete_edition(auth.uid()),false); $$;
revoke all on function public.can_read_complete_content() from public;
grant execute on function public.can_read_complete_content() to anon,authenticated,service_role;
drop policy "published techniques are public" on public.techniques;
create policy "published techniques by access" on public.techniques for select to anon,authenticated using(status='published' and (access_tier='free' or public.can_read_complete_content()));
drop policy "published theories are public" on public.theories;
create policy "published theories by access" on public.theories for select to anon,authenticated using(status='published' and (access_tier='free' or public.can_read_complete_content()));
create view public.public_techniques with (security_barrier=true) as
select id,persona_id,category,title,
 case when access_tier='free' or public.can_read_complete_content() then essence else '' end essence,
 case when access_tier='free' or public.can_read_complete_content() then explanation else '' end explanation,
 case when access_tier='free' or public.can_read_complete_content() then memo else '' end memo,
 importance,
 case when access_tier='free' or public.can_read_complete_content() then practices else '[]'::jsonb end practices,
 case when access_tier='free' or public.can_read_complete_content() then examples else '[]'::jsonb end examples,
 case when access_tier='free' or public.can_read_complete_content() then cautions else '[]'::jsonb end cautions,
 primary_theory_ids,theory_ids,status,display_order,updated_at,image_path,access_tier,tags
from public.techniques where status='published';
create view public.public_theories with (security_barrier=true) as
select id,title,
 case when access_tier='free' or public.can_read_complete_content() then summary else '' end summary,
 category_id,category_title,aliases,related_theory_ids,
 case when access_tier='free' or public.can_read_complete_content() then provenance else null end provenance,
 status,display_order,display_id,image_path,access_tier from public.theories where status='published';
revoke all on public.public_techniques,public.public_theories from public,anon,authenticated;
grant select on public.public_techniques,public.public_theories to anon,authenticated,service_role;
-- Previous clients cannot send optional telemetry without an explicit opt-in.
create or replace function public.record_content_event(p_anonymous_session_id text,p_content_type text,p_content_id text,p_event_type text default 'view') returns void language sql set search_path=public as $$ select; $$;
CREATE OR REPLACE FUNCTION public.record_consented_content_event(p_anonymous_session_id text, p_content_type text, p_content_id text, p_event_type text DEFAULT 'view'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
revoke all on function public.record_consented_content_event(text,text,text,text) from public;
grant execute on function public.record_consented_content_event(text,text,text,text) to anon,authenticated,service_role;
update storage.buckets set public=false where id='profile-avatars';
create policy "users can delete own profile avatar" on storage.objects for delete to authenticated using(bucket_id='profile-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
-- Keep only minimal transaction evidence on account deletion; never an email or avatar.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.deleted_purchase_records(
 provider text not null, transaction_id text not null, account_id uuid not null,
 product_id text not null, purchased_at timestamptz not null, amount integer,currency text,
 status text not null, environment text not null default 'production',
 erased_at timestamptz not null default now(), retain_until timestamptz not null,
 primary key(provider,environment,transaction_id));
revoke all on private.deleted_purchase_records from public,anon,authenticated;
create function private.retain_deleted_purchase_evidence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.deleted_purchase_records(provider,transaction_id,account_id,product_id,purchased_at,amount,currency,status,retain_until)
 select provider,provider_payment_id,user_id,product_id,completed_at,amount,currency,status,completed_at+interval '7 years'
 from public.access_purchases where user_id=old.id and provider_payment_id is not null on conflict do nothing;
 insert into private.deleted_purchase_records(provider,transaction_id,account_id,product_id,purchased_at,status,environment,retain_until)
 select 'apple',transaction_id,user_id,product_id,purchased_at,case when revoked_at is null then 'verified' else 'revoked' end,environment,
 purchased_at+case when environment='Sandbox' then interval '180 days' else interval '7 years' end
 from public.apple_transactions where user_id=old.id on conflict do nothing;
 return old;
end; $$;
revoke all on function private.retain_deleted_purchase_evidence() from public,anon,authenticated;
create trigger retain_minimal_purchase_evidence before delete on auth.users for each row execute function private.retain_deleted_purchase_evidence();
create function private.purge_expired_records() returns void language sql security definer set search_path='' as $$
 delete from private.deleted_purchase_records where retain_until < now();
 delete from public.content_events where created_at < now()-interval '90 days'; $$;
revoke all on function private.purge_expired_records() from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.purge_expired_records() to service_role;
-- Schedule on installations already using pg_cron.
do $$ begin if exists(select 1 from pg_extension where extname='pg_cron') then
 perform cron.schedule('roku-privacy-retention','19 18 * * *','select private.purge_expired_records()');
 end if; end $$;
commit;
