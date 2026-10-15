-- Additive knowledge metadata and a bounded, entitlement-protected network.
-- Preserve canonical/display/legacy IDs, 6 categories and all 36 subcategories.
select pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'knowledge-network-20261015','theories',id,to_jsonb(t) from public.theories t on conflict do nothing;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'knowledge-network-20261015','function',p.proname,jsonb_build_object('definition',pg_get_functiondef(p.oid))
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
and p.proname in('validate_theory_content','publish_theory','save_theory_draft','sync_taxonomy_paid_theory') on conflict do nothing;
alter table public.theories add column knowledge_type text not null default 'unspecified'
 check(knowledge_type in('unspecified','theory','principle','phenomenon','model','method','heuristic','thought','aphorism'));
alter table public.theories add column quotation jsonb check(quotation is null or jsonb_typeof(quotation)='object');
create table public.theory_relations(
 source_id text not null references public.theories(id) on delete restrict,
 target_id text not null references public.theories(id) on delete restrict,
 relation_type text not null default 'related' check(relation_type in('contains','explains','applies','contrasts','complements','related')),
 review_status text not null default 'draft' check(review_status in('draft','confirmed','legacy')),
 rationale text not null default '', priority integer not null default 100 check(priority between 1 and 10000),
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id),
 primary key(source_id,target_id),check(source_id<>target_id),
 check(review_status<>'legacy' or relation_type='related'),
 check(relation_type not in('related','contrasts','complements') or source_id<target_id),
 check(review_status<>'confirmed' or length(trim(rationale))>0)
);
create unique index theory_relations_pair on public.theory_relations(least(source_id,target_id),greatest(source_id,target_id));
create index theory_relations_target on public.theory_relations(target_id,priority);
create index theory_relations_source on public.theory_relations(source_id,priority);
alter table public.theory_relations enable row level security;
revoke all on public.theory_relations from public,anon,authenticated;
grant select on public.theory_relations to anon,authenticated;
grant insert,update,delete on public.theory_relations to authenticated;
grant all on public.theory_relations to service_role;
create policy theory_relations_owner on public.theory_relations for all to authenticated
 using((select public.is_owner())) with check((select public.is_owner()));
create policy theory_relations_read on public.theory_relations for select to anon,authenticated using(
 review_status in('confirmed','legacy') and
 exists(select 1 from public.theories s where s.id=source_id and s.status='published') and
 exists(select 1 from public.theories t where t.id=target_id and t.status='published')
);
-- Theories RLS in the EXISTS predicates enforces the entitlement of BOTH endpoints.
-- Existing editorial arrays become general links only; no semantic type is inferred.
insert into public.theory_relations(source_id,target_id,relation_type,review_status,rationale)
select distinct least(t.id,r.id),greatest(t.id,r.id),'related','legacy','既存の関連理論。関係種別は未確認。'
from public.theories t cross join lateral jsonb_array_elements_text(t.related_theory_ids) a(id)
join public.theories r on r.id=a.id and r.status='published'
where t.status='published' and t.id<>r.id and coalesce(t.canonical_id,t.id)=t.id and coalesce(r.canonical_id,r.id)=r.id;

