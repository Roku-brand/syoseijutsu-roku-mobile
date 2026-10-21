import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { topics } from './knowledge-editorial-20261022-data.mjs';

const read = path => JSON.parse(fs.readFileSync(path,'utf8'));
const write = (path,value) => fs.writeFileSync(path,JSON.stringify(value,null,2)+'\n');
const path = 'src/data/generated/theories.json';
const previous = read(path);
const snapshot = read('docs/content/knowledge-editorial-published-20261022.json');
const exportSnapshot = {...snapshot,relations:snapshot.relations.map(r=>({sourceId:r.source_id,targetId:r.target_id,type:r.relation_type,reviewStatus:r.review_status,rationale:r.rationale,priority:r.priority}))};
const exportPath = '.local-knowledge-export-20261022.json';
write(exportPath,exportSnapshot);
try { execFileSync(process.execPath,['scripts/export-theory-reform-catalog.mjs',exportPath],{stdio:'inherit'}); }
finally { fs.unlinkSync(exportPath); }
const current = read(path);
const byId = new Map(current.map(t=>[t.tagId,t]));
const previousIds = new Set(previous.map(t=>t.tagId));
const changes = previous.flatMap(old=>{
  const now = byId.get(old.tagId);
  if (!now) return [{id:old.tagId,removed:true,before:old,redirectTo:'kb_629'}];
  const fields = [...new Set([...Object.keys(old),...Object.keys(now)])].filter(key=>JSON.stringify(old[key])!==JSON.stringify(now[key]));
  return fields.length ? [{id:old.tagId,fields,before:old,after:now}] : [];
});
write('docs/content/knowledge-editorial-catalog-review-20261022.json',{
  publishedCount:947,categories:Object.fromEntries([...new Set(current.map(t=>t.categoryId))].map(id=>[id,current.filter(t=>t.categoryId===id).length])),
  changes,additions:current.filter(t=>!previousIds.has(t.tagId)),
});
const redirects = read('src/data/generated/theory-id-redirects.json');
redirects.kb_549 = 'kb_629';
write('src/data/generated/theory-id-redirects.json',redirects);
const keywords = read('src/data/generated/theory-search-keywords.json');
for (const [id,terms] of Object.entries(topics)) keywords[id]=[...new Set([...(keywords[id]??[]),...terms])];
write('src/data/generated/theory-search-keywords.json',keywords);
console.log(JSON.stringify({published:current.length,changed:changes.length,added:current.filter(t=>!previousIds.has(t.tagId)).length,topicEntries:Object.keys(topics).length}));
