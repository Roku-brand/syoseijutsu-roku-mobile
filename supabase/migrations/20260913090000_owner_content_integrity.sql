-- Canonical personas keep the legacy persona_id (name) stable for existing readers.
create table if not exists public.personas (
  name text primary key check (length(trim(name)) between 1 and 100),
  category text not null check (category in ('interpersonal','work','life')),
  status text not null default 'published' check (status in ('published','archived')),
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.personas(name,category,display_order)
select distinct on (persona_id) persona_id,category,display_order
from public.techniques where trim(persona_id) <> '' and category in ('interpersonal','work','life')
order by persona_id, (status = 'published') desc, display_order
on conflict (name) do nothing;
alter table public.personas enable row level security;
create policy "read personas" on public.personas for select to anon, authenticated using (status='published' or public.is_owner());
grant select on public.personas to anon, authenticated;
revoke insert, update, delete on public.personas from anon, authenticated;

create or replace function public.create_persona(persona_name text, persona_category text)
returns public.personas language plpgsql security definer set search_path=public as $$
declare result public.personas;
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 if persona_category not in ('interpersonal','work','life') or nullif(trim(persona_name),'') is null then
   raise exception '人物像名とカテゴリを選択してください。' using errcode='22023';
 end if;
 insert into public.personas(name,category,display_order)
 values(trim(persona_name),persona_category,(select coalesce(max(display_order),0)+1 from public.personas))
 returning * into result;
 return result;
end; $$;

-- Normalise legacy categories using the chosen persona definitions.
update public.techniques t set category=p.category from public.personas p
where t.persona_id=p.name and t.category is distinct from p.category;

-- Keep references valid at the database boundary, including older clients.
create or replace function public.validate_theory_relations()
returns trigger language plpgsql security definer set search_path=public as $$
declare linked_id text;
begin
 if new.status='archived' then
   if exists(select 1 from public.techniques where status <> 'archived' and theory_ids ? new.id)
   or exists(select 1 from public.technique_drafts d join public.techniques t on t.id=d.technique_id where t.status <> 'archived' and (d.snapshot->'theory_ids') ? new.id)
   or exists(select 1 from public.theories where status='published' and id<>new.id and related_theory_ids ? new.id) then
     raise exception 'この理論は処世術・下書き・関連理論から参照されています。先に関連を外してください。' using errcode='23503';
   end if;
   return new;
 end if;
 for linked_id in select jsonb_array_elements_text(new.related_theory_ids) loop
   perform 1 from public.theories where id=linked_id and status='published' for share;
   if not found then raise exception '公開中の関連理論を選択してください。' using errcode='23503'; end if;
 end loop;
 return new;
end; $$;
create trigger theory_relations_integrity before insert or update on public.theories
for each row execute function public.validate_theory_relations();
create or replace function public.archive_persona(persona_name text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 perform 1 from public.personas where name=persona_name for update;
 if not found then raise exception '人物像が見つかりません。'; end if;
 if exists(select 1 from public.techniques where persona_id=persona_name and status <> 'archived')
 or exists(select 1 from public.technique_drafts d join public.techniques t on t.id=d.technique_id where t.status <> 'archived' and d.snapshot->>'persona_id'=persona_name) then
   raise exception '所属する処世術・下書きを別の人物像へ移動するか削除してください。' using errcode='23503';
 end if;
 update public.personas set status='archived',updated_at=now() where name=persona_name;
end; $$;
revoke all on function public.create_persona(text,text),public.archive_persona(text) from public;
grant execute on function public.create_persona(text,text),public.archive_persona(text) to authenticated;

-- Both direct writes and old publish RPCs derive the category from the persona.
create or replace function public.enforce_technique_persona()
returns trigger language plpgsql security definer set search_path=public as $$
declare persona public.personas;
begin
 if new.status='archived' then return new; end if;
 select * into persona from public.personas where name=new.persona_id and status='published' for share;
 if not found then raise exception '所属する人物像を選択してください。' using errcode='23503'; end if;
 new.category := persona.category;
 if exists(select 1 from jsonb_array_elements_text(coalesce(new.theory_ids,'[]')) link
   where not exists(select 1 from public.theories where id=link and status='published')) then
   raise exception '削除済みの関連理論を外してください。' using errcode='23503';
 end if;
 if not coalesce(new.theory_ids,'[]') @> coalesce(new.primary_theory_ids,'[]') then
   raise exception '主要理論は関連理論から選択してください。' using errcode='22023';
 end if;
 return new;
end; $$;
create trigger technique_persona_integrity before insert or update of persona_id,category,status on public.techniques
for each row execute function public.enforce_technique_persona();
create or replace function public.enforce_draft_persona()
returns trigger language plpgsql security definer set search_path=public as $$
declare persona public.personas;
begin
 select * into persona from public.personas where name=new.snapshot->>'persona_id' and status='published' for share;
 if not found then raise exception '所属する人物像を選択してください。' using errcode='23503'; end if;
 new.snapshot := jsonb_set(new.snapshot,'{category}',to_jsonb(persona.category));
 return new;
end; $$;
create trigger draft_persona_integrity before insert or update on public.technique_drafts
for each row execute function public.enforce_draft_persona();
create or replace function public.create_technique(target_persona_id text)
returns public.techniques language plpgsql security definer set search_path=public as $$
declare result public.techniques; persona public.personas;
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 select * into persona from public.personas where name=target_persona_id and status='published' for share;
 if not found then raise exception '所属する人物像を選択してください。' using errcode='23503'; end if;
 insert into public.techniques(id,persona_id,category,title,primary_theory_ids,status,display_order,updated_by)
 values('technique-'||gen_random_uuid()::text,persona.name,persona.category,'','[]','draft',
 (select coalesce(max(display_order),0)+1 from public.techniques),auth.uid()) returning * into result;
 return result;
end; $$;
revoke all on function public.create_technique(text) from public;
grant execute on function public.create_technique(text) to authenticated;

alter table public.theories add column if not exists provenance jsonb;
create or replace function public.validate_theory_content()
returns trigger language plpgsql security definer set search_path=public as $$
declare category_name text;
begin
 if new.status='archived' then return new; end if;
 category_name := case new.category_id when 'psychology' then '心理学' when 'behavioral-science' then '行動科学'
 when 'organization-management' then '組織・経営論' when 'strategy' then '戦略論'
 when 'classics-thought' then '古典・思想' when 'maxims-experience' then '格言・経験則・作品' end;
 if category_name is null then raise exception '理論カテゴリを選択してください。' using errcode='22023'; end if;
 if nullif(trim(new.title),'') is null or nullif(trim(new.summary),'') is null then
 raise exception 'タイトルと概要は公開に必須です。' using errcode='22023'; end if;
 new.category_title := category_name;
 if jsonb_typeof(new.aliases) <> 'array' or jsonb_typeof(new.related_theory_ids) <> 'array' then
 raise exception '別名と関連理論の形式が不正です。' using errcode='22023'; end if;
 if new.related_theory_ids ? new.id then raise exception '自分自身を関連理論に指定できません。' using errcode='22023'; end if;
 if new.provenance is not null then
   if coalesce(new.provenance->>'status','') not in ('確認済み','書誌確認済み','一部確認','出典不明') then
    raise exception '出典状態を選択してください。' using errcode='22023'; end if;
   if exists(select 1 from jsonb_array_elements(coalesce(new.provenance->'sources','[]')) s
     where coalesce(s->>'url','') !~ '^https://[^[:space:]]+$' or nullif(trim(s->>'title'),'') is null) then
    raise exception '参照先には名称とhttpsのURLを入力してください。' using errcode='22023'; end if;
 end if;
 return new;
end; $$;
create trigger theory_content_integrity before insert or update on public.theories
for each row execute function public.validate_theory_content();

create or replace function public.publish_theory(target_theory_id text,payload jsonb)
returns public.theories language plpgsql security definer set search_path=public as $$
declare result public.theories;
begin
 if not public.is_owner() then raise exception 'owner_required' using errcode='42501'; end if;
 insert into public.theories(id,title,summary,category_id,category_title,aliases,related_theory_ids,provenance,status,display_order,updated_by)
 values(target_theory_id,trim(payload->>'title'),trim(payload->>'summary'),payload->>'category_id','',
 coalesce(payload->'aliases','[]'),coalesce(payload->'related_theory_ids','[]'),nullif(payload->'provenance','null'),
 'published',coalesce((payload->>'display_order')::int,0),auth.uid())
 on conflict(id) do update set title=excluded.title,summary=excluded.summary,category_id=excluded.category_id,
 category_title=excluded.category_title,aliases=excluded.aliases,related_theory_ids=excluded.related_theory_ids,
 provenance=case when payload ? 'provenance' then excluded.provenance else public.theories.provenance end,
 status='published',display_order=excluded.display_order,updated_at=now(),updated_by=auth.uid()
 returning * into result;
 return result;
end; $$;
