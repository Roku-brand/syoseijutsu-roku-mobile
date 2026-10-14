import { readFile, writeFile } from 'node:fs/promises';

const destination = process.argv[2];
if (!destination) throw new Error('Provide the CLI-created category migration filename.');
const original = await readFile('supabase/migrations/20261013135333_feature_articles_cms.sql', 'utf8');
let functions = original.slice(original.indexOf('create function public.save_feature_article_draft'), original.indexOf('create function public.archive_feature_article')).replaceAll('create function ', 'create or replace function ');
const replace = (before, after) => {
  if (!functions.includes(before)) throw new Error(`Missing original RPC section: ${before}`);
  functions = functions.replace(before, after);
};
const valid = "('relationships','self-growth','life-choices','society-era')";
replace(" if target_id is null then", ` if content ? 'category_id' and content->>'category_id' is not null and content->>'category_id' not in ${valid} then raise exception '主カテゴリを確認してください。' using errcode='22023'; end if;\n if target_id is null then`);
replace(' insert into public.feature_article_drafts(article_id,payload,base_updated_at,revision)', " content:=content||jsonb_build_object('category_id',case when content ? 'category_id' then content->>'category_id' else current_row.category_id end);\n insert into public.feature_article_drafts(article_id,payload,base_updated_at,revision)");
replace(' theory_ids text[]; new_slug text;', ' theory_ids text[]; new_slug text; new_category text;');
replace(" p:=draft_row.payload; new_slug:=btrim(coalesce(p->>'slug',''));", ` p:=draft_row.payload; new_slug:=btrim(coalesce(p->>'slug',''));\n new_category:=case when p ? 'category_id' then p->>'category_id' else current_row.category_id end;\n if new_category is not null and new_category not in ${valid} then raise exception '主カテゴリを確認してください。' using errcode='22023'; end if;`);
replace('set slug=new_slug,title=', 'set category_id=new_category,slug=new_slug,title=');

await writeFile(destination, `-- Independent editorial categories; existing article content and RLS stay intact.
-- Nullable categories keep legacy/undecided articles available in the All tab.
alter table public.feature_articles add column category_id text
 check (category_id in ${valid});

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
${functions}`);
