-- Canonical source: production public.theories, 759 published rows.
-- IDs are stable; five retired rows remain as aliases, never physically deleted.
lock table public.theories, public.techniques in share row exclusive mode;
select pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
do $guard$ begin
 if (select count(*) from public.theories where status='published')<>759
 or (select md5(string_agg(id||':'||title||':'||summary||':'||category_id,'|' order by id)) from public.theories where status='published')<>'041403168f4b650ab737b95454c42ffa'
 then raise exception 'Canonical snapshot changed; re-review instead of overwriting.'; end if;
end $guard$;
create table public.theory_taxonomy_backups (
 migration_key text not null, source_table text not null, source_id text not null, snapshot jsonb not null,
 primary key(migration_key,source_table,source_id));
alter table public.theory_taxonomy_backups enable row level security;
create policy taxonomy_backup_owner on public.theory_taxonomy_backups for select to authenticated using(public.is_owner());
grant select on public.theory_taxonomy_backups to authenticated;
insert into public.theory_taxonomy_backups select '20261004125754','theories',id,to_jsonb(t) from public.theories t;
insert into public.theory_taxonomy_backups select '20261004125754','techniques',id,to_jsonb(t) from public.techniques t;
insert into public.theory_taxonomy_backups select '20261004125754','technique_drafts',technique_id,to_jsonb(t) from public.technique_drafts t;
insert into public.theory_taxonomy_backups select '20261004125754','popular_rankings',division,to_jsonb(t) from public.popular_rankings t;
insert into public.theory_taxonomy_backups select '20261004125754','operation_social_posts',id,to_jsonb(t) from public.operation_social_posts t;
create table public.theory_subcategories (
 id text primary key, category_id text not null, title text not null check(length(trim(title))>0),
 display_order integer not null check(display_order>0), unique(id,category_id));
alter table public.theory_subcategories enable row level security;
create policy taxonomy_read on public.theory_subcategories for select to anon,authenticated using(true);
create policy taxonomy_owner on public.theory_subcategories for all to authenticated using(public.is_owner()) with check(public.is_owner());
grant select on public.theory_subcategories to anon,authenticated;
grant insert,update,delete on public.theory_subcategories to authenticated;
alter table public.theories add column subcategory_id text references public.theory_subcategories(id),
 add column taxonomy_order integer check(taxonomy_order>0),
 add column canonical_id text references public.theories(id),
 add column legacy_ids jsonb not null default '[]'::jsonb check(jsonb_typeof(legacy_ids)='array');
create index theories_subcategory_order_idx on public.theories(subcategory_id,taxonomy_order) where status='published';
create index theories_canonical_id_idx on public.theories(canonical_id);
create index theory_subcategories_category_idx on public.theory_subcategories(category_id,display_order);
insert into public.theory_subcategories(id,category_id,title,display_order) values
('psychology-c','psychology','認知',1),
('psychology-e','psychology','感情',2),
('psychology-s','psychology','自己',3),
('psychology-i','psychology','対人',4),
('psychology-a','psychology','不安',5),
('psychology-g','psychology','喪失',6),
('psychology-m','psychology','記憶',7),
('psychology-t','psychology','心理技法',8),
('psychology-v','psychology','社会心理',9),
('psychology-u','psychology','言語',10),
('behavioral-science-d','behavioral-science','意思決定',1),
('behavioral-science-x','behavioral-science','選択',2),
('behavioral-science-h','behavioral-science','習慣',3),
('behavioral-science-m','behavioral-science','動機づけ',4),
('behavioral-science-g','behavioral-science','目標達成',5),
('behavioral-science-e','behavioral-science','行動設計',6),
('behavioral-science-l','behavioral-science','学習',7),
('organization-management-i','organization-management','個人',1),
('organization-management-t','organization-management','チーム',2),
('organization-management-l','organization-management','リーダーシップ',3),
('organization-management-o','organization-management','組織',4),
('organization-management-h','organization-management','人事',5),
('organization-management-n','organization-management','人脈',6),
('organization-management-p','organization-management','権力',7),
('organization-management-m','organization-management','経営',8),
('strategy-a','strategy','分析',1),
('strategy-j','strategy','判断',2),
('strategy-n','strategy','交渉',3),
('strategy-c','strategy','競争',4),
('strategy-g','strategy','ゲーム',5),
('strategy-r','strategy','リスク',6),
('strategy-d','strategy','適応',7),
('strategy-e','strategy','実行',8),
('practical-wisdom-c','practical-wisdom','会話',1),
('practical-wisdom-r','practical-wisdom','人間関係',2),
('practical-wisdom-t','practical-wisdom','思考',3),
('practical-wisdom-j','practical-wisdom','判断',4),
('practical-wisdom-a','practical-wisdom','行動',5),
('practical-wisdom-w','practical-wisdom','仕事',6),
('practical-wisdom-s','practical-wisdom','自己管理',7),
('practical-wisdom-k','practical-wisdom','キャリア',8),
('classics-thought-e','classics-thought','東洋思想',1),
('classics-thought-w','classics-thought','西洋思想',2),
('classics-thought-b','classics-thought','兵法',3),
('classics-thought-p','classics-thought','ことわざ',4),
('classics-thought-q','classics-thought','格言',5),
('classics-thought-f','classics-thought','作品',6);
create function public.resolve_theory_id(target_id text) returns text language sql stable security definer set search_path='' as $fn$
 select coalesce((select canonical_id from public.theories where id=target_id),target_id); $fn$;
create function public.resolve_theory_ids(ids jsonb) returns jsonb language sql stable security definer set search_path='' as $fn$
 select coalesce(jsonb_agg(id order by first_position),'[]'::jsonb) from (
 select public.resolve_theory_id(value) id,min(ord) first_position from jsonb_array_elements_text(coalesce(ids,'[]')) with ordinality v(value,ord)
 group by public.resolve_theory_id(value)) deduplicated; $fn$;
revoke all on function public.resolve_theory_id(text),public.resolve_theory_ids(jsonb) from public;
grant execute on function public.resolve_theory_id(text),public.resolve_theory_ids(jsonb) to anon,authenticated;
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
 if new.status='published' and (new.provenance->>'status'='オリジナル' or (new.category_id='practical-wisdom' and new.title ~ '^「[^「」]+」$')) then
  if new.title !~ '^「[^「」]+」$' or new.provenance is null
    or new.provenance->>'status' is distinct from 'オリジナル'
    or new.provenance->>'attribution' is distinct from '処世術禄'
    or new.provenance->'works' is distinct from '["処世術禄オリジナル"]'::jsonb
    or new.provenance->>'note' is distinct from '処世術禄によるオリジナルの実践知です。'
    or coalesce(new.provenance->'sources','[]'::jsonb)<>'[]'::jsonb
    or nullif(new.provenance->>'period','') is not null then
   raise exception '実践知は「」形式のタイトルと処世術禄オリジナルの出典を設定してください。' using errcode='22023';
  end if;
 end if;
 return new;
end $function$
;
-- New projection preserves aliases for previously released clients and protects paid text.
create or replace view public.public_theories with(security_barrier=true) as
 select t.id,t.title,
 case when t.access_tier='free' or public.can_read_complete_content() then t.summary else '' end as summary,
 t.category_id,t.category_title,t.aliases,t.related_theory_ids,
 case when t.access_tier='free' or public.can_read_complete_content() then t.provenance else null::jsonb end as provenance,
 t.status,t.display_order,t.display_id,t.image_path,t.access_tier,t.subcategory_id,s.title subcategory_title,t.taxonomy_order,
 coalesce(t.canonical_id,t.id) canonical_id,t.legacy_ids
 from public.theories t left join public.theory_subcategories s on s.id=t.subcategory_id where t.status='published'
 union all
 select a.id,t.title,case when t.access_tier='free' or public.can_read_complete_content() then t.summary else '' end,
 t.category_id,t.category_title,t.aliases,t.related_theory_ids,
 case when t.access_tier='free' or public.can_read_complete_content() then t.provenance else null::jsonb end,
 'published',t.display_order,t.display_id,t.image_path,t.access_tier,t.subcategory_id,s.title,t.taxonomy_order,t.id,t.legacy_ids
 from public.theories a join public.theories t on t.id=a.canonical_id and t.id<>a.id
 left join public.theory_subcategories s on s.id=t.subcategory_id where t.status='published';
