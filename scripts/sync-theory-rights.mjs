import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase service credentials are required.');
const supabase = createClient(url, key, { auth: { persistSession: false } });
const root = process.cwd();
const theories = JSON.parse(await fs.readFile(path.join(root, 'src/data/generated/theories.json'), 'utf8'));
const sourceById = new Map(theories.map((theory) => [theory.tagId, theory]));
const retired = new Set(Array.from({ length: 26 }, (_, index) => `kb_${675 + index}`));
// This owner-created mnemonic has no confirmed origin or reuse permission.
retired.add('theory-1789343197612-6d9ahj0r');
const { data: remoteTheories, error: theoryError } = await supabase.from('theories').select('id,category_id,related_theory_ids');
if (theoryError) throw theoryError;
const unknownMaxims = (remoteTheories ?? []).filter((row) => row.category_id === 'maxims-experience' && !sourceById.has(row.id) && !retired.has(row.id));
if (unknownMaxims.length) throw new Error(`Unreviewed maxim IDs: ${unknownMaxims.map((row) => row.id).join(', ')}`);
const strip = (ids) => (Array.isArray(ids) ? ids.filter((id) => !retired.has(id)) : []);

for (const row of remoteTheories ?? []) {
  if (retired.has(row.id)) continue;
  const source = sourceById.get(row.id);
  const referencesChanged = strip(row.related_theory_ids).length !== (row.related_theory_ids ?? []).length;
  const needsCategoryUpdate = row.category_id === 'maxims-experience';
  if (!source && !referencesChanged) continue;
  if (!source && needsCategoryUpdate) throw new Error(`Missing editorial decision for ${row.id}`);
  if (!needsCategoryUpdate && !referencesChanged && !/^kb_(?:6(?:3[3-9]|[4-9]\d)|70[1-5])$/.test(row.id)) continue;
  const update = source ? {
    title: source.title,
    summary: source.summary,
    category_id: source.categoryId,
    category_title: source.categoryTitle,
    provenance: source.provenance ?? null,
    related_theory_ids: strip(source.relatedTheoryIds),
  } : { related_theory_ids: strip(row.related_theory_ids) };
  const { error } = await supabase.from('theories').update(update).eq('id', row.id);
  if (error) throw error;
}

for (let offset = 0; ; offset += 1000) {
  const { data, error } = await supabase.from('techniques').select('id,theory_ids,primary_theory_ids').order('id').range(offset, offset + 999);
  if (error) throw error;
  for (const row of data ?? []) {
    const theoryIds = strip(row.theory_ids);
    const primaryIds = strip(row.primary_theory_ids);
    if (theoryIds.length === (row.theory_ids ?? []).length && primaryIds.length === (row.primary_theory_ids ?? []).length) continue;
    const { error: updateError } = await supabase.from('techniques').update({ theory_ids: theoryIds, primary_theory_ids: primaryIds }).eq('id', row.id);
    if (updateError) throw updateError;
  }
  if ((data?.length ?? 0) < 1000) break;
}

const { data: drafts, error: draftError } = await supabase.from('technique_drafts').select('technique_id,snapshot');
if (draftError) throw draftError;
for (const draft of drafts ?? []) {
  const snapshot = draft.snapshot ?? {};
  const next = { ...snapshot };
  let changed = false;
  for (const field of ['theory_ids', 'primary_theory_ids', 'relatedTheoryIds', 'primaryTheoryIds']) {
    if (Array.isArray(snapshot[field]) && strip(snapshot[field]).length !== snapshot[field].length) {
      next[field] = strip(snapshot[field]);
      changed = true;
    }
  }
  if (!changed) continue;
  const { error } = await supabase.from('technique_drafts').update({ snapshot: next }).eq('technique_id', draft.technique_id);
  if (error) throw error;
}

const { error: deleteError } = await supabase.from('theories').delete().in('id', [...retired]);
if (deleteError) throw deleteError;
const { data: remaining, error: verifyError } = await supabase.from('theories').select('id,category_id');
if (verifyError) throw verifyError;
if (remaining.some((row) => row.category_id === 'maxims-experience' || retired.has(row.id))) {
  throw new Error('Retired theories remain in the published theory table.');
}
console.log(`Theory rights sync verified: ${remaining.length} owner theories, 0 retired IDs or categories.`);
