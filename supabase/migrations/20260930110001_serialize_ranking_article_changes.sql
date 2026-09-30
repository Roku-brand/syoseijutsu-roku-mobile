-- Lock candidate articles through commit so concurrent archiving cannot leave
-- a newly published ranking with fewer than ten entries.
create or replace function public.publish_popular_ranking(target_division text,ordered_ids jsonb,expected_updated_at timestamptz)
returns public.popular_rankings language plpgsql security definer set search_path='' as $$
declare current_row public.popular_rankings; valid_count integer; result_row public.popular_rankings;
begin
 if auth.uid() is null or not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 if target_division not in ('technique','theory') or target_division is null then raise exception '部門を選択してください。' using errcode='22023'; end if;
 if ordered_ids is null or jsonb_typeof(ordered_ids)<>'array' then raise exception '10件の記事を選択してください。' using errcode='22023'; end if;
 if jsonb_array_length(ordered_ids)<>10 or (select count(distinct value) from jsonb_array_elements_text(ordered_ids))<>10 then raise exception '重複のない10件の記事を選択してください。' using errcode='22023'; end if;
 select * into current_row from public.popular_rankings where division=target_division for update;
 if current_row.updated_at is distinct from expected_updated_at then raise exception '別の画面でランキングが変更されています。再読み込みしてください。' using errcode='40001'; end if;
 if target_division='technique' then
  select count(*) into valid_count from (select t.id from public.techniques t where t.status='published' and t.id in (select value from jsonb_array_elements_text(ordered_ids)) order by t.id for share) locked;
 else
  select count(*) into valid_count from (select t.id from public.theories t where t.status='published' and t.id in (select value from jsonb_array_elements_text(ordered_ids)) order by t.id for share) locked;
 end if;
 if valid_count<>10 then raise exception '公開中の記事だけを選択できます。' using errcode='22023'; end if;
 update public.popular_rankings set content_ids=ordered_ids,updated_at=clock_timestamp() where division=target_division returning * into result_row;
 return result_row;
end $$;
