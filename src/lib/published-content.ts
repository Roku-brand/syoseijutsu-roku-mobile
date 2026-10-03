import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyManagedCategories, categoryOrder, hydratePaidCatalog, reconcilePublishedStructure, techniqueById, theories, type PaidTechniquePayload } from '@/data/catalog';
import { hydrateContentAccessScope } from '@/access/access-config';
import { hydratePersonaPresentations } from '@/data/persona-presentation';
import { isLockedTheoryShell } from '@/data/theory-display';
import { supabase } from '@/lib/supabase';
import { createResourceCache } from './resource-cache';

const PAGE_SIZE = 500;
const TECHNIQUE_METADATA = 'id,persona_id,category,importance,primary_theory_ids,theory_ids,display_order,image_path,access_tier,tags';
const THEORY_METADATA = 'id,title,category_id,category_title,aliases,related_theory_ids,display_order,display_id,image_path,access_tier';

async function fetchPublishedRows(table: 'techniques' | 'theories' | 'personas', columns: string, tier?: 'free' | 'complete') {
  if (!supabase) return { data: null, error: new Error('Supabase is unavailable') };
  const rows: Record<string, any>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table === 'personas' ? table : `public_${table}`).select(columns).eq('status', 'published');
    if (tier) query = query.eq('access_tier', tier);
    if (table === 'theories') query = query.order('category_id').order('display_id').order('id');
    else query = query.order('display_order').order(table === 'personas' ? 'name' : 'id');
    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}

type PublicSnapshot = { techniques: Record<string, any>[]; theories: Record<string, any>[]; personas: Record<string, any>[]; categories: Record<string, any>[] };
const publishedCache = createResourceCache<PublicSnapshot>({
  key: '@shoseijutsu-roku/published-content/v2', maxAgeMs: 60 * 60 * 1000, storage: AsyncStorage,
  validate: (value): value is PublicSnapshot => Boolean(value && typeof value === 'object'
    && ['techniques', 'theories', 'personas', 'categories'].every((key) => Array.isArray((value as Record<string, unknown>)[key]))),
  fetch: async () => {
    if (!supabase) throw new Error('Supabase is unavailable');
    const results = await Promise.all([
      fetchPublishedRows('techniques', `${TECHNIQUE_METADATA},title,essence,explanation,memo,practices,examples,cautions`, 'free'),
      fetchPublishedRows('techniques', TECHNIQUE_METADATA, 'complete'),
      fetchPublishedRows('theories', `${THEORY_METADATA},summary,provenance`, 'free'),
      fetchPublishedRows('theories', THEORY_METADATA, 'complete'),
      fetchPublishedRows('personas', 'name,category,subtitle,image_path,display_order,access_tier'),
      supabase.from('content_categories').select('kind,id,title,display_order').order('display_order'),
    ]);
    // Cache only a complete, consistent response. A failed table must not
    // become an authoritative empty list that removes offline cards.
    if (results.some((result) => result.error || !result.data)) throw new Error('Published catalogue read failed');
    return { techniques: [...results[0].data!, ...results[1].data!], theories: [...results[2].data!, ...results[3].data!], personas: results[4].data!, categories: results[5].data! };
  },
});

/**
 * Loads the public catalogue from Supabase when the owner-content migration
 * is available. The bundled JSON remains a safe offline/bootstrap fallback.
 */
