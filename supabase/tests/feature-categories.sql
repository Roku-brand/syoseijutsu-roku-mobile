-- All category writes are rolled back; can also run against the linked project.
begin;
select set_config('request.jwt.claim.sub',coalesce((select user_id::text from public.user_roles where role='owner' limit 1),(select user_id::text from public.profiles where role='owner' limit 1)),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare saved jsonb; row public.feature_articles; payload jsonb; rev integer;
begin
 payload:=jsonb_build_object('slug','feature-category-validation','title','分類の検証','lead','導入','body','本文','category_id','relationships','image_path','bundled:feature-coast','image_alt','海','is_featured',false,'show_in_list',true,'display_order',100,'related_technique_ids','[]'::jsonb,'related_theory_ids','[]'::jsonb);
 saved:=public.save_feature_article_draft(null,payload,null,null);
 perform public.publish_feature_article(saved->>'id',(saved->>'revision')::integer);
 select * into row from public.feature_articles where id=saved->>'id';
 if row.category_id is distinct from 'relationships' then raise exception 'Category was not published'; end if;
 payload:=payload||jsonb_build_object('category_id','self-growth');
 saved:=public.save_feature_article_draft(row.id,payload,row.updated_at,null);
 if (select category_id from public.feature_articles where id=row.id) is distinct from 'relationships' then raise exception 'Draft category leaked to published article'; end if;
 perform public.publish_feature_article(row.id,(saved->>'revision')::integer);
 select * into row from public.feature_articles where id=row.id;
 if row.category_id is distinct from 'self-growth' then raise exception 'Edited category was not published'; end if;
 -- Older clients omit the new key; the current classification must survive.
 saved:=public.save_feature_article_draft(row.id,payload-'category_id',row.updated_at,null);
 if (select d.payload->>'category_id' from public.feature_article_drafts d where article_id=row.id) is distinct from 'self-growth' then raise exception 'Old client save erased category'; end if;
 -- Older drafts can also lack the key at publication time.
 update public.feature_article_drafts d set payload=d.payload-'category_id' where article_id=row.id;
 perform public.publish_feature_article(row.id,(saved->>'revision')::integer);
 select * into row from public.feature_articles where id=row.id;
 if row.category_id is distinct from 'self-growth' then raise exception 'Old draft publication erased category'; end if;
 begin
  perform public.save_feature_article_draft(row.id,payload||jsonb_build_object('category_id','all'),row.updated_at,null);
  raise exception 'Filter-only all was accepted as a saved category';
 exception when invalid_parameter_value then null; end;
 begin
  update public.feature_articles set category_id='unexpected' where id=row.id;
  raise exception 'Invalid stored category was accepted';
 exception when check_violation then null; end;
 saved:=public.save_feature_article_draft(row.id,payload||jsonb_build_object('category_id',null),row.updated_at,null);
 perform public.publish_feature_article(row.id,(saved->>'revision')::integer);
 if not exists(select 1 from public.feature_articles where id=row.id and status='published' and category_id is null and body='本文') then raise exception 'Unclassified article disappeared or lost content'; end if;
end $$;
reset role;
rollback;
select 'Category creation/editing/publication, draft isolation, legacy client/draft compatibility, invalid values and unset-category visibility passed' as result;
