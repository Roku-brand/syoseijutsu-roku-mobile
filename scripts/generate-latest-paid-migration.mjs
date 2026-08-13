import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated/techniques.json'), 'utf8'));
const theories = JSON.parse(fs.readFileSync(path.join(root, 'src/data/generated/theories.json'), 'utf8'));
const rows = [];
for (const category of catalog.categories) {
  for (const group of category.subcategories) {
    for (const item of group.items) {
      rows.push({ content_type: 'technique', content_id: item.id, payload: { ...item, categoryKey: category.key, categoryName: category.name, subcategory: group.name, articleTitle: group.articleTitle }, sort_order: rows.length });
    }
  }
}
for (const theory of theories) rows.push({ content_type: 'theory', content_id: theory.tagId, payload: theory, sort_order: rows.length });
const sqlValue = (value) => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const values = rows.map((row) => `('${row.content_type}', '${row.content_id}', ${sqlValue(row.payload)}, ${row.sort_order})`).join(',\n');
const sql = `-- Canonical 525-technique / used-theory catalog generated from the latest user-provided masters.\n-- Learning content is intentionally preserved.\n delete from public.paid_content where content_type in ('technique', 'theory');\n insert into public.paid_content (content_type, content_id, payload, sort_order) values\n${values}\non conflict (content_type, content_id) do update set payload = excluded.payload, sort_order = excluded.sort_order, updated_at = now();\n`;
fs.writeFileSync(path.join(root, 'supabase/migrations/20260813090000_replace_catalog_with_latest_masters.sql'), sql);
console.log(`Generated ${rows.length} paid catalog rows.`);
