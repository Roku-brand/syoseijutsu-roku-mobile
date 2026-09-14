import { hydratePaidCatalog, theories, type PaidTechniquePayload } from '@/data/catalog';
import contentScope from '@/data/content-scope.json';
import { isLockedTheoryShell } from '@/data/theory-display';
import { supabase } from '@/lib/supabase';

let loaded = false;
const excludedTechniqueIds = new Set<string>(contentScope.excludedTechniqueIds);

/**
 * Loads the public catalogue from Supabase when the owner-content migration
 * is available. The bundled JSON remains a safe offline/bootstrap fallback.
 */
export async function hydratePublishedContent(force = false): Promise<boolean> {
  if (!supabase || (loaded && !force)) return false;
  try {
    const [{ data, error }, theoryResult] = await Promise.all([supabase
      .from('techniques')
      .select('id,persona_id,category,title,essence,explanation,memo,importance,practices,examples,cautions,primary_theory_ids,theory_ids,status,display_order,updated_at')
      .eq('status', 'published')
      .order('display_order')
      .order('id'), supabase.from('theories').select('id,title,summary,category_id,category_title,aliases,related_theory_ids,status,display_order').eq('status', 'published').order('display_order').order('id')]);
    if (error || !data?.length) return false;
    const techniques: PaidTechniquePayload[] = data.filter((row) => !excludedTechniqueIds.has(row.id as string)).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      essence: (row.essence as string) ?? '',
      explanation: (row.explanation as string) ?? '',
      memo: (row.memo as string) ?? '',
      importance: row.importance as 1 | 2 | 3,
      primaryTheoryIds: Array.isArray(row.primary_theory_ids) ? row.primary_theory_ids as string[] : [],
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
    // The table is the source of truth for techniques. Keep every theory that
    // has already been resolved by the authenticated complete-edition sync;
    // passing an empty list here would reset those 585 records back to their
    // intentionally blank public shells immediately after a successful sync.
    const remoteTheories = (theoryResult.data ?? []).map((row) => ({ tagId: String(row.id), title: String(row.title ?? ''), summary: String(row.summary ?? ''), categoryId: String(row.category_id ?? ''), categoryTitle: String(row.category_title ?? ''), aliases: Array.isArray(row.aliases) ? row.aliases as string[] : [], relatedTheoryIds: Array.isArray(row.related_theory_ids) ? row.related_theory_ids as string[] : [], status: 'published' as const }));
    const resolvedTheories = remoteTheories.length ? remoteTheories : theories.filter((theory) => !isLockedTheoryShell(theory));
    hydratePaidCatalog(techniques, resolvedTheories);
    loaded = true;
    return true;
  } catch (error) {
    console.warn('Published content hydration failed', error);
    return false;
  }
}

export function resetPublishedContentHydration() {
  loaded = false;
}
