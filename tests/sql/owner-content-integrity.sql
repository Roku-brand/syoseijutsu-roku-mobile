-- Run after the migration in one transaction; every fixture is rolled back.
do $test$
declare
 owner_id uuid; persona_name text := '編集検証-'||gen_random_uuid()::text;
 card public.techniques; theory public.theories; theory_id text := 'editor-test-'||gen_random_uuid()::text;
 snapshot jsonb;
begin
 select user_id into owner_id from public.user_roles where role='owner' limit 1;
 if owner_id is null then select user_id into owner_id from public.profiles where role='owner' limit 1; end if;
 if owner_id is null then raise exception 'owner_fixture_required'; end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.create_persona(persona_name,'work');
 select * into card from public.create_technique(persona_name);
 if card.category <> 'work' or card.status <> 'draft' then raise exception 'persona_creation_failed'; end if;
 update public.techniques set category='life' where id=card.id returning * into card;
 if card.category <> 'work' then raise exception 'category_override_failed'; end if;
 begin
   perform public.archive_persona(persona_name);
   raise exception 'nonempty_persona_was_archived';
 exception when foreign_key_violation then null; end;
 begin
   perform public.publish_theory(theory_id,'{"title":"検証","summary":"","category_id":"psychology"}');
   raise exception 'empty_theory_was_published';
 exception when invalid_parameter_value then null; end;
 select * into theory from public.publish_theory(theory_id,'{"title":"検証","summary":"公開必須概要","category_id":"strategy","category_title":"wrong","provenance":{"status":"一部確認","attribution":"検証著者","sources":[{"title":"参考","url":"https://example.com"}]}}');
 if theory.category_title <> '戦略論' or theory.provenance->>'attribution' <> '検証著者' then raise exception 'theory_roundtrip_failed'; end if;
 snapshot := to_jsonb(card)||jsonb_build_object('title','検証処世術','category','life','theory_ids',jsonb_build_array(theory_id),'primary_theory_ids',jsonb_build_array(theory_id));
 select * into card from public.save_and_publish_technique(card.id,snapshot,card.updated_at);
 if card.category <> 'work' or card.status <> 'published' then raise exception 'publish_derived_category_failed'; end if;
 begin
   perform public.archive_theory(theory_id);
   raise exception 'linked_theory_was_archived';
 exception when foreign_key_violation then null; end;
 perform public.archive_technique(card.id);
 perform public.archive_persona(persona_name);
 perform public.archive_theory(theory_id);
 begin
   perform public.create_technique(persona_name);
   raise exception 'archived_persona_was_used';
 exception when foreign_key_violation then null; end;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin
   perform public.create_persona('unauthorized-test','life');
   raise exception 'nonowner_write_allowed';
 exception when insufficient_privilege then null; end;
end $test$;
select 'PASS: persona lifecycle, derived category, theory required fields and provenance, reference protection, owner authorization' as result;
