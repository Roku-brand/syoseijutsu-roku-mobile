import fs from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const [source,target] = process.argv.slice(2);
if (!source || !target) throw Error('Provide the authoritative before snapshot and a CLI-created migration file.');
const before=JSON.parse(fs.readFileSync(source,'utf8'));
const review=JSON.parse(fs.readFileSync('docs/content/content-network-review-20261016.json','utf8'));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sha=s=>createHash('sha256').update(s).digest('hex');
const dbTech=new Map(before.techniques.map(t=>[t.id,t]));
const dbTheory=new Map(before.theories.map(t=>[t.id,t]));
assert.equal(review.techniques.length,before.techniques.length);
for(const t of review.techniques){const row=dbTech.get(t.id);assert.equal(t.core,row.essence);assert(equal(t.before.theoryIds,row.theory_ids));assert(equal(t.before.primary,row.primary_theory_ids));for(const id of [...t.primary,...t.supplementary])assert(dbTheory.has(id),id);assert.equal(new Set([...t.primary,...t.supplementary]).size,t.primary.length+t.supplementary.length);assert(t.rationale);}
const changes=review.techniques.filter(t=>!equal(t.before.primary,t.primary)||!equal(t.before.theoryIds,[...t.primary,...t.supplementary]));
const payload=changes.map(t=>({id:t.id,previous_primary:t.before.primary,previous_theories:t.before.theoryIds,expected_updated_at:t.sourceUpdatedAt,primary:t.primary,theories:[...t.primary,...t.supplementary]}));
const featurePayload=review.features.map(f=>({id:f.id,expected_updated_at:f.sourceUpdatedAt,previous_techniques:f.before.techniqueIds,previous_theories:f.before.theoryIds,previous_features:f.before.featureIds,techniques:f.techniqueIds,theories:f.theoryIds,features:f.featureIds}));
const q=v=>"'"+JSON.stringify(v).replaceAll("'","''")+"'::jsonb";
const theoryHashes=before.theories.map(t=>({id:t.id,hash:sha(t.title+'|'+t.summary)}));
// Capture exact source revisions for review reproducibility without adding
// restricted prose to the runtime bundle.
review.sourceHashes={techniques:Object.fromEntries(before.techniques.map(t=>[t.id,sha(t.title+'|'+t.essence+'|'+t.explanation)])),features:Object.fromEntries(before.features.map(f=>[f.id,sha(f.title+'|'+f.lead+'|'+f.body)]))};
fs.writeFileSync('docs/content/content-network-review-20261016.json',JSON.stringify(review,null,2)+'\n');
const sql=`-- Reviewed cross-content links only; stable identities, text, access and theory relations are unchanged.
select pg_advisory_xact_lock(hashtextextended('content-network-editorial',0));
lock table public.techniques,public.feature_articles in share row exclusive mode;
create temporary table reviewed_technique_links on commit drop as select * from jsonb_to_recordset(${q(payload)}) x(id text,previous_primary jsonb,previous_theories jsonb,expected_updated_at timestamptz,primary jsonb,theories jsonb);
create temporary table reviewed_feature_links on commit drop as select * from jsonb_to_recordset(${q(featurePayload)}) x(id text,expected_updated_at timestamptz,previous_techniques jsonb,previous_theories jsonb,previous_features jsonb,techniques jsonb,theories jsonb,features jsonb);
do $guard$ begin
 if (select count(*) from public.techniques where status='published')<>${before.techniques.length} or (select count(*) from public.theories where status='published')<>${before.theories.length} or (select count(*) from public.feature_articles where status='published')<>${before.features.length} then raise exception 'Published source changed; review a fresh snapshot.';end if;
 if exists(select 1 from reviewed_technique_links x left join public.techniques t using(id) where t.id is null or t.status<>'published' or t.updated_at is distinct from x.expected_updated_at or (t.theory_ids,t.primary_theory_ids) is distinct from (x.previous_theories,x.previous_primary)) then raise exception 'Technique revision changed; no links were applied.';end if;
 if exists(select 1 from reviewed_feature_links x left join public.feature_articles f using(id) where f.id is null or f.status<>'published' or f.updated_at is distinct from x.expected_updated_at or (to_jsonb(f.related_technique_ids),to_jsonb(f.related_theory_ids),to_jsonb(f.related_feature_ids)) is distinct from (x.previous_techniques,x.previous_theories,x.previous_features)) then raise exception 'Feature revision changed; no links were applied.';end if;
 if exists(select 1 from jsonb_to_recordset(${q(theoryHashes)}) x(id text,hash text) left join public.theories t using(id) where t.id is null or t.status<>'published' or encode(sha256(convert_to(t.title||'|'||t.summary,'UTF8')),'hex')<>x.hash) then raise exception 'Theory definitions changed; repeat semantic review.';end if;
end $guard$;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot) select 'cross-content-network-20261016','techniques',id,to_jsonb(t) from public.techniques t where status='published' on conflict do nothing;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot) select 'cross-content-network-20261016','feature_articles',id,to_jsonb(f) from public.feature_articles f where status='published' on conflict do nothing;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot) select 'cross-content-network-20261016','theory_relations',source_id||'|'||target_id,to_jsonb(r) from public.theory_relations r on conflict do nothing;
update public.techniques t set theory_ids=x.theories,primary_theory_ids=x.primary,updated_at=now() from reviewed_technique_links x where t.id=x.id;
update public.feature_articles f set related_technique_ids=array(select jsonb_array_elements_text(x.techniques)),related_theory_ids=array(select jsonb_array_elements_text(x.theories)),related_feature_ids=array(select jsonb_array_elements_text(x.features)),updated_at=now() from reviewed_feature_links x where f.id=x.id;
do $verify$ begin
 if exists(select 1 from reviewed_technique_links x join public.techniques t using(id) where (t.theory_ids,t.primary_theory_ids) is distinct from (x.theories,x.primary)) then raise exception 'Technique link validation failed.';end if;
 if exists(select 1 from public.techniques t cross join lateral jsonb_array_elements_text(t.theory_ids) e where t.status='published' and not exists(select 1 from public.theories k where k.id=e and k.status='published')) then raise exception 'Broken theory reference.';end if;
 if exists(select 1 from public.feature_articles f cross join lateral unnest(f.related_technique_ids) e where f.status='published' and not exists(select 1 from public.techniques t where t.id=e and t.status='published')) then raise exception 'Broken feature technique reference.';end if;
 if exists(select 1 from public.feature_articles f cross join lateral unnest(f.related_theory_ids) e where f.status='published' and not exists(select 1 from public.theories t where t.id=e and t.status='published')) then raise exception 'Broken feature theory reference.';end if;
 if exists(select 1 from public.feature_articles f cross join lateral unnest(f.related_feature_ids) e where f.status='published' and (f.id=e or not exists(select 1 from public.feature_articles t where t.id=e and t.status='published'))) then raise exception 'Broken feature article reference.';end if;
 if exists(select 1 from (select source_id,snapshot from private.theory_reform_backups where phase='cross-content-network-20261016' and source_table='theory_relations') b full join public.theory_relations r on b.source_id=r.source_id||'|'||r.target_id where b.snapshot is distinct from to_jsonb(r)) then raise exception 'Theory relations unexpectedly changed.';end if;
end $verify$;
`;
// PRIMARY is a SQL keyword: quote the JSON record column consistently.
fs.writeFileSync(target,sql.replace(/\bprimary jsonb/g,'"primary" jsonb').replace(/x\.primary\b/g,'x."primary"'));
console.log({changedTechniques:changes.length,features:featurePayload.length,links:review.techniques.reduce((n,t)=>n+t.primary.length+t.supplementary.length,0)});
