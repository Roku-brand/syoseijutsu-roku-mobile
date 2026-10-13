-- Free editorial articles. Draft payloads never share a public-readable row.
create table public.feature_articles (
 id text primary key default gen_random_uuid()::text,
 slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,79}$'),
 title text not null default '', lead text not null default '', body text not null default '',
 image_path text, image_alt text not null default '',
 is_featured boolean not null default false, show_in_list boolean not null default true,
 display_order integer not null default 100 check (display_order between 0 and 100000),
 related_technique_ids text[] not null default '{}', related_theory_ids text[] not null default '{}',
 status text not null default 'draft' check (status in ('draft','published','archived')),
 updated_at timestamptz not null default clock_timestamp(),
 check (status <> 'published' or (length(btrim(title)) > 0 and length(btrim(body)) > 0)),
 check (length(title)<=180 and length(lead)<=1500 and length(body)<=100000)
);
create index feature_articles_published_order on public.feature_articles(display_order,id) where status='published';
create table public.feature_article_drafts (
 article_id text primary key references public.feature_articles(id) on delete cascade,
 payload jsonb not null check (jsonb_typeof(payload)='object'),
 image_path text generated always as (payload->>'image_path') stored,
 base_updated_at timestamptz not null,
 revision integer not null default 1 check (revision>0)
);
alter table public.feature_articles enable row level security;
alter table public.feature_article_drafts enable row level security;
revoke all on public.feature_articles,public.feature_article_drafts from anon,authenticated;
grant select on public.feature_articles to anon;
grant select,insert,update,delete on public.feature_articles,public.feature_article_drafts to authenticated;
grant all on public.feature_articles,public.feature_article_drafts to service_role;
create policy "published features are readable" on public.feature_articles for select to anon,authenticated using (status='published');
create policy "owners manage features" on public.feature_articles for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy "owners manage feature drafts" on public.feature_article_drafts for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));

