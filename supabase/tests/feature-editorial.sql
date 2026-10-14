begin;
select set_config('request.jwt.claim.sub',coalesce((select user_id::text from public.user_roles where role='owner' limit 1),(select user_id::text from public.profiles where role='owner' limit 1)),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare guide jsonb; saved jsonb; payload jsonb; row public.feature_articles;
begin
 guide:=public.save_editorial_character(null,jsonb_build_object('name','検証案内人','role','編集案内人','bio','紹介','interests',jsonb_build_array('人間関係'),'image_path',null,'status','published','display_order',20),null);
 begin
  perform public.save_editorial_character(guide->>'id',guide,null); raise exception 'stale guide edit accepted';
 exception when serialization_failure then null; end;
 payload:=jsonb_build_object('slug','editorial-validation','title','検証用','lead','導入','body','本文は保持','category_id','relationships','image_path','bundled:feature-coast','image_alt','海','is_featured',false,'show_in_list',true,'display_order',100,'related_technique_ids','[]'::jsonb,'related_theory_ids','[]'::jsonb,'editorial_character_id',guide->>'id','related_feature_ids',jsonb_build_array('five-guidelines'),'source_references',jsonb_build_array(jsonb_build_object('title','確認した出典','url','https://example.org/source','note','対象年を記載可能')));
 saved:=public.save_feature_article_draft(null,payload,null,null);
 perform public.publish_feature_article(saved->>'id',(saved->>'revision')::integer);
 select * into row from public.feature_articles where id=saved->>'id';
 if row.editorial_character_id is distinct from guide->>'id' or row.related_feature_ids is distinct from array['five-guidelines'] or row.source_references is distinct from payload->'source_references' then raise exception 'metadata lost'; end if;
 -- Legacy clients and preexisting drafts retain new metadata.
 saved:=public.save_feature_article_draft(row.id,payload-'editorial_character_id'-'related_feature_ids'-'source_references',row.updated_at,null);
 update public.feature_article_drafts d set payload=d.payload-'editorial_character_id'-'related_feature_ids'-'source_references' where article_id=row.id;
 perform public.publish_feature_article(row.id,(saved->>'revision')::integer);
 select * into row from public.feature_articles where id=row.id;
 if row.editorial_character_id is distinct from guide->>'id' or jsonb_array_length(row.source_references)<>1 or cardinality(row.related_feature_ids)<>1 then raise exception 'legacy draft erased editorial metadata'; end if;
 begin
  perform public.save_feature_article_draft(row.id,payload||jsonb_build_object('source_references',jsonb_build_array(jsonb_build_object('title','危険URL','url','javascript:alert(1)'))),row.updated_at,null); raise exception 'unsafe source accepted';
 exception when invalid_parameter_value then null; end;
 begin
  perform public.save_feature_article_draft(row.id,payload||jsonb_build_object('related_feature_ids',jsonb_build_array(row.id)),row.updated_at,null); raise exception 'self link accepted';
 exception when invalid_parameter_value then null; end;
 guide:=public.save_editorial_character(guide->>'id',guide||jsonb_build_object('name','変更後','status','archived'),(guide->>'updated_at')::timestamptz);
 if not exists(select 1 from public.feature_articles where id=row.id and status='published' and body='本文は保持') then raise exception 'archive broke article'; end if;
 -- Deleting a character leaves both existing articles and old drafts publishable.
 saved:=public.save_feature_article_draft(row.id,payload,row.updated_at,null);
 delete from public.editorial_characters where id=guide->>'id';
 perform public.publish_feature_article(row.id,(saved->>'revision')::integer);
 if not exists(select 1 from public.feature_articles where id=row.id and editorial_character_id is null and status='published' and body='本文は保持') then raise exception 'deleted guide broke draft'; end if;
 perform public.save_editorial_character(null,jsonb_build_object('name','非公開の検証案内人','role','案内人','bio','非公開','interests','[]'::jsonb,'status','draft','display_order',20),null);
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ begin
 if exists(select 1 from public.editorial_characters where status<>'published') then raise exception 'private guide leaked'; end if;
 if has_function_privilege('anon','public.save_editorial_character(text,jsonb,timestamptz)','execute') then raise exception 'anonymous guide writes permitted'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin perform public.save_editorial_character(null,'{}'::jsonb,null); raise exception 'nonowner save permitted'; exception when insufficient_privilege then null; end;
 if exists(select 1 from public.editorial_characters where status<>'published') then raise exception 'nonowner read private guide'; end if;
end $$;
reset role;
rollback;
select 'Editorial metadata, legacy clients/drafts, source safety, optimistic locking, guide removal, RLS and article preservation passed' as result;
