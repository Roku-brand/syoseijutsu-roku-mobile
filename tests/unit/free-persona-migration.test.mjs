import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('half-persona release opens only published techniques and keeps existing free access', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const migration = await readFile('supabase/migrations/20261119035700_expand_free_techniques_to_half_of_personas.sql', 'utf8');
  await db.exec(`
    create table public.personas (
      name text primary key, category text, display_order integer,
      access_tier text, status text, updated_at timestamptz
    );
    create table public.techniques (
      id text primary key, persona_id text, category text,
      access_tier text, status text, updated_at timestamptz
    );
    insert into public.personas (name, category, display_order, access_tier, status)
    values
      ('draft', 'interpersonal', 0, 'complete', 'draft'),
      ('first', 'interpersonal', 1, 'complete', 'published'),
      ('second', 'interpersonal', 2, 'complete', 'published'),
      ('third', 'interpersonal', 3, 'complete', 'published'),
      ('fourth', 'interpersonal', 4, 'complete', 'published'),
      ('already-free', 'interpersonal', 5, 'free', 'published'),
      ('work-first', 'work', 1, 'complete', 'published'),
      ('work-second', 'work', 2, 'complete', 'published'),
      ('life-only', 'life', 1, 'complete', 'published');
    insert into public.techniques (id, persona_id, category, access_tier, status)
      select name, name, category, access_tier, 'published' from public.personas;
    insert into public.techniques (id, persona_id, category, access_tier, status)
    values
      ('archived-technique', 'first', 'interpersonal', 'complete', 'archived'),
      ('draft-technique', 'second', 'interpersonal', 'complete', 'draft'),
      ('first-another', 'first', 'interpersonal', 'complete', 'published'),
      ('free-exception', 'fourth', 'interpersonal', 'free', 'published');
  `);

  await db.exec(migration);
  const [personas, techniques] = await Promise.all([
    db.query("select name from public.personas where access_tier = 'free' order by name"),
    db.query("select id from public.techniques where access_tier = 'free' order by id"),
  ]);
  assert.deepEqual(personas.rows.map(({ name }) => name), ['already-free', 'first', 'life-only', 'second', 'work-first']);
  assert.deepEqual(techniques.rows.map(({ id }) => id), [
    'already-free', 'first', 'first-another', 'free-exception', 'life-only', 'second', 'work-first',
  ]);
  const readTiers = () => db.query('select id, access_tier, updated_at from public.techniques order by id');
  const beforeRetry = await readTiers();
  await db.exec(migration);
  assert.deepEqual((await readTiers()).rows, beforeRetry.rows);
});
