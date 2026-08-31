import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error('SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を環境変数に設定してください。');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'src/data/generated/techniques.json'), 'utf8'));
const sourceById = new Map();
for (const category of catalog.categories ?? []) for (const persona of category.subcategories ?? []) for (const item of persona.items ?? []) {
  sourceById.set(item.id, item.relatedTheoryIds ?? item.theoryTagIds ?? []);
}
const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const [{ data: techniques, error: techniqueError }, { data: revisions, error: revisionError }] = await Promise.all([
  supabase.from('techniques').select('id,theory_ids'),
  supabase.from('technique_revisions').select('revision_id,technique_id,snapshot,version').order('version', { ascending: false }),
]);
if (techniqueError) throw techniqueError;
if (revisionError) throw revisionError;

const latestByTechnique = new Map();
for (const revision of revisions ?? []) if (!latestByTechnique.has(revision.technique_id)) latestByTechnique.set(revision.technique_id, revision);
const same = (left, right) => JSON.stringify(left ?? []) === JSON.stringify(right ?? []);
let recovered = 0;
for (const row of techniques ?? []) {
  const sourceIds = sourceById.get(row.id) ?? [];
  const currentIds = Array.isArray(row.theory_ids) ? row.theory_ids : [];
  const revision = latestByTechnique.get(row.id);
  const snapshot = revision?.snapshot && typeof revision.snapshot === 'object' ? revision.snapshot : null;
  const revisionIds = Array.isArray(snapshot?.theory_ids) ? snapshot.theory_ids : Array.isArray(snapshot?.relatedTheoryIds) ? snapshot.relatedTheoryIds : [];
  // A deploy used to overwrite a hand-edited row with the bundled source.
  // If the current value exactly matches that source but the latest revision
  // contains a different curated set, restore the curated set.
  if (!revisionIds.length || !sourceIds.length || !same(currentIds, sourceIds) || same(revisionIds, sourceIds)) continue;
  const { error } = await supabase.from('techniques').update({ theory_ids: revisionIds }).eq('id', row.id);
  if (error) throw error;
  recovered += 1;
}
console.log(`Recovered related-theory links for ${recovered} techniques from the latest revision snapshots.`);
