import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { selectPublicContent } from '../../scripts/public-content-selection.mjs';

const migration = (name) => readFileSync(new URL(`../../supabase/migrations/${name}`, import.meta.url), 'utf8');
const ordering = migration('20260929130601_cms_single_source_ordering.sql');
const canonical = migration('20260928093000_canonical_content_cms.sql');
const fn = (sql, name) => sql.match(new RegExp(`create or replace function public\\.${name}\\([\\s\\S]+?\\$\\$;`))[0];

test('the release allowlist removes stale free copy without adding other bundled copy', () => {
  const data = (name) => JSON.parse(readFileSync(new URL(`../../src/data/generated/${name}.json`, import.meta.url), 'utf8'));
  const inputs = { techniques: data('techniques'), theories: data('theories'), learning: data('learning.full') };
  const baseline = selectPublicContent(inputs);
  const [retained, removed] = baseline.freeTechniqueIds;
  const unbundled = baseline.allTechniques.find((item) => !baseline.freeTechniqueIds.has(item.id));
  const release = selectPublicContent({ ...inputs, liveFreeTechniqueIds: new Set([retained, unbundled.id]) });
  assert.deepEqual([...release.freeTechniqueIds], [retained]);
  assert.ok(baseline.freeTechniqueIds.has(removed));
});

