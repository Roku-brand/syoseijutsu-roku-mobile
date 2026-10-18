import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const review=read('docs/content/content-network-review-20261016.json');
const features=read('tests/fixtures/content-network-features.json');
const source=read('src/data/generated/techniques.json');
const theories=read('docs/content/theory-release-20261018-snapshot.json')['src/data/generated/theories.json'];
// Replay the dated migration against its historical graph, before the 2026-10-18 additions.
const relations=read('docs/content/theory-release-20261018-snapshot.json')['src/data/generated/theory-relations.json'];
const db=new PGlite();
const q=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
try {
 await db.exec(`create schema private;create schema auth;create function auth.uid() returns uuid language sql as 'select null::uuid';
 create table public.theories(id text primary key,title text,summary text,status text);
 create table public.personas(name text primary key,category text,status text);
 create table public.content_categories(kind text,id text,title text);
 create table public.techniques(id text primary key,persona_id text,category text,title text,essence text,explanation text,memo text,importance smallint,practices jsonb,examples jsonb,cautions jsonb,theory_ids jsonb,status text,display_order integer,created_at timestamptz,updated_at timestamptz,updated_by uuid,primary_theory_ids jsonb,image_path text,tags jsonb,access_tier text,draft_display_order integer);
 create table public.feature_articles(id text primary key,slug text,title text,lead text,body text,status text,updated_at timestamptz,related_technique_ids text[],related_theory_ids text[],related_feature_ids text[]);
 create table public.theory_relations(source_id text,target_id text,relation_type text,review_status text,rationale text,priority integer,primary key(source_id,target_id));
 create table public.paid_content(content_type text,content_id text,payload jsonb,sort_order integer,updated_at timestamptz,primary key(content_type,content_id));
 create table private.theory_reform_backups(phase text,source_table text,source_id text,snapshot jsonb,primary key(phase,source_table,source_id));`);
 const cards=source.categories.flatMap(c=>c.subcategories.flatMap(p=>p.items.map(t=>{
  const r=review.techniques.find(r=>r.id===t.id);
  return {...t,persona_id:p.name,category:c.key,status:'published',updated_at:r.sourceUpdatedAt,theory_ids:r.before.theoryIds,primary_theory_ids:r.before.primary,access_tier:t.accessTier,display_order:t.displayOrder};
 })));
 await db.exec(`insert into public.theories select * from jsonb_populate_recordset(null::public.theories,${q(theories.map(t=>({id:t.tagId,title:t.title,summary:t.summary,status:'published'})))});
 insert into public.techniques select * from jsonb_populate_recordset(null::public.techniques,${q(cards)});
 insert into public.feature_articles select * from jsonb_populate_recordset(null::public.feature_articles,${q(features)});
 insert into public.personas select distinct persona_id,category,'published' from public.techniques;
 insert into public.content_categories select distinct 'technique',category,category from public.techniques;
 insert into public.theory_relations select * from jsonb_populate_recordset(null::public.theory_relations,${q(relations.map(r=>({source_id:r.sourceId,target_id:r.targetId,relation_type:r.type,review_status:r.reviewStatus,rationale:r.rationale,priority:r.priority})))});`);
 for(const fn of read('tests/fixtures/content-network-functions.json'))await db.exec(fn);
 await db.exec('create trigger technique_persona_integrity before update on public.techniques for each row execute function public.enforce_technique_persona();create trigger sync_canonical_paid_technique after update on public.techniques for each row execute function public.sync_canonical_paid_content();');
 const migration=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_optimize_cross_content_network.sql'));
 const sql=fs.readFileSync('supabase/migrations/'+migration,'utf8');
 const beforeTech=(await db.query('select * from public.techniques order by id')).rows;
 const beforeFeatures=(await db.query('select * from public.feature_articles order by id')).rows;
 const beforeRelations=(await db.query('select * from public.theory_relations order by source_id,target_id')).rows;
 for(const mutation of ["update public.techniques set updated_at=now() where id='master336-006'","update public.feature_articles set updated_at=now() where id='five-guidelines'","update public.theories set summary=summary||' changed' where id='kb_909'"]){
  await db.exec('begin;'+mutation);await assert.rejects(db.exec(sql),/changed/);await db.exec('rollback');
 }
 await db.exec('begin;'+sql+';commit;');
 const afterTech=(await db.query('select * from public.techniques order by id')).rows;
 for(const before of beforeTech){const after=afterTech.find(t=>t.id===before.id);const r=review.techniques.find(t=>t.id===before.id);assert.deepEqual(after.theory_ids,[...r.primary,...r.supplementary]);assert.deepEqual(after.primary_theory_ids,r.primary);for(const key of Object.keys(before).filter(k=>!['theory_ids','primary_theory_ids','updated_at'].includes(k)))assert.deepEqual(after[key],before[key],`${before.id}/${key}`);}
 for(const before of beforeFeatures){const after=(await db.query('select * from public.feature_articles where id=$1',[before.id])).rows[0],r=review.features.find(f=>f.id===before.id);assert.deepEqual(after.related_technique_ids,r.techniqueIds);assert.deepEqual(after.related_theory_ids,r.theoryIds);assert.deepEqual(after.related_feature_ids,r.featureIds);for(const key of ['id','slug','title','lead','body','status'])assert.equal(after[key],before[key]);}
 assert.deepEqual((await db.query('select * from public.theory_relations order by source_id,target_id')).rows,beforeRelations);
 for(const t of afterTech.filter(t=>t.access_tier==='complete'&&t.updated_at.toISOString()!==new Date(review.techniques.find(r=>r.id===t.id).sourceUpdatedAt).toISOString())){const payload=(await db.query("select payload from public.paid_content where content_type='technique' and content_id=$1",[t.id])).rows[0].payload;assert.deepEqual(payload.relatedTheoryIds,t.theory_ids);assert.deepEqual(payload.primaryTheoryIds,t.primary_theory_ids);assert.equal(payload.explanation,t.explanation);}
 assert.equal((await db.query('select count(*)::int n from private.theory_reform_backups')).rows[0].n,356+6+574);
 console.log({passed:true,techniques:afterTech.length,features:6,theoryRelationsPreserved:574,conflictGuards:true,paidProjection:true,textAndIdentityPreserved:true});
}finally{await db.close();}
