import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { unchangedFieldsHash } from '../../scripts/apply-practical-theory-openings.mjs';
import { catalogReviews, removedTheoryIds, summaryReviews, titleReviews as latestTitleReviews, latestCatalogReview } from '../helpers/theory-editorial-history.mjs';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const review = readJson('docs/content/theory-practical-review-20261021.json');
const currentReviews = new Map(readJson('docs/content/theory-plain-review-20261021.json').changes.map(row => [row.id, row]));
const before = readJson('docs/content/theory-practical-before-20261021.json');
const catalogue = readJson('src/data/generated/theories.json');
const titleReview = readJson('docs/content/theory-saying-titles-review-20261021.json');
const titleReviews = new Map(titleReview.changes.map(row => [row.id, row]));
const titleUpdate = fs.readFileSync('docs/content/theory-saying-titles-update-20261021.sql', 'utf8');
const titleRollback = fs.readFileSync('docs/content/theory-saying-titles-rollback-20261021.sql', 'utf8');
const update = fs.readFileSync('docs/content/theory-practical-update-20261021.sql', 'utf8');
const rollback = fs.readFileSync('docs/content/theory-practical-rollback-20261021.sql', 'utf8');
const quoteGuard = fs.readFileSync('supabase/migrations/20261015174824_theory_quote_headlines.sql', 'utf8')
  .match(/CREATE OR REPLACE FUNCTION public\.validate_quotation_metadata\(\)[\s\S]*?end \$function\$\s*;/i)[0];
const json = value => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";

test('945 explanations match review; identity, access, links, provenance and approved quotation text are preserved', () => {
  assert.equal(review.changes.length, 945);
  assert.equal(new Set(review.changes.map(row => row.id)).size, 945);
  assert.equal(catalogue.length, latestCatalogReview.publishedCount);
  const byId = new Map(catalogue.map(theory => [theory.tagId, theory]));
  for (const row of review.changes) {
    if(removedTheoryIds.has(row.id)){assert.equal(catalogReviews.get(row.id).redirectTo,'kb_629');continue;}
    const theory = byId.get(row.id);
    const current = currentReviews.get(row.id);
    const approved=catalogReviews.get(row.id);
    if(approved)assert.deepEqual(theory,approved.after);
    assert.equal(theory.summary, summaryReviews.get(row.id)?.summary??current.summary, row.id);
    assert.notEqual(row.beforeSummary, row.summary, row.id);
    assert.equal(theory.title, latestTitleReviews.get(row.id)?.title ?? row.title, row.id);
    assert.equal(unchangedFieldsHash({ ...(approved?.before??theory), title: row.title }), row.unchangedFieldsSha256, row.id);
    if (row.quotation) {
      const { contextNote: oldNote, ...oldQuote } = row.beforeQuotation;
      const { contextNote: newNote, ...newQuote } = theory.quotation;
      assert.deepEqual(newQuote, oldQuote, row.id);
      assert.notEqual(newNote, oldNote, row.id);
      assert.ok(newNote.startsWith(current.opening), row.id);
      assert.equal(theory.summary, `「${oldQuote.translationText}」\n— ${oldQuote.author}\n${oldQuote.work}\n\n${newNote}`);
    } else if(!approved?.fields.includes('summary'))assert.ok(theory.summary.startsWith(current.opening), row.id);
  }
  assert.equal(review.changes.filter(row => row.quotation).length, 19);
});

test('atomic SQL rejects intervening CMS edits, applies idempotently, and rolls back every explanation with quotation guard enabled', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema private;
      create table private.theory_reform_backups(phase text,source_table text,source_id text,snapshot jsonb,primary key(phase,source_table,source_id));
      create table public.theories(id text primary key,title text,summary text,quotation jsonb,status text,access_tier text,updated_at timestamptz,knowledge_type text,category_id text);`);
    const rows = before.map(row => ({ ...row, knowledge_type: row.quotation ? 'aphorism' : 'model', category_id: catalogReviews.get(row.id)?.before.categoryId??catalogue.find(t => t.tagId === row.id).categoryId }));
    rows.push({ id: 'keep-archived', title: 'Archived', summary: 'Preserve this record.', status: 'archived', access_tier: 'complete', quotation: null });
    await db.exec(`insert into public.theories select * from jsonb_populate_recordset(null::public.theories,${json(rows)});
      ${quoteGuard}
      create trigger quotation_publication_guard before update on public.theories for each row execute function public.validate_quotation_metadata();`);
    const snapshot = async () => (await db.query("select id,to_jsonb(t)-'updated_at' as record from public.theories t order by id")).rows;
    const original = await snapshot();
    await db.exec("begin;update public.theories set summary='A newer CMS edit' where id='kb_001';");
    await assert.rejects(db.exec(update), /Reviewed explanation changed/);
    await db.exec('rollback;');
    assert.deepEqual(await snapshot(), original);
    await db.exec(update);
    assert.equal((await db.query('select count(*)::int as n from private.theory_reform_backups')).rows[0].n, 945);
    const expectedById = new Map(review.changes.map(row => [row.id, row]));
    for (const row of await snapshot()) {
      const old = original.find(item => item.id === row.id).record;
      const edit = expectedById.get(row.id);
      assert.deepEqual(row.record, edit ? { ...old, summary: edit.summary, quotation: edit.quotation } : old);
    }
    const dates = (await db.query('select id,updated_at from public.theories order by id')).rows;
    await db.exec(update);
    assert.deepEqual((await db.query('select id,updated_at from public.theories order by id')).rows, dates);
    const contentSnapshot = await snapshot();
    await db.exec(titleUpdate);
    for (const row of await snapshot()) {
      const old = contentSnapshot.find(item => item.id === row.id).record;
      const titleEdit = titleReviews.get(row.id);
      assert.deepEqual(row.record, titleEdit ? { ...old, title: titleEdit.title } : old);
    }
    assert.equal((await db.query("select count(*)::int as n from private.theory_reform_backups where phase='saying_title_quotes_20261021'")).rows[0].n, 57);
    await db.exec(titleRollback);
    assert.deepEqual(await snapshot(), contentSnapshot);
    await db.exec(rollback);
    assert.deepEqual(await snapshot(), original);
  } finally { await db.close(); }
});