test('editorial stages round-trip while persona access controls the existing public and paid projections', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select '00000000-0000-4000-8000-000000000001'::uuid $$;
      create function public.is_owner() returns boolean language sql stable as $$ select current_setting('test.owner', true) = 'yes' $$;
      create table public.personas (id text primary key, name text unique, category text, status text, access_tier text);
      create table public.content_categories (kind text, id text, title text);
      create table public.techniques (
        id text primary key, persona_id text, category text, title text, essence text default '', explanation text default '',
        memo text default '', importance smallint default 1, practices jsonb default '[]', examples jsonb default '[]',
        cautions jsonb default '[]', theory_ids jsonb default '[]', primary_theory_ids jsonb default '[]', tags jsonb,
        status text, display_order integer, draft_display_order integer, image_path text, access_tier text default 'complete',
        updated_at timestamptz default now(), updated_by uuid
      );
      create unique index technique_published_order on public.techniques(persona_id, display_order) where status = 'published';
      create unique index technique_draft_order on public.techniques(persona_id, draft_display_order) where status = 'draft';
      create table public.technique_drafts (technique_id text primary key, snapshot jsonb, base_updated_at timestamptz, updated_at timestamptz, updated_by uuid);
      create table public.technique_revisions (technique_id text, snapshot jsonb, version integer, created_by uuid);
      create table public.theories (id text primary key, status text, subcategory_id text, taxonomy_order integer, updated_at timestamptz default now());
      create table public.paid_content (content_type text, content_id text, payload jsonb, sort_order integer, updated_at timestamptz, primary key (content_type, content_id));
      insert into public.personas values ('a', '人物像A', 'life', 'published', 'free'), ('b', '人物像B', 'life', 'published', 'complete');
      insert into public.content_categories values ('technique', 'life', '生き方');
    `);
    await db.exec([
      fn(ordering, 'reorder_content'), fn(ordering, 'reorder_technique_drafts'),
      fn(ordering, 'move_technique_order'), fn(ordering, 'create_technique'), fn(canonical, 'sync_canonical_paid_content'),
    ].join('\n'));
    await db.exec(`
      create trigger sync_canonical_paid_technique after insert or update or delete on public.techniques
        for each row execute function public.sync_canonical_paid_content();
      insert into public.techniques (id, persona_id, category, title, essence, explanation, status, display_order, draft_display_order, access_tier)
      values ('published', '人物像A', 'life', '既存のタイトル', '本質', '既存の解説', 'published', 1, null, 'complete'),
             ('title', '人物像A', 'life', 'タイトルだけ', '', '', 'draft', null, 1, 'free'),
             ('essence', '人物像A', 'life', '下書き', '本質', '', 'draft', null, 2, 'free'),
             ('body', '人物像B', 'life', '本文あり', '本質', '解説', 'draft', null, 1, 'free');
    `);
    const migrations = readdirSync(new URL('../../supabase/migrations/', import.meta.url));
    await db.exec(migration(migrations.find((name) => name.endsWith('_technique_editorial_stage_and_persona_access.sql'))));

    const query = async (sql, params) => (await db.query(sql, params)).rows;
    assert.deepEqual(await query('select id, editorial_stage, access_tier from public.techniques order by id'), [
      { id: 'body', editorial_stage: 'title_essence_explanation', access_tier: 'complete' },
      { id: 'essence', editorial_stage: 'title_essence', access_tier: 'free' },
      { id: 'published', editorial_stage: 'publishable', access_tier: 'free' },
      { id: 'title', editorial_stage: 'title_only', access_tier: 'free' },
    ]);
    assert.deepEqual(await query('select content_id from public.paid_content'), []);

    await db.exec(`update public.personas set access_tier = 'complete' where id = 'a'`);
    assert.deepEqual(await query(`select content_id, payload->>'accessTier' as tier from public.paid_content`), [{ content_id: 'published', tier: 'complete' }]);

    await db.exec(`set test.owner = 'yes'`);
    const draft = (await query(`select * from public.create_technique('人物像A')`))[0];
    assert.equal(draft.editorial_stage, 'title_only');
    assert.equal(draft.access_tier, 'complete');
    const payload = { title: 'タイトルだけ', essence: '追加した本質', persona_id: '人物像A', editorial_stage: 'title_essence', access_tier: 'free', examples: ['旧クライアントの入力'] };
    await query(`select public.save_technique_draft('title', $1::jsonb)`, [JSON.stringify(payload)]);
    const [stored] = await query(`select snapshot from public.technique_drafts where technique_id = 'title'`);
    assert.equal(stored.snapshot.editorial_stage, 'title_essence');
    assert.equal(Object.hasOwn(stored.snapshot, 'examples'), false);
    assert.equal(Object.hasOwn(stored.snapshot, 'access_tier'), false);
    await query(`select public.reorder_technique_drafts('人物像A', $1::text[])`, [[draft.id, 'essence', 'title']]);
    assert.deepEqual(await query(`select id from public.techniques where status = 'draft' and persona_id = '人物像A' order by draft_display_order`), [{ id: draft.id }, { id: 'essence' }, { id: 'title' }]);
    const [published] = await query(`select * from public.publish_technique('title')`);
    assert.equal(published.title, 'タイトルだけ');
    assert.equal(published.editorial_stage, 'title_essence');
    assert.equal(published.access_tier, 'complete');
    assert.deepEqual(published.examples, []);

    await db.exec(`update public.personas set access_tier = 'free' where id = 'b'`);
    const [moved] = await query(`select * from public.save_and_publish_technique('title', $1::jsonb)`, [JSON.stringify({ ...payload, persona_id: '人物像B', access_tier: 'complete', editorial_stage: 'publishable' })]);
    assert.equal(moved.access_tier, 'free');
    assert.equal(moved.editorial_stage, 'publishable');
    assert.deepEqual(await query('select content_id from public.paid_content order by content_id'), [{ content_id: 'published' }]);
    await assert.rejects(query(`select public.save_technique_draft('title', '{"editorial_stage":"invalid"}'::jsonb)`), /techniques_editorial_stage_check/);
    assert.equal((await query(`select status from public.techniques where id = 'title'`))[0].status, 'published');

    await db.exec(`insert into public.theories (id, status, subcategory_id, taxonomy_order) values ('a', 'draft', 's', 1), ('b', 'draft', 's', 2), ('c', 'published', 's', 1)`);
    await assert.rejects(query(`select public.reorder_subcategory_theories('s', array['b', 'c'], 'draft')`), /下書き理論/);
    await query(`select public.reorder_subcategory_theories('s', array['b', 'a'], 'draft')`);
    assert.deepEqual(await query(`select id, taxonomy_order from public.theories order by id`), [
      { id: 'a', taxonomy_order: 2 }, { id: 'b', taxonomy_order: 1 }, { id: 'c', taxonomy_order: 1 },
    ]);

    await db.exec(`set test.owner = 'no'; set role authenticated;`);
    await assert.rejects(query(`select public.reorder_technique_drafts('人物像A', '{}'::text[])`), /owner_required/);
  } finally {
    await db.close();
  }
});
