// Input: fresh privileged Supabase read after the headline migration, not an edited JSON catalogue.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const dir = 'src/data/generated/';
const rows = JSON.parse(fs.readFileSync(dir+'theories.json', 'utf8'));
assert.equal(source.theories.length, rows.length);
assert.equal(source.subcategories.length, 36);
const db = new Map(source.theories.map(t => [t.id,t]));
const sub = new Map(source.subcategories.map(s => [s.id,s]));
for (const t of rows) {
 const current = db.get(t.tagId); assert.ok(current, t.tagId);
 if (t.quotation) assert.equal(current.title, '「'+t.quotation.translationText+'」');
 else assert.equal(current.title, t.title);
 t.title = current.title; t.subcategoryId = current.subcategory_id; t.knowledgeType = current.knowledge_type ?? t.knowledgeType;
 t.subcategoryTitle = sub.get(t.subcategoryId).title; t.sortOrder = current.taxonomy_order;
}
const majors = [...new Set(rows.map(t=>t.categoryId))];
rows.sort((a,b)=>majors.indexOf(a.categoryId)-majors.indexOf(b.categoryId)||sub.get(a.subcategoryId).display_order-sub.get(b.subcategoryId).display_order||a.sortOrder-b.sortOrder);
const write=(name,value)=>fs.writeFileSync(dir+name,JSON.stringify(value,null,2)+'\n');
write('theories.json',rows);
write('theory-subcategories.json',source.subcategories.map(s=>({id:s.id,categoryId:s.category_id,title:s.title,displayOrder:s.display_order})).sort((a,b)=>majors.indexOf(a.categoryId)-majors.indexOf(b.categoryId)||a.displayOrder-b.displayOrder));
console.log(`Synced ${rows.length} canonical headings, ${rows.filter(t=>t.quotation).length} quotations, 36 existing subcategories.`);
