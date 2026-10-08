begin;
lock table public.theories,public.theory_subcategories in share row exclusive mode;
select pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
do $renumber$
declare paid_hash text;
begin
 if (select count(*) from public.theories where status='published')<>794
 or (select md5(string_agg(id||':'||title||':'||summary||':'||category_id,'|' order by id)) from public.theories where status='published')<>'186d7298d9cf5729a531fc7ebf507132'
 or (select md5(string_agg(id||':'||subcategory_id||':'||taxonomy_order::text||':'||coalesce(display_id::text,'null'),'|' order by id)) from public.theories where status='published')<>'e3095e559f9523b89f8f76000a34873a'
 or exists(select 1 from public.theories t left join public.theory_subcategories s on s.id=t.subcategory_id where t.status='published' and (s.id is null or s.category_id<>t.category_id))
 then raise exception 'Content, classification or prior display IDs changed; review before renumbering.'; end if;
 select md5(string_agg(content_id||':'||(payload-'displayId'-'displayOrder')::text,'|' order by content_id)) into paid_hash from public.paid_content where content_type='theory';
 insert into public.theory_taxonomy_backups
 select 'theory-display-id-order-20261008','theories',id,to_jsonb(t) from public.theories t;
 -- Avoid transient collisions in the category-local unique index.
 update public.theories set display_id=-display_id where status='published';
 with numbering as (
 select t.id,row_number() over(partition by t.category_id order by s.display_order,t.taxonomy_order,t.id)::integer as display_id
 from public.theories t join public.theory_subcategories s on s.id=t.subcategory_id and s.category_id=t.category_id
 where t.status='published'
 )
 update public.theories t set display_id=n.display_id,updated_at=now() from numbering n where t.id=n.id;
 if exists(
 select 1 from public.theories t join public.theory_taxonomy_backups b
 on b.migration_key='theory-display-id-order-20261008' and b.source_table='theories' and b.source_id=t.id
 where (to_jsonb(t)-'display_id'-'display_order'-'updated_at')<>(b.snapshot-'display_id'-'display_order'-'updated_at'))
 or (select count(*) from public.theories)<>(select count(*) from public.theory_taxonomy_backups where migration_key='theory-display-id-order-20261008' and source_table='theories')
 or exists(
 select 1 from (select t.display_id,row_number() over(partition by t.category_id order by s.display_order,t.taxonomy_order,t.id) as expected
 from public.theories t join public.theory_subcategories s on s.id=t.subcategory_id where t.status='published') n where n.display_id<>n.expected)
 or (select md5(string_agg(content_id||':'||(payload-'displayId'-'displayOrder')::text,'|' order by content_id)) from public.paid_content where content_type='theory') is distinct from paid_hash
 or exists(
 select 1 from public.theories t left join public.paid_content p on p.content_type='theory' and p.content_id=t.id
 join public.theories canonical on canonical.id=coalesce(t.canonical_id,t.id)
 where canonical.status='published' and canonical.access_tier='complete'
 and (p.content_id is null or (p.payload->>'displayId')::integer is distinct from canonical.display_id
 or (p.payload->>'displayOrder')::integer is distinct from canonical.display_order))
 then raise exception 'Display-ID renumbering verification failed.'; end if;
end $renumber$;
commit;
