import fs from 'node:fs';
import { contexts, replacements, relations, topics } from './knowledge-editorial-20261022-data.mjs';

const base = 'docs/content/knowledge-editorial-';
const before = JSON.parse(fs.readFileSync(`${base}snapshot-20261022.json`, 'utf8'));
const after = structuredClone(before);
const byId = new Map(after.theories.map(t => [t.id, t]));
const changes = [];
for (const [id, context] of Object.entries(contexts)) {
  if (!byId.has(id)) throw Error(`Unknown theory ${id}`);
  byId.get(id).summary = byId.get(id).summary.trim() + '\n' + context;
}
for (const [id, summary] of Object.entries(replacements)) byId.get(id).summary = summary;
// In this app the entry concerns emotion work in friendships, so put it beside
// interpersonal communication. Keep its stable identity, and allocate a fresh
// number in the destination category without reusing the old O-014 number.
const emotionWork = byId.get('kb_480');
emotionWork.category_id = 'psychology';
emotionWork.category_title = '心理学';
emotionWork.subcategory_id = 'psychology-i';
emotionWork.display_id = Math.max(...before.theories.filter(t=>t.category_id==='psychology').map(t=>t.display_id))+1;
emotionWork.display_order = emotionWork.display_id;
emotionWork.taxonomy_order = Math.max(...before.theories.filter(t=>t.subcategory_id==='psychology-i').map(t=>t.taxonomy_order))+1;

// Sort positions are independent of stable display IDs. Close the archived
// water maxim's sorting gap without reusing its displayed number or URL.
for (const section of after.subcategories) {
  after.theories.filter(t => t.subcategory_id === section.id)
    .sort((a,b) => a.taxonomy_order-b.taxonomy_order || a.id.localeCompare(b.id))
    .forEach((t,i) => { t.taxonomy_order = i+1; });
}
for (const t of after.theories) {
  const original = before.theories.find(row => row.id === t.id);
  const fields = Object.keys(t).filter(key => JSON.stringify(t[key]) !== JSON.stringify(original[key]));
  if (fields.length) changes.push({ id:t.id, title:t.title, before:original, after:t, fields });
  if (!t.quotation && t.summary.length > 220) throw Error(`Explanation too long: ${t.id} (${t.summary.length})`);
}

const pair = (a,b) => [a,b].sort().join('|');
const edgeMap = new Map(after.relations.map(r => [pair(r.source_id,r.target_id),r]));
const relationChanges = [];
for (const [source_id,target_id,relation_type,rationale] of relations) {
  if (!byId.has(source_id) || !byId.has(target_id) || source_id === target_id) throw Error('Unknown related theory');
  const key = pair(source_id,target_id);
  const original = edgeMap.get(key);
  const [s,t] = ['related','contrasts','complements'].includes(relation_type) ? [source_id,target_id].sort() : [source_id,target_id];
  const row = { source_id:s,target_id:t,relation_type,review_status:'confirmed',rationale,priority:80,updated_at:original?.updated_at ?? null,updated_by:original?.updated_by ?? null };
  relationChanges.push({ before:original??null, after:row });
  edgeMap.set(key,row);
  if (original && ['confirmed','legacy'].includes(original.review_status)) {
    for (const [a,b] of [[original.source_id,original.target_id],[original.target_id,original.source_id]])
      byId.get(a).related_theory_ids = byId.get(a).related_theory_ids.filter(id=>id!==b);
  }
  for (const [a,b] of [[source_id,target_id],[target_id,source_id]]) {
    const list = byId.get(a).related_theory_ids;
    if (!list.includes(b)) list.push(b);
  }
}
after.relations = [...edgeMap.values()].sort((a,b) => pair(a.source_id,a.target_id).localeCompare(pair(b.source_id,b.target_id)));
// Capture reciprocal links changed by the relation projection as well.
for (const t of after.theories) {
  const original = before.theories.find(row => row.id === t.id);
  const fields = Object.keys(t).filter(key => JSON.stringify(t[key]) !== JSON.stringify(original[key]));
  const change = changes.find(row => row.id === t.id);
  if (change) change.fields = fields;
  else if (fields.length) changes.push({ id:t.id,title:t.title,before:original,after:t,fields });
}
const review = { date:'2026-10-22', reviewedCount:before.theories.length, publishedCount:after.theories.length,
  summaryChanges:changes.filter(r=>r.fields.includes('summary')).length, changes, relationChanges, topics,
  preserved:['947 published identities','display IDs except the requested emotion-work category move','141 free identities','all quotations and source records','six categories and 36 sections'],
  distinctConcepts:[['kb_218','kb_219'],['kb_411','kb_412'],['kb_147','kb_148'],['kb_584','kb_571'],['kb_047','kb_462'],['kb_055','kb_436']] };
fs.writeFileSync(`${base}review-20261022.json`, JSON.stringify(review,null,2)+'\n');
fs.writeFileSync(`${base}planned-20261022.json`, JSON.stringify(after)+'\n');

