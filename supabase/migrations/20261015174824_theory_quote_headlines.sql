-- Public quotation headlines requested by the owner; no change to paid source/context access.
select pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));
lock table public.theories,public.theory_subcategories in share row exclusive mode;
do $check$ begin
 if (select count(*) from public.theories where status='published' and quotation is not null)<>19 then raise exception 'Quotation catalogue changed; review a fresh backup.';end if;
 if exists(select 1 from jsonb_to_recordset('[{"id":"kb_595","title":"準備された心","subcategory_id":"classics-thought-p","taxonomy_order":20,"translation":"観察の場では、偶然は準備のできた心だけに味方する。"},{"id":"theory-22667bdf-940f-4226-b7ea-28a72128af6b","title":"友人を見る角度","subcategory_id":"classics-thought-p","taxonomy_order":22,"translation":"友人の片目が不自由なら、私はその人を横顔から見る。"},{"id":"theory-386c4608-d46d-4782-b912-36c85aa8024d","title":"友情と恋を変える時間","subcategory_id":"classics-thought-p","taxonomy_order":21,"translation":"時間は友情を強くし、恋を弱くする。"},{"id":"theory-4a83dca9-828a-4f93-8c7c-f945b36de56a","title":"自由と山頂の空気","subcategory_id":"classics-thought-f","taxonomy_order":4,"translation":"自由は山頂の空気に似ている。どちらも弱い者には堪えることはできない。"},{"id":"theory-4e128612-e3f0-4eb9-9c09-e3503466521d","title":"友に自分を与える","subcategory_id":"classics-thought-p","taxonomy_order":23,"translation":"真の友情では、友を自分へ引き寄せる以上に、自分を友に与える。"},{"id":"theory-5f7a3841-2826-4bf5-8da4-d7265b80de9b","title":"人生とマッチ箱","subcategory_id":"classics-thought-f","taxonomy_order":7,"translation":"人生は一箱のマッチに似ている。重大に扱うのは莫迦莫迦しい。重大に扱わなければ危険である。"},{"id":"theory-62543145-f91d-448d-aece-2a44802164f8","title":"不機嫌という罪","subcategory_id":"classics-thought-f","taxonomy_order":8,"translation":"人間の罪のなかで、私が何より憎むのは不機嫌だ。"},{"id":"theory-8989915e-3d28-4fad-9521-1bdece206b3f","title":"墨の嘘と血の事実","subcategory_id":"classics-thought-f","taxonomy_order":3,"translation":"墨で書いた嘘は、血で書かれた事実を決して覆い隠せない。"},{"id":"theory-8bc430c4-f80e-4e74-bb04-aca4a0d9c8bf","title":"友情と欠点の指摘","subcategory_id":"classics-thought-p","taxonomy_order":25,"translation":"友情のいちばん難しい仕事は、自分の欠点を見せることではなく、友人にその人自身の欠点を気づかせることだ。"},{"id":"theory-8cd3b27e-6948-4ad0-b961-46eb047b1b67","title":"友情における疑い","subcategory_id":"classics-thought-p","taxonomy_order":24,"translation":"友人を疑うことは、友人にだまされることより恥ずかしい。"},{"id":"theory-a16caa2e-318b-4527-bd2a-0dfb9b6a1f33","title":"涙で食べるパン","subcategory_id":"classics-thought-f","taxonomy_order":9,"translation":"涙でパンを食べたことも、悲しみの夜を寝台で泣いて過ごしたこともない者は、天上の力であるあなたがたを知らない。"},{"id":"theory-a70e3a53-86c5-45e0-afb4-97e081936b53","title":"貸した金と失う友","subcategory_id":"classics-thought-f","taxonomy_order":15,"translation":"借り手にも貸し手にもなるな。貸せば、金も友も失いがちだから。"},{"id":"theory-acb4311e-b6ca-416c-8d06-06cff53444b2","title":"恋の飢えと充足","subcategory_id":"classics-thought-f","taxonomy_order":12,"translation":"恋は飢えによって生き、食べ物を与えられて死ぬ。"},{"id":"theory-b16cc75c-68d0-4873-b989-2ed788bd404b","title":"人気と凡庸","subcategory_id":"classics-thought-f","taxonomy_order":5,"translation":"人気者になるには、凡庸でなければならない。"},{"id":"theory-ba3eb39f-7dd4-4795-8eb0-c17c2b34fd1e","title":"青春という実験","subcategory_id":"classics-thought-f","taxonomy_order":13,"translation":"青春は、何もかも実験である。"},{"id":"theory-c83321fd-d076-4d5c-b270-6af925c204a5","title":"幸福の自覚","subcategory_id":"classics-thought-f","taxonomy_order":6,"translation":"人は、自分が幸福だと知らないから不幸なのだ。ただそれだけのために。"},{"id":"theory-d15357a9-73da-4286-859e-91a7ebcb5f85","title":"発見の途上にある幸福","subcategory_id":"classics-thought-f","taxonomy_order":14,"translation":"コロンブスが幸福だったのは、アメリカを発見したときではなく、発見しつつあったときだ。"},{"id":"theory-e1df3caa-9877-4eed-a549-162cc3bdaca0","title":"恋愛の詩的表現","subcategory_id":"classics-thought-f","taxonomy_order":11,"translation":"恋愛はただ性欲の詩的表現を受けたものである。"},{"id":"theory-e634c0c0-8300-44e5-a28f-916300973eb1","title":"自分という欺きやすい相手","subcategory_id":"classics-thought-f","taxonomy_order":10,"translation":"いちばんだましやすい相手は、自分自身だ。"}]'::jsonb) x(id text,title text,subcategory_id text,taxonomy_order integer,translation text) left join public.theories t using(id) where t.id is null or (t.title,t.subcategory_id,t.taxonomy_order,t.quotation->>'translationText') is distinct from (x.title,x.subcategory_id,x.taxonomy_order,x.translation)) then raise exception 'Quotation headings changed; migration aborted.';end if;
 if (select count(*) from public.theory_subcategories where (id,title) in (('classics-thought-p','ことわざ・格言'),('classics-thought-f','文学')))<>2 then raise exception 'Subcategory names changed; migration aborted.';end if;
