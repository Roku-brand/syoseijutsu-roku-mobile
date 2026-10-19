import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const review = JSON.parse(fs.readFileSync('docs/content/theory-summary-review-20261019.json', 'utf8'));
const catalogue = JSON.parse(fs.readFileSync('src/data/generated/theories.json', 'utf8'));
const migration = fs.readFileSync('supabase/migrations/'+fs.readdirSync('supabase/migrations').find(n=>n.endsWith('_theory_summary_editorial_polish.sql')), 'utf8');
const rollback = fs.readFileSync('docs/content/theory-summary-rollback-20261019.sql', 'utf8');
const quoteGuard = fs.readFileSync('supabase/migrations/20261015174824_theory_quote_headlines.sql','utf8').match(/CREATE OR REPLACE FUNCTION public\.validate_quotation_metadata\(\)[\s\S]*?end \$function\$\s*;/i)[0];
const json = value => "'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";

test('review retains the six categories, 36 subcategories and every approved quotation', () => {
  assert.equal(review.reviewedPublishedCount,945);
  assert.equal(review.categoryCount,6);
  assert.equal(review.subcategoryCount,36);
  assert.equal(review.changes.length,286);
  assert.equal(new Set(review.changes.map(r=>r.id)).size,286);
  assert.equal(review.changes.filter(r=>r.contextNote).length,19);
  for (const row of review.changes) {
    assert.ok(row.summary.length > 15);
    if (row.contextNote) {
      const q=catalogue.find(t=>t.tagId===row.id).quotation;
      assert.ok(row.summary.startsWith(`「${q.translationText}」\n— ${q.author}\n${q.work}\n\n`));
      assert.ok(!/候補|原詩へ戻した|法則ではない|根拠ではない/.test(row.contextNote));
    } else {
      assert.ok(row.summary.length <= 150, row.id);
      assert.ok(!/ここでは|というより/.test(row.summary), row.id);
    }
  }
  const mehrabian=review.changes.find(r=>r.id==='kb_389').summary;
  assert.match(mehrabian,/好意や反感.*食い違う.*声や表情/);
});

test('guarded migration and rollback preserve IDs, quotations, rights, access and unrelated rows', async () => {
  const db=new PGlite();
  try {
    await db.exec(`create schema private;create table private.theory_reform_backups(phase text,source_table text,source_id text,snapshot jsonb,primary key(phase,source_table,source_id));
      create table public.theories(id text primary key,title text,summary text,quotation jsonb,knowledge_type text,status text,access_tier text,aliases jsonb,related_theory_ids jsonb,updated_at timestamptz);`);
    const rows=review.changes.map(r=>{
      const original=catalogue.find(t=>t.tagId===r.id);
      const quotation=r.contextNote?{...original.quotation,contextNote:r.beforeContextNote}:null;
      return {id:r.id,title:r.title,summary:r.beforeSummary,quotation,knowledge_type:original?.knowledgeType??'model',status:'published',access_tier:original?.accessTier??'complete',aliases:['keep alias'],related_theory_ids:['keep relation'],updated_at:'2026-10-15T00:00:00Z'};
    });
    rows.push({id:'untouched-archive',title:'retired record',summary:'Keep the retired record.',quotation:null,knowledge_type:'model',status:'archived',access_tier:'complete',aliases:[],related_theory_ids:[],updated_at:'2026-10-15T00:00:00Z'});
    await db.exec(`insert into public.theories select * from jsonb_populate_recordset(null::public.theories,${json(rows)});${quoteGuard}
      create trigger quotation_publication_guard before update on public.theories for each row execute function public.validate_quotation_metadata();`);
    const snapshot=async()=> (await db.query("select id,to_jsonb(t)-'updated_at' as record from public.theories t order by id")).rows;
    const before=await snapshot();
    await db.exec("begin;update public.theories set summary='A newer CMS edit' where id='kb_389';");
    await assert.rejects(db.exec(migration),/Reviewed summary changed/);
    await db.exec('rollback;');
    assert.deepEqual(await snapshot(),before);
    await db.exec(migration);
    assert.equal((await db.query('select count(*)::integer as n from private.theory_reform_backups')).rows[0].n,286);
    const after=await snapshot();
    for(const row of after) {
      const old=before.find(t=>t.id===row.id).record;
      const edit=review.changes.find(t=>t.id===row.id);
      if(!edit) {assert.deepEqual(row.record,old);continue;}
      assert.equal(row.record.summary,edit.summary);
      const expected={...old,summary:edit.summary,...(edit.contextNote?{quotation:{...old.quotation,contextNote:edit.contextNote}}:{})};
      assert.deepEqual(row.record,expected);
    }
    await db.exec(rollback);
    assert.deepEqual(await snapshot(),before);
  } finally { await db.close(); }
});
