// Input is a fresh, privileged read of public.theories; never treat generated JSON as the source of truth.
import fs from 'node:fs';
const source=process.argv[2];if(!source)throw Error('Provide the reviewed Supabase catalogue snapshot.');
const snapshot=JSON.parse(fs.readFileSync(source,'utf8'));
const read=name=>JSON.parse(fs.readFileSync('src/data/generated/'+name,'utf8'));
const write=(name,data)=>fs.writeFileSync('src/data/generated/'+name,JSON.stringify(data,null,2)+'\n');
const sub=new Map(snapshot.subcategories.map(s=>[s.id,s]));
const retired=new Set(read('retired-theory-ids.json'));
if(snapshot.subcategories.length!==36||snapshot.theories.some(t=>retired.has(t.id)||t.provenance?.status==='オリジナル'))throw Error('Unexpected taxonomy or retired content in source.');
const rows=snapshot.theories.map(t=>({tagId:t.id,title:t.title,summary:t.summary,categoryId:t.category_id,categoryTitle:t.category_title,subcategoryId:t.subcategory_id,subcategoryTitle:sub.get(t.subcategory_id)?.title,sortOrder:t.taxonomy_order,canonicalId:t.canonical_id??t.id,legacyIds:t.legacy_ids??[],mergedFromIds:t.legacy_ids??[],aliases:t.aliases??[],relatedTheoryIds:t.related_theory_ids??[],displayId:t.display_id,displayOrder:t.display_order,provenance:t.provenance??undefined,accessTier:t.access_tier,...(t.knowledge_type?{knowledgeType:t.knowledge_type}:{}),...(t.quotation?{quotation:t.quotation}:{}),...(t.image_path?{imagePath:t.image_path}:{})}));
const categoryOrder=['psychology','behavioral-science','organization-management','strategy','practical-wisdom','classics-thought'];
rows.sort((a,b)=>categoryOrder.indexOf(a.categoryId)-categoryOrder.indexOf(b.categoryId)||(sub.get(a.subcategoryId)?.display_order??0)-(sub.get(b.subcategoryId)?.display_order??0)||a.sortOrder-b.sortOrder||a.tagId.localeCompare(b.tagId));
write('theories.json',rows);
const scope=JSON.parse(fs.readFileSync('src/data/content-scope.json','utf8'));scope.complete.theories=rows.length;const free=rows.filter(t=>t.accessTier==='free');scope.free.theories=free.length;scope.freeTheoryIds=free.map(t=>t.tagId);const prefixes={psychology:'P','behavioral-science':'B','organization-management':'O',strategy:'T','practical-wisdom':'A','classics-thought':'C'};scope.freeTheoryDisplayIds=free.map(t=>prefixes[t.categoryId]+'-'+String(t.displayId).padStart(3,'0'));fs.writeFileSync('src/data/content-scope.json',JSON.stringify(scope,null,2)+'\n');
const techniques=read('techniques.json');const dbTechniques=new Map(snapshot.techniques.map(t=>[t.id,t]));
for(const c of techniques.categories)for(const p of c.subcategories)for(const t of p.items){const db=dbTechniques.get(t.id);if(!db)throw Error('Missing canonical technique '+t.id);t.relatedTheoryIds=db.theory_ids;t.theoryTagIds=db.theory_ids;t.primaryTheoryIds=db.primary_theory_ids;}
write('techniques.json',techniques);
write('comprehensive-theory-links.json',Object.fromEntries(techniques.categories.flatMap(c=>c.subcategories.flatMap(p=>p.items.map(t=>[t.id,t.relatedTheoryIds])))));
const primary=read('primary-theory-links.json');for(const [id,t]of dbTechniques)if(id in primary)primary[id]=t.primary_theory_ids;write('primary-theory-links.json',primary);
const metadata=read('metadata.json');metadata.theoryCount=rows.length;metadata.productTheoryCount=rows.length;metadata.categoryCounts=Object.fromEntries(categoryOrder.map(id=>[id,rows.filter(t=>t.categoryId===id).length]));write('metadata.json',metadata);
const rankings=[];for(const r of snapshot.rankings)r.content_ids.forEach((id,i)=>{const t=r.division==='theory'?snapshot.theories.find(t=>t.id===id):dbTechniques.get(id);if(!t)throw Error('Missing ranking item '+id);rankings.push({division:r.division,content_id:id,rank:i+1,title:t.title,category_id:r.division==='theory'?t.category_id:t.category,category_title:r.division==='theory'?t.category_title:({interpersonal:'対人術',work:'仕事術',life:'人生術'})[t.category],access_tier:t.access_tier});});write('popular-rankings.json',rankings);
if(snapshot.relations)write('theory-relations.json',snapshot.relations);
console.log(`Exported ${rows.length} canonical theories; 36 subcategories preserved.`);
