-- Preserve hierarchy separately from position and resolve legacy ties once.
update public.content_categories set display_order=case id
 when 'psychology' then 1 when 'behavioral-science' then 2 when 'organization-management' then 3
 when 'strategy' then 4 when 'practical-wisdom' then 5 when 'classics-thought' then 6
 when 'maxims-experience' then 7 else display_order end
where kind='theory';
with ranked as (
 select id,row_number() over(partition by category order by display_order,name,id) as next_order
 from public.personas where status<>'archived'
)
update public.personas p set display_order=r.next_order from ranked r where p.id=r.id;
with ranked as (
 select id,row_number() over(partition by persona_id order by display_order,id) as next_order
 from public.techniques where status<>'archived'
)
update public.techniques t set display_order=r.next_order from ranked r where t.id=r.id;
with ranked as (
 select id,row_number() over(partition by category_id order by display_order,id) as next_order
 from public.theories where status<>'archived'
)
update public.theories t set display_order=r.next_order from ranked r where t.id=r.id;

