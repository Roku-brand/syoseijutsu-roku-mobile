import fs from 'node:fs';
import assert from 'node:assert/strict';

const review = JSON.parse(fs.readFileSync('docs/content/theory-summary-review-20261019.json', 'utf8'));
const changes = review.changes.map(r => ({ id: r.id, title: r.title, old_summary: r.beforeSummary, new_summary: r.summary, old_note: r.beforeContextNote ?? null, new_note: r.contextNote ?? null }));
assert.equal(new Set(changes.map(r=>r.id)).size, changes.length);
const literal = JSON.stringify(changes).replaceAll("'", "''");
const source = `-- Canonical summary edits only. Stable IDs, access tiers, links and rights metadata stay intact.
-- Reviewed against a full privileged backup; refuse to overwrite intervening CMS edits.
do $edit$
declare edits jsonb := '${literal}'::jsonb; changed integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('theory-summary-editorial-20261019',0));
 lock table public.theories in share row exclusive mode;
 if exists(select 1 from jsonb_to_recordset(edits) x(id text,title text,old_summary text,old_note text) left join public.theories t on t.id=x.id
   where t.id is null or t.status<>'published' or t.title is distinct from x.title or t.summary is distinct from x.old_summary
   or (t.quotation->>'contextNote') is distinct from x.old_note) then
   raise exception 'Reviewed summary changed; back up and review current CMS content before applying.';
 end if;
 insert into private.theory_reform_backups(phase,source_table,source_id,snapshot)
 select 'summary-editorial-20261019','theories',t.id,to_jsonb(t) from public.theories t
 join jsonb_to_recordset(edits) x(id text) on t.id=x.id on conflict do nothing;
 update public.theories t set summary=x.new_summary,
   quotation=case when x.new_note is not null then jsonb_set(t.quotation,'{contextNote}',to_jsonb(x.new_note)) else t.quotation end,
   updated_at=now()
 from jsonb_to_recordset(edits) x(id text,new_summary text,new_note text) where t.id=x.id;
 get diagnostics changed = row_count;
 if changed<>jsonb_array_length(edits) then raise exception 'Summary update count mismatch';end if;
 if exists(select 1 from jsonb_to_recordset(edits) x(id text,new_summary text,new_note text) join public.theories t on t.id=x.id
   where t.summary is distinct from x.new_summary or t.quotation->>'contextNote' is distinct from x.new_note) then
   raise exception 'Canonical summary projection mismatch';
 end if;
end $edit$;
`;
const files=fs.readdirSync('supabase/migrations').filter(n=>n.endsWith('_theory_summary_editorial_polish.sql'));
assert.equal(files.length,1);
fs.writeFileSync('supabase/migrations/'+files[0],source);
const reverse=changes.map(r=>({id:r.id,title:r.title,old_summary:r.new_summary,new_summary:r.old_summary,old_note:r.new_note,new_note:r.old_note}));
// Roll back only our edited fields after an optimistic guard; keep later unrelated CMS changes.
fs.writeFileSync('docs/content/theory-summary-rollback-20261019.sql',source.replace(literal,JSON.stringify(reverse).replaceAll("'","''")).replaceAll('summary-editorial-20261019','summary-editorial-rollback-20261019'));
console.log(`Prepared guarded migration and rollback for ${changes.length} canonical rows.`);
