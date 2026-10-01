-- Run after the replacement inside a transaction that is rolled back.
-- Uses the same owner RPCs as CMS; never creates or changes user accounts.
do $cms_test$
declare owner_id uuid; item public.theories; draft public.theories; ids text[]; payload jsonb;
begin
 select user_id into owner_id from public.user_roles where role='owner' limit 1;
 if owner_id is null then select user_id into owner_id from public.profiles where role='owner' limit 1; end if;
 if owner_id is null then raise exception 'CMS verification requires an existing owner.'; end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 if not public.is_owner() then raise exception 'Owner identity was not recognized.'; end if;
 select array_agg(id order by display_id) into ids from public.theories where category_id='practical-wisdom' and status='published';
 if cardinality(ids)<>39 then raise exception 'CMS must list exactly 39 published originals.'; end if;
 -- Every original can be edited/published through the actual CMS contract.
 for item in select * from public.theories where id=any(ids) order by display_id loop
  payload:=jsonb_build_object('title',item.title,'summary',item.summary||' 編集検証。','category_id',item.category_id,'provenance',item.provenance,'display_id',item.display_id,'access_tier',item.access_tier);
  perform public.publish_theory(item.id,payload);
  if (select summary from public.theories where id=item.id)<>item.summary||' 編集検証。' then raise exception 'CMS edit failed.'; end if;
  perform public.publish_theory(item.id,payload||jsonb_build_object('summary',item.summary));
 end loop;
 perform public.reorder_content('theory','practical-wisdom',array(select v from unnest(ids) with ordinality x(v,ord) order by ord desc));
 if (select display_id from public.theories where id=ids[39])<>1 then raise exception 'CMS reorder failed.'; end if;
 perform public.reorder_content('theory','practical-wisdom',ids);
 -- Future content is assigned A-040, not blocked by a fixed 39-item audit.
 draft:=public.create_theory_draft('practical-wisdom');
 if draft.provenance->>'status'<>'オリジナル' then raise exception 'Original draft default missing.'; end if;
 payload:=jsonb_build_object('title','「明日には、明日の風がある。」','summary','新しい日に合わせて選び直す余地を持つ。','category_id','practical-wisdom','provenance',draft.provenance,'access_tier','complete');
 perform public.save_theory_draft(draft.id,payload);
 draft:=public.publish_theory(draft.id,payload||jsonb_build_object('display_id',40));
 if draft.display_id<>40 then raise exception 'Future A-040 assignment failed.'; end if;
 -- Related techniques can be set and removed without keeping a dead primary link.
 perform public.set_theory_techniques(draft.id,array['master336-329']);
 if not (select theory_ids ? draft.id from public.techniques where id='master336-329') then raise exception 'CMS relation assignment failed.'; end if;
 perform public.set_theory_techniques(draft.id,'{}'::text[]);
 -- Category moves and draft/public transitions normalize both source and destination.
 perform public.move_theory_display_id(draft.id,null,'published','psychology');
 perform public.move_theory_display_id(draft.id,40,'published','practical-wisdom');
 perform public.save_theory_draft(draft.id,payload);
 if (select count(*) from public.theories where category_id='practical-wisdom' and status='published')<>39 then raise exception 'Draft transition did not normalize published list.'; end if;
 perform public.publish_theory(draft.id,payload||jsonb_build_object('display_id',40));
 perform public.archive_theory(draft.id);
 if (select count(*) from public.theories where category_id='practical-wisdom' and status='published')<>39 then raise exception 'CMS deletion/archive failed.'; end if;
 delete from public.theories where id=draft.id;
 if exists(select 1 from public.theories t where t.category_id='practical-wisdom' and t.display_id<>array_position(ids,t.id)) then raise exception 'Dense IDs changed after CMS tests.'; end if;
 -- Invalid original provenance is rejected on publish.
 begin
  update public.theories set provenance=jsonb_build_object('status','書誌確認済み') where id=ids[1];
  raise exception 'Invalid original provenance was accepted.';
 exception when invalid_parameter_value then null;
 end;
 -- No new privilege is granted to a non-owner.
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 begin
  perform public.reorder_content('theory','practical-wisdom',ids);
  raise exception 'Non-owner reorder was accepted.';
 exception when insufficient_privilege then null;
 end;
end $cms_test$;