grant select on public.public_theories to anon,authenticated;
create function public.sync_taxonomy_paid_theory() returns trigger language plpgsql security definer set search_path='' as $fn$
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
 'provenance',t.provenance,'displayId',t.display_id,'displayOrder',t.display_order,'imagePath',t.image_path,'accessTier',t.access_tier);
 for alias_id in select id from public.theories where id=t.id or canonical_id=t.id loop
 insert into public.paid_content(content_type,content_id,payload,sort_order,updated_at)
 values('theory',alias_id,data||jsonb_build_object('tagId',alias_id),coalesce(t.taxonomy_order,t.display_order),now())
 on conflict(content_type,content_id) do update set payload=excluded.payload,sort_order=excluded.sort_order,updated_at=now();
 end loop;return new;
end $fn$;
drop trigger sync_canonical_paid_theory on public.theories;
create trigger sync_canonical_paid_theory after insert or update or delete on public.theories for each row execute function public.sync_taxonomy_paid_theory();
-- Stage display IDs outside both existing and future ranges without disabling integrity triggers.
update public.theories set display_id=display_id+100000 where status='published';
update public.theories set canonical_id=id;
update public.theories set canonical_id='kb_024' where id='kb_418';
update public.theories set canonical_id='kb_566' where id='kb_267';
update public.theories set canonical_id='kb_588' where id='kb_253';
update public.theories set canonical_id='kb_452' where id='kb_103';
update public.theories set canonical_id='kb_016' where id='kb_392';
update public.techniques set theory_ids=public.resolve_theory_ids(theory_ids),primary_theory_ids=public.resolve_theory_ids(primary_theory_ids);
update public.technique_drafts set snapshot=jsonb_set(jsonb_set(snapshot,'{theory_ids}',public.resolve_theory_ids(snapshot->'theory_ids')),'{primary_theory_ids}',public.resolve_theory_ids(snapshot->'primary_theory_ids'));
update public.theories t set related_theory_ids=(select coalesce(jsonb_agg(r.id),'[]'::jsonb) from jsonb_array_elements_text(public.resolve_theory_ids(t.related_theory_ids)) r(id) where r.id<>t.id);
update public.popular_rankings set content_ids=public.resolve_theory_ids(content_ids) where division='theory';
update public.operation_social_posts set source_theory_id=public.resolve_theory_id(source_theory_id) where source_theory_id is not null;
update public.theories set status='archived' where id='kb_418';
update public.theories set status='archived' where id='kb_267';
update public.theories set status='archived' where id='kb_253';
update public.theories set status='archived' where id='kb_103';
update public.theories set status='archived' where id='kb_392';
with assignments(id,subcategory_id,taxonomy_order,display_id) as (values
('kb_399','psychology-c',1,18),
('kb_003','psychology-c',2,243),
('kb_001','psychology-c',3,146),
('kb_002','psychology-c',4,150),
('kb_596','psychology-c',5,35),
('kb_045','psychology-c',6,65),
('kb_597','psychology-c',7,298),
('kb_752','psychology-c',8,26),
('kb_573','psychology-c',9,221),
('kb_265','psychology-c',10,227),
('kb_218','psychology-c',11,7),
('kb_556','psychology-c',12,13),
('kb_421','psychology-c',13,15),
('kb_813','psychology-c',14,22),
('kb_017','psychology-c',15,37),
('kb_576','psychology-c',16,44),
('kb_430','psychology-c',17,56),
('kb_722','psychology-c',18,84),
('kb_452','psychology-c',19,85),
('kb_046','psychology-c',20,91),
('kb_269','psychology-c',21,93),
('kb_027','psychology-c',22,98),
('kb_231','psychology-c',23,105),
('kb_396','psychology-c',24,119),
('kb_708','psychology-c',25,125),
('kb_710','psychology-c',26,126),
('kb_425','psychology-c',27,138),
('kb_400','psychology-c',28,143),
('kb_219','psychology-c',29,148),
('kb_550','psychology-c',30,149),
('kb_718','psychology-c',31,151),
('kb_232','psychology-c',32,163),
('kb_720','psychology-c',33,166),
('kb_723','psychology-c',34,175),
('kb_587','psychology-c',35,180),
('kb_811','psychology-c',36,190),
('kb_706','psychology-c',37,193),
('kb_721','psychology-c',38,197),
('kb_812','psychology-c',39,202),
('kb_233','psychology-c',40,210),
('kb_707','psychology-c',41,218),
('kb_814','psychology-c',42,219),
('kb_577','psychology-c',43,222),
('kb_574','psychology-c',44,223),
('kb_858','psychology-c',45,228),
('kb_511','psychology-c',46,231),
('kb_820','psychology-c',47,235),
('kb_709','psychology-c',48,236),
('kb_719','psychology-c',49,237),
('kb_387','psychology-c',50,239),
('kb_450','psychology-c',51,241),
('kb_559','psychology-c',52,242),
('kb_586','psychology-c',53,244),
('kb_029','psychology-c',54,247),
('kb_236','psychology-c',55,255),
('kb_819','psychology-c',56,261),
('kb_429','psychology-c',57,271),
('kb_810','psychology-c',58,294),
('kb_716','psychology-c',59,50),
('kb_712','psychology-c',60,62),
('kb_105','psychology-c',61,70),
('kb_190','psychology-c',62,23),
('kb_023','psychology-e',1,55),
('kb_602','psychology-e',2,36),
('kb_234','psychology-e',3,57),
('kb_235','psychology-e',4,19),
('kb_268','psychology-e',5,31),
('kb_736','psychology-e',6,263),
('kb_158','psychology-e',7,52),
('kb_601','psychology-e',8,289),
('kb_169','psychology-s',1,40),
('kb_259','psychology-s',2,112),
('kb_257','psychology-s',3,123),
('kb_020','psychology-s',4,117),
('kb_420','psychology-s',5,120),
('kb_263','psychology-s',6,171),
('kb_583','psychology-s',7,102),
('kb_724','psychology-s',8,250),
('kb_726','psychology-s',9,266),
('kb_251','psychology-s',10,2),
('kb_249','psychology-s',11,3),
('kb_589','psychology-s',12,5),
('kb_727','psychology-s',13,20),
('kb_239','psychology-s',14,33),
('kb_244','psychology-s',15,43),
('kb_256','psychology-s',16,45),
('kb_582','psychology-s',17,66),
('kb_021','psychology-s',18,113),
('kb_558','psychology-s',19,118),
('kb_478','psychology-s',20,121),
('kb_479','psychology-s',21,122),
('kb_258','psychology-s',22,124),
('kb_266','psychology-s',23,133),
('kb_590','psychology-s',24,174),
('kb_264','psychology-s',25,176),
('kb_728','psychology-s',26,178),
('kb_815','psychology-s',27,186),
('kb_271','psychology-s',28,187),
('kb_725','psychology-s',29,207),
('kb_246','psychology-s',30,213),
('kb_270','psychology-s',31,270),
('kb_250','psychology-s',32,285),
('kb_252','psychology-s',33,296),
('kb_111','psychology-s',34,89),
('kb_112','psychology-s',35,169),
('kb_115','psychology-s',36,170),
('kb_122','psychology-s',37,264),
('kb_121','psychology-s',38,281),
('kb_221','psychology-s',39,157),
('kb_036','psychology-i',1,1),
('kb_009','psychology-i',2,131),
('kb_008','psychology-i',3,111),
('kb_030','psychology-i',4,129),
('kb_031','psychology-i',5,96),
('kb_033','psychology-i',6,181),
('kb_034','psychology-i',7,206),
('kb_822','psychology-i',8,301),
('kb_004','psychology-i',9,195),
('kb_005','psychology-i',10,299),
('kb_007','psychology-i',11,92),
('kb_047','psychology-i',12,268),
('kb_011','psychology-i',13,24),
('kb_095','psychology-i',14,39),
('kb_428','psychology-i',15,42),
('kb_391','psychology-i',16,46),
('kb_426','psychology-i',17,47),
('kb_038','psychology-i',18,48),
('kb_039','psychology-i',19,49),
('kb_044','psychology-i',20,60),
('kb_434','psychology-i',21,61),
('kb_444','psychology-i',22,63),
('kb_092','psychology-i',23,68),
('kb_404','psychology-i',24,73),
('kb_816','psychology-i',25,75),
('kb_821','psychology-i',26,76),
('kb_026','psychology-i',27,83),
('kb_015','psychology-i',28,87),
('kb_390','psychology-i',29,95),
('kb_818','psychology-i',30,99),
('kb_041','psychology-i',31,101),
('kb_032','psychology-i',32,103),
('kb_035','psychology-i',33,106),
('kb_446','psychology-i',34,107),
('kb_410','psychology-i',35,108),
('kb_018','psychology-i',36,127),
('kb_564','psychology-i',37,130),
('kb_824','psychology-i',38,134),
('kb_447','psychology-i',39,144),
('kb_730','psychology-i',40,145),
('kb_037','psychology-i',41,154),
('kb_424','psychology-i',42,155),
('kb_439','psychology-i',43,156),
('kb_050','psychology-i',44,158),
('kb_397','psychology-i',45,165),
('kb_566','psychology-i',46,183),
('kb_006','psychology-i',47,185),
('kb_817','psychology-i',48,188),
('kb_096','psychology-i',49,189),
('kb_022','psychology-i',50,191),
('kb_094','psychology-i',51,194),
('kb_012','psychology-i',52,196),
('kb_028','psychology-i',53,200),
('kb_093','psychology-i',54,212),
('kb_043','psychology-i',55,232),
('kb_436','psychology-i',56,253),
('kb_056','psychology-i',57,254),
('kb_010','psychology-i',58,257),
('kb_433','psychology-i',59,260),
('kb_025','psychology-i',60,262),
('kb_019','psychology-i',61,267),
('kb_823','psychology-i',62,274),
('kb_419','psychology-i',63,275),
('kb_014','psychology-i',64,276),
('kb_057','psychology-i',65,287),
('kb_042','psychology-i',66,288),
('kb_422','psychology-i',67,291),
('kb_600','psychology-i',68,293),
('kb_013','psychology-i',69,295),
('kb_114','psychology-i',70,109),
('kb_462','psychology-i',71,115),
('kb_460','psychology-i',72,116),
('kb_472','psychology-i',73,252),
('kb_203','psychology-a',1,258),
('kb_204','psychology-a',2,153),
('kb_206','psychology-a',3,226),
('kb_205','psychology-a',4,278),
('kb_216','psychology-a',5,246),
('kb_213','psychology-a',6,238),
('kb_207','psychology-a',7,12),
('kb_208','psychology-a',8,27),
('kb_214','psychology-a',9,38),
('kb_212','psychology-a',10,54),
('kb_220','psychology-a',11,81),
('kb_215','psychology-a',12,100),
('kb_565','psychology-a',13,160),
('kb_228','psychology-a',14,162),
('kb_211','psychology-a',15,290),
('kb_240','psychology-g',1,300),
('kb_254','psychology-g',2,6),
('kb_255','psychology-g',3,90),
('kb_588','psychology-g',4,182),
('kb_242','psychology-g',5,152),
('kb_245','psychology-g',6,135),
('kb_243','psychology-g',7,16),
('kb_581','psychology-g',8,17),
('kb_248','psychology-g',9,25),
('kb_241','psychology-g',10,29),
('kb_563','psychology-g',11,128),
('kb_247','psychology-g',12,139),
('kb_745','psychology-m',1,305),
('kb_738','psychology-m',2,4),
('kb_739','psychology-m',3,82),
('kb_744','psychology-m',4,147),
('kb_743','psychology-m',5,259),
('kb_826','psychology-m',6,265),
('kb_827','psychology-m',7,142),
('kb_742','psychology-m',8,217),
('kb_746','psychology-m',9,198),
('kb_441','psychology-m',10,28),
('kb_831','psychology-m',11,59),
('kb_393','psychology-m',12,114),
('kb_741','psychology-m',13,167),
('kb_830','psychology-m',14,204),
('kb_493','psychology-m',15,229),
('kb_740','psychology-m',16,256),
('kb_829','psychology-m',17,297),
('kb_414','psychology-m',18,302),
('kb_531','psychology-m',19,64),
('kb_403','psychology-t',1,304),
('kb_412','psychology-t',2,10),
('kb_411','psychology-t',3,72),
('kb_051','psychology-t',4,11),
('kb_052','psychology-t',5,203),
('kb_053','psychology-t',6,251),
('kb_225','psychology-t',7,273),
('kb_210','psychology-t',8,240),
('kb_238','psychology-t',9,161),
('kb_272','psychology-t',10,303),
('kb_222','psychology-t',11,8),
('kb_024','psychology-t',12,9),
('kb_262','psychology-t',13,34),
('kb_405','psychology-t',14,53),
('kb_227','psychology-t',15,58),
('kb_427','psychology-t',16,67),
('kb_217','psychology-t',17,77),
('kb_097','psychology-t',18,80),
('kb_040','psychology-t',19,136),
('kb_226','psychology-t',20,177),
('kb_224','psychology-t',21,192),
('kb_054','psychology-t',22,201),
('kb_230','psychology-t',23,215),
('kb_223','psychology-t',24,225),
('kb_580','psychology-t',25,245),
('kb_578','psychology-t',26,249),
('kb_237','psychology-t',27,269),
('kb_229','psychology-t',28,283),
('kb_202','psychology-t',29,30),
('kb_099','psychology-t',30,69),
('kb_098','psychology-t',31,71),
('kb_100','psychology-t',32,78),
('kb_058','psychology-v',1,173),
('kb_059','psychology-v',2,140),
('kb_062','psychology-v',3,137),
('kb_060','psychology-v',4,233),
('kb_061','psychology-v',5,199),
('kb_063','psychology-v',6,216),
('kb_459','psychology-v',7,94),
('kb_734','psychology-v',8,184),
('kb_104','psychology-v',9,41),
('kb_072','psychology-v',10,282),
('kb_477','psychology-v',11,14),
('kb_733','psychology-v',12,86),
('kb_731','psychology-v',13,159),
('kb_106','psychology-v',14,51),
('kb_782','psychology-v',15,88),
('kb_485','psychology-v',16,97),
('kb_481','psychology-v',17,110),
('kb_473','psychology-v',18,141),
('kb_067','psychology-v',19,205),
('kb_732','psychology-v',20,208),
('kb_066','psychology-v',21,209),
('kb_484','psychology-v',22,211),
('kb_457','psychology-v',23,224),
('kb_458','psychology-v',24,230),
('kb_470','psychology-v',25,234),
('kb_729','psychology-v',26,277),
('kb_762','psychology-v',27,284),
('kb_388','psychology-u',1,248),
('kb_859','psychology-u',2,79),
('kb_789','psychology-u',3,74),
('kb_788','psychology-u',4,104),
('kb_860','psychology-u',5,272),
('kb_055','psychology-u',6,280),
('kb_784','psychology-u',7,168),
('kb_413','psychology-u',8,32),
('kb_787','psychology-u',9,132),
('kb_857','psychology-u',10,164),
('kb_786','psychology-u',11,172),
('kb_856','psychology-u',12,214),
('kb_861','psychology-u',13,220),
('kb_389','psychology-u',14,279),
('kb_461','psychology-u',15,179),
('kb_785','psychology-u',16,21),
('kb_754','behavioral-science-d',1,83),
('kb_756','behavioral-science-d',2,23),
('kb_755','behavioral-science-d',3,24),
('kb_133','behavioral-science-d',4,91),
('kb_134','behavioral-science-d',5,71),
('kb_273','behavioral-science-d',6,41),
('kb_175','behavioral-science-d',7,30),
('kb_176','behavioral-science-d',8,69),
('kb_276','behavioral-science-d',9,39),
('kb_277','behavioral-science-d',10,52),
('kb_753','behavioral-science-d',11,74),
('kb_758','behavioral-science-d',12,2),
('kb_835','behavioral-science-d',13,3),
('kb_191','behavioral-science-d',14,7),
('kb_844','behavioral-science-d',15,14),
('kb_274','behavioral-science-d',16,18),
('kb_840','behavioral-science-d',17,21),
('kb_713','behavioral-science-d',18,26),
('kb_442','behavioral-science-d',19,32),
('kb_808','behavioral-science-d',20,35),
('kb_836','behavioral-science-d',21,43),
('kb_839','behavioral-science-d',22,55),
('kb_807','behavioral-science-d',23,57),
('kb_711','behavioral-science-d',24,62),
('kb_809','behavioral-science-d',25,65),
('kb_843','behavioral-science-d',26,93),
('kb_714','behavioral-science-d',27,98),
('kb_757','behavioral-science-d',28,100),
('kb_715','behavioral-science-d',29,107),
('kb_138','behavioral-science-x',1,4),
('kb_137','behavioral-science-x',2,89),
('kb_140','behavioral-science-x',3,10),
('kb_141','behavioral-science-x',4,76),
('kb_136','behavioral-science-x',5,33),
('kb_135','behavioral-science-x',6,99),
('kb_759','behavioral-science-x',7,12),
('kb_837','behavioral-science-x',8,6),
('kb_514','behavioral-science-x',9,19),
('kb_102','behavioral-science-x',10,20),
('kb_401','behavioral-science-x',11,29),
('theory-1789620805420-wbuepmtu','behavioral-science-x',12,38),
('kb_761','behavioral-science-x',13,48),
('kb_760','behavioral-science-x',14,64),
('kb_521','behavioral-science-x',15,67),
('kb_275','behavioral-science-x',16,68),
('kb_139','behavioral-science-x',17,73),
('kb_842','behavioral-science-x',18,77),
('kb_838','behavioral-science-x',19,80),
('kb_180','behavioral-science-h',1,51),
('kb_535','behavioral-science-h',2,94),
('kb_541','behavioral-science-h',3,1),
('kb_533','behavioral-science-h',4,50),
('kb_534','behavioral-science-h',5,108),
('kb_520','behavioral-science-m',1,49),
('kb_750','behavioral-science-m',2,22),
('kb_168','behavioral-science-m',3,25),
('kb_751','behavioral-science-m',4,42),
('kb_183','behavioral-science-m',5,103),
('kb_260','behavioral-science-m',6,5),
('kb_261','behavioral-science-m',7,28),
('kb_833','behavioral-science-m',8,46),
('kb_737','behavioral-science-m',9,79),
('kb_184','behavioral-science-m',10,58),
('kb_185','behavioral-science-m',11,59),
('kb_189','behavioral-science-m',12,70),
('kb_186','behavioral-science-m',13,78),
('kb_167','behavioral-science-g',1,104),
('kb_170','behavioral-science-g',2,102),
('kb_187','behavioral-science-g',3,13),
('kb_188','behavioral-science-g',4,63),
('kb_172','behavioral-science-g',5,47),
('kb_171','behavioral-science-g',6,61),
('kb_537','behavioral-science-g',7,87),
('kb_174','behavioral-science-g',8,90),
('kb_749','behavioral-science-g',9,101),
('kb_832','behavioral-science-g',10,40),
('kb_572','behavioral-science-g',11,75),
('kb_173','behavioral-science-g',12,37),
('kb_539','behavioral-science-g',13,92),
('kb_834','behavioral-science-g',14,9),
('kb_178','behavioral-science-e',1,66),
('kb_179','behavioral-science-e',2,84),
('kb_528','behavioral-science-e',3,17),
('kb_181','behavioral-science-e',4,36),
('kb_177','behavioral-science-e',5,81),
('kb_182','behavioral-science-e',6,105),
('kb_438','behavioral-science-e',7,44),
('kb_536','behavioral-science-l',1,11),
('kb_437','behavioral-science-l',2,34),
('kb_440','behavioral-science-l',3,54),
('kb_048','behavioral-science-l',4,15),
('kb_209','behavioral-science-l',5,60),
('kb_735','behavioral-science-l',6,27),
('kb_200','behavioral-science-l',7,16),
('kb_199','behavioral-science-l',8,31),
('kb_201','behavioral-science-l',9,85),
('kb_747','behavioral-science-l',10,8),
('kb_748','behavioral-science-l',11,45),
('kb_198','behavioral-science-l',12,82),
('kb_049','behavioral-science-l',13,53),
('kb_415','behavioral-science-l',14,56),
('kb_828','behavioral-science-l',15,72),
('kb_766','organization-management-i',1,68),
('kb_767','organization-management-i',2,57),
('kb_500','organization-management-i',3,155),
('kb_763','organization-management-i',4,69),
('kb_540','organization-management-i',5,2),
('kb_772','organization-management-i',6,45),
('kb_130','organization-management-i',7,70),
('kb_291','organization-management-i',8,17),
('kb_805','organization-management-i',9,19),
('kb_806','organization-management-i',10,18),
('kb_804','organization-management-i',11,56),
('kb_480','organization-management-i',12,11),
('kb_131','organization-management-i',13,20),
('kb_868','organization-management-i',14,22),
('kb_292','organization-management-i',15,26),
('kb_290','organization-management-i',16,27),
('kb_120','organization-management-i',17,48),
('kb_765','organization-management-i',18,88),
('kb_585','organization-management-i',19,107),
('kb_867','organization-management-i',20,145),
('kb_803','organization-management-i',21,152),
('kb_764','organization-management-i',22,67),
('kb_777','organization-management-t',1,24),
('kb_087','organization-management-t',2,114),
('kb_070','organization-management-t',3,55),
('kb_071','organization-management-t',4,162),
('kb_064','organization-management-t',5,61),
('kb_068','organization-management-t',6,3),
('kb_065','organization-management-t',7,60),
('kb_074','organization-management-t',8,13),
('kb_454','organization-management-t',9,54),
('kb_455','organization-management-t',10,58),
('kb_453','organization-management-t',11,59),
('kb_069','organization-management-t',12,63),
('kb_073','organization-management-t',13,84),
('kb_771','organization-management-t',14,127),
('kb_402','organization-management-t',15,75),
('kb_773','organization-management-l',1,148),
('kb_774','organization-management-l',2,115),
('kb_845','organization-management-l',3,40),
('kb_775','organization-management-l',4,62),
('kb_776','organization-management-l',5,126),
('kb_125','organization-management-l',6,161),
('kb_598','organization-management-o',1,76),
('kb_127','organization-management-o',2,89),
('kb_118','organization-management-o',3,90),
('kb_770','organization-management-o',4,91),
('kb_506','organization-management-o',5,87),
('kb_507','organization-management-o',6,136),
('kb_497','organization-management-o',7,108),
('kb_781','organization-management-o',8,6),
('kb_510','organization-management-o',9,74),
('kb_846','organization-management-o',10,77),
('kb_516','organization-management-o',11,103),
('kb_456','organization-management-o',12,146),
('kb_195','organization-management-o',13,156),
('kb_508','organization-management-o',14,157),
('kb_155','organization-management-h',1,106),
('kb_768','organization-management-h',2,147),
('kb_769','organization-management-h',3,86),
('kb_123','organization-management-h',4,134),
('kb_124','organization-management-h',5,36),
('kb_132','organization-management-h',6,133),
('kb_129','organization-management-h',7,119),
('kb_128','organization-management-h',8,120),
('kb_584','organization-management-h',9,71),
('kb_571','organization-management-h',10,72),
('kb_395','organization-management-h',11,5),
('kb_501','organization-management-h',12,1),
('kb_509','organization-management-h',13,8),
('kb_116','organization-management-h',14,10),
('kb_194','organization-management-h',15,21),
('kb_193','organization-management-h',16,25),
('kb_117','organization-management-h',17,81),
('kb_491','organization-management-h',18,105),
('kb_119','organization-management-h',19,123),
('kb_081','organization-management-n',1,51),
('kb_082','organization-management-n',2,160),
('kb_085','organization-management-n',3,122),
('kb_083','organization-management-n',4,35),
('kb_084','organization-management-n',5,144),
('kb_086','organization-management-n',6,33),
('kb_466','organization-management-n',7,121),
('kb_090','organization-management-n',8,38),
('kb_113','organization-management-n',9,138),
('kb_512','organization-management-n',10,139),
('kb_465','organization-management-n',11,53),
('kb_088','organization-management-n',12,73),
('kb_126','organization-management-n',13,79),
('kb_851','organization-management-n',14,100),
('kb_089','organization-management-n',15,112),
('kb_091','organization-management-n',16,137),
('kb_467','organization-management-n',17,159),
('kb_079','organization-management-p',1,31),
('kb_080','organization-management-p',2,143),
('kb_075','organization-management-p',3,102),
('kb_076','organization-management-p',4,101),
('kb_445','organization-management-p',5,4),
('kb_513','organization-management-p',6,94),
('kb_518','organization-management-p',7,95),
('kb_077','organization-management-p',8,153),
('kb_078','organization-management-p',9,163),
('kb_474','organization-management-p',10,135),
('kb_847','organization-management-m',1,92),
('kb_850','organization-management-m',2,32),
('kb_848','organization-management-m',3,44),
('kb_849','organization-management-m',4,96),
('kb_197','organization-management-m',5,83),
('kb_196','organization-management-m',6,151),
('kb_527','organization-management-m',7,116),
('kb_854','organization-management-m',8,15),
('kb_855','organization-management-m',9,129),
('kb_783','organization-management-m',10,7),
('kb_852','organization-management-m',11,154),
('kb_593','organization-management-m',12,12),
('kb_853','organization-management-m',13,28),
('kb_423','organization-management-m',14,41),
('kb_519','organization-management-m',15,80),
('kb_110','organization-management-m',16,142),
('kb_543','organization-management-m',17,9),
('kb_109','strategy-a',1,73),
('kb_107','strategy-a',2,64),
('kb_108','strategy-a',3,75),
('kb_800','strategy-a',4,29),
('kb_801','strategy-a',5,82),
('kb_802','strategy-a',6,83),
('kb_717','strategy-a',7,14),
('kb_545','strategy-a',8,59),
('kb_449','strategy-j',1,16),
('kb_570','strategy-j',2,15),
('kb_825','strategy-j',3,6),
('kb_142','strategy-n',1,56),
('kb_143','strategy-n',2,39),
('kb_144','strategy-n',3,78),
('kb_148','strategy-n',4,13),
('kb_149','strategy-n',5,40),
('kb_154','strategy-n',6,7),
('kb_522','strategy-n',7,48),
('kb_150','strategy-n',8,80),
('kb_151','strategy-n',9,55),
('kb_152','strategy-n',10,71),
('kb_153','strategy-n',11,30),
('kb_161','strategy-n',12,43),
('kb_157','strategy-n',13,49),
('kb_156','strategy-n',14,51),
('kb_486','strategy-n',15,52),
('kb_524','strategy-n',16,12),
('kb_145','strategy-n',17,19),
('kb_523','strategy-n',18,44),
('kb_160','strategy-n',19,45),
('kb_146','strategy-n',20,60),
('kb_159','strategy-n',21,72),
('kb_147','strategy-n',22,76),
('kb_515','strategy-c',1,63),
('kb_289','strategy-c',2,81),
('kb_476','strategy-c',3,37),
('kb_525','strategy-c',4,31),
('kb_791','strategy-g',1,26),
('kb_790','strategy-g',2,50),
('kb_864','strategy-g',3,23),
('kb_792','strategy-g',4,18),
('kb_162','strategy-g',5,28),
('kb_796','strategy-g',6,8),
('kb_797','strategy-g',7,33),
('kb_165','strategy-g',8,42),
('kb_163','strategy-g',9,62),
('kb_164','strategy-g',10,25),
('kb_798','strategy-g',11,21),
('kb_799','strategy-g',12,17),
('kb_794','strategy-g',13,9),
('kb_795','strategy-g',14,34),
('kb_863','strategy-g',15,58),
('kb_865','strategy-g',16,70),
('kb_862','strategy-g',17,69),
('kb_866','strategy-g',18,3),
('kb_778','strategy-g',19,10),
('kb_166','strategy-g',20,20),
('kb_793','strategy-g',21,24),
('kb_780','strategy-g',22,27),
('kb_779','strategy-g',23,65),
('kb_555','strategy-r',1,77),
('kb_542','strategy-r',2,57),
('kb_286','strategy-r',3,47),
('kb_281','strategy-r',4,32),
('kb_280','strategy-r',5,67),
('kb_567','strategy-r',6,68),
('kb_278','strategy-r',7,4),
('kb_279','strategy-r',8,74),
('kb_569','strategy-r',9,5),
('kb_599','strategy-r',10,66),
('kb_283','strategy-r',11,1),
('kb_282','strategy-r',12,53),
('kb_841','strategy-r',13,22),
('kb_284','strategy-d',1,2),
('kb_548','strategy-d',2,46),
('kb_285','strategy-d',3,38),
('kb_287','strategy-d',4,41),
('kb_288','strategy-d',5,11),
('kb_488','strategy-d',6,35),
('kb_544','strategy-e',1,36),
('kb_561','strategy-e',2,54),
('kb_495','strategy-e',3,61),
('kb_546','strategy-e',4,79),
('kb_416','practical-wisdom-c',1,70),
('kb_398','practical-wisdom-c',2,71),
('kb_407','practical-wisdom-c',3,67),
('kb_016','practical-wisdom-c',4,76),
('kb_406','practical-wisdom-c',5,57),
('kb_408','practical-wisdom-c',6,58),
('kb_101','practical-wisdom-c',7,40),
('kb_409','practical-wisdom-c',8,63),
('kb_417','practical-wisdom-c',9,73),
('kb_464','practical-wisdom-c',10,49),
('kb_463','practical-wisdom-c',11,52),
('kb_431','practical-wisdom-r',1,61),
('kb_448','practical-wisdom-r',2,60),
('kb_432','practical-wisdom-r',3,68),
('kb_471','practical-wisdom-r',4,56),
('theory-9aef21ca-b8ff-48d5-93cc-5adb7bd329dd','practical-wisdom-r',5,31),
('theory-c1e25b20-5ff7-47b4-8585-72606829f758','practical-wisdom-r',6,32),
('theory-18c606ea-e115-4971-9f3a-017fb6a6d753','practical-wisdom-r',7,39),
('theory-152eda9d-6bb1-462e-9aeb-61f904f7038b','practical-wisdom-r',8,11),
('theory-f7fc74ff-d2d1-4254-9135-a2772f36ccf3','practical-wisdom-r',9,28),
('theory-ea328bdf-a483-4048-9a88-356239325011','practical-wisdom-r',10,30),
('kb_552','practical-wisdom-t',1,69),
('kb_557','practical-wisdom-j',1,66),
('kb_568','practical-wisdom-j',2,80),
('kb_554','practical-wisdom-j',3,79),
('kb_591','practical-wisdom-j',4,74),
('theory-f8329abb-6906-47bb-8dff-85a98adedb64','practical-wisdom-j',5,7),
('theory-6f51e173-64ce-43d1-b64b-92aa5b9794c6','practical-wisdom-j',6,24),
('theory-4f18f89d-592b-418d-a57e-9a5ab75a3ff8','practical-wisdom-j',7,4),
('theory-8c2a3b15-0f6d-4225-abda-07eba8eccc4a','practical-wisdom-j',8,23),
('theory-f93822fd-a157-47e3-b766-45eb04f3aa87','practical-wisdom-j',9,19),
('theory-beebd375-bb7f-4aa0-b21d-8fbb4714c1b1','practical-wisdom-j',10,10),
('theory-bc043984-1d19-4b66-9a5b-f16471ea9c76','practical-wisdom-j',11,29),
('kb_529','practical-wisdom-a',1,44),
('kb_530','practical-wisdom-a',2,41),
('kb_532','practical-wisdom-a',3,42),
('theory-9ad49f9a-e7dd-4b4e-8014-abc9045dd0e3','practical-wisdom-a',4,8),
('theory-1e056acd-4b69-40d2-95ce-3182dc15315a','practical-wisdom-a',5,1),
('theory-ba0ccc1b-92c5-48b9-9d1c-9810807d0416','practical-wisdom-a',6,2),
('theory-a3252859-1363-4fba-b94f-9bc4bdb752d8','practical-wisdom-a',7,3),
('theory-d412a6b9-22f8-4007-b96c-43e7061c4b42','practical-wisdom-a',8,5),
('theory-cd7acf77-8b00-45b9-adfb-f0d3789122b6','practical-wisdom-a',9,6),
('theory-196d34ef-6d9c-489a-9282-dc38243df12a','practical-wisdom-a',10,9),
('theory-b7f5750c-b9d7-485a-ac3e-42bafffb9be0','practical-wisdom-a',11,14),
('theory-a1d88571-e3f5-4383-b757-d4010025befa','practical-wisdom-a',12,16),
('theory-1a1a5e84-191d-4002-9d09-586f422e606a','practical-wisdom-a',13,33),
('theory-0a93dca8-aa3d-4636-b42c-0d1db8f10aa0','practical-wisdom-a',14,34),
('kb_592','practical-wisdom-a',15,77),
('kb_594','practical-wisdom-a',16,78),
('kb_547','practical-wisdom-w',1,46),
('kb_192','practical-wisdom-w',2,54),
('kb_483','practical-wisdom-w',3,47),
('kb_498','practical-wisdom-w',4,48),
('kb_435','practical-wisdom-w',5,59),
('kb_487','practical-wisdom-w',6,51),
('kb_394','practical-wisdom-w',7,62),
('kb_502','practical-wisdom-w',8,50),
('kb_538','practical-wisdom-s',1,43),
('kb_443','practical-wisdom-s',2,64),
('kb_562','practical-wisdom-s',3,75),
('kb_553','practical-wisdom-s',4,82),
('kb_499','practical-wisdom-s',5,65),
('kb_551','practical-wisdom-s',6,72),
('theory-b6565cc5-277c-48c7-9129-68b2f4cbf0a0','practical-wisdom-s',7,12),
('theory-6efbfb85-85f7-4978-8bfd-52cbe3cbf05e','practical-wisdom-s',8,13),
('theory-d9f695d5-7595-4236-a991-b6a3cf5b7ddb','practical-wisdom-s',9,15),
('theory-b181b908-e671-4dcc-b1ca-5acfab6dc431','practical-wisdom-s',10,17),
('theory-65d2d01f-38fc-4557-b7f8-bb0665d07426','practical-wisdom-s',11,18),
('theory-89aeaa0c-c78d-4ae6-9d5b-c0d4b2ca7d68','practical-wisdom-s',12,20),
('theory-a750353b-c60f-44fc-b30b-54c1a1466079','practical-wisdom-s',13,22),
('theory-ea4dfb6c-4442-477a-aa71-a3581d201131','practical-wisdom-s',14,25),
('theory-ab322059-b04a-4e2f-8c43-141492063021','practical-wisdom-s',15,27),
('theory-5c03b393-8849-4e74-a58c-30ed430fcf4c','practical-wisdom-s',16,35),
('theory-665760d5-914e-41d3-af31-7c74dd28d909','practical-wisdom-s',17,36),
('theory-8cbf5a5e-3de7-4c97-be53-579fca58b5c0','practical-wisdom-s',18,37),
('theory-de584411-ca8e-4a8e-a53c-e1f36436c42d','practical-wisdom-s',19,38),
('theory-d923799a-26ec-4db9-b0ed-7777497244ae','practical-wisdom-k',1,21),
('theory-116d47d4-5388-45a1-b6d7-986369be20d0','practical-wisdom-k',2,26),
('kb_575','practical-wisdom-k',3,81),
('kb_482','practical-wisdom-k',4,53),
('kb_475','practical-wisdom-k',5,55),
('kb_517','practical-wisdom-k',6,45),
('kb_311','classics-thought-e',1,35),
('kb_298','classics-thought-e',2,4),
('kb_304','classics-thought-e',3,22),
('kb_624','classics-thought-e',4,11),
('kb_622','classics-thought-e',5,26),
('kb_625','classics-thought-e',6,56),
('kb_299','classics-thought-e',7,60),
('kb_623','classics-thought-e',8,37),
('kb_617','classics-thought-e',9,30),
('kb_618','classics-thought-e',10,44),
('kb_619','classics-thought-e',11,52),
('kb_620','classics-thought-e',12,39),
('kb_621','classics-thought-e',13,31),
('kb_632','classics-thought-e',14,58),
('kb_312','classics-thought-e',15,46),
('kb_604','classics-thought-w',1,29),
('kb_579','classics-thought-w',2,62),
('kb_603','classics-thought-w',3,53),
('kb_606','classics-thought-w',4,2),
('kb_605','classics-thought-w',5,28),
('kb_607','classics-thought-w',6,10),
('kb_615','classics-thought-w',7,9),
('kb_608','classics-thought-w',8,32),
('kb_609','classics-thought-w',9,40),
('kb_611','classics-thought-w',10,43),
('kb_610','classics-thought-w',11,8),
('kb_612','classics-thought-w',12,36),
('kb_613','classics-thought-w',13,42),
('kb_614','classics-thought-w',14,18),
('kb_616','classics-thought-w',15,61),
('kb_560','classics-thought-w',16,63),
('kb_626','classics-thought-b',1,45),
('kb_627','classics-thought-b',2,34),
('kb_503','classics-thought-b',3,13),
('kb_628','classics-thought-b',4,59),
('kb_504','classics-thought-b',5,38),
('kb_490','classics-thought-b',6,41),
('kb_505','classics-thought-b',7,16),
('kb_496','classics-thought-b',8,48),
('kb_630','classics-thought-b',9,33),
('kb_629','classics-thought-b',10,55),
('kb_549','classics-thought-b',11,57),
('kb_333','classics-thought-p',1,51),
('kb_334','classics-thought-p',2,14),
('kb_336','classics-thought-p',3,1),
('kb_335','classics-thought-p',4,5),
('kb_301','classics-thought-p',5,3),
('kb_300','classics-thought-p',6,27),
('kb_296','classics-thought-p',7,49),
('kb_631','classics-thought-p',8,7),
('kb_351','classics-thought-p',9,24),
('kb_352','classics-thought-p',10,12),
('kb_353','classics-thought-p',11,21),
('kb_327','classics-thought-p',12,20),
('kb_324','classics-thought-p',13,23),
('kb_315','classics-thought-p',14,19),
('kb_469','classics-thought-p',15,25),
('kb_468','classics-thought-p',16,47),
('kb_359','classics-thought-p',17,54),
('kb_329','classics-thought-q',1,15),
('kb_326','classics-thought-q',2,50),
('kb_595','classics-thought-q',3,64),
('kb_701','classics-thought-f',1,6),
('kb_702','classics-thought-f',2,17))
update public.theories t set subcategory_id=a.subcategory_id,taxonomy_order=a.taxonomy_order,
 category_id=s.category_id,display_id=a.display_id,category_title=(select title from public.content_categories where kind='theory' and id=s.category_id)
