import { hydratePaidCatalog, type PaidTechniquePayload } from '@/data/catalog';
import type { TheoryCard } from '@/data/types';
import { supabase } from '@/lib/supabase';

let loaded = false;

/**
 * Loads the public catalogue from Supabase when the owner-content migration
 * is available. The bundled JSON remains a safe offline/bootstrap fallback.
 */
export async function hydratePublishedContent(): Promise<boolean> {
  if (!supabase || loaded) return false;
  try {
    const { data, error } = await supabase
      .from('techniques')
      .select('id,persona_id,category,title,essence,explanation,memo,importance,practices,examples,cautions,theory_ids,status,display_order,updated_at')
      .eq('status', 'published')
      .order('display_order')
      .order('id');
    if (error || !data?.length) return false;
    const techniques: PaidTechniquePayload[] = data.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      essence: (row.essence as string) ?? '',
      explanation: (row.explanation as string) ?? '',
      memo: (row.memo as string) ?? '',
      importance: row.importance as 1 | 2 | 3,
      relatedTheoryIds: Array.isArray(row.theory_ids) ? row.theory_ids as string[] : [],
      categoryKey: row.category as PaidTechniquePayload['categoryKey'],
      categoryName: row.category as string,
      subcategory: row.persona_id as string,
      articleTitle: row.persona_id as string,
      practicalActions: {
        todayActions: Array.isArray(row.practices) ? row.practices as string[] : [],
        examples: Array.isArray(row.examples) ? row.examples as string[] : [],
        cautions: Array.isArray(row.cautions) ? row.cautions as string[] : [],
      },
      status: 'published',
      displayOrder: row.display_order as number,
    }));
    // The table is the source of truth for techniques. The bundled theory
    // catalogue is retained until theories receive the same managed table.
    hydratePaidCatalog(techniques, [] as TheoryCard[]);
    loaded = true;
    return true;
  } catch {
    return false;
  }
}

export function resetPublishedContentHydration() {
  loaded = false;
}
