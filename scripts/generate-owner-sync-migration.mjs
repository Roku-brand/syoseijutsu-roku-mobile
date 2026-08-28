import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generated = path.join(root, 'src', 'data', 'generated');
const catalog = JSON.parse(await fs.readFile(path.join(generated, 'techniques.json'), 'utf8'));
const actions = JSON.parse(await fs.readFile(path.join(generated, 'practical-actions.json'), 'utf8'));
const actionsById = new Map(actions.map((item) => [item.id, item]));

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlJson(value) {
  return `'${JSON.stringify(value).replaceAll("'", "''")}'`;
}

const rows = [];
for (const category of catalog.categories ?? []) {
  for (const persona of category.subcategories ?? []) {
    for (const item of persona.items ?? []) {
      const practical = actionsById.get(item.id) ?? {};
      const importance = Math.min(3, Math.max(1, Number(item.importance ?? 1)));
      rows.push([
        item.id,
        item.persona ?? persona.name,
        category.key,
        item.title ?? '',
        item.essence ?? item.subtitle ?? '',
        item.explanation ?? '',
        item.memo ?? '',
        importance,
        practical.todayActions ?? item.practices ?? [],
        practical.examples ?? item.examples ?? [],
        practical.cautions ?? item.cautions ?? [],
        item.relatedTheoryIds ?? item.theoryTagIds ?? [],
        item.displayOrder ?? rows.length + 1,
      ]);
    }
  }
}

const values = rows.map((row) => `  (${row.slice(0, 7).map(sqlText).join(', ')}, ${row[7]}, ${sqlJson(row[8])}::jsonb, ${sqlJson(row[9])}::jsonb, ${sqlJson(row[10])}::jsonb, ${sqlJson(row[11])}::jsonb, 'published', ${row[12]})`).join(',\n');
const migration = `-- Sync the published owner-managed catalogue with the integrated master336 source.\n-- This is intentionally an upsert so existing purchaser access and row identity remain unchanged.\ninsert into public.techniques (id, persona_id, category, title, essence, explanation, memo, importance, practices, examples, cautions, theory_ids, status, display_order)\nvalues\n${values}\non conflict (id) do update set\n  persona_id = excluded.persona_id,\n  category = excluded.category,\n  title = excluded.title,\n  essence = excluded.essence,\n  explanation = excluded.explanation,\n  memo = excluded.memo,\n  importance = excluded.importance,\n  practices = excluded.practices,\n  examples = excluded.examples,\n  cautions = excluded.cautions,\n  theory_ids = excluded.theory_ids,\n  status = 'published',\n  display_order = excluded.display_order,\n  updated_at = now();\n`;

const output = path.join(root, 'supabase', 'migrations', '20260829120000_sync_integrated_master336_owner_content.sql');
await fs.writeFile(output, migration, 'utf8');
console.log(`Generated ${rows.length} owner-content upserts at ${output}`);