from assignments a join public.theory_subcategories s on s.id=a.subcategory_id where t.id=a.id;
update public.theories set title='権威バイアス',aliases='["権威効果"]'::jsonb,legacy_ids='["kb_103"]'::jsonb,related_theory_ids='["kb_733"]'::jsonb,provenance='{"note":"権威と社会的証明を背景として参照。カード名は判断の偏り・実務手段の整理で、独立した同名の法則の原典ではありません。","works":["The 7 Principles of Persuasion（公式解説）","Influence, New and Expanded (2021) / The 7 Principles of Persuasion"],"status":"一部確認","sources":[{"url":"https://www.influenceatwork.com/7-principles-of-persuasion/","title":"著者・出版社による原著・書誌情報"}],"attribution":"Robert B. Cialdini（関連文献の著者）"}'::jsonb where id='kb_452';
update public.theories set title='ビッグ・ファイブ',aliases='["Big Five","Five-Factor Model","FFM","ビッグファイブ","五因子性格モデル","OCEAN","Big Five／五因子モデル","五因子モデル"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_726","kb_129","kb_817"]'::jsonb,provenance='{"note":"測定尺度・文化・自己評定と他者評定によって結果が変わる。","works":["An introduction to the five-factor model and its applications (1992)"],"period":"1980〜1990年代","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1111/j.1467-6494.1992.tb00970.x","title":"代表研究（DOI）"}],"attribution":"Paul Costa / Robert McCrae / Lewis Goldbergほか"}'::jsonb where id='kb_724';
update public.theories set title='統制の所在',aliases='["locus of control","ローカスオブコントロール","内的統制","外的統制","統制の所在／ローカス・オブ・コントロール","ローカス・オブ・コントロール"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_239","kb_230"]'::jsonb,provenance='{"note":"領域ごとの統制感と一般傾向を区別する。","works":["Generalized expectancies for internal versus external control of reinforcement (1966)"],"period":"1966年","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1037/h0092976","title":"代表研究（DOI）"}],"attribution":"Julian B. Rotter"}'::jsonb where id='kb_725';
update public.theories set title='心の理論',aliases='["theory of mind","ToM","心の理論／Theory of Mind"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_789","kb_721"]'::jsonb,provenance='{"note":"単一能力ではなく課題・発達・言語能力に依存し、安易な診断に使わない。","works":["Does the chimpanzee have a theory of mind? (1978)"],"period":"1978年以降","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1017/S0140525X00076512","title":"代表研究（DOI）"}],"attribution":"David Premack / Guy Woodruffほか"}'::jsonb where id='kb_818';
update public.theories set title='相対的剥奪',aliases='["相対的剝奪"]'::jsonb,legacy_ids='["kb_267"]'::jsonb,related_theory_ids='[]'::jsonb,provenance='{"note":"相対的剥奪の理論と研究を検討したメタ分析。概念の歴史上の初出をこの論文へ帰属するものではありません。","works":["Relative Deprivation (2012). Personality and Social Psychology Review, 16(3), 203-232"],"period":"2012年（参照文献）","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1177/1088868311430825","title":"出版社登録の原著書誌・DOI"}],"attribution":"Heather J. Smith / Thomas F. Pettigrew / Gina M. Pippin / Silvana Bialosiewicz（参照文献の著者）"}'::jsonb where id='kb_566';
update public.theories set title='喪失の二重過程モデル',aliases='["二重過程モデル"]'::jsonb,legacy_ids='["kb_253"]'::jsonb,related_theory_ids='["kb_825"]'::jsonb,provenance='{"note":"喪失への対処の二重過程モデル。一般的な思考の二重過程理論とは別です。","works":["THE DUAL PROCESS MODEL OF COPING WITH BEREAVEMENT: RATIONALE AND DESCRIPTION (1999). Death Studies, 23(3), 197-224"],"period":"1999年（参照文献）","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1080/074811899201046","title":"文献情報・原文（DOI）"},{"url":"https://pubmed.ncbi.nlm.nih.gov/10848151/","title":"著者情報（PubMed）"}],"attribution":"Margaret Stroebe / Henk Schut（参照文献の著者）"}'::jsonb where id='kb_588';
update public.theories set title='アクティブ・コンストラクティブ・レスポンディング',aliases='["能動的・建設的反応"]'::jsonb,legacy_ids='["kb_418"]'::jsonb,related_theory_ids='[]'::jsonb,provenance='{"note":"良い出来事の共有と、能動的・建設的な反応を扱う研究。","works":["What Do You Do When Things Go Right? The Intrapersonal and Interpersonal Benefits of Sharing Positive Events. (2004). Journal of Personality and Social Psychology, 87(2), 228-245"],"period":"2004年（参照文献）","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1037/0022-3514.87.2.228","title":"文献情報・原文（DOI）"}],"attribution":"Shelly L. Gable / Harry T. Reis / Emily A. Impett / Evan R. Asher（参照文献の著者）"}'::jsonb where id='kb_024';
update public.theories set title='精緻化可能性モデル',aliases='["elaboration likelihood model","ELM","精緻化見込みモデル","精緻化可能性モデル／ELM"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_785","kb_461","kb_786","kb_856"]'::jsonb,provenance='{"note":"態度変化の持続性は処理の深さだけで決まらない。","works":["Communication and Persuasion (1986)"],"period":"1980年代","status":"一部確認","attribution":"Richard Petty / John Cacioppo","sources":[]}'::jsonb where id='kb_784';
update public.theories set title='ヒューリスティック・システマティック・モデル',aliases='["heuristic-systematic model","HSM","ヒューリスティックシステマティックモデル","HSM／ヒューリスティック・システマティック・モデル","ヒューリスティック系統的モデル"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_784","kb_461"]'::jsonb,provenance='{"note":"二つの処理は同時に働くことがある。","works":["Heuristic versus systematic information processing and the use of source versus message cues (1980)"],"period":"1980年以降","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1037/0022-3514.39.5.752","title":"代表研究（DOI）"}],"attribution":"Shelly Chaiken"}'::jsonb where id='kb_785';
update public.theories set title='職務要求資源モデル',aliases='["job demands-resources model","JD-R model","JD-Rモデル","職務要求‐資源モデル／JD-R","JD-R","職務要求‐資源モデル"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_772","kb_767"]'::jsonb,provenance='{"note":"要求と資源の効果は職種・個人・水準により変わる。","works":["The job demands-resources model of burnout (2001)"],"period":"2001年以降","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1037/0021-9010.86.3.499","title":"代表研究（DOI）"}],"attribution":"Evangelia Demerouti / Arnold Bakkerほか"}'::jsonb where id='kb_763';
update public.theories set title='資源保存理論',aliases='["conservation of resources theory","COR theory","COR理論","資源保存理論／COR","COR"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_763","kb_228"]'::jsonb,provenance='{"note":"資源の定義が広いという批判を踏まえ、文脈で具体化する。","works":["Conservation of resources: A new attempt at conceptualizing stress (1989)"],"period":"1989年","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1037/0003-066X.44.3.513","title":"代表研究（DOI）"}],"attribution":"Stevan Hobfoll"}'::jsonb where id='kb_772';
update public.theories set title='社会的認知キャリア理論',aliases='["social cognitive career theory","SCCT","社会認知的キャリア理論","社会的認知キャリア理論／SCCT"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_169","kb_750"]'::jsonb,provenance='{"note":"構造的制約を本人の努力不足へ還元しない。","works":["Toward a unifying social cognitive theory of career and academic interest, choice, and performance (1994)"],"period":"1994年","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1006/jvbe.1994.1027","title":"代表研究（DOI）"}],"attribution":"Robert Lent / Steven Brown / Gail Hackett"}'::jsonb where id='kb_804';
update public.theories set title='職務特性モデル',aliases='["job characteristics model","JCM","職務特性理論"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_130","kb_766"]'::jsonb,provenance='{"note":"全員に同じ職務拡大が有効とは限らない。","works":["Motivation through the design of work (1976)"],"period":"1976年","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1016/0030-5073(76)90016-7","title":"代表研究（DOI）"}],"attribution":"J. Richard Hackman / Greg Oldham"}'::jsonb where id='kb_764';
update public.theories set title='従業員の発言行動',aliases='["employee voice","voice behavior","従業員発言","発言行動／Employee Voice","発言行動"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_770","kb_402"]'::jsonb,provenance='{"note":"不満の表明すべてではなく、改善志向の建設的行動を中心に扱う。","works":["Helping and voice extra-role behaviors (1998)"],"period":"1998年","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.2307/256902","title":"代表研究（DOI）"}],"attribution":"Linn Van Dyne / Jeffrey LePine"}'::jsonb where id='kb_771';
update public.theories set title='資源ベース理論',aliases='["resource-based view","RBV","資源ベース・ビュー","資源ベース理論／RBV"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_850","kb_849"]'::jsonb,provenance='{"note":"資源を列挙するだけでなく、市場変化と価値創出の検証が必要。","works":["Firm resources and sustained competitive advantage (1991)"],"period":"1980年代以降","status":"書誌確認済み","sources":[{"url":"https://doi.org/10.1177/014920639101700108","title":"代表研究（DOI）"}],"attribution":"Birger Wernerfelt / Jay Barney"}'::jsonb where id='kb_848';
update public.theories set title='再認主導意思決定モデル',aliases='["expert intuition","recognition-primed decision","RPD","熟達者の直観／RPDモデル","熟達者の直観"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='["kb_746","kb_588"]'::jsonb,provenance='{"note":"規則性が高く迅速なフィードバックのある領域で育ちやすく、未知の環境では過信に注意する。","works":["Sources of Power (1998)"],"period":"1989年以降","status":"一部確認","attribution":"Gary Klein","sources":[]}'::jsonb where id='kb_825';
update public.theories set title='呼び名の活用',aliases='["呼び名効果","ネームコーリング効果"]'::jsonb,legacy_ids='["kb_392"]'::jsonb,related_theory_ids='[]'::jsonb,provenance=null where id='kb_016';
update public.theories set title='暫定的な理解の提示',aliases='["仮説提示効果"]'::jsonb,legacy_ids='[]'::jsonb,related_theory_ids='[]'::jsonb,provenance='{"note":"傾聴における意味・感情の理解と確認を背景文献として提示。カード名は本アプリの実践的整理で、論文に同名の単一の効果があるとは示しません。","works":["Active Listening (1957)"],"period":"1957年（参照版）","status":"一部確認","sources":[{"url":"https://www.gordontraining.com/free-workplace-articles/active-listening/","title":"著者・出版社による原著・書誌情報"}],"attribution":"Carl R. Rogers / Richard E. Farson（関連文献の著者）"}'::jsonb where id='kb_406';
create function public.check_theory_taxonomy() returns trigger language plpgsql security definer set search_path='' as $fn$
declare t public.theories;begin
 select * into t from public.theories where id=new.id;
 if t.status='published' and (t.subcategory_id is null or t.taxonomy_order is null or not exists(select 1 from public.theory_subcategories where id=t.subcategory_id and category_id=t.category_id)) then
 raise exception '大分類に属する内部分類と並び順を指定してください。' using errcode='23514';end if;
 return new;end $fn$;
