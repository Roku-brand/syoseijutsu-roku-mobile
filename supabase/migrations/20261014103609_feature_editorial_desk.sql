-- Editorial guides are explicitly fictional; article production remains the editorial desk.
create table public.editorial_characters (
 id text primary key default gen_random_uuid()::text,
 name text not null check (length(btrim(name)) between 1 and 80),
 role text not null default '処世術禄 編集案内人' check (length(role)<=120),
 bio text not null default '' check (length(bio)<=2000),
 interests text[] not null default '{}' check (cardinality(interests)<=12),
 image_path text check (image_path is null or image_path='bundled:sumino-haruka' or image_path like 'feature/%'),
 image_alt text not null default '' check (length(image_alt)<=300),
 status text not null default 'draft' check (status in ('draft','published','archived')),
 display_order integer not null default 100 check (display_order between 0 and 100000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.editorial_characters enable row level security;
create policy editorial_characters_read on public.editorial_characters for select to anon,authenticated
 using (status='published' or (select public.is_owner()));
create policy editorial_characters_insert on public.editorial_characters for insert to authenticated with check ((select public.is_owner()));
create policy editorial_characters_update on public.editorial_characters for update to authenticated using ((select public.is_owner())) with check ((select public.is_owner()));
create policy editorial_characters_delete on public.editorial_characters for delete to authenticated using ((select public.is_owner()));
revoke all on public.editorial_characters from public,anon,authenticated;
grant select on public.editorial_characters to anon;
grant select,insert,update,delete on public.editorial_characters to authenticated;

alter table public.feature_articles
 add column editorial_character_id text references public.editorial_characters(id) on delete set null,
 add column related_feature_ids text[] not null default '{}',
 add column source_references jsonb not null default '[]' check (jsonb_typeof(source_references)='array');
create index feature_articles_editorial_character_idx on public.feature_articles(editorial_character_id);

create function public.save_editorial_character(target_id text,content jsonb,expected_updated_at timestamptz)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_row public.editorial_characters; saved public.editorial_characters; interest_ids text[];
begin
 if auth.uid() is null or not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 if jsonb_typeof(content) is distinct from 'object' or jsonb_typeof(content->'interests') is distinct from 'array' then raise exception '案内人の入力を確認してください。' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(content->'interests') item where jsonb_typeof(item)<>'string' or length(item#>>'{}')>80) then raise exception '関心領域を確認してください。' using errcode='22023'; end if;
 select coalesce(array_agg(value order by ord),'{}') into interest_ids from jsonb_array_elements_text(content->'interests') with ordinality as item(value,ord);
 if target_id is not null then
  select * into current_row from public.editorial_characters where id=target_id for update;
  if not found then raise exception '案内人が見つかりません。' using errcode='22023'; end if;
  if current_row.updated_at is distinct from expected_updated_at then raise exception '案内人が別の画面で変更されています。再読み込みしてください。' using errcode='40001'; end if;
 elsif expected_updated_at is not null then raise exception '案内人を再読み込みしてください。' using errcode='40001'; end if;
 insert into public.editorial_characters(id,name,role,bio,interests,image_path,image_alt,status,display_order,updated_at)
 values(coalesce(target_id,gen_random_uuid()::text),btrim(coalesce(content->>'name','')),coalesce(content->>'role',''),coalesce(content->>'bio',''),interest_ids,content->>'image_path',coalesce(content->>'image_alt',''),coalesce(content->>'status','draft'),coalesce((content->>'display_order')::integer,100),clock_timestamp())
 on conflict(id) do update set name=excluded.name,role=excluded.role,bio=excluded.bio,interests=excluded.interests,image_path=excluded.image_path,image_alt=excluded.image_alt,status=excluded.status,display_order=excluded.display_order,updated_at=excluded.updated_at returning * into saved;
 return to_jsonb(saved);
end $$;
revoke all on function public.save_editorial_character(text,jsonb,timestamptz) from public,anon;
grant execute on function public.save_editorial_character(text,jsonb,timestamptz) to authenticated;

-- Merge new optional keys for older clients/drafts, then validate at both save and publish.
create function public.feature_editorial_payload(content jsonb,current_row public.feature_articles)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p jsonb; reference jsonb; guide_id text;
begin
 if auth.uid() is null or not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 p:=jsonb_build_object('editorial_character_id',current_row.editorial_character_id,'related_feature_ids',current_row.related_feature_ids,'source_references',current_row.source_references)||content;
 if jsonb_typeof(p->'editorial_character_id') not in ('string','null') then raise exception '案内人を確認してください。' using errcode='22023'; end if;
 guide_id:=p->>'editorial_character_id';
 -- An older draft may refer to a guide that has since been deleted.
 if guide_id is not null and not exists(select 1 from public.editorial_characters where id=guide_id) then p:=jsonb_set(p,'{editorial_character_id}','null'); end if;
 if jsonb_typeof(p->'related_feature_ids') is distinct from 'array' or jsonb_array_length(p->'related_feature_ids')>12 then raise exception '関連する特集を確認してください。' using errcode='22023'; end if;
 if exists(select 1 from jsonb_array_elements(p->'related_feature_ids') item where jsonb_typeof(item)<>'string') or exists(select 1 from jsonb_array_elements_text(p->'related_feature_ids') item(id) where id=current_row.id or not exists(select 1 from public.feature_articles f where f.id=item.id)) then raise exception '関連する特集を確認してください。' using errcode='22023'; end if;
 if jsonb_typeof(p->'source_references') is distinct from 'array' or jsonb_array_length(p->'source_references')>12 then raise exception '出典を確認してください。' using errcode='22023'; end if;
 for reference in select value from jsonb_array_elements(p->'source_references') loop
  if jsonb_typeof(reference) is distinct from 'object' or jsonb_typeof(reference->'title') is distinct from 'string' or length(btrim(coalesce(reference->>'title',''))) not between 1 and 300 or length(coalesce(reference->>'note',''))>1500 or (reference ? 'note' and jsonb_typeof(reference->'note')<>'string') then raise exception '出典の名称と補足を確認してください。' using errcode='22023'; end if;
  if reference->>'url' is not null and (jsonb_typeof(reference->'url')<>'string' or length(reference->>'url')>2000 or reference->>'url' !~ '^https?://[^[:space:]/?#]+[^[:space:]]*$') then raise exception '出典URLは http / https で入力してください。' using errcode='22023'; end if;
 end loop;
 return p;
end $$;
revoke all on function public.feature_editorial_payload(jsonb,public.feature_articles) from public,anon;
grant execute on function public.feature_editorial_payload(jsonb,public.feature_articles) to authenticated;

insert into public.editorial_characters(id,name,role,bio,interests,image_path,image_alt,status,display_order)
values('sumino-haruka','澄野 遥','処世術禄 編集案内人','人はなぜ、そう考え、そう行動するのか。身近な疑問を出発点に、心理学や社会科学の知見から、人間と人生の仕組みを探ります。',array['人間関係','心理学','自己理解','人生哲学','人間の意思決定'],'bundled:sumino-haruka','澄野遥を表現した、穏やかな表情の架空の編集案内人のイラスト','published',10);
-- Metadata only. Published content, URLs, images and optimistic-lock versions stay unchanged.
update public.feature_articles set editorial_character_id='sumino-haruka'
where editorial_character_id is null and slug in ('five-guidelines','mastering-tilt','meta-comments','passion-and-cynicism','the-secret-behind-age');

-- Add only reviewed knowledge links where no previous association exists.
-- Existing nonempty arrays are retained, and missing/unpublished catalog IDs are skipped.
with links(slug,techniques,theories) as (values
 ('five-guidelines',array['master336-004','master336-269','master336-275'],array['kb_280','kb_553']),
 ('mastering-tilt','{}'::text[],array['kb_574']),
 ('meta-comments','{}'::text[],array['kb_480','kb_417']),
 ('passion-and-cynicism','{}'::text[],array['kb_574']),
 ('the-secret-behind-age','{}'::text[],array['kb_266','kb_735']))
update public.feature_articles f set
 related_technique_ids=case when cardinality(f.related_technique_ids)=0 then array(select requested.id from unnest(links.techniques) with ordinality requested(id,ord) join public.techniques t on t.id=requested.id and t.status='published' order by requested.ord) else f.related_technique_ids end,
 related_theory_ids=case when cardinality(f.related_theory_ids)=0 then array(select requested.id from unnest(links.theories) with ordinality requested(id,ord) join public.theories t on t.id=requested.id and t.status='published' order by requested.ord) else f.related_theory_ids end
from links where f.slug=links.slug;

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
 content:=public.feature_editorial_payload(content,current_row);
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
 p:=public.feature_editorial_payload(draft_row.payload,current_row); new_slug:=btrim(coalesce(p->>'slug',''));
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
 update public.feature_articles set editorial_character_id=p->>'editorial_character_id',related_feature_ids=array(select value from jsonb_array_elements_text(p->'related_feature_ids')),source_references=p->'source_references',category_id=new_category,slug=new_slug,title=btrim(p->>'title'),lead=coalesce(p->>'lead',''),body=p->>'body',image_path=p->>'image_path',image_alt=coalesce(p->>'image_alt',''),is_featured=coalesce((p->>'is_featured')::boolean,false),show_in_list=coalesce((p->>'show_in_list')::boolean,true),display_order=coalesce((p->>'display_order')::integer,100),related_technique_ids=technique_ids,related_theory_ids=theory_ids,status='published',updated_at=clock_timestamp() where id=target_id;
 delete from public.feature_article_drafts where article_id=target_id;
end $$;
revoke all on function public.publish_feature_article(text,integer) from public,anon;
grant execute on function public.publish_feature_article(text,integer) to authenticated;
