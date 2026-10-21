import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const b=read('tests/fixtures/theory-release-20261018-db.json');
const db=new PGlite();
const q=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
const migration=fs.readFileSync('supabase/migrations/20261018112458_expand_theory_catalog_945.sql','utf8');
const rollback=fs.readFileSync('supabase/rollback/20261018112458_expand_theory_catalog_945.sql','utf8');
const release=read('docs/content/theory-release-20261018-changes.json');
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema private;
 create function auth.uid() returns uuid language sql as 'select null::uuid';
 create function public.is_owner() returns boolean language sql as $$select coalesce(current_setting('app.owner',true),'false')='true'$$;
 create function public.can_read_complete_content() returns boolean language sql as $$select coalesce(current_setting('app.complete',true),'false')='true'$$;
 create table public.content_categories(kind text,id text,title text,display_order integer,updated_at timestamptz);
 create table public.theory_subcategories(id text primary key,category_id text,title text,display_order integer);
 create table public.popular_rankings(division text,content_ids jsonb);
 create table public.technique_drafts(technique_id text,snapshot jsonb);
 create table private.theory_reform_backups(phase text,source_table text,source_id text,snapshot jsonb,primary key(phase,source_table,source_id));`);
 for(const table of ['theories','techniques','theory_relations','paid_content']){
  const fields=b.columns.filter(c=>c.table===table).map(c=>`${c.name} ${c.type}${c.default?' default '+c.default:''}${c.nullable==='NO'?' not null':''}`);
  fields.push(table==='theory_relations'?'primary key(source_id,target_id)':table==='paid_content'?'primary key(content_type,content_id)':'primary key(id)');
  await db.exec(`create table public.${table}(${fields.join(',')});`);
 }
 for(const [table,items] of [['theories',b.theories],['techniques',b.techniques],['theory_relations',b.relations],['theory_subcategories',b.subcategories],['content_categories',b.categories]])await db.exec(`insert into public.${table} select * from jsonb_populate_recordset(null::public.${table},${q(items)});`);
 await db.exec(`alter table public.theories add foreign key(canonical_id) references public.theories(id),add foreign key(subcategory_id) references public.theory_subcategories(id),add check(taxonomy_order>0),add check(access_tier in('free','complete')),add check(status in('published','draft','archived')),add check(knowledge_type in('unspecified','theory','principle','phenomenon','model','method','heuristic','thought','aphorism'));
 create unique index theory_display on public.theories(category_id,display_id) where status='published';
 alter table public.theory_relations add foreign key(source_id) references public.theories(id),add foreign key(target_id) references public.theories(id),add check(source_id<>target_id),add check(relation_type not in('related','contrasts','complements') or source_id<target_id);
 create view public.public_theories as ${b.view};`);
 for(const fn of [...read('tests/fixtures/theory-release-20261018-functions.json'),...b.functions,...read('tests/fixtures/theory-release-20261018-reorder.json'),...read('tests/fixtures/theory-release-20261018-drafts.json')])await db.exec(fn);
 for(const trigger of b.triggers.filter(t=>!t.includes('content_revision_changed')&&!t.includes('protect_ranked_theories')))await db.exec(trigger);
 await db.exec('create trigger sync_canonical_paid_technique after update on public.techniques for each row execute function public.sync_canonical_paid_content();');
 assert.equal((await db.query("select md5(string_agg((to_jsonb(t)-'updated_at'-'updated_by')::text,'|' order by id)) fp from public.theories t")).rows[0].fp,b.fingerprint);
 await db.exec("begin;update public.theories set summary=summary||' concurrent edit' where id='kb_001'");
 await assert.rejects(db.exec(migration),/Release source changed/);await db.exec('rollback');
 await db.exec(migration);
 console.log('migration passed');
 assert.equal((await db.query("select count(*)::int n from public.theories where status='published'")).rows[0].n,945);
 for(const item of release.additions){const row=(await db.query('select * from public.theories where id=$1',[item.id])).rows[0];assert.equal(row.title,item.title);assert.equal(row.access_tier,'complete');assert.ok(row.provenance.sources.length);}
 // The editorial update follows the 945-card release and must keep the same access policies and paid projection.
 await db.exec(fs.readFileSync('supabase/migrations/20261018163911_theory_summary_editorial_polish.sql','utf8'));
 for(const row of read('docs/content/theory-summary-review-20261019.json').changes) {
  const canonical=(await db.query('select summary from public.theories where id=$1',[row.id])).rows[0];
  assert.equal(canonical.summary,row.summary,row.id);
 }
 // Replay the later wording and title revisions before comparing paid payloads
 // with today's source catalogue; reverse them before the dated release rollback.
 for(const revision of ['theory-practical','theory-saying-titles','theory-plain']) {
  await db.exec(fs.readFileSync(`docs/content/${revision}-update-20261021.sql`,'utf8'));
 }
 await db.exec(`grant usage on schema public to anon,authenticated;grant select on public.public_theories,public.theories,public.paid_content to anon,authenticated;
 alter table public.theories enable row level security;create policy read_theories on public.theories for select to anon,authenticated using(status='published' and(access_tier='free' or public.can_read_complete_content()));
 alter table public.paid_content enable row level security;create policy read_paid on public.paid_content for select to authenticated using(public.can_read_complete_content());set role anon;`);
 assert.equal((await db.query('select count(*)::int n from public.theories')).rows[0].n,141);
 assert.equal((await db.query('select count(*)::int n from public.paid_content')).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from public.public_theories where access_tier='complete' and(summary<>'' or provenance is not null or quotation is not null)")).rows[0].n,0);
 await db.exec("reset role;set app.complete='true';set role authenticated");
 assert.equal((await db.query('select count(*)::int n from public.theories')).rows[0].n,945);
 assert.equal((await db.query("select payload->>'summary' summary from public.paid_content where content_id='kb_957'")).rows[0].summary,read('src/data/generated/theories.json').find(t=>t.tagId==='kb_957').summary);
 await db.exec("reset role;set app.owner='true';begin");
 console.log('entitlement passed');
 await db.query("select public.set_theory_relations('kb_957','[]'::jsonb)");
 const t=(await db.query("select * from public.theories where id='kb_957'")).rows[0];
 const payload={...t,title:t.title+'（CMS確認）',aliases:[...t.aliases,'CMS検証用別名'],related_theory_ids:[],related_technique_ids:[],relations:[],display_id:t.display_id};
 await db.query('select public.save_theory_draft($1,$2)',[t.id,payload]);
 assert.equal((await db.query('select status from public.theories where id=$1',[t.id])).rows[0].status,'draft');
 await db.query('select public.publish_theory($1,$2)',[t.id,payload]);
 assert.equal((await db.query('select title from public.theories where id=$1',[t.id])).rows[0].title,payload.title);
 assert.equal((await db.query('select payload->>\'title\' title from public.paid_content where content_id=$1',[t.id])).rows[0].title,payload.title);
 await db.query("select public.place_theory_in_subcategory($1,'psychology-m',1)",[t.id]);
 assert.equal((await db.query('select subcategory_id from public.theories where id=$1',[t.id])).rows[0].subcategory_id,'psychology-m');
 await db.exec("update public.theories set status='archived' where id='kb_957'");
 assert.equal((await db.query("select count(*)::int n from public.paid_content where content_id='kb_957'")).rows[0].n,0);
 await db.exec('rollback');
 console.log('CMS passed');
 await db.exec('reset role');
 for(const revision of ['theory-plain','theory-saying-titles','theory-practical']) {
  await db.exec(fs.readFileSync(`docs/content/${revision}-rollback-20261021.sql`,'utf8'));
 }
 await db.exec(fs.readFileSync('docs/content/theory-summary-rollback-20261019.sql','utf8'));
 await db.exec("begin;update public.theories set summary=summary||' CMS edit' where id='kb_957'");await assert.rejects(db.exec(rollback),/Later theory edit/);await db.exec('rollback');
 await db.exec('reset role');
 await db.exec(rollback);
 console.log('rollback passed');
 assert.equal((await db.query("select count(*)::int n from public.theories where status='published'")).rows[0].n,821);
 assert.equal((await db.query("select count(*)::int n from public.theory_relations")).rows[0].n,574);
 for(const old of b.theories){const now=(await db.query('select * from public.theories where id=$1',[old.id])).rows[0];for(const key of Object.keys(old).filter(k=>!['updated_at','updated_by'].includes(k)))assert.deepEqual(now[key],old[key],old.id+'/'+key);}
 console.log(JSON.stringify({passed:true,published:945,added:124,free:141,relations:574+release.relationChanges.length,CMSDraftPublishEditMoveArchive:true,concurrentEditGuards:true,anonymousPaidProtection:true,rollback821:true}));
}catch(error){console.error(error.message,error.where??'');process.exitCode=1;}finally{await db.close();}
