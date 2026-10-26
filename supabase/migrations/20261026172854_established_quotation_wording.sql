-- Owner approved: established wording and reviewed bounds for undated ancient texts.
DO $guard$
begin
 if md5(pg_get_functiondef('public.validate_quotation_metadata()'::regprocedure)) <> '7360dd76a19fa08bf9391f8967cac179' then
  raise exception 'Quotation validation changed; review before applying.';
 end if;
end;
$guard$;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
 values('familiar-aphorisms-20261027-before','function','validate_quotation_metadata',
 jsonb_build_object('definition',pg_get_functiondef('public.validate_quotation_metadata()'::regprocedure)))
 on conflict do nothing;

CREATE OR REPLACE FUNCTION public.validate_quotation_metadata()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
declare q jsonb; f text; death_year text; publication_year text;
begin
 if new.status<>'published' or (new.knowledge_type<>'aphorism' and new.quotation is null) then return new; end if;
 q:=new.quotation;
 if q is null or q->>'verification' is distinct from 'verified' or q->>'rightsStatus' is distinct from 'cleared' then
  raise exception '原典と権利の確認が済むまで格言は公開できません。' using errcode='23514';
 end if;
 foreach f in array array['originalText','translationText','author','work','locator','rightsBasis'] loop
  if nullif(trim(q->>f),'') is null then raise exception '格言の監査記録が不足しています: %',f using errcode='23514'; end if;
 end loop;
 death_year:=coalesce(q->>'authorDeathYear',q->>'authorDeathYearUpperBound','');
 publication_year:=coalesce(q->>'publicationYear',q->>'publicationYearUpperBound','');
 if death_year !~ '^-?[0-9]+$' or publication_year !~ '^-?[0-9]+$' then
  raise exception '死亡年・刊行年または確認済み上限年を確認してください。' using errcode='23514';
 end if;
 if death_year::integer>1950 or publication_year::integer>1950 then
  raise exception '今回の格言の権利審査対象外です。' using errcode='23514';
 end if;
 if coalesce(q->>'translationKind','') not in ('original_japanese','independent_translation','classical_transcription','established_translation')
  or coalesce(q->>'checkedOn','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or jsonb_typeof(q->'sourceUrls') is distinct from 'array' then
  raise exception '翻訳区分・確認日・資料が必要です。' using errcode='23514';
 end if;
 if jsonb_array_length(q->'sourceUrls')=0 or exists(select 1 from jsonb_array_elements_text(q->'sourceUrls') u where u !~ '^https://[^[:space:]]+$') then
  raise exception '原典の確認資料URLが必要です。' using errcode='23514';
 end if;
 if q->>'translationKind'='established_translation' and
  (nullif(trim(q->>'translationSourceUrl'),'') is null or not (q->'sourceUrls' @> jsonb_build_array(q->>'translationSourceUrl'))) then
  raise exception '定着した日本語表現を確認できる資料URLを記録してください。' using errcode='23514';
 end if;
 new.title:='「'||(q->>'translationText')||'」';
 new.summary:='「'||(q->>'translationText')||'」'||chr(10)||'— '||(q->>'author')||chr(10)||(q->>'work')||chr(10)||chr(10)||coalesce(q->>'contextNote','');
 return new;
end;
$function$;
