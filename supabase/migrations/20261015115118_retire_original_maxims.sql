-- Retire, never repurpose, the reviewed 39 original maxims.
-- Before: 842 published, 36 subcategories. After: 803 published.
-- Existing stable/display/canonical/legacy IDs remain unchanged; A-040+ keep their numbers.
lock table public.theories,public.techniques,public.popular_rankings in share row exclusive mode;
select pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
do $guard$ begin
 if (select md5(string_agg((to_jsonb(t)-'updated_at'-'updated_by')::text,'|' order by id)) from public.theories t)<>'f7277133fd6f44e5ad68492aeb214b69'
 then raise exception 'Canonical snapshot changed; re-review instead of overwriting.';end if;
 if (select count(*) from public.theory_subcategories)<>36 then raise exception 'Expected unchanged 36 subcategories.';end if;
end $guard$;
create table if not exists private.theory_reform_backups(phase text not null,source_table text not null,source_id text not null,snapshot jsonb not null,primary key(phase,source_table,source_id));
alter table private.theory_reform_backups enable row level security;
revoke all on private.theory_reform_backups from public,anon,authenticated;
grant select on private.theory_reform_backups to service_role;
insert into private.theory_reform_backups select 'original-retirement-20261015','theories',id,to_jsonb(t) from public.theories t;
insert into private.theory_reform_backups select 'original-retirement-20261015','techniques',id,to_jsonb(t) from public.techniques t;
insert into private.theory_reform_backups select 'original-retirement-20261015','technique_drafts',technique_id,to_jsonb(t) from public.technique_drafts t;
insert into private.theory_reform_backups select 'original-retirement-20261015','popular_rankings',division,to_jsonb(t) from public.popular_rankings t;
insert into private.theory_reform_backups select 'original-retirement-20261015','functions',p.proname,jsonb_build_object('definition',pg_get_functiondef(p.oid)) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname='validate_theory_content';
create temporary table retired_original_ids(id text primary key) on commit drop;
insert into retired_original_ids values ('theory-0a93dca8-aa3d-4636-b42c-0d1db8f10aa0'),('theory-116d47d4-5388-45a1-b6d7-986369be20d0'),('theory-152eda9d-6bb1-462e-9aeb-61f904f7038b'),('theory-18c606ea-e115-4971-9f3a-017fb6a6d753'),('theory-196d34ef-6d9c-489a-9282-dc38243df12a'),('theory-1a1a5e84-191d-4002-9d09-586f422e606a'),('theory-1e056acd-4b69-40d2-95ce-3182dc15315a'),('theory-4f18f89d-592b-418d-a57e-9a5ab75a3ff8'),('theory-5c03b393-8849-4e74-a58c-30ed430fcf4c'),('theory-65d2d01f-38fc-4557-b7f8-bb0665d07426'),('theory-665760d5-914e-41d3-af31-7c74dd28d909'),('theory-6efbfb85-85f7-4978-8bfd-52cbe3cbf05e'),('theory-6f51e173-64ce-43d1-b64b-92aa5b9794c6'),('theory-89aeaa0c-c78d-4ae6-9d5b-c0d4b2ca7d68'),('theory-8c2a3b15-0f6d-4225-abda-07eba8eccc4a'),('theory-8cbf5a5e-3de7-4c97-be53-579fca58b5c0'),('theory-9ad49f9a-e7dd-4b4e-8014-abc9045dd0e3'),('theory-9aef21ca-b8ff-48d5-93cc-5adb7bd329dd'),('theory-a1d88571-e3f5-4383-b757-d4010025befa'),('theory-a3252859-1363-4fba-b94f-9bc4bdb752d8'),('theory-a750353b-c60f-44fc-b30b-54c1a1466079'),('theory-ab322059-b04a-4e2f-8c43-141492063021'),('theory-b181b908-e671-4dcc-b1ca-5acfab6dc431'),('theory-b6565cc5-277c-48c7-9129-68b2f4cbf0a0'),('theory-b7f5750c-b9d7-485a-ac3e-42bafffb9be0'),('theory-ba0ccc1b-92c5-48b9-9d1c-9810807d0416'),('theory-bc043984-1d19-4b66-9a5b-f16471ea9c76'),('theory-beebd375-bb7f-4aa0-b21d-8fbb4714c1b1'),('theory-c1e25b20-5ff7-47b4-8585-72606829f758'),('theory-cd7acf77-8b00-45b9-adfb-f0d3789122b6'),('theory-d412a6b9-22f8-4007-b96c-43e7061c4b42'),('theory-d923799a-26ec-4db9-b0ed-7777497244ae'),('theory-d9f695d5-7595-4236-a991-b6a3cf5b7ddb'),('theory-de584411-ca8e-4a8e-a53c-e1f36436c42d'),('theory-ea328bdf-a483-4048-9a88-356239325011'),('theory-ea4dfb6c-4442-477a-aa71-a3581d201131'),('theory-f7fc74ff-d2d1-4254-9135-a2772f36ccf3'),('theory-f8329abb-6906-47bb-8dff-85a98adedb64'),('theory-f93822fd-a157-47e3-b766-45eb04f3aa87');
-- Preserve immutable version/event history. Refuse newly introduced editorial references.
do $guard$ begin
 if exists(select 1 from public.feature_articles f join retired_original_ids r on to_jsonb(f.related_theory_ids)?r.id)
 or exists(select 1 from public.feature_article_drafts f join retired_original_ids r on (f.payload->'related_theory_ids')?r.id)
 or exists(select 1 from public.operation_social_posts p join retired_original_ids r on p.source_theory_id=r.id)
 then raise exception 'An additional feature/social reference needs review before retirement.';end if;
