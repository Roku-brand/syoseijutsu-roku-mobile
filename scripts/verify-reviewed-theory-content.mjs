import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const {PGlite}=process.argv[2] ? await import(pathToFileURL(process.argv[2]).href) : await import('@electric-sql/pglite');
const b=JSON.parse(fs.readFileSync('tests/fixtures/theory-reform-catalog-before.json','utf8'));
const file=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_retire_original_maxims.sql'));
const sql=fs.readFileSync('supabase/migrations/'+file,'utf8');
const db=new PGlite();
const q=x=>"'"+JSON.stringify(x).replaceAll("'","''")+"'::jsonb";
const retired=new Set(b.theories.filter(t=>t.provenance?.status==='オリジナル').map(t=>t.id));
try{
 await db.exec(`set timezone='UTC';create role anon;create role authenticated;create role service_role;create schema private;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as 'select null::uuid';create function public.is_owner() returns boolean language sql as $$select coalesce(current_setting('app.owner',true),'false')='true'$$;
 create function public.can_read_complete_content() returns boolean language sql as $$select coalesce(current_setting('app.complete',true),'false')='true'$$;
 create table public.content_categories(kind text,id text,title text,display_order integer,updated_at timestamptz);
 create table public.theory_subcategories(id text primary key,category_id text,title text,display_order integer);
 create table public.theories(id text primary key,title text,summary text,category_id text,category_title text,aliases jsonb,related_theory_ids jsonb,status text,display_order integer,updated_at timestamptz,updated_by uuid,provenance jsonb,image_path text,draft_technique_ids jsonb,access_tier text,display_id integer,draft_display_id integer,subcategory_id text,taxonomy_order integer,canonical_id text,legacy_ids jsonb);
 create table public.techniques(id text primary key,persona_id text,category text,title text,essence text,explanation text,memo text,importance smallint,practices jsonb,examples jsonb,cautions jsonb,theory_ids jsonb,status text,display_order integer,created_at timestamptz,updated_at timestamptz,updated_by uuid,primary_theory_ids jsonb,image_path text,tags jsonb,access_tier text,draft_display_order integer);
 create table public.technique_drafts(technique_id text,snapshot jsonb);
 create table public.popular_rankings(division text,content_ids jsonb check(jsonb_typeof(content_ids)='array' and jsonb_array_length(content_ids)=10));
 create table public.feature_articles(related_theory_ids text[]);
 create table public.feature_article_drafts(payload jsonb);
 create table public.operation_social_posts(source_theory_id text);
 create table public.paid_content(content_type text,content_id text,payload jsonb,sort_order integer,updated_at timestamptz,primary key(content_type,content_id));`);
 for(const [name,data] of [['theories',b.theories],['techniques',b.techniques],['content_categories',b.categories],['theory_subcategories',b.subcategories]]) await db.exec(`insert into public.${name} select * from jsonb_populate_recordset(null::public.${name},${q(data)});`);
 await db.exec(`insert into public.popular_rankings select x.division,x.content_ids from jsonb_to_recordset(${q(b.rankings)}) x(division text,content_ids jsonb);
 create unique index theory_display on public.theories(category_id,display_id) where status='published';
 create view public.public_theories as ${b.view};`);
 for(const name of ['validate_theory_content','validate_theory_relations','sync_taxonomy_paid_theory']) await db.exec(b.functions.find(f=>f.name===name).definition);
 await db.exec(`create trigger theory_content_integrity before insert or update on public.theories for each row execute function public.validate_theory_content();create trigger theory_relations_integrity before insert or update on public.theories for each row execute function public.validate_theory_relations();create trigger sync_canonical_paid_theory after insert or update on public.theories for each row execute function public.sync_taxonomy_paid_theory();insert into public.paid_content select 'theory',id,'{}',display_id,now() from public.theories where status='published' and access_tier='complete';`);
 console.log((await db.query("select md5(string_agg((to_jsonb(t)-'updated_at'-'updated_by')::text,'|' order by id)) as fingerprint from public.theories t")).rows);
 await db.exec('begin;update public.theories set title=title||\' CMS edit\' where id=\'kb_001\';');
 await assert.rejects(db.exec(sql),/snapshot changed/);await db.exec('rollback;');
 await db.exec('begin;'+sql+';commit;');
 const after=(await db.query('select to_jsonb(t) as item from public.theories t order by id')).rows.map(r=>r.item);
 assert.equal(after.filter(t=>t.status==='published').length,803);
 assert.equal(after.filter(t=>retired.has(t.id)&&t.status==='archived').length,39);
 assert.equal((await db.query("select jsonb_array_length(content_ids)::int n from public.popular_rankings where division='theory'")).rows[0].n,10);
 assert.equal((await db.query('select count(*)::int n from public.theory_subcategories')).rows[0].n,36);
 for(const t of after)if(!retired.has(t.id))assert.deepEqual(t,b.theories.find(x=>x.id===t.id),`Unrelated row must remain unchanged: ${t.id}`);
 for(const t of (await db.query('select * from public.techniques')).rows){const old=b.techniques.find(x=>x.id===t.id);assert.deepEqual(t.theory_ids,old.theory_ids.filter(id=>!retired.has(id)));assert.deepEqual(t.primary_theory_ids,old.primary_theory_ids.filter(id=>!retired.has(id)));}
 for(const t of after.filter(t=>retired.has(t.id))) await assert.rejects(db.query('update public.theories set status=\'draft\' where id=$1',[t.id]),/独自作成の名言/);
 assert.equal((await db.query('select count(*)::int n from private.theory_reform_backups')).rows[0].n,b.theories.length+b.techniques.length+b.rankings.length+1);

 await db.exec(fs.readFileSync('supabase/migrations/20261015121152_theory_knowledge_network.sql','utf8'));

 await db.exec(fs.readFileSync('supabase/migrations/20261015123353_theory_network_editor_drafts.sql','utf8'));
 const expected={theories:(await db.query("select * from public.theories where status='published'")).rows,fingerprint:'ec7717144a9a94e73ea955792ed480ec'};
 const fp=(await db.query("select md5(string_agg((to_jsonb(t)-'updated_at'-'updated_by')::text,'|' order by id)) fp from public.theories t where status='published'")).rows[0].fp;
 assert.equal(fp,expected.fingerprint);
 const beforeEdges=(await db.query('select * from public.theory_relations')).rows;
 const content=fs.readFileSync('supabase/migrations/20261015125607_historical_maxims_reviewed_content.sql','utf8');
 await db.exec("begin;update public.theories set summary=summary||' CMS change' where id='kb_001'");await assert.rejects(db.exec(content),/Reviewed source changed/);await db.exec('rollback');
 await db.exec('begin;'+content+';commit;');
 const all=(await db.query('select * from public.theories')).rows;
 const published=all.filter(t=>t.status==='published');assert.equal(published.length,821);
 assert.equal(published.filter(t=>t.quotation).length,19);
 for(const t of expected.theories){const row=published.find(r=>r.id===t.id);assert(row,t.id);assert.equal(row.display_id,t.display_id,t.id);assert.equal(row.access_tier,t.access_tier,t.id);assert.equal(row.category_id,t.category_id,t.id);assert.equal(row.subcategory_id,t.subcategory_id,t.id);if(!['kb_002','kb_595'].includes(t.id)){assert.equal(row.title,t.title);assert.equal(row.summary,t.summary);}}
 const audit=JSON.parse(fs.readFileSync('docs/content/historical-maxims-audit-20261015.json','utf8'));
 for(const q of audit){if(q.decision==='hold'){assert.equal(q.theoryId,null);continue;}const row=published.find(t=>t.id===q.theoryId);assert.equal(row.quotation.originalText,q.originalText);assert.equal(row.quotation.translationText,q.displayText);assert.notEqual(row.title,'「'+q.displayText+'」');assert.equal(row.access_tier,'complete');}
 assert.equal((await db.query('select count(*)::int n from public.theory_quote_reviews')).rows[0].n,50);
 const finalEdges=(await db.query('select * from public.theory_relations')).rows;
 const key=r=>[r.source_id,r.target_id].sort().join('|');const edgeKeys=new Set(finalEdges.map(key));for(const edge of beforeEdges)assert(edgeKeys.has(key(edge)),'Lost prior edge '+key(edge));
 for(const t of expected.theories)for(const id of t.related_theory_ids)assert(published.find(r=>r.id===t.id).related_theory_ids.includes(id));
 for(const r of finalEdges.filter(r=>r.review_status==='confirmed')){assert(published.find(t=>t.id===r.source_id).related_theory_ids.includes(r.target_id));assert(published.find(t=>t.id===r.target_id).related_theory_ids.includes(r.source_id));}
 for(const q of audit.filter(q=>q.decision!=='hold'))for(const id of q.relatedTechniqueIds){const t=(await db.query('select * from public.techniques where id=$1',[id])).rows[0];assert(t.theory_ids.includes(q.theoryId));if(q.decision==='adopt')assert(!t.primary_theory_ids.includes(q.theoryId));}
 await assert.rejects(db.exec("insert into public.theory_subcategories(id,category_id,title,display_order) values('new-section','psychology','分割',99)"),/36/);
 await assert.rejects(db.exec("delete from public.theory_subcategories where id='psychology-c'"),/36/);
 await assert.rejects(db.exec("insert into public.content_categories(kind,id,title) values('theory','new-major','新分類')"),/6大分類/);
 await db.exec("grant usage on schema public to anon,authenticated;grant select on public.theories to anon,authenticated;alter table public.theories enable row level security;create policy read_theories on public.theories for select to anon,authenticated using(status='published' and(access_tier='free' or public.can_read_complete_content()));set role anon");
 assert.equal((await db.query("select count(*)::int n from public.public_theories where access_tier='complete' and(summary<>'' or quotation is not null or provenance is not null)")).rows[0].n,0);
 await assert.rejects(db.query('select * from public.theory_quote_reviews'));
 await db.exec('reset role;set role authenticated');assert.equal((await db.query('select count(*)::int n from public.theory_quote_reviews')).rows[0].n,0);
 await db.exec('reset role');
 const headlines=fs.readFileSync('supabase/migrations/20261015174824_theory_quote_headlines.sql','utf8');
 await db.exec('begin;'+headlines+';commit;');
 const renamed=(await db.query("select * from public.theories where status='published'")).rows;
 assert.equal(renamed.length,821);
 for(const old of published){const now=renamed.find(t=>t.id===old.id);assert.equal(now.display_id,old.display_id);assert.equal(now.access_tier,old.access_tier);assert.deepEqual(now.related_theory_ids,old.related_theory_ids);assert.deepEqual(now.quotation,old.quotation);if(old.quotation){assert.equal(now.title,'「'+old.quotation.translationText+'」');assert.equal(now.subcategory_id,'classics-thought-f');}else assert.equal(now.title,old.title);}
 assert.equal((await db.query("select title from public.theory_subcategories where id='classics-thought-p'")).rows[0].title,'ことわざ');
 assert.equal((await db.query("select title from public.theory_subcategories where id='classics-thought-f'")).rows[0].title,'格言');
 for(const id of ['classics-thought-p','classics-thought-f']){const order=renamed.filter(t=>t.subcategory_id===id).map(t=>t.taxonomy_order).sort((a,b)=>a-b);assert.deepEqual(order,order.map((_,i)=>i+1));}
 await db.exec("update public.theories set title='obsolete paraphrase' where id='kb_595'");
 assert.equal((await db.query("select title from public.theories where id='kb_595'")).rows[0].title,'「'+renamed.find(t=>t.id==='kb_595').quotation.translationText+'」');
 await assert.rejects(db.exec("update public.theories set quotation=jsonb_set(quotation,'{rightsStatus}','\"pending\"') where id='kb_595'"),/原典と権利/);
 await db.exec(fs.readFileSync('supabase/migrations/20261015175353_distinguish_literary_commentary.sql','utf8'));
 assert.equal((await db.query("select count(*)::int n from public.theories where status='published' and subcategory_id='classics-thought-f' and quotation is null")).rows[0].n,0);
 for(const id of ['kb_701','kb_702'])assert.equal((await db.query('select subcategory_id from public.theories where id=$1',[id])).rows[0].subcategory_id,'classics-thought-e');
 await db.exec('set role anon');
 assert.equal((await db.query("select count(*)::int n from public.public_theories where access_tier='complete' and(summary<>'' or quotation is not null or provenance is not null)")).rows[0].n,0);
 assert.equal((await db.query("select title from public.public_theories where id='kb_595'")).rows[0].title,renamed.find(t=>t.id==='kb_595').title);
 console.log(JSON.stringify({passed:true,published:published.length,quoted:19,retired:39,typed:finalEdges.filter(r=>r.review_status==='confirmed').length,general:finalEdges.filter(r=>r.review_status==='legacy').length,totalEdges:finalEdges.length,candidates:50,stableIds:true,paidBodiesProtected:true,oldEdgesPreserved:true,classificationLock:true,publicQuoteHeadlines:true}));
}catch(error){console.error(error.message);process.exitCode=1;}finally{await db.close();}
