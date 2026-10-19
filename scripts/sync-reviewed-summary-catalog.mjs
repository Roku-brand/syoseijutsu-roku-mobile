// Refresh existing bundled IDs from a fresh privileged read AFTER the canonical edit.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const changes=JSON.parse(fs.readFileSync('docs/content/theory-summary-review-20261019.json','utf8')).changes;
const byId=new Map(source.theories.map(t=>[t.id,t]));
const reviewed=new Map(changes.map(t=>[t.id,t]));
for(const edit of changes) {
  const row=byId.get(edit.id);
  assert.equal(row?.status,'published',edit.id);
  assert.equal(row.summary,edit.summary,edit.id);
  if(edit.contextNote) assert.equal(row.quotation?.contextNote,edit.contextNote,edit.id);
}
const pathname='src/data/generated/theories.json';
const rows=JSON.parse(fs.readFileSync(pathname,'utf8'));
let count=0;
for(const row of rows) {
  if(!reviewed.has(row.tagId)) continue;
  const canonical=byId.get(row.tagId);
  assert.equal(row.title,canonical.title);
  row.summary=canonical.summary;
  if(canonical.quotation) row.quotation=canonical.quotation;
  count++;
}
fs.writeFileSync(pathname,JSON.stringify(rows,null,2)+'\n');
console.log(`Refreshed ${count} existing bundled summaries from Supabase; preserved all ${rows.length} bundled IDs and all extra CMS records.`);