create function public.save_feature_article_draft(target_id text,content jsonb,expected_updated_at timestamptz,expected_revision integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_row public.feature_articles; current_draft public.feature_article_drafts; saved public.feature_article_drafts; article_key text;
begin
 if auth.uid() is null or not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 if content is null or jsonb_typeof(content)<>'object' then raise exception '記事の内容を確認してください。' using errcode='22023'; end if;
 if length(coalesce(content->>'body',''))>100000 or length(coalesce(content->>'title',''))>180 or length(coalesce(content->>'lead',''))>1500 then raise exception '入力が長すぎます。' using errcode='22023'; end if;
 if target_id is null then
  if expected_updated_at is not null or expected_revision is not null then raise exception '記事を再読み込みしてください。' using errcode='40001'; end if;
  article_key:=gen_random_uuid()::text;
  insert into public.feature_articles(id,slug,title) values(article_key,article_key,coalesce(content->>'title','')) returning * into current_row;
 else
  select * into current_row from public.feature_articles where id=target_id for update;
  if not found then raise exception '記事が見つかりません。' using errcode='22023'; end if;
  if current_row.updated_at is distinct from expected_updated_at then raise exception '公開内容が別の画面で変更されています。再読み込みしてください。' using errcode='40001'; end if;
 end if;
 select * into current_draft from public.feature_article_drafts where article_id=current_row.id for update;
 if current_draft.revision is distinct from expected_revision then raise exception '下書きが別の画面で変更されています。再読み込みしてください。' using errcode='40001'; end if;
 insert into public.feature_article_drafts(article_id,payload,base_updated_at,revision)
 values(current_row.id,content,current_row.updated_at,coalesce(current_draft.revision,0)+1)
 on conflict(article_id) do update set payload=excluded.payload,base_updated_at=excluded.base_updated_at,revision=excluded.revision returning * into saved;
 return jsonb_build_object('id',current_row.id,'revision',saved.revision,'base_updated_at',saved.base_updated_at);
end $$;
revoke all on function public.save_feature_article_draft(text,jsonb,timestamptz,integer) from public,anon;
grant execute on function public.save_feature_article_draft(text,jsonb,timestamptz,integer) to authenticated;

create function public.publish_feature_article(target_id text,expected_revision integer)
returns void language plpgsql security invoker set search_path='' as $$
declare current_row public.feature_articles; draft_row public.feature_article_drafts; p jsonb; technique_ids text[]; theory_ids text[]; new_slug text;
begin
 if auth.uid() is null or not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 select * into current_row from public.feature_articles where id=target_id for update;
 if not found then raise exception '記事が見つかりません。' using errcode='22023'; end if;
 select * into draft_row from public.feature_article_drafts where article_id=target_id for update;
 if not found or draft_row.revision is distinct from expected_revision or draft_row.base_updated_at is distinct from current_row.updated_at then raise exception '記事または下書きが変更されています。再読み込みしてください。' using errcode='40001'; end if;
 p:=draft_row.payload; new_slug:=btrim(coalesce(p->>'slug',''));
 if new_slug !~ '^[a-z0-9][a-z0-9-]{0,79}$' then raise exception 'URL名は半角英数字とハイフンで入力してください。' using errcode='22023'; end if;
 if current_row.status<>'draft' and new_slug<>current_row.slug then raise exception '公開済みの記事のURL名は変更できません。' using errcode='22023'; end if;
 if length(btrim(coalesce(p->>'title','')))=0 or length(btrim(coalesce(p->>'body','')))=0 then raise exception 'タイトルと本文を入力してください。' using errcode='22023'; end if;
 if coalesce(p->>'image_path','') not in ('bundled:feature-coast','bundled:feature-forest','bundled:feature-mountain') and coalesce(p->>'image_path','') not like 'feature/%' then raise exception '記事の写真を選択してください。' using errcode='22023'; end if;
 if jsonb_typeof(p->'related_technique_ids') is distinct from 'array' or jsonb_typeof(p->'related_theory_ids') is distinct from 'array' then raise exception '関連する知識を確認してください。' using errcode='22023'; end if;
 select coalesce(array_agg(distinct value),'{}') into technique_ids from jsonb_array_elements_text(p->'related_technique_ids');
 select coalesce(array_agg(distinct value),'{}') into theory_ids from jsonb_array_elements_text(p->'related_theory_ids');
 if exists(select 1 from unnest(technique_ids) requested(id) where not exists(select 1 from public.techniques t where t.id=requested.id and t.status='published')) or exists(select 1 from unnest(theory_ids) requested(id) where not exists(select 1 from public.theories t where t.id=requested.id and t.status='published')) then raise exception '関連する知識は公開中のものを選択してください。' using errcode='22023'; end if;
 update public.feature_articles set slug=new_slug,title=btrim(p->>'title'),lead=coalesce(p->>'lead',''),body=p->>'body',image_path=p->>'image_path',image_alt=coalesce(p->>'image_alt',''),is_featured=coalesce((p->>'is_featured')::boolean,false),show_in_list=coalesce((p->>'show_in_list')::boolean,true),display_order=coalesce((p->>'display_order')::integer,100),related_technique_ids=technique_ids,related_theory_ids=theory_ids,status='published',updated_at=clock_timestamp() where id=target_id;
 delete from public.feature_article_drafts where article_id=target_id;
end $$;
revoke all on function public.publish_feature_article(text,integer) from public,anon;
grant execute on function public.publish_feature_article(text,integer) to authenticated;

create function public.archive_feature_article(target_id text,expected_updated_at timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
declare current_row public.feature_articles; new_version timestamptz;
begin
 if auth.uid() is null or not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 select * into current_row from public.feature_articles where id=target_id for update;
 if not found then raise exception '記事が見つかりません。' using errcode='22023'; end if;
 if current_row.updated_at is distinct from expected_updated_at then raise exception '記事が変更されています。再読み込みしてください。' using errcode='40001'; end if;
 new_version:=clock_timestamp();
 update public.feature_articles set status='archived',updated_at=new_version where id=target_id;
 update public.feature_article_drafts set base_updated_at=new_version,revision=revision+1 where article_id=target_id;
end $$;
revoke all on function public.archive_feature_article(text,timestamptz) from public,anon;
grant execute on function public.archive_feature_article(text,timestamptz) to authenticated;
