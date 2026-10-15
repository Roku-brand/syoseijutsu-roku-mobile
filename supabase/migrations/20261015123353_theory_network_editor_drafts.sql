-- Keep relation edits private until the existing publish action succeeds.
alter table public.theories add column draft_relations jsonb check(draft_relations is null or jsonb_typeof(draft_relations)='array');
create table public.theory_quote_reviews(
 candidate_id text primary key check(candidate_id ~ '^[0-9]{2}$' and candidate_id::integer between 1 and 50),
 audit jsonb not null check(jsonb_typeof(audit)='object'),
 theory_id text references public.theories(id), updated_at timestamptz not null default now()
);
alter table public.theory_quote_reviews enable row level security;
revoke all on public.theory_quote_reviews from public,anon,authenticated;
grant select,insert,update,delete on public.theory_quote_reviews to authenticated;
grant all on public.theory_quote_reviews to service_role;
create policy theory_quote_review_owner on public.theory_quote_reviews for all to authenticated using((select public.is_owner())) with check((select public.is_owner()));

CREATE OR REPLACE FUNCTION public.publish_theory(target_theory_id text, payload jsonb)
 RETURNS theories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result public.theories;
begin

  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if payload ? 'expected_updated_at' and exists(select 1 from public.theories where id=target_theory_id and updated_at is distinct from (payload->>'expected_updated_at')::timestamptz) then raise exception '他の編集が保存されました。再読込して差分を確認してください。' using errcode='40001';end if;
  if exists(select 1 from public.theories where id=target_theory_id and canonical_id<>id) then raise exception '統合済みIDは編集できません。'; end if;
  if not exists(select 1 from public.theory_subcategories where id=payload->>'subcategory_id' and category_id=payload->>'category_id') then raise exception '大分類に属する内部分類を選択してください。' using errcode='23503'; end if;
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if nullif(trim(payload->>'title'),'') is null or nullif(trim(payload->>'summary'),'') is null then
    raise exception 'タイトルと概要を入力してください。' using errcode='22023'; end if;
  if not exists(select 1 from public.content_categories where kind='theory' and id=payload->>'category_id') then
    raise exception '理論カテゴリを選択してください。' using errcode='23503'; end if;
  -- Keep the old category until the sequence helper has captured its source
  -- list; it applies the new category atomically with the publish transition.
  update public.theories set draft_relations=null, knowledge_type=case when payload ? 'knowledge_type' then payload->>'knowledge_type' else knowledge_type end,
    quotation=case when payload ? 'quotation' then nullif(payload->'quotation','null'::jsonb) else quotation end,
    title=trim(payload->>'title'),summary=trim(payload->>'summary'),
    aliases=coalesce(payload->'aliases','[]'::jsonb),related_theory_ids=coalesce(payload->'related_theory_ids','[]'::jsonb),
    provenance=case when payload ? 'provenance' then nullif(payload->'provenance','null'::jsonb) else provenance end,
    image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
    access_tier=coalesce(payload->>'access_tier',access_tier),draft_technique_ids='[]'::jsonb,
    updated_at=now(),updated_by=auth.uid()
  where id=target_theory_id returning * into result;
  if not found then raise exception 'theory_not_found' using errcode='P0002'; end if;
  perform public.move_theory_display_id(target_theory_id,
    coalesce((payload->>'display_id')::integer,(payload->>'draft_display_id')::integer,(payload->>'display_order')::integer),
    'published',payload->>'category_id');
  select * into result from public.theories where id=target_theory_id;
  if payload ? 'related_technique_ids' then
    perform public.set_theory_techniques(result.id,array(select jsonb_array_elements_text(payload->'related_technique_ids')));
  end if;
  perform public.place_theory_in_subcategory(target_theory_id,payload->>'subcategory_id',(payload->>'taxonomy_order')::integer);
  select * into result from public.theories where id=target_theory_id;
  if payload ? 'relations' then perform public.set_theory_relations(target_theory_id,payload->'relations');end if;
  select * into result from public.theories where id=target_theory_id;
  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_theory_draft(target_theory_id text, payload jsonb)
 RETURNS theories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result public.theories;
begin

  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if payload ? 'expected_updated_at' and exists(select 1 from public.theories where id=target_theory_id and updated_at is distinct from (payload->>'expected_updated_at')::timestamptz) then raise exception '他の編集が保存されました。再読込して差分を確認してください。' using errcode='40001';end if;
  if exists(select 1 from public.theories where id=target_theory_id and canonical_id<>id) then raise exception '統合済みIDは編集できません。'; end if;
  if not exists(select 1 from public.theory_subcategories where id=payload->>'subcategory_id' and category_id=payload->>'category_id') then raise exception '大分類に属する内部分類を選択してください。' using errcode='23503'; end if;
  perform public.move_theory_display_id(target_theory_id,coalesce((payload->>'display_id')::integer,(payload->>'draft_display_id')::integer,(payload->>'display_order')::integer),'draft',payload->>'category_id');
  update public.theories set draft_relations=case when payload ? 'relations' then payload->'relations' else draft_relations end, knowledge_type=case when payload ? 'knowledge_type' then payload->>'knowledge_type' else knowledge_type end,
    quotation=case when payload ? 'quotation' then nullif(payload->'quotation','null'::jsonb) else quotation end,
    title=coalesce(payload->>'title',''),summary=coalesce(payload->>'summary',''),
    category_title=(select title from public.content_categories where kind='theory' and id=category_id),
    aliases=coalesce(payload->'aliases','[]'::jsonb),related_theory_ids=coalesce(payload->'related_theory_ids','[]'::jsonb),
    provenance=nullif(payload->'provenance','null'::jsonb),image_path=case when payload ? 'image_path' then payload->>'image_path' else image_path end,
    access_tier=coalesce(payload->>'access_tier',access_tier),draft_technique_ids=coalesce(payload->'draft_technique_ids','[]'::jsonb),
    updated_at=now(),updated_by=auth.uid()
  where id=target_theory_id returning * into result;
  perform public.place_theory_in_subcategory(target_theory_id,payload->>'subcategory_id',(payload->>'taxonomy_order')::integer);
  select * into result from public.theories where id=target_theory_id;
  return result;
end;
$function$;
