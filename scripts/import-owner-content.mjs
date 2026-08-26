import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error('SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を環境変数に設定してください。');
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'src/data/generated/techniques.json'), 'utf8'));
const practicalActions = JSON.parse(await fs.readFile(path.join(root, 'src/data/generated/practical-actions.json'), 'utf8'));
const actionsById = new Map(practicalActions.map((item) => [item.id, item]));
const rows = [];

for (const category of catalog.categories ?? []) {
  for (const persona of category.subcategories ?? []) {
    for (const item of persona.items ?? []) {
      const actions = actionsById.get(item.id) ?? {};
      rows.push({
        id: item.id,
        persona_id: item.persona ?? persona.name,
        category: category.key,
        title: item.title,
        essence: item.essence ?? item.subtitle ?? '',
        explanation: item.explanation ?? '',
        memo: item.memo ?? '',
        importance: Math.min(3, Math.max(1, Number(item.importance ?? 1))),
        practices: actions.todayActions ?? item.practices ?? [],
        examples: actions.examples ?? item.examples ?? [],
        cautions: actions.cautions ?? item.cautions ?? [],
        theory_ids: item.relatedTheoryIds ?? item.theoryTagIds ?? [],
        status: 'published',
        display_order: item.displayOrder ?? rows.length + 1,
      });
    }
  }
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const { count: beforeCount, error: beforeError } = await supabase.from('techniques').select('id', { count: 'exact', head: true });
if (beforeError) throw beforeError;
console.log(`Existing techniques before import: ${beforeCount ?? 0}`);
for (let index = 0; index < rows.length; index += 100) {
  const batch = rows.slice(index, index + 100);
  const { error } = await supabase.from('techniques').upsert(batch, { onConflict: 'id' });
  if (error) throw error;
  console.log(`imported ${Math.min(index + batch.length, rows.length)}/${rows.length}`);
}
const { count: afterCount, error: afterError } = await supabase.from('techniques').select('id', { count: 'exact', head: true });
if (afterError) throw afterError;
console.log(`Imported ${rows.length} techniques into public.techniques. Total after import: ${afterCount ?? 0}.`);
