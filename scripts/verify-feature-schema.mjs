import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const modulePath = process.argv[2];
if (!modulePath) throw new Error('Provide a local PGlite module path for isolated migration verification.');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; grant usage on schema auth to anon,authenticated;
    create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
    create table public.user_roles(user_id uuid,role text); create table public.profiles(user_id uuid,role text);
    insert into public.user_roles values('00000000-0000-4000-8000-000000000001','owner');
    create function public.is_owner() returns boolean language sql stable security definer set search_path='' as 'select exists(select 1 from public.user_roles where user_id=auth.uid() and role=''owner'')';
    create table public.techniques(id text,status text); create table public.theories(id text,status text);
    grant select on public.techniques,public.theories to authenticated;`);
  await db.exec(await readFile('supabase/migrations/20261013135333_feature_articles_cms.sql','utf8'));
  await db.exec(await readFile('supabase/migrations/20261013142340_seed_feature_articles.sql','utf8'));
  if (process.argv[3]) {
    const before = (await db.query('select * from public.feature_articles order by display_order,id')).rows;
    await db.exec(await readFile(process.argv[3], 'utf8'));
    const after = (await db.query('select * from public.feature_articles order by display_order,id')).rows;
    for (const [index, row] of after.entries()) {
      const { category_id, ...unchanged } = row;
      if (row.slug === 'five-guidelines') unchanged.show_in_list = before[index].show_in_list;
      assert.deepEqual(unchanged, before[index], 'Migration must preserve article content, relations and versions');
      assert.equal(category_id, { 'five-guidelines': 'life-choices', 'mastering-tilt': 'self-growth', 'meta-comments': 'relationships', 'passion-and-cynicism': 'self-growth' }[row.slug]);
    }
    console.log((await db.exec(await readFile('supabase/tests/feature-categories.sql', 'utf8'))).at(-1).rows);
  }
  const results = await db.exec(await readFile('supabase/tests/features.sql','utf8'));
  console.log(results.at(-1).rows);
  console.log((await db.query('select count(*)::integer as initial_articles from public.feature_articles')).rows);
} catch (cause) { console.error(cause.message, cause.detail ?? ''); process.exitCode = 1; }
finally { await db.close(); }
