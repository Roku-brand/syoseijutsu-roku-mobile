import fs from 'node:fs';import {createHash} from 'node:crypto';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
if(!process.argv[2]) throw Error('Provide the privileged pre-content snapshot JSON. Never regenerate applied migrations against current data.');
const source=read(process.argv[2]);
const review=read('docs/content/theory-editorial-review-20261015.json');const audit=read('docs/content/historical-maxims-audit-20261015.json');const receipts=read('docs/content/historical-maxims-source-receipts-20261015.json');
const relations=read('docs/content/theory-knowledge-relations-20261015.json').filter(r=>!audit.some(q=>q.decision!=='hold'&&(q.theoryId===r.sourceId||q.theoryId===r.targetId)));const work=read('docs/content/work-theory-link-review-20261015.json');
const adopted=audit.filter(r=>r.decision!=='hold');if(audit.length!==50||adopted.length!==19||review.length!==803||source.subcategories.length!==36)throw Error('Unexpected reviewed scope');
const q=x=>"'"+String(x).replaceAll("'","''")+"'";const j=x=>q(JSON.stringify(x))+'::jsonb';
for(const r of adopted)if(!receipts.some(v=>v.candidateId===r.candidateId&&v.verified&&v.originalSha256===createHash('sha256').update(r.originalText).digest('hex')))throw Error('Unverified source '+r.candidateId);
let guard=fs.readFileSync('supabase/migrations/20261015121152_theory_knowledge_network.sql','utf8');const start=guard.indexOf('create function public.validate_quotation_metadata()');const end=guard.indexOf('create trigger quotation_publication_guard',start);guard=guard.slice(start,end).replace('create function','create or replace function').replace("if new.title is distinct from ('「'||(q->>'translationText')||'」') then raise exception '表示文と格言タイトルが一致していません。'", "if new.access_tier='complete' and replace(replace(new.title,'「',''),'」','')=q->>'translationText' then raise exception '完全版の格言本文は公開見出しと分けてください。'");
guard=guard.replace(' return new;\nend $fn$;',()=>` new.summary:='「'||(q->>'translationText')||'」'||chr(10)||'— '||(q->>'author')||chr(10)||(q->>'work')||chr(10)||chr(10)||coalesce(q->>'contextNote','');
 return new;
end $fn$;`);
let sql=`-- Audited content only. Holds remain owner-only records, never published theories.
select pg_advisory_xact_lock(hashtextextended('theory-knowledge-network',0));
lock table public.theories,public.techniques,public.theory_relations in share row exclusive mode;
-- Refuse to overwrite intervening editorial changes, even when counts are unchanged.
do $check$ begin
 if (select count(*) from public.theories where status='published')<>803 then raise exception 'Published catalogue changed; take a new backup and review.';end if;
 if (select md5(string_agg((to_jsonb(t)-'updated_at'-'updated_by')::text,'|' order by id)) from public.theories t where status='published') is distinct from ${q(source.fingerprint)} then raise exception 'Reviewed source changed; content migration aborted.';end if;
 if exists(select 1 from jsonb_to_recordset(${j(work.map(r=>({id:r.id,theory_ids:r.beforeTheoryIds,primary_theory_ids:r.beforePrimaryIds})))}) x(id text,theory_ids jsonb,primary_theory_ids jsonb) join public.techniques t using(id) where (t.theory_ids,t.primary_theory_ids) is distinct from (x.theory_ids,x.primary_theory_ids)) then raise exception 'Reviewed work links changed; content migration aborted.';end if;
end $check$;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'reviewed-content-20261015','theories',id,to_jsonb(t) from public.theories t on conflict do nothing;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'reviewed-content-20261015','techniques',id,to_jsonb(t) from public.techniques t on conflict do nothing;
insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
select 'reviewed-content-20261015','theory_relations',source_id||'|'||target_id,to_jsonb(t) from public.theory_relations t on conflict do nothing;
${guard}
update public.theories t set knowledge_type=x.kind from jsonb_to_recordset(${j(review.map(t=>({id:t.id,kind:t.knowledgeType})))}) x(id text,kind text) where t.id=x.id;
-- Keep the stable ID and the old spelling as a search alias.
update public.theories set title='新近効果', aliases=(select jsonb_agg(distinct v) from jsonb_array_elements(aliases||'["親近効果","新近性効果","recency effect"]'::jsonb) v) where id='kb_002';
`;
let seq=Math.max(...source.theories.filter(t=>t.category_id==='classics-thought').map(t=>t.display_id));const positions=new Map(source.subcategories.map(s=>[s.id,Math.max(0,...source.theories.filter(t=>t.subcategory_id===s.id).map(t=>t.taxonomy_order))]));
for(const r of adopted){
 const quotation={candidateId:r.candidateId,originalText:r.originalText,translationText:r.displayText,author:r.author,authorDeathYear:r.deathYear,work:r.work,locator:r.locator,publicationYear:r.publicationYear,originalLanguage:r.originalLanguage,translationKind:r.originalLanguage==='ja'?([9,26].includes(Number(r.candidateId))?'classical_transcription':'original_japanese'):'independent_translation',verification:'verified',rightsStatus:'cleared',rightsBasis:r.rightsReview,sourceUrls:[r.primaryUrl,...r.additionalSources??[]],checkedOn:r.checkedOn,contextNote:r.summary};
 const provenance={status:'確認済み',attribution:r.author,period:r.publicationYear+'年（原典・参照版）',works:[r.work],sources:[{title:r.work+'（原典本文）',url:r.primaryUrl}],note:(r.originalLanguage==='ja'?'原文を照合し、表記整理した箇所は原文を別記。':'原語本文を照合した独自訳。')+' 文学的・思想的な洞察であり、実証的な証拠とは区別する。'};
 if(r.decision==='update_existing')sql+=`update public.theories set title=${q(r.displayTitle)},summary=${q(r.summary)},knowledge_type='aphorism',quotation=${j(quotation)},provenance=${j(provenance)} where id=${q(r.theoryId)};\n`;
 else {seq++;const pos=(positions.get(r.subcategoryId)??0)+1;positions.set(r.subcategoryId,pos);
 sql+=`insert into public.theories(id,title,summary,category_id,category_title,subcategory_id,taxonomy_order,canonical_id,legacy_ids,aliases,related_theory_ids,status,display_id,display_order,access_tier,knowledge_type,quotation,provenance)
 values(${q(r.theoryId)},${q(r.displayTitle)},${q(r.summary)},'classics-thought','古典・思想',${q(r.subcategoryId)},${pos},${q(r.theoryId)},'[]','[]','[]','published',${seq},${seq},'complete','aphorism',${j(quotation)},${j(provenance)});\n`;
 }
 for(const target of r.relatedTheoryIds){const targetTitle=source.theories.find(t=>t.id===target)?.title;if(!targetTitle)throw Error('Missing related theory '+target);const type=r.candidateId==='44'?'contrasts':'complements';const [sourceId,targetId]=[r.theoryId,target].sort();relations.push({sourceId,targetId,type,reviewStatus:'confirmed',priority:200+Number(r.candidateId),rationale:r.candidateId==='44'?'疑いを恥とみる箴言と、損なわれた信頼を行動で再構築する理論を対照する。相手への無条件の信用を求める根拠にはしない。':`${r.work}の言葉を、${targetTitle}と同じ主題を考える別の視点として読む。格言が理論の実証的証拠であることは意味しない。`});}
}
for(const r of relations){
 sql+=`insert into public.theory_relations(source_id,target_id,relation_type,review_status,rationale,priority) values(${q(r.sourceId)},${q(r.targetId)},${q(r.type)},'confirmed',${q(r.rationale)},${r.priority})
 on conflict(least(source_id,target_id),greatest(source_id,target_id)) do update set source_id=excluded.source_id,target_id=excluded.target_id,relation_type=excluded.relation_type,review_status=excluded.review_status,rationale=excluded.rationale,priority=excluded.priority;\n`;
}
for(const r of work)sql+=`update public.techniques set theory_ids=${j(r.afterTheoryIds)},primary_theory_ids=${j(r.afterPrimaryIds)},updated_at=now() where id=${q(r.id)};\n`;
for(const r of adopted)for(const id of r.relatedTechniqueIds)sql+=`update public.techniques set theory_ids=theory_ids||jsonb_build_array(${q(r.theoryId)}),updated_at=now() where id=${q(id)} and not theory_ids ? ${q(r.theoryId)};\n`;
for(const r of audit)sql+=`insert into public.theory_quote_reviews(candidate_id,audit,theory_id) values(${q(r.candidateId)},${j(r)},${r.theoryId?q(r.theoryId):'null'});\n`;
sql+=`-- Closing archive gaps changes only sorting positions, never displayed/stable IDs.
with ranked as(select id,row_number() over(partition by subcategory_id order by taxonomy_order,display_id,id)::integer position from public.theories where status='published')
update public.theories t set taxonomy_order=r.position from ranked r where t.id=r.id and t.taxonomy_order is distinct from r.position;
-- Retain the six major and thirty-six internal identities. Only names/order may be edited.
create function public.preserve_theory_taxonomy() returns trigger language plpgsql set search_path='' as $fn$
begin
 if tg_table_name='theory_subcategories' then
  if tg_op<>'UPDATE' then raise exception '既存36内部分類を維持します。追加・分割・削除はできません。' using errcode='23514';end if;
  if (new.id,new.category_id) is distinct from (old.id,old.category_id) then raise exception '内部分類のID・大分類は変更できません。' using errcode='23514';end if;
 else
  if tg_op='INSERT' and new.kind='theory' or tg_op='DELETE' and old.kind='theory' then raise exception '理論の6大分類を維持します。' using errcode='23514';end if;
  if tg_op='UPDATE' and (new.kind='theory' or old.kind='theory') and (new.id,new.kind) is distinct from (old.id,old.kind) then raise exception '理論の大分類IDは変更できません。' using errcode='23514';end if;
 end if;
 if tg_op='DELETE' then return old;else return new;end if;
end $fn$;
revoke all on function public.preserve_theory_taxonomy() from public,anon,authenticated;
create trigger preserve_theory_subcategories before insert or update or delete on public.theory_subcategories for each row execute function public.preserve_theory_taxonomy();
create trigger preserve_theory_categories before insert or update or delete on public.content_categories for each row execute function public.preserve_theory_taxonomy();
do $verify$ begin
 if (select count(*) from public.theories where status='published')<>821 then raise exception 'Unexpected final theory count';end if;
 if (select count(*) from public.theory_subcategories)<>36 or (select count(*) from public.content_categories where kind='theory')<>6 then raise exception 'Taxonomy changed';end if;
 if (select count(*) from public.theory_quote_reviews)<>50 then raise exception 'Missing candidate audits';end if;
 if (select count(*) from public.theories where status='published' and quotation is not null)<>19 then raise exception 'Unreviewed quote appeared';end if;
end $verify$;
`;
fs.writeFileSync('supabase/migrations/20261015125607_historical_maxims_reviewed_content.sql',sql);
fs.writeFileSync('docs/content/theory-knowledge-relations-20261015.json',JSON.stringify(relations,null,2)+'\n');
console.log({publishedAfter:821,quotations:19,relations:relations.length,sourceChars:sql.length});
