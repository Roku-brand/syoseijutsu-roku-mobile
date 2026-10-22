begin;
select pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));
lock table public.theories in share row exclusive mode;
do $guard$ begin
if (select md5(string_agg(id||summary||coalesce(quotation->>'contextNote',''),'|' order by id)) from public.theories where status='published') is distinct from '14674a8c6d8e74856bf9219a64fc1817' then raise exception 'Later content edits; rollback stopped'; end if;
if (select count(*) from private.theory_reform_backups where phase='theory_depth_20261023')<>739 then raise exception 'Backup incomplete'; end if;
end $guard$;
update public.theories t set summary=b.snapshot->>'summary',quotation=b.snapshot->'quotation',updated_at=now() from private.theory_reform_backups b where b.phase='theory_depth_20261023' and b.source_id=t.id;
commit;