create function public.validate_quotation_metadata() returns trigger language plpgsql set search_path='' as $fn$
declare q jsonb; f text;
begin
 if new.status<>'published' or (new.knowledge_type<>'aphorism' and new.quotation is null) then return new;end if;
 q:=new.quotation;
 if q is null or q->>'verification' is distinct from 'verified' or q->>'rightsStatus' is distinct from 'cleared' then
 raise exception '原典と権利の確認が済むまで格言は公開できません。' using errcode='23514';end if;
 foreach f in array array['originalText','translationText','author','work','locator','rightsBasis'] loop
 if nullif(trim(q->>f),'') is null then raise exception '格言の監査記録が不足しています: %',f using errcode='23514';end if;end loop;
 if coalesce(q->>'authorDeathYear','') !~ '^-?[0-9]+$' or coalesce(q->>'publicationYear','') !~ '^[0-9]+$' then
 raise exception '死亡年・刊行年を確認してください。' using errcode='23514';end if;
 if (q->>'authorDeathYear')::integer>1950 or (q->>'publicationYear')::integer>1950 then
 raise exception '今回の格言の権利審査対象外です。' using errcode='23514';end if;
 if coalesce(q->>'translationKind','') not in('original_japanese','independent_translation','classical_transcription')
 or coalesce(q->>'checkedOn','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 or jsonb_typeof(q->'sourceUrls') is distinct from 'array' then raise exception '翻訳区分・確認日・資料が必要です。' using errcode='23514';end if;
 if jsonb_array_length(q->'sourceUrls')=0 or exists(select 1 from jsonb_array_elements_text(q->'sourceUrls') u where u !~ '^https://[^[:space:]]+$') then
 raise exception '原典の確認資料URLが必要です。' using errcode='23514';end if;
 if new.title is distinct from ('「'||(q->>'translationText')||'」') then raise exception '表示文と格言タイトルが一致していません。' using errcode='23514';end if;
 return new;
end $fn$;
create trigger quotation_publication_guard before insert or update on public.theories for each row execute function public.validate_quotation_metadata();

create function public.validate_knowledge_relation() returns trigger language plpgsql security definer set search_path='' as $fn$
declare swap_id text;
begin
 perform pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));
 if new.relation_type in('related','contrasts','complements') and new.source_id>new.target_id then
 swap_id:=new.source_id;new.source_id:=new.target_id;new.target_id:=swap_id;end if;
 if exists(select 1 from public.theories t where t.id in(new.source_id,new.target_id) and (t.status='archived' or coalesce(t.canonical_id,t.id)<>t.id)) then
 raise exception '公開終了・統合済みIDには接続できません。' using errcode='23514';end if;
 if new.review_status in('confirmed','legacy') and (select count(*) from public.theories where id in(new.source_id,new.target_id) and status='published')<>2 then
 raise exception '公開する関連には公開済みの知識が必要です。' using errcode='23514';end if;
 if new.relation_type='contains' and new.review_status='confirmed' and exists(
 with recursive descendants(id,path) as(
 select new.target_id,array[new.target_id]
 union all select r.target_id,d.path||r.target_id from public.theory_relations r join descendants d on r.source_id=d.id
 where r.relation_type='contains' and r.review_status='confirmed' and not r.target_id=any(d.path)
 and (tg_op='INSERT' or (r.source_id,r.target_id)<>(old.source_id,old.target_id))
 )select 1 from descendants where id=new.source_id) then raise exception '包含関係が循環しています。' using errcode='23514';end if;
 new.updated_at:=now();new.updated_by:=auth.uid();return new;
end $fn$;
create trigger knowledge_relation_guard before insert or update on public.theory_relations for each row execute function public.validate_knowledge_relation();

create function public.sync_knowledge_relation_arrays() returns trigger language plpgsql security definer set search_path='' as $fn$
declare s text;t text; active boolean;
begin
 if tg_op<>'INSERT' and old.review_status in('confirmed','legacy') then
 update public.theories set related_theory_ids=related_theory_ids-old.target_id where id=old.source_id;
 update public.theories set related_theory_ids=related_theory_ids-old.source_id where id=old.target_id;
 end if;
 if tg_op<>'DELETE' and new.review_status in('confirmed','legacy') then
 s:=new.source_id;t:=new.target_id;
 update public.theories set related_theory_ids=related_theory_ids||jsonb_build_array(t) where id=s and not related_theory_ids ? t;
 update public.theories set related_theory_ids=related_theory_ids||jsonb_build_array(s) where id=t and not related_theory_ids ? s;
 end if;
 return null;
end $fn$;
create trigger knowledge_relation_arrays after insert or update or delete on public.theory_relations for each row execute function public.sync_knowledge_relation_arrays();

create function public.sync_legacy_theory_relations() returns trigger language plpgsql security definer set search_path='' as $fn$
declare v text;
begin
 if pg_trigger_depth()>1 then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));
 if new.status<>'published' then
 delete from public.theory_relations where source_id=new.id or target_id=new.id;return new;end if;
 if tg_op='UPDATE' and new.related_theory_ids is not distinct from old.related_theory_ids then return new;end if;
 if tg_op='UPDATE' then
 for v in select jsonb_array_elements_text(old.related_theory_ids) except select jsonb_array_elements_text(new.related_theory_ids) loop
 delete from public.theory_relations where least(source_id,target_id)=least(new.id,v) and greatest(source_id,target_id)=greatest(new.id,v);end loop;end if;
 for v in select jsonb_array_elements_text(new.related_theory_ids) loop
 if exists(select 1 from public.theories where id=v and status='published') then
 insert into public.theory_relations(source_id,target_id,review_status,rationale) values(least(new.id,v),greatest(new.id,v),'legacy','既存の関連理論。関係種別は未確認。') on conflict do nothing;end if;end loop;
 return new;
