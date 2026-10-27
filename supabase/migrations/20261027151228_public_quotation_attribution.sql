-- Public cover attribution requested for aphorism cards.
-- Preserve all existing body, quotation, provenance and entitlement conditions.
create or replace view public.public_theories with (security_barrier=true) as
 SELECT t.id,
    t.title,
        CASE
            WHEN t.access_tier = 'free'::text OR can_read_complete_content() THEN t.summary
            ELSE ''::text
        END AS summary,
    t.category_id,
    t.category_title,
    t.aliases,
    t.related_theory_ids,
        CASE
            WHEN t.access_tier = 'free'::text OR can_read_complete_content() THEN t.provenance
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
            WHEN t.access_tier = 'free'::text OR can_read_complete_content() THEN t.quotation
            ELSE NULL::jsonb
        END AS quotation,
    nullif(btrim(t.quotation ->> 'author'), '') AS quotation_author
   FROM theories t
     LEFT JOIN theory_subcategories s ON s.id = t.subcategory_id
  WHERE t.status = 'published'::text
UNION ALL
 SELECT a.id,
    t.title,
        CASE
            WHEN t.access_tier = 'free'::text OR can_read_complete_content() THEN t.summary
            ELSE ''::text
        END AS summary,
    t.category_id,
    t.category_title,
    t.aliases,
    t.related_theory_ids,
        CASE
            WHEN t.access_tier = 'free'::text OR can_read_complete_content() THEN t.provenance
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
            WHEN t.access_tier = 'free'::text OR can_read_complete_content() THEN t.quotation
            ELSE NULL::jsonb
        END AS quotation,
    nullif(btrim(t.quotation ->> 'author'), '') AS quotation_author
   FROM theories a
     JOIN theories t ON t.id = a.canonical_id AND t.id <> a.id
     LEFT JOIN theory_subcategories s ON s.id = t.subcategory_id
  WHERE t.status = 'published'::text;

comment on column public.public_theories.quotation_author is 'Public cover attribution only; full quotation metadata remains access controlled.';
notify pgrst, 'reload schema';