const quote = value => "'"+String(value).replaceAll("'","''")+"'";
const json = value => quote(JSON.stringify(value))+'::jsonb';
const phase = 'knowledge_editorial_20261022';
const guards = JSON.parse(fs.readFileSync(`${base}guards-20261022.json`,'utf8'));
const projectedFields = ['id','summary','category_id','category_title','subcategory_id','taxonomy_order','display_id','display_order','related_theory_ids'];
const project = row => Object.fromEntries(projectedFields.map(key=>[key,row[key]]));
const projectedChanges = changes.map(c=>project(c.after));
fs.writeFileSync(`${base}compact-20261022.json`,JSON.stringify({changes:projectedChanges,relationChanges}));
const sql = `begin;
select pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));
lock table public.theories,public.theory_relations in share row exclusive mode;
do $guard$ begin
 if (select count(*) from public.theories where status='published') <> 947 then raise exception 'Catalogue changed'; end if;
 if (select md5(string_agg(to_jsonb(t)::text,'|' order by id)) from public.theories t where status='published') is distinct from ${quote(guards.theories_md5)} then raise exception 'Reviewed content changed'; end if;
 if (select md5(string_agg(to_jsonb(r)::text,'|' order by source_id,target_id,relation_type)) from public.theory_relations r) is distinct from ${quote(guards.relations_md5)} then raise exception 'Reviewed relationships changed'; end if;
end $guard$;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot) select '${phase}','theories',id,to_jsonb(t) from public.theories t where status='published';
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot) select '${phase}','theory_relations',source_id||'|'||target_id,to_jsonb(r) from public.theory_relations r;
update public.theories t set summary=x.summary,taxonomy_order=x.taxonomy_order,category_id=x.category_id,category_title=x.category_title,subcategory_id=x.subcategory_id,display_id=x.display_id,display_order=x.display_order,updated_at=now()
 from jsonb_populate_recordset(null::public.theories,${json(changes.filter(c=>c.fields.some(f=>['summary','taxonomy_order','category_id'].includes(f))).map(c=>project(c.after)))}) x where t.id=x.id;
${relationChanges.map(({after:r})=>`insert into public.theory_relations(source_id,target_id,relation_type,review_status,rationale,priority) values(${quote(r.source_id)},${quote(r.target_id)},${quote(r.relation_type)},'confirmed',${quote(r.rationale)},80)
on conflict(least(source_id,target_id),greatest(source_id,target_id)) do update set source_id=excluded.source_id,target_id=excluded.target_id,relation_type=excluded.relation_type,review_status=excluded.review_status,rationale=excluded.rationale,priority=excluded.priority,updated_at=now();`).join('\n')}
do $verify$ begin
 if (select count(*) from public.theories where status='published')<>947 then raise exception 'Published count changed'; end if;
 if exists(select 1 from jsonb_array_elements(${json(projectedChanges)}) a join public.theories t on t.id=a->>'id' where (select jsonb_object_agg(k,to_jsonb(t)->k) from jsonb_object_keys(a) k) is distinct from a) then raise exception 'Editorial result differs from reviewed content'; end if;
 if (select count(*) from public.theories where status='published' and access_tier='free')<>141 then raise exception 'Free scope changed'; end if;
end $verify$;
commit;
`;
fs.writeFileSync(`${base}update-20261022.sql`,sql);
const rollback=`begin;
select pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));
lock table public.theories,public.theory_relations in share row exclusive mode;
do $guard$ begin
 if exists(select 1 from jsonb_array_elements(${json(after.theories)}) a join public.theories t on t.id=a->>'id' where (to_jsonb(t)-'updated_at') is distinct from (a-'updated_at')) then raise exception 'Later editorial changes; rollback aborted'; end if;
end $guard$;
${relationChanges.map(({after:r})=>`delete from public.theory_relations where least(source_id,target_id)=least(${quote(r.source_id)},${quote(r.target_id)}) and greatest(source_id,target_id)=greatest(${quote(r.source_id)},${quote(r.target_id)});`).join('\n')}
insert into public.theory_relations select * from jsonb_populate_recordset(null::public.theory_relations,${json(relationChanges.map(r=>r.before).filter(Boolean))});
update public.theories t set summary=x.summary,taxonomy_order=x.taxonomy_order,category_id=x.category_id,category_title=x.category_title,subcategory_id=x.subcategory_id,display_id=x.display_id,display_order=x.display_order,related_theory_ids=x.related_theory_ids,updated_at=now() from jsonb_populate_recordset(null::public.theories,${json(changes.map(c=>c.before))}) x where t.id=x.id;
commit;
`;
fs.writeFileSync(`${base}rollback-20261022.sql`,rollback);
console.log(JSON.stringify({reviewed:947,summaryChanges:review.summaryChanges,changedRecords:changes.length,reviewedRelationships:relationChanges.length,newRelationships:relationChanges.filter(r=>!r.before).length,maxSummary:Math.max(...changes.map(c=>c.after.summary.length))}));