end $guard$;
update public.techniques t set theory_ids=(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(t.theory_ids) with ordinality x(value,ord) where value not in(select id from retired_original_ids)),
 primary_theory_ids=(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(t.primary_theory_ids) with ordinality x(value,ord) where value not in(select id from retired_original_ids))
where exists(select 1 from retired_original_ids r where t.theory_ids?r.id or t.primary_theory_ids?r.id);
update public.technique_drafts d set snapshot=jsonb_set(jsonb_set(snapshot,'{theory_ids}',(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(coalesce(snapshot->'theory_ids','[]')) with ordinality x(value,ord) where value not in(select id from retired_original_ids))),'{primary_theory_ids}',(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(coalesce(snapshot->'primary_theory_ids','[]')) with ordinality x(value,ord) where value not in(select id from retired_original_ids)))
where exists(select 1 from retired_original_ids r where (d.snapshot->'theory_ids')?r.id or (d.snapshot->'primary_theory_ids')?r.id);
update public.theories t set related_theory_ids=(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(t.related_theory_ids) with ordinality x(value,ord) where value not in(select id from retired_original_ids)) where exists(select 1 from retired_original_ids r where t.related_theory_ids?r.id);
-- Preserve the eight remaining entries in their relative order. The existing
-- editorial TOP 10 requires ten entries: append two established concepts,
-- never reuse the retired IDs or substitute new invented/historical maxims.
update public.popular_rankings p set content_ids=(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements_text(p.content_ids) with ordinality x(value,ord) where value not in(select id from retired_original_ids))||'["kb_001","kb_133"]'::jsonb where division='theory';
update public.theories set status='archived' where id in(select id from retired_original_ids);
CREATE OR REPLACE FUNCTION public.validate_theory_content()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare category_name text;
begin
 select title into category_name from public.content_categories where kind='theory' and id=new.category_id;
 if category_name is null then raise exception '理論カテゴリを選択してください。' using errcode='22023'; end if;
 new.category_title:=category_name;

 if new.status='published' and (nullif(trim(new.title),'') is null or nullif(trim(new.summary),'') is null) then
  raise exception 'タイトルと概要は公開に必須です。' using errcode='22023';
 end if;
 if jsonb_typeof(new.aliases)<>'array' or jsonb_typeof(new.related_theory_ids)<>'array' then raise exception '別名と関連理論の形式が不正です。' using errcode='22023'; end if;
 if new.related_theory_ids ? new.id then raise exception '自分自身を関連理論に指定できません。' using errcode='22023'; end if;
 if new.provenance is not null then
  if coalesce(new.provenance->>'status','') not in ('オリジナル','確認済み','書誌確認済み','一部確認','出典不明') then raise exception '出典状態を選択してください。' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(new.provenance->'sources','[]'::jsonb))<>'array' then raise exception '参照先の形式が不正です。' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(new.provenance->'sources','[]')) s where coalesce(s->>'url','') !~ '^https://[^[:space:]]+$' or nullif(trim(s->>'title'),'') is null) then raise exception '参照先には名称とhttpsのURLを入力してください。' using errcode='22023'; end if;
 end if;
 if new.status<>'archived' and (new.id in ('theory-0a93dca8-aa3d-4636-b42c-0d1db8f10aa0','theory-116d47d4-5388-45a1-b6d7-986369be20d0','theory-152eda9d-6bb1-462e-9aeb-61f904f7038b','theory-18c606ea-e115-4971-9f3a-017fb6a6d753','theory-196d34ef-6d9c-489a-9282-dc38243df12a','theory-1a1a5e84-191d-4002-9d09-586f422e606a','theory-1e056acd-4b69-40d2-95ce-3182dc15315a','theory-4f18f89d-592b-418d-a57e-9a5ab75a3ff8','theory-5c03b393-8849-4e74-a58c-30ed430fcf4c','theory-65d2d01f-38fc-4557-b7f8-bb0665d07426','theory-665760d5-914e-41d3-af31-7c74dd28d909','theory-6efbfb85-85f7-4978-8bfd-52cbe3cbf05e','theory-6f51e173-64ce-43d1-b64b-92aa5b9794c6','theory-89aeaa0c-c78d-4ae6-9d5b-c0d4b2ca7d68','theory-8c2a3b15-0f6d-4225-abda-07eba8eccc4a','theory-8cbf5a5e-3de7-4c97-be53-579fca58b5c0','theory-9ad49f9a-e7dd-4b4e-8014-abc9045dd0e3','theory-9aef21ca-b8ff-48d5-93cc-5adb7bd329dd','theory-a1d88571-e3f5-4383-b757-d4010025befa','theory-a3252859-1363-4fba-b94f-9bc4bdb752d8','theory-a750353b-c60f-44fc-b30b-54c1a1466079','theory-ab322059-b04a-4e2f-8c43-141492063021','theory-b181b908-e671-4dcc-b1ca-5acfab6dc431','theory-b6565cc5-277c-48c7-9129-68b2f4cbf0a0','theory-b7f5750c-b9d7-485a-ac3e-42bafffb9be0','theory-ba0ccc1b-92c5-48b9-9d1c-9810807d0416','theory-bc043984-1d19-4b66-9a5b-f16471ea9c76','theory-beebd375-bb7f-4aa0-b21d-8fbb4714c1b1','theory-c1e25b20-5ff7-47b4-8585-72606829f758','theory-cd7acf77-8b00-45b9-adfb-f0d3789122b6','theory-d412a6b9-22f8-4007-b96c-43e7061c4b42','theory-d923799a-26ec-4db9-b0ed-7777497244ae','theory-d9f695d5-7595-4236-a991-b6a3cf5b7ddb','theory-de584411-ca8e-4a8e-a53c-e1f36436c42d','theory-ea328bdf-a483-4048-9a88-356239325011','theory-ea4dfb6c-4442-477a-aa71-a3581d201131','theory-f7fc74ff-d2d1-4254-9135-a2772f36ccf3','theory-f8329abb-6906-47bb-8dff-85a98adedb64','theory-f93822fd-a157-47e3-b766-45eb04f3aa87') or new.provenance->>'status'='オリジナル') then
  raise exception '独自作成の名言は公開・再利用できません。' using errcode='23514';
 end if;
 if new.status='published' and new.category_id='practical-wisdom' and new.title ~ '^「[^「」]+」$' then
  raise exception '実践知には標語ではなく説明可能な原理・手法を登録してください。' using errcode='23514';
 end if;
 return new;
end $function$
;
do $verify$ begin
 if (select count(*) from public.theories where status='published')<>803
 or exists(select 1 from public.public_theories t join retired_original_ids r on r.id=t.id)
 or exists(select 1 from public.paid_content p join retired_original_ids r on r.id=p.content_id where p.content_type='theory')
 then raise exception 'Retirement verification failed.';end if;
end $verify$;