create constraint trigger theory_taxonomy_integrity after insert or update on public.theories deferrable initially deferred for each row execute function public.check_theory_taxonomy();
create function public.place_theory_in_subcategory(target_id text,target_subcategory text,target_order integer) returns void
language plpgsql security definer set search_path='' as $fn$
declare item public.theories;ids text[];requested integer;begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
 select * into item from public.theories where id=target_id for update;
 if item.canonical_id is not null and item.canonical_id<>item.id then raise exception '統合済みIDは編集できません。';end if;
 if not exists(select 1 from public.theory_subcategories where id=target_subcategory and category_id=item.category_id) then raise exception 'この大分類の内部分類を選択してください。' using errcode='23503';end if;
 if target_order is not null and target_order<1 then raise exception '並び順は1以上の整数にしてください。';end if;
 select coalesce(array_agg(id order by taxonomy_order nulls last,display_id,id),'{}') into ids from public.theories where subcategory_id=target_subcategory and status=item.status and id<>target_id;
 requested:=greatest(1,least(coalesce(target_order,cardinality(ids)+1),cardinality(ids)+1));
 ids:=ids[1:requested-1]||array[target_id]||ids[requested:cardinality(ids)];
 update public.theories t set subcategory_id=target_subcategory,taxonomy_order=x.ord,updated_at=now() from unnest(ids) with ordinality x(id,ord) where t.id=x.id;
 with ranked as (select id,row_number() over(partition by subcategory_id,status order by taxonomy_order nulls last,id) ord from public.theories where subcategory_id in(target_subcategory,item.subcategory_id) and status in('published','draft'))
 update public.theories t set taxonomy_order=r.ord from ranked r where t.id=r.id and t.taxonomy_order is distinct from r.ord;
