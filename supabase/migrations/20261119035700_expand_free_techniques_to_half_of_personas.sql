-- Keep existing free personas first, then use the CMS display order to fill
-- half of each published category, rounding up. Individual free techniques
-- outside these personas keep their existing access tier.
with ranked_personas as (
  select name, category,
    row_number() over (
      partition by category
      order by (access_tier = 'free') desc, display_order, name
    ) as position,
    count(*) over (partition by category) as category_size
  from public.personas
  where status = 'published'
    and category in ('interpersonal', 'work', 'life')
),
free_personas as (
  select name, category
  from ranked_personas
  where position <= (category_size + 1) / 2
),
opened_personas as (
  update public.personas as persona
  set access_tier = 'free', updated_at = now()
  from free_personas as selected
  where persona.name = selected.name
    and persona.category = selected.category
    and persona.status = 'published'
    and persona.access_tier = 'complete'
)
update public.techniques as technique
set access_tier = 'free', updated_at = now()
from free_personas as selected
where technique.persona_id = selected.name
  and technique.category = selected.category
  and technique.status = 'published'
  and technique.access_tier = 'complete';
