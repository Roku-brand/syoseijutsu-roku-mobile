-- Run after the migration inside a transaction. No fixture writes survive.
begin;
set constraints all deferred;
do $check$ begin
 if (select count(*) from public.theories where status='published')<>754 then raise exception 'active count';end if;
 if (select count(*) from public.public_theories)<>759 then raise exception 'legacy view count';end if;
end $check$;
select set_config('request.jwt.claim.sub',(select user_id::text from (select user_id from public.user_roles where role='owner' union select user_id from public.profiles where role='owner') owners limit 1),true);
set local role authenticated;
do $owner$ declare ids text[];payload jsonb;denied boolean;created public.theories;begin
 if not public.is_owner() then raise exception 'Owner test context unavailable';end if;
 perform public.save_theory_subcategory('taxonomy-test','psychology','監査用分類',1);
 perform public.save_theory_subcategory('taxonomy-test','psychology','監査用改名',2);
 if not exists(select 1 from public.theory_subcategories where id='taxonomy-test' and title='監査用改名' and display_order=2) then raise exception 'subcategory edit';end if;
 perform public.delete_theory_subcategory('taxonomy-test');
 denied:=false;begin perform public.delete_theory_subcategory('psychology-c');exception when others then denied:=true;end;
 if not denied then raise exception 'populated deletion accepted';end if;
 select array_agg(id order by taxonomy_order desc) into ids from public.theories where subcategory_id='psychology-c' and status='published';
 perform public.reorder_subcategory_theories('psychology-c',ids);
 if (select taxonomy_order from public.theories where id=ids[1])<>1 then raise exception 'reorder';end if;
 denied:=false;begin perform public.reorder_subcategory_theories('psychology-c',array_replace(ids,ids[1],'invalid-id'));exception when others then denied:=true;end;
 if not denied then raise exception 'invalid ID accepted';end if;
 select jsonb_build_object('title',title,'summary',summary,'category_id',category_id,'subcategory_id',subcategory_id,'taxonomy_order',2,'display_id',display_id,'aliases',aliases,'related_theory_ids',related_theory_ids,'provenance',provenance,'access_tier',access_tier) into payload from public.theories where id='kb_001';
 perform public.publish_theory('kb_001',payload);
 if (select taxonomy_order from public.theories where id='kb_001')<>2 then raise exception 'publish order';end if;
 denied:=false;begin perform public.publish_theory('kb_001',payload-'subcategory_id');exception when foreign_key_violation then denied:=true;end;
 if not denied then raise exception 'missing subcategory accepted';end if;
 denied:=false;begin perform public.publish_theory('kb_001',payload||'{"subcategory_id":"strategy-g"}');exception when foreign_key_violation then denied:=true;end;
 if not denied then raise exception 'cross-major subcategory accepted';end if;
 created:=public.create_theory_draft('psychology');
 payload:=jsonb_build_object('title','監査用新規理論','summary','内部分類を持つ新規コンテンツ。','category_id','psychology','subcategory_id','psychology-c','taxonomy_order',3,'aliases','[]'::jsonb,'related_theory_ids','[]'::jsonb,'access_tier','complete');
 perform public.save_theory_draft(created.id,payload);
 if not exists(select 1 from public.theories where id=created.id and status='draft' and subcategory_id='psychology-c') then raise exception 'new draft taxonomy';end if;
 perform public.publish_theory(created.id,payload);
 if not exists(select 1 from public.theories where id=created.id and status='published' and subcategory_id='psychology-c') then raise exception 'new publication taxonomy';end if;
 perform public.publish_theory(created.id,payload||'{"category_id":"behavioral-science","subcategory_id":"behavioral-science-x"}');
 if not exists(select 1 from public.theories where id=created.id and category_id='behavioral-science' and subcategory_id='behavioral-science-x') then raise exception 'major move taxonomy';end if;
end $owner$;
reset role;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000999',true);
set local role anon;
do $guest$ declare denied boolean:=false;begin
 if exists(select 1 from public.public_theories where access_tier='complete' and (summary<>'' or provenance is not null)) then raise exception 'Paid text leaked';end if;
 if (select count(*) from public.public_theories where canonical_id=id and access_tier='free')<>151 then raise exception 'free identities changed';end if;
 begin perform public.save_theory_subcategory('unauthorized','psychology','不可',1);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'guest write allowed';end if;
end $guest$;
reset role;
rollback;