end $fn$;
create function public.reorder_subcategory_theories(target_id text,target_ids text[]) returns void language plpgsql security definer set search_path='' as $fn$
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
 if cardinality(target_ids)<>(select count(*) from public.theories where status='published' and subcategory_id=target_id)
 or cardinality(target_ids)<>(select count(distinct id) from unnest(target_ids) id)
 or exists(select 1 from unnest(target_ids) requested(id) where not exists(select 1 from public.theories t where t.id=requested.id and t.subcategory_id=target_id and t.status='published')) then raise exception '内部分類の全理論を重複なく指定してください。';end if;
 update public.theories t set taxonomy_order=x.ord,updated_at=now() from unnest(target_ids) with ordinality x(id,ord) where t.id=x.id;
end $fn$;
create function public.save_theory_subcategory(target_id text,target_category text,target_title text,target_order integer) returns void language plpgsql security definer set search_path='' as $fn$
declare ids text[];requested integer;begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
 if nullif(trim(target_id),'') is null or nullif(trim(target_title),'') is null or target_order is null or target_order<1 or not exists(select 1 from public.content_categories where kind='theory' and id=target_category) then raise exception '大分類、名称、並び順を指定してください。';end if;
 if exists(select 1 from public.theory_subcategories where id=target_id and category_id<>target_category) then raise exception '内部分類の所属大分類は変更できません。';end if;
 if exists(select 1 from public.theory_subcategories where category_id=target_category and title=trim(target_title) and id<>target_id) then raise exception '同じ大分類内の名称は重複できません。';end if;
 select coalesce(array_agg(id order by display_order,id),'{}') into ids from public.theory_subcategories where category_id=target_category and id<>target_id;
 requested:=greatest(1,least(target_order,cardinality(ids)+1));
 ids:=ids[1:requested-1]||array[target_id]||ids[requested:cardinality(ids)];
 insert into public.theory_subcategories(id,category_id,title,display_order) values(target_id,target_category,trim(target_title),target_order)
 on conflict(id) do update set title=excluded.title,display_order=excluded.display_order;
 update public.theory_subcategories s set display_order=x.ord from unnest(ids) with ordinality x(id,ord) where s.id=x.id;
 -- Refresh secure projections when the section is renamed.
 update public.theories set updated_at=now() where subcategory_id=target_id;
