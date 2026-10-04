import fs from 'node:fs';
const p='docs/content/theory-taxonomy-plan.json';
const plan=JSON.parse(fs.readFileSync(p,'utf8'));
const before=JSON.parse(fs.readFileSync('docs/content/theory-taxonomy-before.json','utf8'));
const decisions=new Map([
 ['心理的安全性','organization-management-t'],['職務特性モデル','organization-management-i'],
 ['心理的柔軟性','psychology-s'],['HSM／ヒューリスティック・システマティック・モデル','psychology-u'],
 ['フット・イン・ザ・ドア','psychology-t'],['ドア・イン・ザ・フェイス','psychology-t'],['ローボール・テクニック','psychology-t'],
]);
plan.rename.kb_730=['所属欲求',['Need to Belong']];
for(const [title,id] of decisions){
 const source=before.find(t=>t.title===title);
 if(!source){console.log('Title not matched:',title);continue;}
 const s=plan.subcategories.find(t=>t.id===id),a=plan.assignments.find(t=>t.tagId===source.id);
 Object.assign(a,{categoryId:s.categoryId,categoryTitle:plan.assignments.find(t=>t.subcategoryId===id).categoryTitle,subcategoryId:id,subcategoryTitle:s.title,sortOrder:1000});
}
fs.writeFileSync(p,JSON.stringify(plan,null,2)+'\n');
