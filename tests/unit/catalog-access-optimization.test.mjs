import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const migration=fs.readFileSync('supabase/migrations/20261029095332_optimize_catalog_and_personal_backups.sql','utf8');
const before=JSON.parse(fs.readFileSync('tests/fixtures/catalog-access-before-20261029.json','utf8'));
test('catalog optimization preserves all access states, legacy aliases and private backup isolation',async()=>{
 const db=new PGlite();
 try{
 await db.exec(`
 create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth;
 create table auth.users(id uuid primary key, edition text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;
 create function public.is_owner() returns boolean language sql stable security definer as $$select exists(select 1 from auth.users where id=auth.uid() and edition='owner')$$;
 create function public.has_complete_edition(target_user_id uuid) returns boolean language sql stable security definer as $$select exists(select 1 from auth.users where id=target_user_id and edition in('owner','paid'))$$;
 create function public.can_read_complete_content() returns boolean language sql stable security definer as $$select public.is_owner() or public.has_complete_edition(auth.uid())$$;
 create function public.create_persona(name text, category text) returns void language plpgsql security definer as $$begin if not public.is_owner() then raise exception 'owner_required';end if;end$$;
 create table public.techniques(id text,persona_id text,category text,title text,essence text,explanation text,memo text,importance int,practices jsonb,examples jsonb,cautions jsonb,primary_theory_ids jsonb,theory_ids jsonb,status text,display_order int,updated_at timestamptz,image_path text,access_tier text,tags jsonb);
 create table public.theories(id text primary key,title text,summary text,category_id text,category_title text,aliases jsonb,related_theory_ids jsonb,provenance jsonb,status text,display_order int,display_id int,image_path text,access_tier text,subcategory_id text,taxonomy_order int,canonical_id text,legacy_ids jsonb,knowledge_type text,quotation jsonb,updated_at timestamptz default now());
 create table public.theory_subcategories(id text,title text);
 insert into auth.users select ('00000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,edition from (values(1,'free'),(2,'paid'),(3,'owner'),(4,'expired'),(5,'revoked')) a(i,edition);
 insert into public.techniques(id,title,essence,explanation,access_tier,status,practices,examples,cautions,tags) values('free','Free','free essence','free body','free','published','[]','[]','[]','["free"]'),('paid','Paid','paid essence','paid body','complete','published','["paid"]','["paid"]','["paid"]','["paid"]'),('draft','Hidden','draft','draft','complete','draft','[]','[]','[]','[]');
 insert into public.theories(id,title,summary,access_tier,status,canonical_id,quotation,provenance,aliases) values('free','Free','free theory','free','published','free','{"author":"author","translationText":"free"}','{"note":"free"}','[]'),('paid','Paid','paid theory','complete','published','paid','{"author":"author","translationText":"paid"}','{"note":"paid"}','[]'),('legacy','Old','old','complete','archived','paid',null,null,'[]');
 `);
 for(const v of before.views)await db.exec('create view public.'+v.name+' with(security_barrier=true) as '+v.definition);
 await db.exec('grant select on public.public_techniques,public.public_theories to anon,authenticated;');
 const contexts=[null,1,2,3,4,5],snapshots=[];
 const enter=async id=>{await db.exec("reset role;set request.jwt.claim.sub='"+(id?'00000000-0000-4000-8000-'+String(id).padStart(12,'0'):'')+"';set role "+(id?'authenticated':'anon')+';');};
 const read=async()=>({techniques:(await db.query("select to_jsonb(t)-'updated_at' as row from public.public_techniques t order by id")).rows,theories:(await db.query("select to_jsonb(t)-'updated_at' as row from public.public_theories t order by id")).rows});
 for(const id of contexts){await enter(id);snapshots.push(await read());}
 await db.exec('reset role;');await db.exec(migration);
 for(const [i,id] of contexts.entries()){await enter(id);assert.deepEqual(await read(),snapshots[i],'access context '+id);}
 await enter(null);await assert.rejects(db.query("select public.create_persona('x','work')"),/permission denied/);
 await enter(1);await assert.rejects(db.query("select public.create_persona('x','work')"),/owner_required/);
 await db.query("insert into public.personal_backups(user_id,data) values(auth.uid(),'{\"record\":\"mine\"}')");
 await enter(2);assert.equal((await db.query('select * from public.personal_backups')).rows.length,0);
 await assert.rejects(db.query("insert into public.personal_backups(user_id,data) values('00000000-0000-4000-8000-000000000001','{}')"),/row-level security|duplicate key/);
 await enter(1);assert.equal((await db.query('select data from public.personal_backups')).rows[0].data.record,'mine');
 await db.query("update public.personal_backups set data='{\"record\":\"updated\"}' where user_id=auth.uid()");
 await assert.rejects(db.query("update public.personal_backups set user_id='00000000-0000-4000-8000-000000000002'"),/permission denied/);
 await db.query('delete from public.personal_backups where user_id=auth.uid()');
 assert.equal((await db.query('select * from public.personal_backups')).rows.length,0);
 }finally{await db.close();}
});

