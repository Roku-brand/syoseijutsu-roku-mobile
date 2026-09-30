-- Run against a migrated Supabase database. All fixture and reorder operations
-- are inside one transaction and rolled back at the end.
begin;
set local statement_timeout = '90s';

do $test$
declare
  owner_id uuid;
  persona_name text;
  destination_persona text;
  original_technique_ids text[];
  actual_ids text[];
  expected_ids text[];
  first_persona_ids text[];
  category_ids text[];
  original_display_ids text[];
  display_ids text[];
  created_technique public.techniques;
  draft_one public.techniques;
  draft_two public.techniques;
  created_theory public.theories;
  existing_theory public.theories;
  draft_theory_one public.theories;
  draft_theory_two public.theories;
  saved_theory_draft public.theories;
  first_theory_category text;
  destination_theory_category text;
  original_technique_category_title text;
  original_theory_category_title text;
  total_count integer;
  min_order integer;
  max_order integer;
  unique_count integer;
begin
  select user_id into owner_id from public.user_roles where role='owner' limit 1;
  if owner_id is null then select user_id into owner_id from public.profiles where role='owner' limit 1; end if;
  if owner_id is null then raise exception 'owner_fixture_required'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);

  -- Techniques: direct position changes, insertion, archive compaction, and
  -- moving between personas must preserve dense per-persona positions.
  select p.name,array(select t.id from public.techniques t
    where t.persona_id=p.name and t.status='published' order by t.display_order limit 7)
    into persona_name,original_technique_ids
    from public.personas p where p.status='published'
      and (select count(*) from public.techniques t where t.persona_id=p.name and t.status='published')>=7
    order by p.category,p.display_order limit 1;
  if cardinality(original_technique_ids)<>7 then raise exception 'technique_fixture_requires_seven_rows'; end if;
  perform public.move_technique_order(original_technique_ids[1],persona_name,5,'published');
  expected_ids:=array[original_technique_ids[2],original_technique_ids[3],original_technique_ids[4],original_technique_ids[5],original_technique_ids[1],original_technique_ids[6],original_technique_ids[7]];
  select array(select id from public.techniques where persona_id=persona_name and status='published' order by display_order limit 7) into actual_ids;
  if actual_ids is distinct from expected_ids then raise exception 'technique_move_1_to_5_failed'; end if;
  perform public.move_technique_order(original_technique_ids[1],persona_name,1,'published');
  perform public.move_technique_order(original_technique_ids[3],persona_name,7,'published');
  perform public.move_technique_order(original_technique_ids[3],persona_name,3,'published');
  select array(select id from public.techniques where persona_id=persona_name and status='published' order by display_order limit 7) into actual_ids;
  if actual_ids is distinct from original_technique_ids then raise exception 'technique_move_5_to_1_or_3_to_7_failed'; end if;

  select name into destination_persona from public.personas
    where status='published' and name<>persona_name
      and (select count(*) from public.techniques t where t.persona_id=public.personas.name and t.status='published')>=2
    order by category,display_order limit 1;
  perform public.move_technique_order(original_technique_ids[2],destination_persona,2,'published');
  if not exists(select 1 from public.techniques where id=original_technique_ids[2] and persona_id=destination_persona and display_order=2) then
    raise exception 'technique_cross_persona_move_failed';
  end if;
  perform public.move_technique_order(original_technique_ids[2],persona_name,2,'published');
  select array(select id from public.techniques where persona_id=persona_name and status='published' order by display_order limit 7) into actual_ids;
  if actual_ids is distinct from original_technique_ids then raise exception 'technique_cross_persona_restore_failed'; end if;

  select * into created_technique from public.create_technique(persona_name);
  perform public.move_technique_order(created_technique.id,persona_name,3,'published');
  if not exists(select 1 from public.techniques where id=created_technique.id and status='published' and display_order=3) then
    raise exception 'technique_insert_at_three_failed';
  end if;
  perform public.archive_technique(created_technique.id);
  select count(*),min(display_order),max(display_order),count(distinct display_order)
    into total_count,min_order,max_order,unique_count from public.techniques where persona_id=persona_name and status='published';
  if min_order<>1 or max_order<>total_count or unique_count<>total_count then raise exception 'technique_archive_left_gap'; end if;

  -- Archived -> published must work even while a sibling draft is present.
  select * into draft_one from public.create_technique(persona_name);
  select * into draft_two from public.create_technique(persona_name);
  perform public.archive_technique(draft_one.id);
  perform public.move_technique_order(draft_one.id,persona_name,2,'published');
  if not exists(select 1 from public.techniques where id=draft_two.id and status='draft' and draft_display_order=1) then
    raise exception 'draft_order_changed_when_restoring_archived_technique';
  end if;
  perform public.archive_technique(draft_one.id);
  perform public.archive_technique(draft_two.id);

  -- Persona ordering is dense and category scoped.
  select array(select id from public.personas where category='interpersonal' and status<>'archived' order by display_order limit 5) into first_persona_ids;
  if cardinality(first_persona_ids)<5 then raise exception 'persona_fixture_requires_five_rows'; end if;
  perform public.move_persona_order(first_persona_ids[1],'interpersonal',4);
  select array(select id from public.personas where category='interpersonal' and status<>'archived' order by display_order limit 5) into actual_ids;
  if actual_ids is distinct from array[first_persona_ids[2],first_persona_ids[3],first_persona_ids[4],first_persona_ids[1],first_persona_ids[5]] then
    raise exception 'persona_move_failed';
  end if;
  perform public.move_persona_order(first_persona_ids[1],'interpersonal',1);

  -- Categories can be added, renamed, reordered, and safely deleted while
  -- their per-kind display positions remain dense.
  perform public.save_content_category('technique','cms-order-test-technique','CMS順序テスト');
  select array_agg(id order by display_order) into category_ids from public.content_categories where kind='technique';
  category_ids:=array[category_ids[2],category_ids[1]]||category_ids[3:cardinality(category_ids)];
  perform public.reorder_content('technique-category','',category_ids);
  perform public.save_content_category('technique','cms-order-test-technique','CMS順序テスト改名');
  perform public.delete_content_category('technique','cms-order-test-technique');
  select count(*),min(display_order),max(display_order),count(distinct display_order)
    into total_count,min_order,max_order,unique_count from public.content_categories where kind='technique';
  if min_order<>1 or max_order<>total_count or unique_count<>total_count then raise exception 'technique_category_order_invalid'; end if;

  perform public.save_content_category('theory','cms-order-test-theory','CMS理論順序テスト');
  select array_agg(id order by display_order) into category_ids from public.content_categories where kind='theory';
  category_ids:=array[category_ids[2],category_ids[1]]||category_ids[3:cardinality(category_ids)];
  perform public.reorder_content('theory-category','',category_ids);
  perform public.save_content_category('theory','cms-order-test-theory','CMS理論順序テスト改名');
  perform public.delete_content_category('theory','cms-order-test-theory');
  select count(*),min(display_order),max(display_order),count(distinct display_order)
    into total_count,min_order,max_order,unique_count from public.content_categories where kind='theory';
  if min_order<>1 or max_order<>total_count or unique_count<>total_count then raise exception 'theory_category_order_invalid'; end if;

  -- Category title edits propagate to the public/complete content projections.
  select title into original_technique_category_title from public.content_categories where kind='technique' and id='interpersonal';
  perform public.save_content_category('technique','interpersonal','CMSカテゴリ表示検証');
  if exists(select 1 from public.paid_content p join public.techniques t on t.id=p.content_id
      where p.content_type='technique' and t.category='interpersonal' and p.payload->>'categoryName'<>'CMSカテゴリ表示検証') then
    raise exception 'technique_category_label_projection_failed';
  end if;
  perform public.save_content_category('technique','interpersonal',original_technique_category_title);
  select title into original_theory_category_title from public.content_categories where kind='theory' and id='psychology';
  perform public.save_content_category('theory','psychology','CMS理論カテゴリ表示検証');
  if exists(select 1 from public.theories where category_id='psychology' and category_title<>'CMS理論カテゴリ表示検証') then
    raise exception 'theory_category_label_projection_failed';
  end if;
  perform public.save_content_category('theory','psychology',original_theory_category_title);

  -- Published theory order is dense within each category. Matching numbers
  -- across two categories are valid and the stable relation IDs do not change.
  select category_id into first_theory_category from public.theories
    where status='published' group by category_id having count(*)>=10 order by category_id limit 1;
  if first_theory_category is null then raise exception 'theory_fixture_requires_ten_rows'; end if;
  select array(select id from public.theories where status='published' and category_id=first_theory_category order by display_id limit 10) into original_display_ids;
  perform public.move_theory_display_id(original_display_ids[10],3,'published',first_theory_category);
  select array(select id from public.theories where status='published' and category_id=first_theory_category order by display_id limit 10) into display_ids;
  expected_ids:=array[original_display_ids[1],original_display_ids[2],original_display_ids[10],original_display_ids[3],original_display_ids[4],original_display_ids[5],original_display_ids[6],original_display_ids[7],original_display_ids[8],original_display_ids[9]];
  if display_ids is distinct from expected_ids then raise exception 'theory_category_move_10_to_3_failed'; end if;
  perform public.move_theory_display_id(original_display_ids[10],10,'published',first_theory_category);
  perform public.move_theory_display_id(original_display_ids[3],10,'published',first_theory_category);
  perform public.move_theory_display_id(original_display_ids[3],3,'published',first_theory_category);
  select array(select id from public.theories where status='published' and category_id=first_theory_category order by display_id limit 10) into display_ids;
  if display_ids is distinct from original_display_ids then raise exception 'theory_category_restore_failed'; end if;
  if not exists(select 1 from public.theories where category_id='psychology' and status='published' and display_id=1)
    or not exists(select 1 from public.theories where category_id='behavioral-science' and status='published' and display_id=1) then
    raise exception 'category_local_ids_cannot_repeat';
  end if;

  select * into created_theory from public.create_theory_draft('psychology');
  select * into saved_theory_draft from public.save_theory_draft(created_theory.id,
    jsonb_build_object('title','CMS順序テスト理論','summary','テスト用の概要です。','category_id','psychology','display_id',4,'aliases','[]'::jsonb,'related_theory_ids','[]'::jsonb));
  select * into created_theory from public.publish_theory(saved_theory_draft.id,
    jsonb_build_object('title','CMS順序テスト理論','summary','テスト用の概要です。','category_id','psychology','display_id',4,'aliases','[]'::jsonb,'related_theory_ids','[]'::jsonb));
  if created_theory.display_id<>4 then raise exception 'theory_insert_at_four_failed'; end if;
  perform public.archive_theory(created_theory.id);
  if not exists(select 1 from public.theories where id=created_theory.id and status='archived') then raise exception 'theory_delete_failed'; end if;
  select count(*),min(display_id),max(display_id),count(distinct display_id)
    into total_count,min_order,max_order,unique_count from public.theories where status='published' and category_id='psychology';
  if min_order<>1 or max_order<>total_count or unique_count<>total_count then raise exception 'theory_archive_left_category_gap'; end if;

  -- Draft positions are category-local; move a draft between categories,
  -- publish it, and archive it while the other category keeps rank one.
  select * into draft_theory_one from public.create_theory_draft('psychology');
  select * into draft_theory_two from public.create_theory_draft('behavioral-science');
  if draft_theory_one.draft_display_id<>1 or draft_theory_two.draft_display_id<>1 then raise exception 'draft_ids_not_category_local'; end if;
  select * into saved_theory_draft from public.save_theory_draft(draft_theory_one.id,
    jsonb_build_object('title','CMS下書き移動テスト','summary','カテゴリ別下書き順序のテストです。','category_id','behavioral-science','display_id',2,'aliases','[]'::jsonb,'related_theory_ids','[]'::jsonb));
  if saved_theory_draft.category_id<>'behavioral-science' or saved_theory_draft.draft_display_id<>2 then raise exception 'draft_cross_category_move_failed'; end if;
  if not exists(select 1 from public.theories where id=draft_theory_two.id and status='draft' and category_id='behavioral-science' and draft_display_id=1) then
    raise exception 'existing_destination_draft_order_changed';
  end if;
  select * into created_theory from public.publish_theory(saved_theory_draft.id,
    jsonb_build_object('title','CMS下書き移動テスト','summary','カテゴリ別下書き順序のテストです。','category_id','behavioral-science','display_id',4,'aliases','[]'::jsonb,'related_theory_ids','[]'::jsonb));
  if created_theory.status<>'published' or created_theory.category_id<>'behavioral-science' or created_theory.display_id<>4 then raise exception 'draft_category_publish_failed'; end if;
  perform public.archive_theory(created_theory.id);
  perform public.archive_theory(draft_theory_two.id);

  select * into existing_theory from public.theories where category_id='psychology' and status='published' order by display_id limit 1;
  select id into destination_theory_category from public.content_categories where kind='theory' and id='behavioral-science';
  perform public.publish_theory(existing_theory.id,jsonb_build_object(
    'title',existing_theory.title,'summary',existing_theory.summary,'category_id',destination_theory_category,
    'aliases',existing_theory.aliases,'related_theory_ids',existing_theory.related_theory_ids,
    'provenance',existing_theory.provenance,'display_id',existing_theory.display_id,
    'image_path',existing_theory.image_path,'access_tier',existing_theory.access_tier));
  if not exists(select 1 from public.theories where id=existing_theory.id and category_id=destination_theory_category and display_id=1) then
    raise exception 'theory_category_move_changed_internal_id_or_display_id';
  end if;
  select count(*),min(display_id),max(display_id),count(distinct display_id)
    into total_count,min_order,max_order,unique_count from public.theories where status='published' and category_id='psychology';
  if min_order<>1 or max_order<>total_count or unique_count<>total_count then raise exception 'theory_source_category_move_left_gap'; end if;
  perform public.publish_theory(existing_theory.id,jsonb_build_object(
    'title',existing_theory.title,'summary',existing_theory.summary,'category_id',existing_theory.category_id,
    'aliases',existing_theory.aliases,'related_theory_ids',existing_theory.related_theory_ids,
    'provenance',existing_theory.provenance,'display_id',existing_theory.display_id,
    'image_path',existing_theory.image_path,'access_tier',existing_theory.access_tier));
end
$test$;

rollback;
select 'PASS: technique/theory position changes, insert/delete compaction, category/persona ordering, dynamic category CRUD, public label sync, stable IDs and category moves' as result;
