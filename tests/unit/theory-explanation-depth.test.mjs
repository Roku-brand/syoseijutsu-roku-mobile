import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const read = name => JSON.parse(fs.readFileSync(name, 'utf8'));
const before = read('docs/content/theory-depth-before-20261023.json');
const after = read('src/data/generated/theories.json');
const review = read('docs/content/theory-depth-review-20261023.json');
const changes = new Map(review.changes.map(row => [row.id, row]));
const body = theory => theory.quotation?.contextNote ?? theory.summary;
const count = value => (value.match(/[。！？]/g) ?? []).length;

test('every short explanation gains context while definitions, quotations and identities remain intact', () => {
  assert.equal(after.length, before.length);
  assert.equal(changes.size, 739);
  assert.equal(new Set(review.changes.map(row => row.addition)).size, changes.size);
  for (const old of before) {
    const current = after.find(row => row.tagId === old.tagId);
    const edit = changes.get(old.tagId);
    assert.ok(current && count(body(current)) >= 2, old.tagId);
    if (!edit) { assert.deepEqual(current, old); continue; }
    assert.equal(count(body(old)), 1, old.tagId);
    assert.ok(body(current).startsWith(body(old) + '\n'), old.tagId);
    assert.equal(body(current), edit.explanation);
    const strip = row => ({ ...row, summary: '', ...(row.quotation ? { quotation: { ...row.quotation, contextNote: '' } } : {}) });
    assert.deepEqual(strip(current), strip(old), old.tagId);
    assert.ok(body(current).length <= 180, old.tagId);
  }
});

test('expanded paid bodies never enter the public catalogue and free bodies match the full catalogue', () => {
  const publicRows = read('src/data/generated/theories.public.json');
  assert.equal(publicRows.length, 947);
  for (const row of after) {
    const exposed = publicRows.find(item => item.tagId === row.tagId);
    if (row.accessTier === 'free') {
      assert.equal(exposed.summary, row.summary);
      assert.deepEqual(exposed.quotation, row.quotation);
    } else {
      assert.equal(exposed.summary, '');
      assert.equal(exposed.quotation, undefined);
      assert.equal(exposed.provenance, undefined);
    }
  }
});

test('publication and rollback are atomic and refuse intervening editorial edits', async () => {
  const db = new PGlite();
  const snapshot = read('docs/content/knowledge-editorial-published-20261022.json').theories;
  const beforeById = new Map(before.map(t => [t.tagId, t]));
  for (const row of snapshot) {
    assert.equal(row.summary, beforeById.get(row.id).summary);
    assert.deepEqual(row.quotation, beforeById.get(row.id).quotation ?? null);
  }
  try {
    await db.exec("create schema private; create table private.theory_reform_backups(phase text,source_table text,source_id text,snapshot jsonb,primary key(phase,source_table,source_id));create table public.theories(id text primary key,title text,summary text,category_id text,category_title text,aliases jsonb,related_theory_ids jsonb,status text,display_order integer,updated_at timestamptz,updated_by uuid,provenance jsonb,image_path text,draft_technique_ids jsonb,access_tier text,display_id integer,draft_display_id integer,subcategory_id text,taxonomy_order integer,canonical_id text,legacy_ids jsonb,knowledge_type text,quotation jsonb,draft_relations jsonb);create table public.content_revision(id boolean,revision bigint);insert into public.content_revision values(true,8489);");
    await db.query('insert into public.theories select * from jsonb_populate_recordset(null::public.theories,$1::jsonb)', [JSON.stringify(snapshot)]);
    const baseline = (await db.query("select md5(string_agg(to_jsonb(t)::text,'|' order by id)) hash from public.theories t where status='published'")).rows[0].hash;
    // The dated snapshot has the same reviewed content but may have a different
    // server timestamp representation. Use its full-row hash for this fixture.
    const sql = fs.readFileSync('docs/content/theory-depth-update-20261023.sql', 'utf8').replace('c29637f918e3ab30b1613958fa26815f', baseline);
    const rollback = fs.readFileSync('docs/content/theory-depth-rollback-20261023.sql', 'utf8');
    await db.exec("begin;update public.theories set summary=summary||' CMS edit' where id='kb_399';");
    await assert.rejects(db.exec(sql), /Reviewed content changed/);
    await db.exec('rollback;');
    await db.exec(sql);
    assert.equal((await db.query('select count(*)::int n from private.theory_reform_backups')).rows[0].n, 739);
    for (const row of (await db.query('select * from public.theories')).rows) {
      const old = snapshot.find(t => t.id === row.id);
      const change = changes.get(row.id);
      assert.equal(row.summary, change?.summary ?? old.summary);
      assert.deepEqual(row.quotation, change?.quotation ?? old.quotation);
      const strip = value => ({ ...value, summary: '', quotation: null, updated_at: null });
      assert.deepEqual(strip(row), strip(old));
    }
    await assert.rejects(db.exec(sql), /Reviewed content changed/);
    await db.exec('rollback;');
    await db.exec("begin;update public.theories set summary=summary||' Later edit' where id='kb_399';");
    await assert.rejects(db.exec(rollback), /Later content edits/);
    await db.exec('rollback;');
    await db.exec(rollback);
    for (const row of (await db.query('select id,summary,quotation from public.theories')).rows) {
      const old = snapshot.find(t => t.id === row.id);
      assert.equal(row.summary, old.summary);
      assert.deepEqual(row.quotation, old.quotation);
    }
  } finally { await db.close(); }
});