end $fn$;
create function public.delete_theory_subcategory(target_id text) returns void language plpgsql security definer set search_path='' as $fn$
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
 if exists(select 1 from public.theories where subcategory_id=target_id) then raise exception '先に理論を別の内部分類へ移動してください。';end if;
 delete from public.theory_subcategories where id=target_id;
end $fn$;
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
  update public.theories set title=trim(payload->>'title'),summary=trim(payload->>'summary'),
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
  update public.theories set title=coalesce(payload->>'title',''),summary=coalesce(payload->>'summary',''),
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

revoke all on function public.sync_taxonomy_paid_theory(),public.check_theory_taxonomy(),public.place_theory_in_subcategory(text,text,integer),public.reorder_subcategory_theories(text,text[]),public.save_theory_subcategory(text,text,text,integer),public.delete_theory_subcategory(text) from public;
grant execute on function public.place_theory_in_subcategory(text,text,integer),public.reorder_subcategory_theories(text,text[]),public.save_theory_subcategory(text,text,text,integer),public.delete_theory_subcategory(text) to authenticated;
set constraints all immediate;
do $audit$ begin
 if (select count(*) from public.theories where status='published')<>754 then raise exception 'Published count mismatch';end if;
 if (select count(*) from public.theories where status='archived' and canonical_id<>id)<>5 then raise exception 'Alias count mismatch';end if;
 if exists(select 1 from public.theories t where status='published' and (subcategory_id is null or taxonomy_order is null)) then raise exception 'Unclassified theory';end if;
 if exists(select 1 from public.techniques t cross join lateral jsonb_array_elements_text(t.theory_ids) r(id) left join public.theories k on k.id=r.id where t.status<>'archived' and (k.id is null or k.status<>'published')) then raise exception 'Technique relation broken';end if;
 if exists(select 1 from public.theories t cross join lateral jsonb_array_elements_text(t.related_theory_ids) r(id) left join public.theories k on k.id=r.id where t.status='published' and (k.id is null or k.status<>'published' or t.id=r.id)) then raise exception 'Theory relation broken';end if;
 if (select count(*) from public.public_theories)<>759 then raise exception 'Old client compatibility mismatch';end if;
end $audit$;