end $fn$;
create trigger legacy_theory_relations_sync after insert or update of related_theory_ids,status on public.theories for each row execute function public.sync_legacy_theory_relations();

create function public.set_theory_relations(target_theory_id text, relations jsonb) returns void language plpgsql security definer set search_path='' as $fn$
declare r jsonb;s text;t text;kind text;desired text[]:=array[]::text[];key text;
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501';end if;
 if jsonb_typeof(relations) is distinct from 'array' or jsonb_array_length(relations)>100 then raise exception '関連知識は100件以内の配列にしてください。';end if;
 perform pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));
 for r in select value from jsonb_array_elements(relations) loop
 s:=r->>'sourceId';t:=r->>'targetId';kind:=coalesce(r->>'type','related');
 if s is null or t is null or (s<>target_theory_id and t<>target_theory_id) then raise exception '関係元・関係先が不正です。';end if;
 if kind in('related','contrasts','complements') and s>t then key:=s;s:=t;t:=key;end if;
 key:=least(s,t)||'|'||greatest(s,t);
 if key=any(desired) then raise exception '同じ知識との関係が重複しています。';end if;desired:=array_append(desired,key);
 delete from public.theory_relations where least(source_id,target_id)=least(s,t) and greatest(source_id,target_id)=greatest(s,t) and (source_id,target_id)<>(s,t);
 insert into public.theory_relations(source_id,target_id,relation_type,review_status,rationale,priority)
 values(s,t,kind,coalesce(r->>'reviewStatus','draft'),coalesce(r->>'rationale',''),coalesce((r->>'priority')::integer,100))
 on conflict(source_id,target_id) do update set relation_type=excluded.relation_type,review_status=excluded.review_status,rationale=excluded.rationale,priority=excluded.priority;
 end loop;
 delete from public.theory_relations where (source_id=target_theory_id or target_id=target_theory_id) and not (least(source_id,target_id)||'|'||greatest(source_id,target_id)=any(desired));
