-- Transactional CMS and RLS verification; no test article survives rollback.
begin;
select set_config('request.jwt.claim.sub',coalesce((select user_id::text from public.user_roles where role='owner' limit 1),(select user_id::text from public.profiles where role='owner' limit 1)),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare saved jsonb;
begin
 if not public.is_owner() then raise exception 'Owner fixture is required'; end if;
 saved:=public.save_feature_article_draft(null,jsonb_build_object('slug','feature-cms-validation','title','検証記事','lead','導入','body','## 見出し'||chr(10)||chr(10)||'本文','image_path','bundled:feature-coast','image_alt','海','is_featured',true,'show_in_list',true,'display_order',100,'related_technique_ids','[]'::jsonb,'related_theory_ids','[]'::jsonb),null,null);
 perform set_config('feature.test_id',saved->>'id',true);
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
 if exists(select 1 from public.feature_articles where id=current_setting('feature.test_id')) then raise exception 'Draft leaked to anonymous reader'; end if;
 begin perform 1 from public.feature_article_drafts; raise exception 'Anonymous draft select was allowed'; exception when insufficient_privilege then null; end;
 begin perform public.publish_feature_article(current_setting('feature.test_id'),1); raise exception 'Anonymous publish was allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',coalesce((select user_id::text from public.user_roles where role='owner' limit 1),(select user_id::text from public.profiles where role='owner' limit 1)),true);
set local role authenticated;
select public.publish_feature_article(current_setting('feature.test_id'),1);
do $$
declare row public.feature_articles; saved jsonb; payload jsonb;
begin
 select * into row from public.feature_articles where id=current_setting('feature.test_id');
 payload:=to_jsonb(row)-'id'-'status'-'updated_at'; payload:=payload||jsonb_build_object('title','未公開の変更');
 saved:=public.save_feature_article_draft(row.id,payload,row.updated_at,null);
 begin perform public.save_feature_article_draft(row.id,payload,row.updated_at,null); raise exception 'Stale editor overwrote draft'; exception when serialization_failure then null; end;
 begin perform public.publish_feature_article(row.id,999); raise exception 'Stale draft was published'; exception when serialization_failure then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
 if (select title from public.feature_articles where id=current_setting('feature.test_id')) is distinct from '検証記事' then raise exception 'Unpublished changes replaced public article'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true),set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 if public.is_owner() then raise exception 'Ordinary user unexpectedly has owner role'; end if;
 begin perform public.save_feature_article_draft(null,'{}',null,null); raise exception 'Ordinary user could create article'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.feature_article_drafts) then raise exception 'Draft leaked to ordinary user'; end if;
 begin insert into public.feature_articles(id,slug,title) values('forbidden','forbidden','不正'); raise exception 'Ordinary user could insert directly'; exception when insufficient_privilege then null; end;
 update public.feature_articles set title='不正' where id=current_setting('feature.test_id');
 delete from public.feature_articles where id=current_setting('feature.test_id');
 if (select title from public.feature_articles where id=current_setting('feature.test_id')) is distinct from '検証記事' then raise exception 'Ordinary user changed or deleted published article'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',coalesce((select user_id::text from public.user_roles where role='owner' limit 1),(select user_id::text from public.profiles where role='owner' limit 1)),true);
set local role authenticated;
do $$
declare row public.feature_articles; rev integer;
begin
 select revision into rev from public.feature_article_drafts where article_id=current_setting('feature.test_id');
 perform public.publish_feature_article(current_setting('feature.test_id'),rev);
 select * into row from public.feature_articles where id=current_setting('feature.test_id');
 if row.title<>'未公開の変更' or row.status<>'published' then raise exception 'Publish did not apply saved draft'; end if;
 perform public.archive_feature_article(row.id,row.updated_at);
 select * into row from public.feature_articles where id=current_setting('feature.test_id');
 if row.status<>'archived' or row.body='' then raise exception 'Archive did not preserve article body'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
 if exists(select 1 from public.feature_articles where id=current_setting('feature.test_id')) then raise exception 'Archived article remained public'; end if;
end $$;
reset role;
rollback;
select 'Feature CMS, draft isolation, conflicts, publication, archive and RLS checks passed' as result;
