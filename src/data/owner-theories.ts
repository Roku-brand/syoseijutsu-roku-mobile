import { theories as bundledTheories, hydratePaidTheories } from '@/data/catalog';
import type { TheoryCard } from '@/data/types';
import { supabase } from '@/lib/supabase';

export async function fetchOwnerTheories() {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.from('theories').select('*').order('display_order').order('id');
  if (error) throw error;
  return (data ?? []).map(toTheory);
}
function toTheory(row: Record<string, unknown>): Omit<TheoryCard, 'status'> & { status: 'published' | 'archived'; displayOrder: number } {
  return { tagId: String(row.id), title: String(row.title ?? ''), summary: String(row.summary ?? ''), categoryId: String(row.category_id ?? 'psychology'), categoryTitle: String(row.category_title ?? ''), aliases: Array.isArray(row.aliases) ? row.aliases as string[] : [], relatedTheoryIds: Array.isArray(row.related_theory_ids) ? row.related_theory_ids as string[] : [], status: row.status === 'archived' ? 'archived' : 'published', displayOrder: Number(row.display_order ?? 0) };
}
export async function publishTheory(theory: Omit<TheoryCard, 'status'> & { displayOrder?: number }) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.rpc('publish_theory', { target_theory_id: theory.tagId, payload: { title: theory.title, summary: theory.summary, category_id: theory.categoryId, category_title: theory.categoryTitle, aliases: theory.aliases ?? [], related_theory_ids: theory.relatedTheoryIds ?? [], display_order: theory.displayOrder ?? 0 } });
  if (error) throw error;
  return toTheory((Array.isArray(data) ? data[0] : data) as Record<string, unknown>);
}
export async function archiveTheory(id: string) { if (!supabase) throw new Error('Supabaseが未設定です。'); const { error } = await supabase.rpc('archive_theory', { target_theory_id: id }); if (error) throw error; }
export async function seedOwnerTheoriesIfEmpty() {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data: existing, error } = await supabase.from('theories').select('id').limit(1);
  if (error) throw error; if (existing?.length) return;
  const rows = bundledTheories.map((theory, index) => ({ id: theory.tagId, title: theory.title, summary: theory.summary, category_id: theory.categoryId, category_title: theory.categoryTitle, aliases: theory.aliases ?? [], related_theory_ids: theory.relatedTheoryIds ?? [], display_order: index }));
  for (let i = 0; i < rows.length; i += 100) { const { error: insertError } = await supabase.from('theories').insert(rows.slice(i, i + 100)); if (insertError) throw insertError; }
}
export function applyTheory(theory: Omit<TheoryCard, 'status'>) { hydratePaidTheories([{ ...theory, status: 'published' }]); }