end $check$;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'quote-headlines-20261016','theories',id,to_jsonb(t) from public.theories t where category_id='classics-thought' on conflict do nothing;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'quote-headlines-20261016','theory_subcategories',id,to_jsonb(s) from public.theory_subcategories s where id in ('classics-thought-p','classics-thought-f') on conflict do nothing;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot) values
('quote-headlines-20261016','function','validate_quotation_metadata',jsonb_build_object('definition',pg_get_functiondef('public.validate_quotation_metadata()'::regprocedure))) on conflict do nothing;
CREATE OR REPLACE FUNCTION public.validate_quotation_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
 -- The approved Japanese quotation is the public card headline; source and commentary remain gated.
 new.title:='「'||(q->>'translationText')||'」';
 new.summary:='「'||(q->>'translationText')||'」'||chr(10)||'— '||(q->>'author')||chr(10)||(q->>'work')||chr(10)||chr(10)||coalesce(q->>'contextNote','');
 return new;
end $function$
;
update public.theory_subcategories set title=case id when 'classics-thought-p' then 'ことわざ' else '格言' end where id in ('classics-thought-p','classics-thought-f');
-- Retain stable IDs/display IDs, and put attributed quotations together in the existing final section.
with ordered as (select id,row_number() over(order by case when subcategory_id='classics-thought-f' then 0 else 1 end,taxonomy_order,id)::integer as n from public.theories where status='published' and (subcategory_id='classics-thought-f' or quotation is not null))
update public.theories t set title=case when quotation is not null then '「'||(quotation->>'translationText')||'」' else title end,subcategory_id='classics-thought-f',taxonomy_order=o.n,updated_at=now() from ordered o where t.id=o.id;
-- All existing proverb rows keep their IDs and relative order; remove gaps after moving six quotations.
with ordered as(select id,row_number() over(order by taxonomy_order,id)::integer as n from public.theories where status='published' and subcategory_id='classics-thought-p') update public.theories t set taxonomy_order=o.n,updated_at=now() from ordered o where t.id=o.id;
do $verify$ begin
 if (select count(*) from public.theory_subcategories)<>36 or (select count(*) from public.theories where status='published')<>821 then raise exception 'Catalogue count changed unexpectedly.';end if;
 if exists(select 1 from public.theories where status='published' and quotation is not null and (title is distinct from '「'||(quotation->>'translationText')||'」' or subcategory_id<>'classics-thought-f')) then raise exception 'Quotation headline invariant failed.';end if;
end $verify$;
