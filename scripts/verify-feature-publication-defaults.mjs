import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const sql=file=>fs.readFileSync(file,'utf8');
const owner='00000000-0000-4000-8000-000000000001';
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;grant usage on schema auth to anon,authenticated;
 create function auth.uid() returns uuid language sql stable as 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
 create function public.is_owner() returns boolean language sql stable as 'select auth.uid()=''${owner}''::uuid';
 create table public.techniques(id text,status text);create table public.theories(id text,status text);
 insert into public.techniques values('z','published'),('a','published');insert into public.theories values('z','published'),('a','published');
 grant select on public.techniques,public.theories to authenticated;
 create schema private;create table private.theory_reform_backups(phase text,source_table text,source_id text,snapshot jsonb,primary key(phase,source_table,source_id));`);
 for(const name of ['20261013135333_feature_articles_cms.sql','20261013142340_seed_feature_articles.sql','20261014080440_add_feature_article_categories.sql','20261014103609_feature_editorial_desk.sql']) await db.exec(sql('supabase/migrations/'+name));
 const before=(await db.query('select * from public.feature_articles order by id')).rows;
 const migration=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_fix_feature_publication_defaults.sql'));
 await db.exec(sql('supabase/migrations/'+migration));
 assert.deepEqual((await db.query('select * from public.feature_articles order by id')).rows,before);
 assert.equal((await db.query('select count(*)::integer n from private.theory_reform_backups')).rows[0].n,2);
 const asOwner=`set request.jwt.claim.sub='${owner}';set role authenticated;`;
 await db.exec(asOwner);
 const payload={slug:'',title:'省略したURLの検証',body:'本文',image_path:'bundled:feature-coast',related_technique_ids:['z','a','z'],related_theory_ids:['z','a','z']};
 const saved=(await db.query('select public.save_feature_article_draft(null,$1::jsonb,null,null) result',[JSON.stringify(payload)])).rows[0].result;
 assert.match(saved.slug,/^[a-z0-9-]+$/);assert.equal(saved.slug,saved.id);
 await db.query('select public.publish_feature_article($1,$2)',[saved.id,saved.revision]);
 const article=(await db.query('select * from public.feature_articles where id=$1',[saved.id])).rows[0];
 assert.equal(article.status,'published');assert.equal(article.slug,saved.slug);assert.deepEqual(article.related_technique_ids,['z','a']);assert.deepEqual(article.related_theory_ids,['z','a']);
 const revision=(await db.query('select public.save_feature_article_draft($1,$2::jsonb,$3,null) result',[article.id,JSON.stringify({...payload,title:'未公開の変更'}),article.updated_at])).rows[0].result;
 assert.equal(revision.slug,article.slug);
 await assert.rejects(db.query('select public.publish_feature_article($1,999)',[article.id]),/変更されています/);
 assert.equal((await db.query('select title from public.feature_articles where id=$1',[article.id])).rows[0].title,article.title);
 await db.exec("reset role;set request.jwt.claim.sub='';set role anon;");
 await assert.rejects(db.query('select public.publish_feature_article($1,$2)',[article.id,revision.revision]),/permission denied/);
 await db.exec("reset role;set request.jwt.claim.sub='00000000-0000-4000-8000-000000000099';set role authenticated;");
 await assert.rejects(db.query('select public.publish_feature_article($1,$2)',[article.id,revision.revision]),/owner_required/);
 await db.exec(asOwner);
 assert.equal((await db.query('select revision from public.feature_article_drafts where article_id=$1',[article.id])).rows[0].revision,revision.revision);
 await db.query('select public.publish_feature_article($1,$2)',[article.id,revision.revision]);
 assert.equal((await db.query('select title from public.feature_articles where id=$1',[article.id])).rows[0].title,'未公開の変更');

 await db.exec('reset role');
 const previousFeatures = (await db.query('select * from public.feature_articles order by id')).rows;
 const seriesMigration = fs.readdirSync('supabase/migrations').find(name => name.endsWith('_add_generational_concerns.sql'));
 const seriesSql = sql('supabase/migrations/' + seriesMigration);
 await db.exec(seriesSql);
 const editorials = (await db.query("select * from public.feature_articles where series_id='editorial' order by id")).rows;
 assert.deepEqual(editorials.map(({series_id,life_stage,show_in_series,...row}) => row), previousFeatures);
 const concerns = (await db.query("select * from public.feature_articles where series_id='generational-concerns'")).rows;
 assert.equal(concerns.length, 21);
 assert.ok(concerns.every(row => row.status === 'published' && row.show_in_series && !row.show_in_list && !row.is_featured));
 const imported = concerns.find(row => row.slug === 'life-group-exclusion');

 await db.exec(asOwner);
 const save = async (content, target = null) => (await db.query('select public.save_feature_article_draft($1,$2::jsonb,$3,null) result', [target?.id ?? null, JSON.stringify(content), target?.updated_at ?? null])).rows[0].result;
 const edit = await save({...payload, image_path: null, title: '既存の短編を編集'}, imported);
 await db.query('select public.publish_feature_article($1,$2)', [edit.id, edit.revision]);
 const edited = (await db.query('select * from public.feature_articles where id=$1', [edit.id])).rows[0];
 assert.equal(edited.life_stage, 'student');
 assert.equal(edited.title, '既存の短編を編集');
 assert.equal(edited.show_in_list, false);
 const moved = await save({...payload, image_path: null, life_stage: 'crossroads', show_in_series: false}, edited);
 await db.query('select public.publish_feature_article($1,$2)', [moved.id, moved.revision]);
 assert.deepEqual((await db.query('select life_stage, show_in_series from public.feature_articles where id=$1', [edit.id])).rows[0], {life_stage: 'crossroads', show_in_series: false});

 const newDraft = await save({...payload, series_id: 'generational-concerns', life_stage: null, image_path: null});
 await assert.rejects(db.query('select public.publish_feature_article($1,$2)', [newDraft.id, newDraft.revision]), /人生段階/);
 await db.exec("reset role;set request.jwt.claim.sub='';set role anon");
 assert.equal((await db.query('select id from public.feature_articles where id=$1', [newDraft.id])).rows.length, 0);
 await db.exec('reset role');
 const beforeReplay = (await db.query('select * from public.feature_articles order by id')).rows;
 await db.exec(seriesSql);
 assert.deepEqual((await db.query('select * from public.feature_articles order by id')).rows, beforeReplay);

 console.log({passed:true,automaticSlug:true,relationOrderPreserved:true,retryAfterConflict:true,ownerOnly:true,existingArticlesUnchanged:true,generationalConcerns:21,replayPreservesEdits:true});
}catch(cause) {console.error(cause.message,cause.detail??'');process.exitCode=1;}
finally {await db.close();}
