-- Independent editorial categories; existing article content and RLS stay intact.
-- Nullable categories keep legacy/undecided articles available in the All tab.
alter table public.feature_articles add column category_id text
 check (category_id in ('relationships','self-growth','life-choices','society-era'));

-- Classify the reviewed original articles without changing title/body/relations/versions.
update public.feature_articles set category_id=case slug
 when 'five-guidelines' then 'life-choices'
 when 'mastering-tilt' then 'self-growth'
 when 'meta-comments' then 'relationships'
 when 'passion-and-cynicism' then 'self-growth'
 end where category_id is null and slug in ('five-guidelines','mastering-tilt','meta-comments','passion-and-cynicism');
-- User requested that the hero guide also appear among all four article cards.
update public.feature_articles set show_in_list=true where slug='five-guidelines';

-- Same RPC signatures, owner checks, conflict checks and privileges as before.
-- Omitted category keys from older clients/drafts retain the existing category.
create or replace function public.save_feature_article_draft(target_id text,content jsonb,expected_updated_at timestamptz,expected_revision integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_row public.feature_articles; current_draft public.feature_article_drafts; saved public.feature_article_drafts; article_key text;
begin
 if auth.uid() is null or not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 if content is null or jsonb_typeof(content)<>'object' then raise exception '記事の内容を確認してください。' using errcode='22023'; end if;
 if length(coalesce(content->>'body',''))>100000 or length(coalesce(content->>'title',''))>180 or length(coalesce(content->>'lead',''))>1500 then raise exception '入力が長すぎます。' using errcode='22023'; end if;
 if content ? 'category_id' and content->>'category_id' is not null and content->>'category_id' not in ('relationships','self-growth','life-choices','society-era') then raise exception '主カテゴリを確認してください。' using errcode='22023'; end if;
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
 content:=content||jsonb_build_object('category_id',case when content ? 'category_id' then content->>'category_id' else current_row.category_id end);
 insert into public.feature_article_drafts(article_id,payload,base_updated_at,revision)
 values(current_row.id,content,current_row.updated_at,coalesce(current_draft.revision,0)+1)
 on conflict(article_id) do update set payload=excluded.payload,base_updated_at=excluded.base_updated_at,revision=excluded.revision returning * into saved;
 return jsonb_build_object('id',current_row.id,'revision',saved.revision,'base_updated_at',saved.base_updated_at);
end $$;
revoke all on function public.save_feature_article_draft(text,jsonb,timestamptz,integer) from public,anon;
grant execute on function public.save_feature_article_draft(text,jsonb,timestamptz,integer) to authenticated;

create or replace function public.publish_feature_article(target_id text,expected_revision integer)
returns void language plpgsql security invoker set search_path='' as $$
declare current_row public.feature_articles; draft_row public.feature_article_drafts; p jsonb; technique_ids text[]; theory_ids text[]; new_slug text; new_category text;
begin
 if auth.uid() is null or not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 select * into current_row from public.feature_articles where id=target_id for update;
 if not found then raise exception '記事が見つかりません。' using errcode='22023'; end if;
 select * into draft_row from public.feature_article_drafts where article_id=target_id for update;
 if not found or draft_row.revision is distinct from expected_revision or draft_row.base_updated_at is distinct from current_row.updated_at then raise exception '記事または下書きが変更されています。再読み込みしてください。' using errcode='40001'; end if;
 p:=draft_row.payload; new_slug:=btrim(coalesce(p->>'slug',''));
 new_category:=case when p ? 'category_id' then p->>'category_id' else current_row.category_id end;
 if new_category is not null and new_category not in ('relationships','self-growth','life-choices','society-era') then raise exception '主カテゴリを確認してください。' using errcode='22023'; end if;
 if new_slug !~ '^[a-z0-9][a-z0-9-]{0,79}$' then raise exception 'URL名は半角英数字とハイフンで入力してください。' using errcode='22023'; end if;
 if current_row.status<>'draft' and new_slug<>current_row.slug then raise exception '公開済みの記事のURL名は変更できません。' using errcode='22023'; end if;
 if length(btrim(coalesce(p->>'title','')))=0 or length(btrim(coalesce(p->>'body','')))=0 then raise exception 'タイトルと本文を入力してください。' using errcode='22023'; end if;
 if coalesce(p->>'image_path','') not in ('bundled:feature-coast','bundled:feature-forest','bundled:feature-mountain') and coalesce(p->>'image_path','') not like 'feature/%' then raise exception '記事の写真を選択してください。' using errcode='22023'; end if;
 if jsonb_typeof(p->'related_technique_ids') is distinct from 'array' or jsonb_typeof(p->'related_theory_ids') is distinct from 'array' then raise exception '関連する知識を確認してください。' using errcode='22023'; end if;
 select coalesce(array_agg(distinct value),'{}') into technique_ids from jsonb_array_elements_text(p->'related_technique_ids');
 select coalesce(array_agg(distinct value),'{}') into theory_ids from jsonb_array_elements_text(p->'related_theory_ids');
 if exists(select 1 from unnest(technique_ids) requested(id) where not exists(select 1 from public.techniques t where t.id=requested.id and t.status='published')) or exists(select 1 from unnest(theory_ids) requested(id) where not exists(select 1 from public.theories t where t.id=requested.id and t.status='published')) then raise exception '関連する知識は公開中のものを選択してください。' using errcode='22023'; end if;
 update public.feature_articles set category_id=new_category,slug=new_slug,title=btrim(p->>'title'),lead=coalesce(p->>'lead',''),body=p->>'body',image_path=p->>'image_path',image_alt=coalesce(p->>'image_alt',''),is_featured=coalesce((p->>'is_featured')::boolean,false),show_in_list=coalesce((p->>'show_in_list')::boolean,true),display_order=coalesce((p->>'display_order')::integer,100),related_technique_ids=technique_ids,related_theory_ids=theory_ids,status='published',updated_at=clock_timestamp() where id=target_id;
 delete from public.feature_article_drafts where article_id=target_id;
end $$;
revoke all on function public.publish_feature_article(text,integer) from public,anon;
grant execute on function public.publish_feature_article(text,integer) to authenticated;

