-- Treat practical wisdom as a first-class theory category across owner tools,
-- filtering and public catalogue hydration.
update public.theories
set category_id = 'practical-wisdom', category_title = '実践知', updated_at = now()
where id in ('kb_330', 'kb_331', 'kb_338');

update public.theories
set category_title = case category_id
  when 'psychology' then '心理学'
  when 'behavioral-science' then '行動科学'
  when 'organization-management' then '組織・経営論'
  when 'strategy' then '戦略論'
  when 'practical-wisdom' then '実践知'
  when 'classics-thought' then '古典・思想'
  when 'maxims-experience' then '格言'
  else category_title
end;

alter table public.theories drop constraint if exists theories_category_id_check;
alter table public.theories add constraint theories_category_id_check check (
  category_id in (
    'psychology',
    'behavioral-science',
    'organization-management',
    'strategy',
    'practical-wisdom',
    'classics-thought',
    'maxims-experience'
  )
);
