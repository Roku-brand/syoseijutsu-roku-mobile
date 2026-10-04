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
  const { error } = await supabase.rpc('save_content_category', {
    target_kind: category.kind,
    target_id: category.id,
    target_title: category.title.trim(),
  });
  if (error) throw error;
}

export async function deleteContentCategory(category: Pick<ContentCategory, 'kind' | 'id'>): Promise<void> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { error } = await supabase.rpc('delete_content_category', {
    target_kind: category.kind,
    target_id: category.id,
  });
  if (error) throw error;
}

export async function reorderContent(kind: ContentKind | 'technique-category' | 'theory-category', scope: string, ids: string[]): Promise<void> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { error } = await supabase.rpc('reorder_content', { target_kind: kind, target_scope: scope, target_ids: ids });
  if (error) throw error;
}

export async function createTheoryDraft(category: ContentCategory): Promise<ReturnType<typeof toTheory>> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.rpc('create_theory_draft', { target_category_id: category.id });
  if (error) throw error;
  return toTheory((Array.isArray(data) ? data[0] : data) as Record<string, unknown>);
}

export async function saveTheoryDraft(theory: Omit<TheoryCard, 'status'> & { displayOrder?: number | null; draftTechniqueIds?: string[] }): Promise<void> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { error } = await supabase.rpc('save_theory_draft', {
    target_theory_id: theory.tagId,
    payload: {
      title: theory.title,
      summary: theory.summary,
      category_id: theory.categoryId, subcategory_id: theory.subcategoryId, taxonomy_order: theory.sortOrder,
      aliases: theory.aliases ?? [],
      related_theory_ids: theory.relatedTheoryIds ?? [],
      provenance: theory.provenance ?? null,
      image_path: theory.imagePath ?? null,
      access_tier: theory.accessTier ?? 'complete',
      display_id: theory.displayId ?? theory.draftDisplayId ?? theory.displayOrder ?? undefined,
      draft_technique_ids: theory.draftTechniqueIds ?? [],
    },
  });
  if (error) throw error;
}