end $fn$;
revoke all on function public.validate_quotation_metadata(),public.validate_knowledge_relation(),public.sync_knowledge_relation_arrays(),public.sync_legacy_theory_relations(),public.set_theory_relations(text,jsonb) from public,anon,authenticated;
grant execute on function public.set_theory_relations(text,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.publish_theory(target_theory_id text, payload jsonb)
 RETURNS theories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result public.theories;
begin

  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if exists(select 1 from public.theories where id=target_theory_id and canonical_id<>id) then raise exception '統合済みIDは編集できません。'; end if;
  if not exists(select 1 from public.theory_subcategories where id=payload->>'subcategory_id' and category_id=payload->>'category_id') then raise exception '大分類に属する内部分類を選択してください。' using errcode='23503'; end if;
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if nullif(trim(payload->>'title'),'') is null or nullif(trim(payload->>'summary'),'') is null then
    raise exception 'タイトルと概要を入力してください。' using errcode='22023'; end if;
  if not exists(select 1 from public.content_categories where kind='theory' and id=payload->>'category_id') then
    raise exception '理論カテゴリを選択してください。' using errcode='23503'; end if;
  -- Keep the old category until the sequence helper has captured its source
  -- list; it applies the new category atomically with the publish transition.
  update public.theories set knowledge_type=case when payload ? 'knowledge_type' then payload->>'knowledge_type' else knowledge_type end,
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
$function$
;

CREATE OR REPLACE FUNCTION public.save_theory_draft(target_theory_id text, payload jsonb)
 RETURNS theories
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result public.theories;
begin

  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if exists(select 1 from public.theories where id=target_theory_id and canonical_id<>id) then raise exception '統合済みIDは編集できません。'; end if;
  if not exists(select 1 from public.theory_subcategories where id=payload->>'subcategory_id' and category_id=payload->>'category_id') then raise exception '大分類に属する内部分類を選択してください。' using errcode='23503'; end if;
  perform public.move_theory_display_id(target_theory_id,coalesce((payload->>'display_id')::integer,(payload->>'draft_display_id')::integer,(payload->>'display_order')::integer),'draft',payload->>'category_id');
  update public.theories set knowledge_type=case when payload ? 'knowledge_type' then payload->>'knowledge_type' else knowledge_type end,
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
$function$
;

CREATE OR REPLACE FUNCTION public.sync_taxonomy_paid_theory()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare t public.theories; data jsonb; alias_id text;
begin
 if tg_op='DELETE' then delete from public.paid_content where content_type='theory' and content_id=old.id;return old;end if;
 select * into t from public.theories where id=coalesce(new.canonical_id,new.id);
 if t.status<>'published' or t.access_tier<>'complete' then
  delete from public.paid_content where content_type='theory' and (content_id=new.id or content_id in(select id from public.theories where canonical_id=t.id));return new;
 end if;
 data:=jsonb_build_object('tagId',t.id,'canonicalId',t.id,'title',t.title,'summary',t.summary,
 'categoryId',t.category_id,'categoryTitle',t.category_title,'subcategoryId',t.subcategory_id,
 'subcategoryTitle',(select title from public.theory_subcategories where id=t.subcategory_id),'sortOrder',t.taxonomy_order,
 'aliases',t.aliases,'legacyIds',t.legacy_ids,'mergedFromIds',t.legacy_ids,'relatedTheoryIds',t.related_theory_ids,
 'knowledgeType',t.knowledge_type,'quotation',t.quotation,'provenance',t.provenance,'displayId',t.display_id,'displayOrder',t.display_order,'imagePath',t.image_path,'accessTier',t.access_tier);
 for alias_id in select id from public.theories where id=t.id or canonical_id=t.id loop
 insert into public.paid_content(content_type,content_id,payload,sort_order,updated_at)
 values('theory',alias_id,data||jsonb_build_object('tagId',alias_id),coalesce(t.taxonomy_order,t.display_order),now())
 on conflict(content_type,content_id) do update set payload=excluded.payload,sort_order=excluded.sort_order,updated_at=now();
 end loop;return new;
end $function$
;

create or replace view public.public_theories with(security_barrier=true) as SELECT t.id,
    t.title,
        CASE
            WHEN t.access_tier = 'free'::text OR can_read_complete_content() THEN t.summary
            ELSE ''::text
        END AS summary,
    t.category_id,
    t.category_title,
    t.aliases,
    t.related_theory_ids,
        CASE
            WHEN t.access_tier = 'free'::text OR can_read_complete_content() THEN t.provenance
            ELSE NULL::jsonb
        END AS provenance,
    t.status,
    t.display_order,
    t.display_id,
    t.image_path,
    t.access_tier,
    t.subcategory_id,
    s.title AS subcategory_title,
    t.taxonomy_order,
    COALESCE(t.canonical_id, t.id) AS canonical_id,
    t.legacy_ids, t.knowledge_type, CASE WHEN t.access_tier='free' OR public.can_read_complete_content() THEN t.quotation ELSE NULL::jsonb END AS quotation
   FROM theories t
     LEFT JOIN theory_subcategories s ON s.id = t.subcategory_id
  WHERE t.status = 'published'::text
UNION ALL
 SELECT a.id,
    t.title,
        CASE
            WHEN t.access_tier = 'free'::text OR can_read_complete_content() THEN t.summary
            ELSE ''::text
        END AS summary,
    t.category_id,
    t.category_title,
    t.aliases,
    t.related_theory_ids,
        CASE
            WHEN t.access_tier = 'free'::text OR can_read_complete_content() THEN t.provenance
            ELSE NULL::jsonb
        END AS provenance,
    'published'::text AS status,
    t.display_order,
    t.display_id,
    t.image_path,
    t.access_tier,
    t.subcategory_id,
    s.title AS subcategory_title,
    t.taxonomy_order,
    t.id AS canonical_id,
    t.legacy_ids, t.knowledge_type, CASE WHEN t.access_tier='free' OR public.can_read_complete_content() THEN t.quotation ELSE NULL::jsonb END AS quotation
   FROM theories a
     JOIN theories t ON t.id = a.canonical_id AND t.id <> a.id
     LEFT JOIN theory_subcategories s ON s.id = t.subcategory_id
  WHERE t.status = 'published'::text;
grant select on public.public_theories to anon,authenticated;
-- Refresh protected projections only; no source IDs, display numbers, or access tiers change.
update public.theories set knowledge_type=knowledge_type where status='published';
