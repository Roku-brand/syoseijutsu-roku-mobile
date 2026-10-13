import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { readInitialFeatures } from './feature-seed.mjs';

const [modulePath, migrationPath] = process.argv.slice(2);
if (!modulePath || !migrationPath) throw new Error('Provide a local PGlite module path and the revision migration.');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
try {
  await db.exec(`create table public.feature_articles(id text primary key,slug text,title text,lead text,body text,image_path text,image_alt text,is_featured boolean,show_in_list boolean,display_order integer,status text,updated_at timestamptz default clock_timestamp()); create table public.feature_article_drafts(article_id text primary key,payload jsonb);`);
  await db.exec(await readFile('supabase/migrations/20261013142340_seed_feature_articles.sql', 'utf8'));
  const original = (await db.query('select * from public.feature_articles order by display_order')).rows;
  const revision = await readFile(migrationPath, 'utf8');
  await db.exec("update public.feature_articles set lead='CMSで編集中の原稿' where id='meta-comments'");
  await assert.rejects(db.exec(revision), /上書きせずに停止/);
  assert.equal((await db.query("select body from public.feature_articles where id='five-guidelines'")).rows[0].body, original[0].body, 'The earlier update must roll back when a later article conflicts');
  await db.query("update public.feature_articles set lead=$1 where id='meta-comments'", [original[2].lead]);
  await db.exec("insert into public.feature_article_drafts values('meta-comments','{}')");
  await assert.rejects(db.exec(revision), /上書きせずに停止/);
  await db.exec('delete from public.feature_article_drafts');
  await db.exec('update public.feature_articles set body=replace(body,chr(10),chr(13)||chr(10))');
  await db.exec(revision);
  const changed = (await db.query('select * from public.feature_articles order by display_order')).rows;
  const expected = await readInitialFeatures();
  for (const [index, row] of changed.entries()) {
    assert.equal(row.body.replace(/\r\n/g, '\n'), expected[index].body);
    assert.equal(row.lead, expected[index].lead);
    for (const field of ['title', 'slug', 'image_path', 'is_featured', 'show_in_list', 'display_order', 'status']) assert.equal(row[field], original[index][field]);
  }
  await db.exec(revision);
  assert.deepEqual((await db.query('select * from public.feature_articles order by display_order')).rows, changed, 'Repeat execution must preserve versions');
  console.log('Four editorial revisions passed: atomic rollback, CMS edit/draft protection, preserved settings, idempotency.');
} finally { await db.close(); }
