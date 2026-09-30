-- Keep existing IDs in their current space while the sequence helper frees
-- positions; each category reorder then performs the single required shift.
create or replace function public.move_theory_display_id(target_theory_id text,target_display_id integer,target_status text,target_category_id text default null)
returns public.theories language plpgsql security definer set search_path=''
as $$
declare
  item public.theories;
  source_category text;
  destination_category text;
  source_ids text[]:='{}'::text[];
  destination_ids text[]:='{}'::text[];
  source_draft_ids text[]:='{}'::text[];
  destination_draft_ids text[]:='{}'::text[];
  next_ids text[]:='{}'::text[];
  next_draft_ids text[]:='{}'::text[];
  destination_count integer;
  draft_destination_count integer;
  requested integer;
begin
  if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
  if target_status not in ('draft','published') then raise exception '公開状態が不正です。' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('theory-display-id',0));
  select * into item from public.theories where id=target_theory_id for update;
  if not found then raise exception 'theory_not_found' using errcode='P0002'; end if;
  source_category:=item.category_id;
  destination_category:=coalesce(target_category_id,source_category);
  if not exists(select 1 from public.content_categories where kind='theory' and id=destination_category) then
    raise exception '理論カテゴリを選択してください。' using errcode='23503';
  end if;

  if item.status='published' then
    select coalesce(array_agg(id order by display_id),'{}'::text[]) into source_ids
      from public.theories where status='published' and category_id=source_category and id<>target_theory_id;
  end if;
  if destination_category=source_category and item.status='published' then
    destination_ids:=source_ids;
  else
    select coalesce(array_agg(id order by display_id),'{}'::text[]) into destination_ids
      from public.theories where status='published' and category_id=destination_category and id<>target_theory_id;
  end if;
  if item.status='draft' then
    select coalesce(array_agg(id order by draft_display_id),'{}'::text[]) into source_draft_ids
      from public.theories where status='draft' and category_id=source_category and id<>target_theory_id;
  end if;
  if destination_category=source_category and item.status='draft' then
    destination_draft_ids:=source_draft_ids;
  else
    select coalesce(array_agg(id order by draft_display_id),'{}'::text[]) into destination_draft_ids
      from public.theories where status='draft' and category_id=destination_category and id<>target_theory_id;
  end if;

  if target_status='draft' then
    draft_destination_count:=cardinality(destination_draft_ids);
    requested:=greatest(1,least(coalesce(target_display_id,item.draft_display_id,item.display_id,draft_destination_count+1),draft_destination_count+1));
    next_draft_ids:=destination_draft_ids[1:requested-1]||array[target_theory_id]||destination_draft_ids[requested:draft_destination_count];
    update public.theories set status='draft',display_id=null,display_order=null,
      draft_display_id=-2147483647,category_id=destination_category,
      category_title=(select title from public.content_categories where kind='theory' and id=destination_category),
      updated_at=now(),updated_by=auth.uid()
    where id=target_theory_id;
    if item.status='published' and cardinality(source_ids)>0 then
      perform public.reorder_content('theory',source_category,source_ids);
    elsif item.status='draft' and source_category<>destination_category and cardinality(source_draft_ids)>0 then
      perform public.reorder_theory_drafts(source_draft_ids);
    end if;
    perform public.reorder_theory_drafts(next_draft_ids);
  else
    destination_count:=cardinality(destination_ids);
    requested:=greatest(1,least(coalesce(target_display_id,item.draft_display_id,item.display_id,destination_count+1),destination_count+1));
    next_ids:=destination_ids[1:requested-1]||array[target_theory_id]||destination_ids[requested:destination_count];
    update public.theories set status='published',display_id=-2147483647,draft_display_id=null,
      category_id=destination_category,
      category_title=(select title from public.content_categories where kind='theory' and id=destination_category),
      updated_at=now(),updated_by=auth.uid()
    where id=target_theory_id;
    if item.status='published' and source_category<>destination_category and cardinality(source_ids)>0 then
      perform public.reorder_content('theory',source_category,source_ids);
    elsif item.status='draft' and cardinality(source_draft_ids)>0 then
      perform public.reorder_theory_drafts(source_draft_ids);
    end if;
    perform public.reorder_content('theory',destination_category,next_ids);
  end if;
  select * into item from public.theories where id=target_theory_id;
  return item;
end;
$$;
revoke all on function public.move_theory_display_id(text,integer,text,text) from public;
grant execute on function public.move_theory_display_id(text,integer,text,text) to authenticated;
