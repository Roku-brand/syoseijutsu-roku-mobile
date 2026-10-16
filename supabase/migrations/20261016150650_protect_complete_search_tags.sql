-- Match tags to the existing free/complete body entitlement, preserving view ACLs.
set local lock_timeout='5s';
do $guard$ begin
 if pg_get_viewdef('public.public_techniques'::regclass,true) <> ' SELECT id,
    persona_id,
    category,
    title,
        CASE
            WHEN access_tier = ''free''::text OR can_read_complete_content() THEN essence
            ELSE ''''::text
        END AS essence,
        CASE
            WHEN access_tier = ''free''::text OR can_read_complete_content() THEN explanation
            ELSE ''''::text
        END AS explanation,
        CASE
            WHEN access_tier = ''free''::text OR can_read_complete_content() THEN memo
            ELSE ''''::text
        END AS memo,
    importance,
        CASE
            WHEN access_tier = ''free''::text OR can_read_complete_content() THEN practices
            ELSE ''[]''::jsonb
        END AS practices,
        CASE
            WHEN access_tier = ''free''::text OR can_read_complete_content() THEN examples
            ELSE ''[]''::jsonb
        END AS examples,
        CASE
            WHEN access_tier = ''free''::text OR can_read_complete_content() THEN cautions
            ELSE ''[]''::jsonb
        END AS cautions,
    primary_theory_ids,
    theory_ids,
    status,
    display_order,
    updated_at,
    image_path,
    access_tier,
    tags
   FROM techniques
  WHERE status = ''published''::text;' then raise exception 'Public technique view changed; review before applying';end if;
end $guard$;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'search-tags-public-mask-20261016','views','public_techniques',jsonb_build_object('definition',pg_get_viewdef(c.oid,true),'acl',to_jsonb(c.relacl),'options',to_jsonb(c.reloptions)) from pg_class c where c.oid='public.public_techniques'::regclass
on conflict(phase,source_table,source_id) do nothing;
create or replace view public.public_techniques with(security_barrier=true) as  SELECT id,
    persona_id,
    category,
    title,
        CASE
            WHEN access_tier = 'free'::text OR can_read_complete_content() THEN essence
            ELSE ''::text
        END AS essence,
        CASE
            WHEN access_tier = 'free'::text OR can_read_complete_content() THEN explanation
            ELSE ''::text
        END AS explanation,
        CASE
            WHEN access_tier = 'free'::text OR can_read_complete_content() THEN memo
            ELSE ''::text
        END AS memo,
    importance,
        CASE
            WHEN access_tier = 'free'::text OR can_read_complete_content() THEN practices
            ELSE '[]'::jsonb
        END AS practices,
        CASE
            WHEN access_tier = 'free'::text OR can_read_complete_content() THEN examples
            ELSE '[]'::jsonb
        END AS examples,
        CASE
            WHEN access_tier = 'free'::text OR can_read_complete_content() THEN cautions
            ELSE '[]'::jsonb
        END AS cautions,
    primary_theory_ids,
    theory_ids,
    status,
    display_order,
    updated_at,
    image_path,
    access_tier,
    CASE WHEN access_tier = 'free'::text OR can_read_complete_content() THEN tags ELSE NULL::jsonb END AS tags
   FROM public.techniques
  WHERE status = 'published'::text;
do $verify$ begin
 if exists(select 1 from pg_class c join private.theory_reform_backups b on b.phase='search-tags-public-mask-20261016' and b.source_table='views' and b.source_id='public_techniques' where c.oid='public.public_techniques'::regclass and (to_jsonb(c.relacl) is distinct from b.snapshot->'acl' or to_jsonb(c.reloptions) is distinct from b.snapshot->'options')) then raise exception 'View privileges/options changed unexpectedly';end if;
end $verify$;

