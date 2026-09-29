import { theories as bundledTheories, hydratePaidTheories } from '@/data/catalog';
import { getTheoryProvenance } from './theory-sources';
import { validateTheoryForPublish } from './content-editor-schema';
import type { TheoryCard, TheoryProvenance } from '@/data/types';
import { supabase } from '@/lib/supabase';

export async function fetchOwnerTheories() {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('theories').select('*').order('display_order').order('id').range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data ?? []) as Record<string, unknown>[]);
    if ((data ?? []).length < 1000) break;
  }
  return rows.map(toTheory);
}
export function toTheory(row: Record<string, unknown>): Omit<TheoryCard, 'status'> & { status: 'published' | 'draft' | 'archived'; displayOrder: number; updatedAt: string; draftTechniqueIds: string[] } {
  return { provenance: (row.provenance as TheoryProvenance | null) ?? getTheoryProvenance(bundledTheories.find((item) => item.tagId === row.id) ?? { title: String(row.title ?? '') }), tagId: String(row.id), title: String(row.title ?? ''), summary: String(row.summary ?? ''), categoryId: String(row.category_id ?? 'psychology'), categoryTitle: String(row.category_title ?? ''), aliases: Array.isArray(row.aliases) ? row.aliases as string[] : [], relatedTheoryIds: Array.isArray(row.related_theory_ids) ? row.related_theory_ids as string[] : [], status: row.status === 'archived' ? 'archived' : row.status === 'draft' ? 'draft' : 'published', displayOrder: Number(row.display_order ?? 0), updatedAt: String(row.updated_at ?? ''), imagePath: typeof row.image_path === 'string' ? row.image_path : null, accessTier: row.access_tier === 'free' ? 'free' : 'complete', draftTechniqueIds: Array.isArray(row.draft_technique_ids) ? row.draft_technique_ids as string[] : [] };
}
export async function publishTheory(theory: Omit<TheoryCard, 'status'> & { displayOrder?: number; relatedTechniqueIds?: string[] }) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const errors = validateTheoryForPublish(theory);
  if (errors.length) throw new Error(errors.join('\n'));
  const { data, error } = await supabase.rpc('publish_theory', { target_theory_id: theory.tagId, payload: { provenance: theory.provenance ?? null, title: theory.title, summary: theory.summary, category_id: theory.categoryId, category_title: theory.categoryTitle, aliases: theory.aliases ?? [], related_theory_ids: theory.relatedTheoryIds ?? [], display_order: theory.displayOrder ?? 0, image_path: theory.imagePath ?? null, access_tier: theory.accessTier ?? 'complete', related_technique_ids: theory.relatedTechniqueIds } });
  if (error) throw error;
  return toTheory((Array.isArray(data) ? data[0] : data) as Record<string, unknown>);
}
export async function archiveTheory(id: string) { if (!supabase) throw new Error('Supabaseが未設定です。'); const { error } = await supabase.rpc('archive_theory', { target_theory_id: id }); if (error) throw error; }
export async function seedOwnerTheoriesIfEmpty() {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data: existing, error } = await supabase.from('theories').select('id').limit(1);
  if (error) throw error; if (existing?.length) return;
  const rows = bundledTheories.map((theory, index) => ({ provenance: theory.provenance ?? null, id: theory.tagId, title: theory.title, summary: theory.summary, category_id: theory.categoryId, category_title: theory.categoryTitle, aliases: theory.aliases ?? [], related_theory_ids: theory.relatedTheoryIds ?? [], display_order: index }));
  for (let i = 0; i < rows.length; i += 100) { const { error: insertError } = await supabase.from('theories').insert(rows.slice(i, i + 100)); if (insertError) throw insertError; }
}
export function applyTheory(theory: Omit<TheoryCard, 'status'>) { hydratePaidTheories([{ ...theory, status: 'published' }]); }

