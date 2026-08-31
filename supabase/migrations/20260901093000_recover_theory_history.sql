-- Preserve related-theory links in old drafts/revisions that predate the
-- owner editor field name, and recover empty current values where possible.
update public.technique_revisions r
set snapshot = jsonb_set(
  r.snapshot - 'relatedTheoryIds',
  '{theory_ids}',
  coalesce(r.snapshot->'theory_ids', r.snapshot->'relatedTheoryIds', t.theory_ids),
  true
)
from public.techniques t
where t.id = r.technique_id
  and (not (r.snapshot ? 'theory_ids') or jsonb_typeof(r.snapshot->'theory_ids') <> 'array' or (jsonb_typeof(r.snapshot->'theory_ids') = 'array' and jsonb_array_length(r.snapshot->'theory_ids') = 0))
  and (r.snapshot ? 'relatedTheoryIds' or jsonb_array_length(t.theory_ids) > 0);

update public.technique_drafts d
set snapshot = jsonb_set(
  d.snapshot - 'relatedTheoryIds',
  '{theory_ids}',
  coalesce(d.snapshot->'theory_ids', d.snapshot->'relatedTheoryIds', t.theory_ids),
  true
)
from public.techniques t
where t.id = d.technique_id
  and (not (d.snapshot ? 'theory_ids') or jsonb_typeof(d.snapshot->'theory_ids') <> 'array' or (jsonb_typeof(d.snapshot->'theory_ids') = 'array' and jsonb_array_length(d.snapshot->'theory_ids') = 0))
  and (d.snapshot ? 'relatedTheoryIds' or jsonb_array_length(t.theory_ids) > 0);

update public.techniques t
set theory_ids = (
  select r.snapshot->'theory_ids'
  from public.technique_revisions r
  where r.technique_id = t.id
    and jsonb_typeof(r.snapshot->'theory_ids') = 'array'
    and jsonb_array_length(r.snapshot->'theory_ids') > 0
  order by r.version desc, r.created_at desc
  limit 1
)
where jsonb_array_length(t.theory_ids) = 0
  and exists (
    select 1 from public.technique_revisions r
    where r.technique_id = t.id
      and jsonb_typeof(r.snapshot->'theory_ids') = 'array'
      and jsonb_array_length(r.snapshot->'theory_ids') > 0
  );
