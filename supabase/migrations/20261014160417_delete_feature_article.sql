-- Deletion is separate from reversible archiving. Shared media is retained.
create function public.delete_feature_article(target_id text,expected_updated_at timestamptz,expected_revision integer)
returns void language plpgsql security invoker set search_path='' as $$
declare current_row public.feature_articles; related_row public.feature_articles; draft_revision integer; new_version timestamptz;
begin
 if auth.uid() is null or not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 -- A small editorial collection: serialize writes while cleaning both live and draft links.
 lock table public.feature_articles,public.feature_article_drafts in share row exclusive mode;
 select * into current_row from public.feature_articles where id=target_id for update;
 if not found then raise exception '記事が見つかりません。再読み込みしてください。' using errcode='22023'; end if;
 select revision into draft_revision from public.feature_article_drafts where article_id=target_id for update;
 if current_row.updated_at is distinct from expected_updated_at or draft_revision is distinct from expected_revision then
  raise exception '記事または下書きが別の画面で変更されています。再読み込みしてください。' using errcode='40001';
 end if;
 new_version:=clock_timestamp();
 for related_row in select * from public.feature_articles where id<>target_id and target_id=any(related_feature_ids) loop
  update public.feature_articles set related_feature_ids=array_remove(related_feature_ids,target_id),updated_at=new_version where id=related_row.id;
  update public.feature_article_drafts set base_updated_at=case when base_updated_at=related_row.updated_at then new_version else base_updated_at end,revision=revision+1 where article_id=related_row.id;
 end loop;
 update public.feature_article_drafts d set
  payload=case when d.payload->'related_feature_ids' @> jsonb_build_array(target_id) then
   jsonb_set(d.payload,'{related_feature_ids}',(select coalesce(jsonb_agg(item.value order by item.ordinality),'[]'::jsonb)
    from jsonb_array_elements(d.payload->'related_feature_ids') with ordinality item(value,ordinality) where item.value<>to_jsonb(target_id)))
   else d.payload end,
  revision=d.revision+1
 where d.article_id<>target_id and d.payload->'related_feature_ids' @> jsonb_build_array(target_id);
 delete from public.feature_articles where id=target_id;
end $$;
revoke all on function public.delete_feature_article(text,timestamptz,integer) from public,anon;
grant execute on function public.delete_feature_article(text,timestamptz,integer) to authenticated;
