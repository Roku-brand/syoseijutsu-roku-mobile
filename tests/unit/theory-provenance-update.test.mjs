import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const read = async (file) => JSON.parse(await fs.readFile(new URL(`../../${file}`, import.meta.url), 'utf8'));
const additions = await read('docs/content/theory-provenance-additions-20261003.json');
const baseline = await read('docs/content/theory-provenance-server-before-20261003.json');
const sql = await fs.readFile(new URL('../../docs/content/theory-provenance-server-update-20261003.sql', import.meta.url), 'utf8');
const reviewed = JSON.parse(sql.match(/\$reviewed\$([\s\S]*?)\$reviewed\$/)[1]);

test('new references retain bibliography and distinguish originals from related works', async () => {
  const catalog = await read('src/data/generated/theories.json');
  const byId = new Map(catalog.map((card) => [card.tagId, card]));
  assert.equal(new Set(additions.records.map((x) => x.tagId)).size, additions.records.length);
  for (const record of additions.records) {
    const card = byId.get(record.tagId);
    assert.equal(card.title, record.title);
    assert.deepEqual(card.provenance, record.provenance);
    assert.ok(['書誌確認済み','一部確認'].includes(record.provenance.status));
    assert.ok(record.provenance.attribution && record.provenance.note);
    assert.ok(record.provenance.works.length && record.provenance.sources.length);
    for (const source of record.provenance.sources) {
      const url = new URL(source.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(!url.username && !url.password && source.title);
    }
  }
  const attachment = byId.get('kb_036').provenance;
  assert.match(attachment.attribution, /Bowlby.*Hazan.*Shaver/);
  assert.ok(attachment.works.some((x) => /1958/.test(x)));
  assert.ok(attachment.works.some((x) => /1987/.test(x)));
  assert.match(byId.get('theory-1789620805420-wbuepmtu').provenance.note, /別の概念/);
  assert.equal(byId.get('kb_592').provenance.status, '一部確認');
});

async function fixture(t, corruptProjection = false) {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create table public.theories(id text primary key,title text,summary text,status text,access_tier text,provenance jsonb,updated_at timestamptz);
    create table public.paid_content(content_type text,content_id text,payload jsonb,sort_order integer);
    create function project_theory() returns trigger language plpgsql as $$ begin
      update public.paid_content set payload=${corruptProjection ? "jsonb_build_object('provenance',new.provenance)" : "jsonb_set(payload,'{provenance}',new.provenance)"}
        where content_type='theory' and content_id=new.id;
      return new;
    end $$;
    create trigger project after update on public.theories for each row execute function project_theory();`);
  await db.query(`insert into public.theories
    select r.id,r.title,'body-'||r.id,'published',r.access_tier,r.provenance,now()
      from jsonb_to_recordset($1::jsonb) r(id text,title text,access_tier text,provenance jsonb)`, [JSON.stringify(baseline)]);
  await db.exec(`insert into public.paid_content select 'theory',id,
    jsonb_build_object('title',title,'summary',summary,'provenance',provenance),1
    from public.theories where access_tier='complete';`);
  return db;
}

test('metadata update reaches paid projection and preserves bodies and existing sources', async (t) => {
  const db = await fixture(t);
  await db.exec(sql);
  const { rows } = await db.query('select id,title,summary,provenance from public.theories');
  const byId = new Map(rows.map((r) => [r.id,r]));
  for (const record of reviewed) assert.deepEqual(byId.get(record.id).provenance, record.provenance);
  for (const row of baseline) {
    assert.equal(byId.get(row.id).summary, `body-${row.id}`);
    assert.equal(byId.get(row.id).title, row.title);
    if (row.provenance) assert.deepEqual(byId.get(row.id).provenance, row.provenance);
  }
});

for (const change of ['identity', 'curation', 'projection']) {
  test(`metadata update aborts atomically on ${change} changes`, async (t) => {
    const db = await fixture(t, change === 'projection');
    if (change === 'identity') await db.query('update public.theories set title=$1 where id=$2',['renamed',reviewed[0].id]);
    if (change === 'curation') await db.query('update public.theories set provenance=$1::jsonb where id=$2',[JSON.stringify({status:'一部確認',note:'owner edit'}),reviewed[0].id]);
    await assert.rejects(db.exec(sql), /mismatch|projection changed/i);
    const { rows } = await db.query('select provenance from public.theories where id=$1',[reviewed.at(-1).id]);
    assert.equal(rows[0].provenance, null);
  });
}
