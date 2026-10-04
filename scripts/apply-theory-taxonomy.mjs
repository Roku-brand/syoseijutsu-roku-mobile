import fs from 'node:fs';
const root = new URL('../',import.meta.url);
const read=p=>JSON.parse(fs.readFileSync(new URL(p,root),'utf8'));
const write=(p,v)=>fs.writeFileSync(new URL(p,root),JSON.stringify(v,null,2)+'\n');
const plan=read('docs/content/theory-taxonomy-plan.json');
const before=read('docs/content/theory-taxonomy-before.json');
const byId=new Map(before.map(t=>[t.id,t]));
const assignments=new Map(plan.assignments.map(t=>[t.tagId,t]));
const redirects=Object.fromEntries(plan.merges.map(m=>[m.legacyId,m.canonicalId]));
const resolve=id=>redirects[id]??id;
const unique=a=>[...new Set(a)];
const normalize=s=>s.normalize('NFKC').trim().toLowerCase();
const rows=before.filter(t=>!redirects[t.id]).map(row=>{
 const assignment=assignments.get(row.id);
 const merged=plan.merges.filter(m=>m.canonicalId===row.id).map(m=>byId.get(m.legacyId));
 const rename=plan.rename[row.id];
 const title=rename?.[0]??row.title;
 const seen=new Set([normalize(title)]);
 const aliases=unique([...row.aliases,...(rename?[row.title,...rename[1]]:[]),...merged.flatMap(t=>[t.title,...t.aliases])]).filter(a=>{const k=normalize(a);if(seen.has(k))return false;seen.add(k);return true;});
 const provenance=row.provenance ? {...row.provenance, works:unique([row,...merged].flatMap(t=>t.provenance?.works??[])),sources:[...new Map([row,...merged].flatMap(t=>t.provenance?.sources??[]).map(s=>[s.url,s])).values()]} : undefined;
 return {tagId:row.id,title,summary:row.summary,categoryId:assignment.categoryId,categoryTitle:assignment.categoryTitle,subcategoryId:assignment.subcategoryId,subcategoryTitle:assignment.subcategoryTitle,sortOrder:assignment.sortOrder,displayId:row.display_id,aliases,relatedTheoryIds:unique([row,...merged].flatMap(t=>t.related_theory_ids).map(resolve)).filter(id=>id!==row.id),legacyIds:merged.map(t=>t.id),mergedFromIds:merged.map(t=>t.id),canonicalId:row.id,accessTier:[row,...merged].some(t=>t.access_tier==='free')?'free':'complete',provenance};
});
// Preserve category-local display numbers for unmoved records. Fill holes for moved records.
for(const category of unique(rows.map(t=>t.categoryId))){
 const members=rows.filter(t=>t.categoryId===category);
 const fixed=members.filter(t=>assignments.get(t.tagId).previousCategoryId===category);
 const used=new Set(fixed.map(t=>t.displayId));
 let next=1;
 for(const t of members.filter(t=>!fixed.includes(t))){while(used.has(next))next++;t.displayId=next;used.add(next++);}
}
rows.sort((a,b)=>plan.subcategories.findIndex(s=>s.id===a.subcategoryId)-plan.subcategories.findIndex(s=>s.id===b.subcategoryId)||a.sortOrder-b.sortOrder);
for(const s of plan.subcategories){rows.filter(t=>t.subcategoryId===s.id).forEach((t,i)=>t.sortOrder=i+1);}
write('src/data/generated/theories.json',rows);
write('src/data/generated/theory-subcategories.json',plan.subcategories);
write('src/data/generated/theory-id-redirects.json',redirects);
// Rewrite every live relation; retained before snapshot is the reversible audit evidence.
for(const file of ['techniques.json','comprehensive-theory-links.json','primary-theory-links.json']){
 const value=read('src/data/generated/'+file);
 function visit(v){if(Array.isArray(v))return v.every(x=>typeof x==='string')?unique(v.map(resolve)):v.map(visit);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)]));return typeof v==='string'?resolve(v):v;}
 write('src/data/generated/'+file,visit(value));
}
write('docs/content/theory-taxonomy-after.json',rows);
const scope=read('src/data/content-scope.json');
const prefixes={'psychology':'P','behavioral-science':'B','organization-management':'O',strategy:'T','practical-wisdom':'A','classics-thought':'C'};
scope.schemaVersion=2;scope.complete.theories=rows.length;
scope.freeTheoryIds=rows.filter(t=>t.accessTier==='free').map(t=>t.tagId);
scope.freeTheoryDisplayIds=rows.filter(t=>t.accessTier==='free').map(t=>`${prefixes[t.categoryId]}-${String(t.displayId).padStart(3,'0')}`);
write('src/data/content-scope.json',scope);
console.log({before:before.length,after:rows.length,merges:plan.merges.length,physicalDeletes:0,free:rows.filter(t=>t.accessTier==='free').length});
