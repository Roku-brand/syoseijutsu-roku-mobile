-- Publishing a draft into the globally unique theory sequence must first free
-- every occupied ID, then write the final dense sequence in the same txn.
create or replace function public.move_theory_display_id(target_theory_id text,target_display_id integer,target_status text,target_category_id text default null)
returns public.theories language plpgsql security definer set search_path=''
as $$
declare
  item public.theories;
  ids text[];
  next_ids text[];
  draft_ids text[];
  next_draft_ids text[];
  requested integer;
  current_count integer;
  draft_count integer;
  draft_position integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if target_status not in ('draft','published') then raise exception '公開状態が不正です。' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
  select * into item from public.theories where id=target_theory_id for update;
  if not found then raise exception 'theory_not_found' using errcode='P0002'; end if;
  if target_category_id is not null and not exists(select 1 from public.content_categories where kind='theory' and id=target_category_id) then
    raise exception '理論カテゴリを選択してください。' using errcode='23503';
  end if;
  select coalesce(array_agg(id order by display_id),'{}'::text[]) into ids
    from public.theories where status='published' and id<>target_theory_id;
  current_count:=cardinality(ids);
  select coalesce(array_agg(id order by draft_display_id),'{}'::text[]) into draft_ids
    from public.theories where status='draft' and id<>target_theory_id;
  draft_count:=cardinality(draft_ids);
  if target_status='draft' then
    draft_position:=greatest(1,least(coalesce(target_display_id,item.draft_display_id,item.display_id,draft_count+1),draft_count+1));
    next_draft_ids:=draft_ids[1:draft_position-1]||array[target_theory_id]||draft_ids[draft_position:draft_count];
    if item.status='published' then
      update public.theories set status='draft',display_id=null,display_order=null,
        draft_display_id=-2147483647,
        category_id=coalesce(target_category_id,category_id),updated_at=now(),updated_by=auth.uid()
      where id=target_theory_id;
      if current_count>0 then perform public.reorder_content('theory','',ids); end if;
    else
      update public.theories set status='draft',display_id=null,display_order=null,
        draft_display_id=-2147483647,
        category_id=coalesce(target_category_id,category_id),updated_at=now(),updated_by=auth.uid()
      where id=target_theory_id;
    end if;
    perform public.reorder_theory_drafts(next_draft_ids);
  else
    requested:=greatest(1,least(coalesce(target_display_id,item.draft_display_id,item.display_id,current_count+1),current_count+1));
    next_ids:=ids[1:requested-1]||array[target_theory_id]||ids[requested:current_count];
    if item.status='published' then
      update public.theories set display_id=-display_id where status='published';
      update public.theories set category_id=coalesce(target_category_id,category_id),display_id=-2147483647,
        updated_at=now(),updated_by=auth.uid() where id=target_theory_id;
    else
      update public.theories set display_id=-display_id where status='published';
      update public.theories set category_id=coalesce(target_category_id,category_id),status='published',display_id=-2147483647,
        draft_display_id=null,updated_at=now(),updated_by=auth.uid() where id=target_theory_id;
      perform public.reorder_theory_drafts(draft_ids);
    end if;
    update public.theories set display_id=array_position(next_ids,id),updated_at=now()
      where status='published' and id=any(next_ids);
  end if;
  select * into item from public.theories where id=target_theory_id;
  return item;
end;
$$;
revoke all on function public.move_theory_display_id(text,integer,text,text) from public;
grant execute on function public.move_theory_display_id(text,integer,text,text) to authenticated;
