-- Preserve canonical IDs, alias rows and the exact paid-content redaction contract.
create or replace view public.public_techniques with (security_barrier=true) as
with catalog_access as materialized (select public.can_read_complete_content() as allowed)
 SELECT id,
    persona_id,
    category,
    title,
        CASE
            WHEN ((access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN essence
            ELSE ''::text
        END AS essence,
        CASE
            WHEN ((access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN explanation
            ELSE ''::text
        END AS explanation,
        CASE
            WHEN ((access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN memo
            ELSE ''::text
        END AS memo,
    importance,
        CASE
            WHEN ((access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN practices
            ELSE '[]'::jsonb
        END AS practices,
        CASE
            WHEN ((access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN examples
            ELSE '[]'::jsonb
        END AS examples,
        CASE
            WHEN ((access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN cautions
            ELSE '[]'::jsonb
        END AS cautions,
    primary_theory_ids,
    theory_ids,
    status,
    display_order,
    updated_at,
    image_path,
    access_tier,
        CASE
            WHEN ((access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN tags
            ELSE NULL::jsonb
        END AS tags
   FROM techniques
  WHERE (status = 'published'::text);

create or replace view public.public_theories with (security_barrier=true) as
with catalog_access as materialized (select public.can_read_complete_content() as allowed)
 SELECT t.id,
    t.title,
        CASE
            WHEN ((t.access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN t.summary
            ELSE ''::text
        END AS summary,
    t.category_id,
    t.category_title,
    t.aliases,
    t.related_theory_ids,
        CASE
            WHEN ((t.access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN t.provenance
            ELSE NULL::jsonb
        END AS provenance,
    t.status,
    t.display_order,
    t.display_id,
    t.image_path,
    t.access_tier,
    t.subcategory_id,
    s.title AS subcategory_title,
    t.taxonomy_order,
    COALESCE(t.canonical_id, t.id) AS canonical_id,
    t.legacy_ids,
    t.knowledge_type,
        CASE
            WHEN ((t.access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN t.quotation
            ELSE NULL::jsonb
        END AS quotation,
    NULLIF(btrim((t.quotation ->> 'author'::text)), ''::text) AS quotation_author,
    t.updated_at
   FROM (theories t
     LEFT JOIN theory_subcategories s ON ((s.id = t.subcategory_id)))
  WHERE (t.status = 'published'::text)
UNION ALL
 SELECT a.id,
    t.title,
        CASE
            WHEN ((t.access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN t.summary
            ELSE ''::text
        END AS summary,
    t.category_id,
    t.category_title,
    t.aliases,
    t.related_theory_ids,
        CASE
            WHEN ((t.access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN t.provenance
            ELSE NULL::jsonb
        END AS provenance,
    'published'::text AS status,
    t.display_order,
    t.display_id,
    t.image_path,
    t.access_tier,
    t.subcategory_id,
    s.title AS subcategory_title,
    t.taxonomy_order,
    t.id AS canonical_id,
    t.legacy_ids,
    t.knowledge_type,
        CASE
            WHEN ((t.access_tier = 'free'::text) OR (select allowed from catalog_access)) THEN t.quotation
            ELSE NULL::jsonb
        END AS quotation,
    NULLIF(btrim((t.quotation ->> 'author'::text)), ''::text) AS quotation_author,
    t.updated_at
   FROM ((theories a
     JOIN theories t ON (((t.id = a.canonical_id) AND (t.id <> a.id))))
     LEFT JOIN theory_subcategories s ON ((s.id = t.subcategory_id)))
  WHERE (t.status = 'published'::text);

-- No shared role/entitlement caches: the answer is evaluated for each SQL statement.
create or replace function public.can_read_complete_content() returns boolean
language sql stable security definer set search_path = '' as $$
 select case when (select auth.uid()) is null then false
 else public.is_owner() or coalesce(public.has_complete_edition((select auth.uid())),false) end;
$$;

-- Only the existing owner APIs lose anonymous execution; authenticated owner guards remain.
do $hardening$ declare item record; begin
 for item in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef and p.proname = any(array['rename_technique','reorder_technique_drafts','restore_technique_revision','publish_technique','save_and_publish_technique','create_technique','create_persona','archive_persona','set_theory_techniques','save_technique_draft','move_technique_order','move_persona_order','save_persona','set_persona_techniques','archive_technique','save_theory_draft','create_theory_draft','save_content_category','delete_content_category','reorder_theory_drafts','reorder_content','move_theory_display_id','archive_theory','publish_popular_ranking','publish_theory','place_theory_in_subcategory','reorder_subcategory_theories','save_theory_subcategory','delete_theory_subcategory','set_theory_relations']) loop
 execute format('revoke execute on function %s from public, anon',item.signature);
 execute format('grant execute on function %s to authenticated, service_role',item.signature);
 end loop;
 for item in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prorettype='trigger'::regtype loop
 execute format('revoke execute on function %s from public, anon, authenticated',item.signature);
 end loop;
end $hardening$;

-- Optional backups are private to the signed-in user. Nothing is uploaded automatically.
create table public.personal_backups (
 user_id uuid primary key references auth.users(id) on delete cascade,
 schema_version integer not null default 1 check (schema_version=1),
 data jsonb not null check (jsonb_typeof(data)='object' and octet_length(data::text)<=5242880),
 updated_at timestamptz not null default now()
);
alter table public.personal_backups enable row level security;
revoke all on public.personal_backups from anon, authenticated;
grant select, delete on public.personal_backups to authenticated;
grant insert(user_id,schema_version,data) on public.personal_backups to authenticated;
grant update(schema_version,data) on public.personal_backups to authenticated;
grant all on public.personal_backups to service_role;
create policy personal_backup_read on public.personal_backups for select to authenticated using ((select auth.uid())=user_id);
create policy personal_backup_insert on public.personal_backups for insert to authenticated with check ((select auth.uid())=user_id);
create policy personal_backup_update on public.personal_backups for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy personal_backup_delete on public.personal_backups for delete to authenticated using ((select auth.uid())=user_id);
create function public.stamp_personal_backup() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end;
$$;
revoke execute on function public.stamp_personal_backup() from public, anon, authenticated;
create trigger personal_backup_timestamp before update on public.personal_backups for each row execute function public.stamp_personal_backup();
comment on table public.personal_backups is 'User-initiated personal record backup; no paid bodies, sessions or authentication secrets.';
comment on view public.public_techniques is 'Intentional security-barrier projection: public titles, authenticated redaction; permission evaluated once per statement.';
comment on view public.public_theories is 'Intentional security-barrier projection including legacy aliases; permission evaluated once per statement.';

