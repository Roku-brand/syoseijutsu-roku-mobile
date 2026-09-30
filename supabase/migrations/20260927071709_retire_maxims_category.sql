-- Replace the retired maxim category with practical wisdom in the owner catalogue.
create or replace function public.validate_theory_content()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare category_name text;
begin
  if new.status = 'archived' then return new; end if;
  category_name := case new.category_id
    when 'psychology' then '心理学'
    when 'behavioral-science' then '行動科学'
    when 'organization-management' then '組織・経営論'
    when 'strategy' then '戦略論'
    when 'practical-wisdom' then '実践知'
    when 'classics-thought' then '古典・思想'
  end;
  if category_name is null then raise exception '理論カテゴリを選択してください。' using errcode='22023'; end if;
  if nullif(trim(new.title),'') is null or nullif(trim(new.summary),'') is null then
    raise exception 'タイトルと概要は公開に必須です。' using errcode='22023';
  end if;
  new.category_title := category_name;
  if jsonb_typeof(new.aliases) <> 'array' or jsonb_typeof(new.related_theory_ids) <> 'array' then
    raise exception '別名と関連理論の形式が不正です。' using errcode='22023';
  end if;
  if new.related_theory_ids ? new.id then raise exception '自分自身を関連理論に指定できません。' using errcode='22023'; end if;
  if new.provenance is not null then
    if coalesce(new.provenance->>'status','') not in ('確認済み','書誌確認済み','一部確認','出典不明') then
      raise exception '出典状態を選択してください。' using errcode='22023';
    end if;
    if exists(
      select 1 from jsonb_array_elements(coalesce(new.provenance->'sources','[]'::jsonb)) s
      where coalesce(s->>'url','') !~ '^https://[^[:space:]]+$'
        or nullif(trim(s->>'title'),'') is null
    ) then
      raise exception '参照先には名称とhttpsのURLを入力してください。' using errcode='22023';
    end if;
  end if;
  return new;
end;
$function$;
