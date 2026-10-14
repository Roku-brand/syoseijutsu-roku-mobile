begin;
select set_config('request.jwt.claim.sub',coalesce((select user_id::text from public.user_roles where role='owner' limit 1),(select user_id::text from public.profiles where role='owner' limit 1)),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('request.jwt.claim.sub'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare target public.feature_articles; linked public.feature_articles; unrelated jsonb; saved jsonb; draft_saved jsonb; p jsonb;
begin
 select to_jsonb(f) into unrelated from public.feature_articles f where id='five-guidelines';
 p:=jsonb_build_object('slug','deletion-target','title','削除の検証','body','検証本文','image_path','bundled:feature-coast','related_technique_ids','[]'::jsonb,'related_theory_ids','[]'::jsonb);
 saved:=public.save_feature_article_draft(null,p,null,null);
 perform public.publish_feature_article(saved->>'id',(saved->>'revision')::integer);
 select * into target from public.feature_articles where id=saved->>'id';
 draft_saved:=public.save_feature_article_draft(target.id,p,target.updated_at,null);
 p:=p||jsonb_build_object('slug','deletion-linked','title','残す記事','body','変更しない本文','related_feature_ids',jsonb_build_array(target.id,'five-guidelines'));
 saved:=public.save_feature_article_draft(null,p,null,null);
 perform public.publish_feature_article(saved->>'id',(saved->>'revision')::integer);
 select * into linked from public.feature_articles where id=saved->>'id';
 saved:=public.save_feature_article_draft(linked.id,p,linked.updated_at,null);
 begin perform public.delete_feature_article(target.id,target.updated_at,null); raise exception 'stale draft delete accepted'; exception when serialization_failure then null; end;
 begin perform public.delete_feature_article(target.id,target.updated_at-interval '1 second',(draft_saved->>'revision')::integer); raise exception 'stale article delete accepted'; exception when serialization_failure then null; end;
 perform public.delete_feature_article(target.id,target.updated_at,(draft_saved->>'revision')::integer);
 if exists(select 1 from public.feature_articles where id=target.id) or exists(select 1 from public.feature_article_drafts where article_id=target.id) then raise exception 'target or draft survived'; end if;
 if not exists(select 1 from public.feature_articles where id=linked.id and body='変更しない本文' and related_feature_ids=array['five-guidelines']) then raise exception 'linked content lost'; end if;
 if unrelated is distinct from (select to_jsonb(f) from public.feature_articles f where id='five-guidelines') then raise exception 'unrelated article changed'; end if;
 if not exists(select 1 from public.feature_article_drafts where article_id=linked.id and payload->>'body'='変更しない本文' and payload->'related_feature_ids'='["five-guidelines"]'::jsonb and revision>(saved->>'revision')::integer) then raise exception 'draft links not cleaned'; end if;
 perform public.publish_feature_article(linked.id,(select revision from public.feature_article_drafts where article_id=linked.id));
 select * into linked from public.feature_articles where id=linked.id;
 perform public.archive_feature_article(linked.id,linked.updated_at);
 select * into linked from public.feature_articles where id=linked.id;
 perform public.delete_feature_article(linked.id,linked.updated_at,null);
 saved:=public.save_feature_article_draft(null,p||jsonb_build_object('related_feature_ids','[]'::jsonb),null,null);
 select * into target from public.feature_articles where id=saved->>'id';
 perform public.delete_feature_article(target.id,target.updated_at,(saved->>'revision')::integer);
end $$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated"}',true);
set local role authenticated;
do $$ begin
 begin perform public.delete_feature_article('five-guidelines',null,null); raise exception 'nonowner deleted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.delete_feature_article(text,timestamptz,integer)','execute') then raise exception 'anonymous delete permitted'; end if;
end $$;
rollback;
select 'Published, archived and draft deletion; confirmation versions; link cleanup; content preservation; owner permissions passed' as result;
