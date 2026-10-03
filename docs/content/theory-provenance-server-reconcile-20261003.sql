-- Reconcile the previously reviewed classical source; guard the exact stale state.
do $reconcile$
declare bodies_before text; projection_before text; changed integer;
begin
lock table public.theories in share row exclusive mode;
lock table public.paid_content in share row exclusive mode;
if not exists(select 1 from public.theories where id='kb_504' and title='優れた勝利は、目立たない' and provenance='{"note":"現時点で、特定の提唱者・研究・著作を確実に確認できていません。","status":"出典不明"}'::jsonb)
then raise exception 'Classical provenance baseline changed'; end if;
select md5(jsonb_agg(to_jsonb(t)-'provenance'-'updated_at'-'updated_by' order by id)::text) into bodies_before from public.theories t;
select md5(jsonb_agg(jsonb_build_array(content_type,content_id,payload-'provenance',sort_order) order by content_type,content_id)::text) into projection_before from public.paid_content;
update public.theories set provenance=$source${"status":"確認済み","attribution":"孫武に伝統的に帰される『孫子』","period":"古代中国（成立年代・編纂過程には議論があります）","works":["『孫子』軍形篇（第4篇）"],"sources":[{"title":"原典・公開資料","url":"https://www.gutenberg.org/files/132/132-h/132-h.htm"}],"note":"原典の文脈を確認し、意味が単独で伝わる見出しと概要に再編集。元の軍事的文脈と日常生活への応用を区別します。"}$source$::jsonb,updated_at=now() where id='kb_504';
get diagnostics changed = row_count;
if changed<>1 then raise exception 'Classical update count mismatch'; end if;
if bodies_before is distinct from (select md5(jsonb_agg(to_jsonb(t)-'provenance'-'updated_at'-'updated_by' order by id)::text) from public.theories t)
then raise exception 'Theory bodies changed'; end if;
if projection_before is distinct from (select md5(jsonb_agg(jsonb_build_array(content_type,content_id,payload-'provenance',sort_order) order by content_type,content_id)::text) from public.paid_content)
then raise exception 'Paid bodies changed'; end if;
if exists(select 1 from public.theories t left join public.paid_content p on p.content_type='theory' and p.content_id=t.id where t.id='kb_504' and t.access_tier='complete' and (p.content_id is null or p.payload->'provenance' is distinct from t.provenance))
then raise exception 'Classical projection mismatch'; end if;
end $reconcile$;
select id,provenance from public.theories where id='kb_504';
