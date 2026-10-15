-- A work interpretation is not a verbatim quotation; keep it in the existing thought section.
select pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));
lock table public.theories in share row exclusive mode;
do $check$ begin
 if (select count(*) from public.theories where id in ('kb_701','kb_702') and status='published' and subcategory_id='classics-thought-f' and quotation is null)<>2 then raise exception 'Literary interpretation cards changed; review before moving.';end if;
end $check$;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'literary-commentary-20261016','theories',id,to_jsonb(t) from public.theories t where category_id='classics-thought' on conflict do nothing;
with ordered as(select id,(select coalesce(max(taxonomy_order),0) from public.theories where status='published' and subcategory_id='classics-thought-e')+row_number() over(order by id) as n from public.theories where id in ('kb_701','kb_702'))
update public.theories t set subcategory_id='classics-thought-e',taxonomy_order=o.n,knowledge_type='thought',updated_at=now() from ordered o where t.id=o.id;
with ordered as(select id,row_number() over(order by taxonomy_order,id)::integer as n from public.theories where status='published' and subcategory_id='classics-thought-f') update public.theories t set taxonomy_order=o.n,updated_at=now() from ordered o where t.id=o.id;
do $verify$ begin
 if exists(select 1 from public.theories where status='published' and subcategory_id='classics-thought-f' and quotation is null) then raise exception 'Unquoted commentary in aphorism section.';end if;
end $verify$;
