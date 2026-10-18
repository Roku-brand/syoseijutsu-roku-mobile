import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const source=JSON.parse(fs.readFileSync('src/data/generated/techniques.json','utf8'));
const cards=source.categories.flatMap(c=>c.subcategories.flatMap(p=>p.items));
const sql=fs.readFileSync('supabase/migrations/20261016150453_curate_search_tags.sql','utf8');
const db=new PGlite();
const q=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
try {
 await db.exec(`create schema private;
 create table public.techniques(id text primary key,title text,essence text,explanation text,tags jsonb,status text,updated_at timestamptz default now());
 create table public.paid_content(content_type text,content_id text,payload jsonb,sort_order int,updated_at timestamptz default now(),primary key(content_type,content_id));
 create table private.theory_reform_backups(phase text,source_table text,source_id text,snapshot jsonb,primary key(phase,source_table,source_id));
 insert into public.techniques select * from jsonb_populate_recordset(null::public.techniques,${q(cards.map(t=>({...t,tags:null,status:'published'})))});
 update public.techniques set tags='null'::jsonb where id in ('master336-001','master336-002');
 insert into public.paid_content select 'technique',id,jsonb_build_object('id',id,'explanation',explanation),0,now() from public.techniques;
 insert into public.paid_content values('theory','private-sentinel','{"summary":"unchanged"}',0,now());`);
 await db.exec('begin;'+sql+'commit;');
 assert.equal((await db.query('select count(*)::int as n from public.techniques where jsonb_array_length(tags)=3')).rows[0].n,356);
 assert.equal((await db.query('select count(*)::int as n from private.theory_reform_backups')).rows[0].n,712);
 assert.equal((await db.query("select (snapshot->>'_tags_sql_null')::boolean as was_sql_null from private.theory_reform_backups where source_id='master336-001' and source_table='techniques'")).rows[0].was_sql_null,false);
 assert.deepEqual((await db.query("select payload from public.paid_content where content_id='private-sentinel'")).rows[0].payload,{summary:'unchanged'});
 await db.exec('begin;'+sql+'commit;'); // idempotence, original backup retained
 assert.equal((await db.query('select count(*)::int as n from private.theory_reform_backups')).rows[0].n,712);
 await db.exec("update public.techniques set tags='[\"owner edit\"]' where id='master336-001';");
 await assert.rejects(db.exec('begin;'+sql+'commit;'),/Source text or owner tags changed/);await db.exec('rollback');
 assert.deepEqual((await db.query("select tags from public.techniques where id='master336-001'")).rows[0].tags,['owner edit']);
 await db.exec("update public.techniques set tags='[]' where id='master336-001';");
 await assert.rejects(db.exec('begin;'+sql+'commit;'),/Source text or owner tags changed/);await db.exec('rollback');
 assert.deepEqual((await db.query("select tags from public.techniques where id='master336-001'")).rows[0].tags,[]);
 const mask=fs.readFileSync('supabase/migrations/20261016150650_protect_complete_search_tags.sql','utf8');
 const beforeView=mask.match(/<> '([\s\S]*?)' then raise/)[1].replaceAll("''", "'");
 await db.exec(`alter table public.techniques add column persona_id text,add column category text,add column memo text,add column importance int,add column practices jsonb,add column examples jsonb,add column cautions jsonb,add column primary_theory_ids jsonb,add column theory_ids jsonb,add column display_order int,add column image_path text,add column access_tier text default 'complete';
 create function public.can_read_complete_content() returns boolean language sql stable as $$select coalesce(current_setting('test.is_paid',true),'false')='true'$$;
 create role anon;create role authenticated;
 create view public.public_techniques with(security_barrier=true) as ${beforeView}
 grant select on public.public_techniques to anon,authenticated;
 update public.techniques set access_tier='free',tags=${q(cards[0].tags)} where id='master336-001';`);
 // PGlite PG18 reformats view SQL differently from production PG17.
 // Parse the identical pre-migration definition, then compare its canonical form.
 const canonicalBefore=(await db.query("select pg_get_viewdef('public.public_techniques'::regclass,true) definition")).rows[0].definition;
 const compatibleMask=mask.replace(beforeView.replaceAll("'","''"),canonicalBefore.replaceAll("'","''"));
 await db.exec('begin;'+compatibleMask+'commit;');
 await db.exec("set role anon;");
 assert.equal((await db.query("select count(*)::int n from public.public_techniques where access_tier='complete' and tags is not null")).rows[0].n,0);
 assert.deepEqual((await db.query("select tags from public.public_techniques where id='master336-001'")).rows[0].tags,cards[0].tags);
 await db.exec("reset role;set role authenticated;set test.is_paid='true';");
 assert.equal((await db.query("select count(*)::int n from public.public_techniques where tags is not null")).rows[0].n,356);
 await db.exec("set test.is_paid='false';");
 assert.equal((await db.query("select count(*)::int n from public.public_techniques where access_tier='complete' and tags is not null")).rows[0].n,0);
 await db.exec('reset role;');
 console.log('Search-tag migration passed: 356 rows, paid payload compatibility, backup, idempotence and concurrent-owner guard.');
 console.log('Public tag view passed: anonymous/free masking, complete entitlement and unchanged ACL/security barrier.');
} catch(error) {console.error(error.message);process.exitCode=1;} finally {await db.close();}
