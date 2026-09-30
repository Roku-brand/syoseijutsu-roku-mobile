-- Editorial rankings are separate from reading analytics and catalogue order.
create table public.popular_rankings (
 division text primary key check (division in ('technique','theory')),
 content_ids jsonb not null check (jsonb_typeof(content_ids)='array' and jsonb_array_length(content_ids)=10),
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.popular_rankings enable row level security;
create policy "owners read ranking configuration" on public.popular_rankings for select to authenticated using ((select public.is_owner()));
revoke all on public.popular_rankings from anon,authenticated;
grant select on public.popular_rankings to authenticated;
insert into public.popular_rankings(division,content_ids)
select 'technique', jsonb_agg(t.id order by p.ordinality)
-- These are authored catalogue keys, not generated database UUIDs.
from unnest(array['master336-001','master336-007','master336-172','master336-050','master336-250','master336-052','master336-187','master336-266','master336-003','master336-188']) with ordinality p(id,ordinality)
join public.techniques t on t.id=p.id and t.status='published'
having count(*)=10
on conflict(division) do nothing;
insert into public.popular_rankings(division,content_ids)
select 'theory', jsonb_agg(t.id order by p.ordinality)
-- These are authored catalogue keys, not generated database UUIDs.
from unnest(array['kb_001','kb_002','kb_004','kb_003','kb_029','kb_047','kb_138','kb_134','kb_104','kb_284']) with ordinality p(id,ordinality)
join public.theories t on t.id=p.id and t.status='published'
having count(*)=10
on conflict(division) do nothing;
do $$ begin
 if (select count(*) from public.popular_rankings)<>2 then
  raise exception 'Both ranking divisions must be initialized with ten published entries';
 end if;
end $$;

-- The public response contains only the same title/category shell exposed in
-- the catalogue. SECURITY DEFINER is needed to read the owner-only configuration
-- and title shells regardless of edition. No article body leaves this function.
create function public.get_popular_rankings()
returns table(division text,content_id text,rank bigint,title text,category_id text,category_title text,access_tier text)
language sql stable security definer set search_path='' as $$
 with content as (
  select 'technique'::text kind,t.id,t.title,t.category category_id,t.access_tier,t.status from public.techniques t
  union all
  select 'theory',t.id,t.title,t.category_id,t.access_tier,t.status from public.theories t
 )
 select r.division,c.id,row_number() over(partition by r.division order by p.ordinality),c.title,c.category_id,
 coalesce(cat.title,c.category_id),c.access_tier
 from public.popular_rankings r
 cross join lateral jsonb_array_elements_text(r.content_ids) with ordinality p(id,ordinality)
 join content c on c.kind=r.division and c.id=p.id and c.status='published'
 left join public.content_categories cat on cat.kind=c.kind and cat.id=c.category_id
 order by r.division,p.ordinality;
$$;
revoke all on function public.get_popular_rankings() from public;
grant execute on function public.get_popular_rankings() to anon,authenticated;

create function public.get_ranking_candidates()
returns table(division text,id text,title text,category text)
language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null or not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 return query
 select 'technique'::text,t.id,t.title,coalesce(c.title,t.category)
 from public.techniques t left join public.content_categories c on c.kind='technique' and c.id=t.category where t.status='published'
 union all
 select 'theory',t.id,t.title,coalesce(c.title,t.category_id)
 from public.theories t left join public.content_categories c on c.kind='theory' and c.id=t.category_id where t.status='published';
end $$;
revoke all on function public.get_ranking_candidates() from public,anon;
grant execute on function public.get_ranking_candidates() to authenticated;

create function public.publish_popular_ranking(target_division text,ordered_ids jsonb,expected_updated_at timestamptz)
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
  select count(*) into valid_count from public.techniques t where t.status='published' and t.id in (select value from jsonb_array_elements_text(ordered_ids));
 else
  select count(*) into valid_count from public.theories t where t.status='published' and t.id in (select value from jsonb_array_elements_text(ordered_ids));
 end if;
 if valid_count<>10 then raise exception '公開中の記事だけを選択できます。' using errcode='22023'; end if;
 update public.popular_rankings set content_ids=ordered_ids,updated_at=clock_timestamp() where division=target_division returning * into result_row;
 return result_row;
end $$;
revoke all on function public.publish_popular_ranking(text,jsonb,timestamptz) from public,anon;
grant execute on function public.publish_popular_ranking(text,jsonb,timestamptz) to authenticated;

-- Keep both public top tens complete. Replace a ranked entry in the CMS before
-- archiving/deleting it; changing article text or catalogue order is unaffected.
create function public.protect_ranked_content()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.status='published' then return new; end if;
 if exists(select 1 from public.popular_rankings r where r.division=case when tg_table_name='techniques' then 'technique' else 'theory' end and r.content_ids ? old.id) then
  raise exception '人気ランキングに掲載中です。先にランキングの記事を差し替えてください。' using errcode='23514';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
revoke all on function public.protect_ranked_content() from public,anon,authenticated;
create trigger protect_ranked_techniques before update of status or delete on public.techniques for each row execute function public.protect_ranked_content();
create trigger protect_ranked_theories before update of status or delete on public.theories for each row execute function public.protect_ranked_content();
