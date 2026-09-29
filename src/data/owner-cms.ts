import { supabase } from '@/lib/supabase';
import type { TheoryCard } from './types';
import { toTheory } from './owner-theories';

export type ContentKind = 'persona' | 'technique' | 'theory';
export type ContentCategory = { kind: 'technique' | 'theory'; id: string; title: string; display_order: number; updated_at: string };

export async function fetchContentCategories(): Promise<ContentCategory[]> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.from('content_categories').select('*').order('display_order').order('id');
  if (error) throw error;
  return (data ?? []) as ContentCategory[];
}

export async function saveContentCategory(category: ContentCategory): Promise<void> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { error } = await supabase.from('content_categories').update({ title: category.title.trim(), updated_at: new Date().toISOString() })
    .eq('kind', category.kind).eq('id', category.id);
  if (error) throw error;
}

export async function reorderContent(kind: ContentKind | 'technique-category' | 'theory-category', scope: string, ids: string[]): Promise<void> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { error } = await supabase.rpc('reorder_content', { target_kind: kind, target_scope: scope, target_ids: ids });
  if (error) throw error;
}

export async function createTheoryDraft(category: ContentCategory): Promise<ReturnType<typeof toTheory>> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const id = `theory-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const { data: last, error: orderError } = await supabase.from('theories').select('display_order').eq('category_id', category.id).order('display_order', { ascending: false }).limit(1);
  if (orderError) throw orderError;
  const { data, error } = await supabase.from('theories').insert({
    id, title: '', summary: '', category_id: category.id, category_title: category.title,
    status: 'draft', access_tier: 'complete', display_order: Number(last?.[0]?.display_order ?? 0) + 1, aliases: [], related_theory_ids: [],
  }).select('*').single();
  if (error) throw error;
  return toTheory(data as Record<string, unknown>);
}

export async function saveTheoryDraft(theory: Omit<TheoryCard, 'status'> & { displayOrder?: number; draftTechniqueIds?: string[] }): Promise<void> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { error } = await supabase.from('theories').update({ title: theory.title, summary: theory.summary,
    category_id: theory.categoryId, aliases: theory.aliases ?? [], related_theory_ids: theory.relatedTheoryIds ?? [],
    provenance: theory.provenance ?? null, image_path: theory.imagePath ?? null, access_tier: theory.accessTier ?? 'complete',
    display_order: theory.displayOrder ?? 0, draft_technique_ids: theory.draftTechniqueIds ?? [], status: 'draft', updated_at: new Date().toISOString(),
  }).eq('id', theory.tagId);
  if (error) throw error;
}

