import fs from 'node:fs';
import assert from 'node:assert/strict';
const current=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const review=JSON.parse(fs.readFileSync('docs/content/content-network-review-20261016.json','utf8'));
const read=name=>JSON.parse(fs.readFileSync('src/data/generated/'+name,'utf8'));
const write=(name,data)=>fs.writeFileSync('src/data/generated/'+name,JSON.stringify(data,null,2)+'\n');
const byId=new Map(current.techniques.map(t=>[t.id,t]));
const catalogue=read('techniques.json');
for(const category of catalogue.categories)for(const persona of category.subcategories)for(const card of persona.items){
 const row=byId.get(card.id),r=review.techniques.find(t=>t.id===card.id);assert.ok(row);assert.deepEqual(row.theory_ids,[...r.primary,...r.supplementary]);assert.deepEqual(row.primary_theory_ids,r.primary);
 card.theoryTagIds=row.theory_ids;card.relatedTheoryIds=row.theory_ids;card.primaryTheoryIds=row.primary_theory_ids;
}
for(const f of review.features){const row=current.features.find(x=>x.id===f.id);assert.deepEqual(row.related_technique_ids,f.techniqueIds);assert.deepEqual(row.related_theory_ids,f.theoryIds);assert.deepEqual(row.related_feature_ids,f.featureIds);}
write('techniques.json',catalogue);
write('primary-theory-links.json',Object.fromEntries(current.techniques.map(t=>[t.id,t.primary_theory_ids])));
write('comprehensive-theory-links.json',Object.fromEntries(current.techniques.map(t=>[t.id,t.theory_ids])));
console.log({canonicalTechniques:current.techniques.length,features:current.features.length});