export async function hydratePublishedContent(force = false): Promise<boolean> {
  if (!supabase) return false;
  try {
    const snapshot = await publishedCache.get(force);
    const data = snapshot.techniques;
    const theoryResult = { data: snapshot.theories, error: null };
    const personaResult = { data: snapshot.personas, error: null };
    const categoryResult = { data: snapshot.categories, error: null };
    const techniques: PaidTechniquePayload[] = data.map((row) => {
      const existing = techniqueById.get(row.id);
      // Authenticated payloads need not include a publication status. Preserve
      // their resolved body when public metadata is reapplied after paid sync.
      const resolved = row.access_tier === 'complete' && existing?.status !== 'locked'
        && existing?.explanation?.trim() ? existing : undefined;
      return {
        ...resolved,
        id: row.id as string,
        title: row.title ?? existing?.title ?? '完全版の処世術',
        essence: row.essence ?? resolved?.essence ?? '',
        explanation: row.explanation ?? resolved?.explanation ?? '',
        memo: (row.memo as string) ?? '',
        importance: row.importance as 1 | 2 | 3,
        primaryTheoryIds: Array.isArray(row.primary_theory_ids) ? row.primary_theory_ids as string[] : [],
        relatedTheoryIds: Array.isArray(row.theory_ids) ? row.theory_ids as string[] : [],
        categoryKey: row.category as PaidTechniquePayload['categoryKey'],
        categoryName: row.category as string,
        subcategory: row.persona_id as string,
        articleTitle: row.persona_id as string,
        practicalActions: row.access_tier === 'complete' ? resolved?.practicalActions : {
          todayActions: Array.isArray(row.practices) ? row.practices as string[] : [],
          examples: Array.isArray(row.examples) ? row.examples as string[] : [],
          cautions: Array.isArray(row.cautions) ? row.cautions as string[] : [],
        },
        status: row.access_tier === 'free' || resolved ? 'published' : 'locked',
        displayOrder: row.display_order as number,
        imagePath: typeof row.image_path === 'string' ? row.image_path : null,
        accessTier: row.access_tier === 'free' ? 'free' : 'complete',
        tags: Array.isArray(row.tags) ? row.tags as string[] : undefined,
      };
    });
    // The table is the source of truth for techniques. Keep every theory that
    // has already been resolved by the authenticated complete-edition sync;
    // passing an empty list here would reset those 585 records back to their
    // intentionally blank public shells immediately after a successful sync.
    const remoteTheories = (theoryResult.data ?? []).map((row) => {
      const existing = theories.find((item) => item.tagId === row.id);
      const resolved = row.access_tier === 'complete' && existing && !isLockedTheoryShell(existing) ? existing : undefined;
      return { provenance: row.provenance ?? resolved?.provenance, tagId: String(row.id), displayId: typeof row.display_id === 'number' ? row.display_id : Number(row.display_order ?? 0), title: String(row.title ?? ''), summary: String(row.summary ?? resolved?.summary ?? ''), categoryId: String(row.category_id ?? ''), categoryTitle: String(row.category_title ?? ''), aliases: Array.isArray(row.aliases) ? row.aliases as string[] : [], relatedTheoryIds: Array.isArray(row.related_theory_ids) ? row.related_theory_ids as string[] : [], status: row.access_tier === 'free' || resolved ? 'published' as const : 'locked' as const, displayOrder: Number(row.display_id ?? row.display_order ?? 0), imagePath: typeof row.image_path === 'string' ? row.image_path : null, accessTier: row.access_tier === 'free' ? 'free' as const : 'complete' as const };
    });
    const resolvedTheories = !theoryResult.error ? remoteTheories : theories.filter((theory) => !isLockedTheoryShell(theory));
    hydratePaidCatalog(techniques, resolvedTheories);
    if (!categoryResult.error && categoryResult.data) applyManagedCategories(categoryResult.data as Array<{ kind: string; id: string; title: string; display_order: number }>);
    reconcilePublishedStructure(techniques.map((item) => item.id), personaResult.error ? undefined : personaResult.data as { name: string; category: PaidTechniquePayload['categoryKey'] }[], theoryResult.error ? undefined : remoteTheories.map((item) => item.tagId));
    if (!personaResult.error && personaResult.data) hydratePersonaPresentations(personaResult.data as Array<{ name: string; category?: string; subtitle?: string; image_path?: string | null; display_order?: number }>, categoryOrder);
    if (!personaResult.error && !theoryResult.error) hydrateContentAccessScope({ personas: (personaResult.data ?? []) as Array<{ name: string; access_tier?: string }>, techniques: data as Array<{ id: string; access_tier?: string }>, theories: (theoryResult.data ?? []) as Array<{ id: string; access_tier?: string }> });
    return true;
  } catch (error) {
    console.warn('Published content hydration failed', error);
    return false;
  }
}
