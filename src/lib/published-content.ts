import { applyManagedCategories, categoryOrder, hydratePaidCatalog, reconcilePublishedStructure, theories, type PaidTechniquePayload } from '@/data/catalog';
import { hydrateContentAccessScope } from '@/access/access-config';
import { hydratePersonaPresentations } from '@/data/persona-presentation';
import { isLockedTheoryShell } from '@/data/theory-display';
import { supabase } from '@/lib/supabase';

let loaded = false;
const PAGE_SIZE = 500;

async function fetchPublishedRows(table: 'techniques' | 'theories' | 'personas', columns: string) {
  if (!supabase) return { data: null, error: new Error('Supabase is unavailable') };
  const rows: Record<string, any>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table).select(columns).eq('status', 'published');
    if (table === 'theories') query = query.order('category_id').order('display_id').order('id');
    else query = query.order('display_order').order(table === 'personas' ? 'name' : 'id');
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}

/**
 * Loads the public catalogue from Supabase when the owner-content migration
 * is available. The bundled JSON remains a safe offline/bootstrap fallback.
 */
export async function hydratePublishedContent(force = false): Promise<boolean> {
  if (!supabase || (loaded && !force)) return false;
  try {
    const [{ data, error }, theoryResult, personaResult, categoryResult] = await Promise.all([
      fetchPublishedRows('techniques', 'id,persona_id,category,title,essence,explanation,memo,importance,practices,examples,cautions,primary_theory_ids,theory_ids,status,display_order,updated_at,image_path,access_tier,tags'),
      fetchPublishedRows('theories', 'id,title,summary,category_id,category_title,aliases,related_theory_ids,provenance,status,display_order,display_id,image_path,access_tier'),
      fetchPublishedRows('personas', 'name,category,subtitle,image_path,display_order,access_tier'),
      supabase.from('content_categories').select('kind,id,title,display_order').order('display_order'),
    ]);
    if (error || !data) return false;
    const techniques: PaidTechniquePayload[] = data.map((row) => ({
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
      imagePath: typeof row.image_path === 'string' ? row.image_path : null,
      accessTier: row.access_tier === 'free' ? 'free' : 'complete',
      tags: Array.isArray(row.tags) ? row.tags as string[] : undefined,
    }));
    // The table is the source of truth for techniques. Keep every theory that
    // has already been resolved by the authenticated complete-edition sync;
    // passing an empty list here would reset those 585 records back to their
    // intentionally blank public shells immediately after a successful sync.
    const remoteTheories = (theoryResult.data ?? []).map((row) => ({ provenance: row.provenance ?? theories.find((item) => item.tagId === row.id)?.provenance, tagId: String(row.id), displayId: typeof row.display_id === 'number' ? row.display_id : Number(row.display_order ?? 0), title: String(row.title ?? ''), summary: String(row.summary ?? ''), categoryId: String(row.category_id ?? ''), categoryTitle: String(row.category_title ?? ''), aliases: Array.isArray(row.aliases) ? row.aliases as string[] : [], relatedTheoryIds: Array.isArray(row.related_theory_ids) ? row.related_theory_ids as string[] : [], status: 'published' as const, displayOrder: Number(row.display_id ?? row.display_order ?? 0), imagePath: typeof row.image_path === 'string' ? row.image_path : null, accessTier: row.access_tier === 'free' ? 'free' as const : 'complete' as const }));
    const resolvedTheories = !theoryResult.error ? remoteTheories : theories.filter((theory) => !isLockedTheoryShell(theory));
    hydratePaidCatalog(techniques, resolvedTheories);
    if (!categoryResult.error && categoryResult.data) applyManagedCategories(categoryResult.data);
    reconcilePublishedStructure(techniques.map((item) => item.id), personaResult.error ? undefined : personaResult.data as { name: string; category: PaidTechniquePayload['categoryKey'] }[], theoryResult.error ? undefined : remoteTheories.map((item) => item.tagId));
    if (!personaResult.error && personaResult.data) hydratePersonaPresentations(personaResult.data as Array<{ name: string; category?: string; subtitle?: string; image_path?: string | null; display_order?: number }>, categoryOrder);
    if (!personaResult.error && !theoryResult.error) hydrateContentAccessScope({ personas: (personaResult.data ?? []) as Array<{ name: string; access_tier?: string }>, techniques: data as Array<{ id: string; access_tier?: string }>, theories: (theoryResult.data ?? []) as Array<{ id: string; access_tier?: string }> });
    loaded = true;
    return true;
  } catch (error) {
    console.warn('Published content hydration failed', error);
    return false;
  }
}
