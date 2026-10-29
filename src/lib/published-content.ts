import { applyManagedCategories, categoryOrder, hydratePaidCatalog, reconcilePublishedStructure, techniqueById, theories, type PaidTechniquePayload } from '@/data/catalog';
import { hydrateContentAccessScope } from '@/access/access-config';
import { hydratePersonaPresentations } from '@/data/persona-presentation';
import { isLockedTheoryShell } from '@/data/theory-display';
import { supabase } from '@/lib/supabase';
import { applyTheorySubcategories } from '@/data/theory-taxonomy';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SyncStatus = { status: 'idle' | 'loading' | 'ready' | 'offline'; updatedAt: string | null };
const initialSync: SyncStatus = { status: 'idle', updatedAt: null };
let syncStatus = initialSync;
const listeners = new Set<() => void>();
export const catalogSyncStore = {
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => syncStatus,
  getServerSnapshot: () => initialSync,
};
function notifySync(status: SyncStatus['status']) { syncStatus = { status, updatedAt: status === 'ready' ? new Date().toISOString() : syncStatus.updatedAt }; listeners.forEach(listener => listener()); }
const CACHE_KEY = '@shoseijutsu-roku/public-catalog/v2';
let cachedRows: { techniques: Record<string, any>[]; theories: Record<string, any>[] } | null = null;
let cacheRestored = false;

let loaded = false;
let pending: Promise<boolean> | null = null;
const PAGE_SIZE = 500;

async function fetchPublishedRows(table: 'techniques' | 'theories' | 'personas', columns: string, freeOnly = false) {
  if (!supabase) return { data: null, error: new Error('Supabase is unavailable') };
  const rows: Record<string, any>[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabase.from(table === 'personas' ? table : `public_${table}`).select(columns).eq('status', 'published');
    if (freeOnly) query = query.eq('access_tier', 'free');
    if (table === 'theories') query = query.order('category_id').order('display_id').order('id');
    else query = query.order('display_order').order(table === 'personas' ? 'name' : 'id');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let result;
    try { result = await (query.abortSignal?.(controller.signal) ?? query).range(from, from + PAGE_SIZE - 1); }
    finally { clearTimeout(timeout); }
    const { data, error } = result;
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
export function hydratePublishedContent(force = false, reuseInFlight = false): Promise<boolean> {
  // Startup deck restoration can share the ordinary catalogue request. An
  // explicit CMS refresh still starts a fresh read after a publication edit.
  if (pending) {
    if (reuseInFlight || !force) return pending;
    // Explicit publication refreshes run after an existing read, never race it.
    return pending.then(() => hydratePublishedContent(force, true));
  }
  const request = loadPublishedContent(force);
  pending = request;
  const clear = () => { if (pending === request) pending = null; };
  void request.then(clear, clear);
  return request;
}

async function loadPublishedContent(force: boolean): Promise<boolean> {
  if (!supabase || (loaded && !force)) return false;
  notifySync('loading');
  try {
    if (!cacheRestored) {
      cacheRestored = true;
      try {
        const raw = await Promise.race([AsyncStorage.getItem(CACHE_KEY), new Promise<null>(resolve => { setTimeout(() => resolve(null), 250); })]);
        if (raw) { const cache = JSON.parse(raw); if (cache.version === 2 && Array.isArray(cache.techniques) && Array.isArray(cache.theories)) cachedRows = cache; }
      } catch { /* The bundled catalogue remains available. */ }
    }
    const [{ data, error }, theoryResult, personaResult, categoryResult, subcategoryResult] = await Promise.all([
      fetchPublishedRows('techniques', 'id,persona_id,category,title,essence,importance,primary_theory_ids,theory_ids,status,display_order,updated_at,image_path,access_tier,tags'),
      fetchPublishedRows('theories', 'id,title,category_id,category_title,aliases,related_theory_ids,status,display_order,display_id,image_path,access_tier,subcategory_id,subcategory_title,taxonomy_order,canonical_id,legacy_ids,knowledge_type,quotation_author,updated_at'),
      fetchPublishedRows('personas', 'name,category,subtitle,image_path,display_order,access_tier'),
      supabase.from('content_categories').select('kind,id,title,display_order').order('display_order'),
      supabase.from('theory_subcategories').select('id,category_id,title,display_order').order('display_order'),
    ]);
    if (error || !data) { restorePublicCache(); notifySync('offline'); return false; }
    const bodies = async (table: 'techniques' | 'theories', metadata: Record<string, any>[]) => {
      const cached = new Map((cachedRows?.[table] ?? []).map(row => [row.id, row]));
      const needsRead = metadata.some(row => row.access_tier === 'free' && !(row.explanation || row.summary) && (!row.updated_at || cached.get(row.id)?.updated_at !== row.updated_at));
      let result = { data: [] as Record<string, any>[] | null, error: null as unknown };
      if (needsRead) result = await fetchPublishedRows(table, table === 'techniques' ? 'id,explanation,memo,practices,examples,cautions' : 'id,summary,provenance,quotation', true);
      if (result.error) notifySync('offline');
      const rows = new Map((result.data ?? []).map(row => [row.id, row]));
      return { rows: metadata.map(row => ({ ...(row.access_tier === 'free' ? cached.get(row.id) : undefined), ...row, ...rows.get(row.id) })), ok: !result.error };
    };
    const [techniqueBodies, theoryBodies] = await Promise.all([bodies('techniques', data), bodies('theories', theoryResult.data ?? [])]);
    data.splice(0, data.length, ...techniqueBodies.rows);
    if (theoryResult.data) theoryResult.data.splice(0, theoryResult.data.length, ...theoryBodies.rows);
    applyPublicRows(data, theoryResult, personaResult, categoryResult, subcategoryResult);
    const complete = !theoryResult.error && !personaResult.error && !categoryResult.error && !subcategoryResult.error && techniqueBodies.ok && theoryBodies.ok;
    loaded = complete;
    if (complete) {
      // Complete-edition bodies never enter the shared, account-independent cache.
      const mask = (row: Record<string, any>) => row.access_tier === 'complete' ? { ...row, essence: '', explanation: '', memo: '', practices: [], examples: [], cautions: [], tags: null, summary: '', provenance: null, quotation: null } : row;
      cachedRows = { techniques: data.map(mask), theories: (theoryResult.data ?? []).map(mask) };
      void AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ version: 2, ...cachedRows })).catch(() => undefined);
    }
    notifySync(complete ? 'ready' : 'offline');
    // Do not acknowledge a revision when part of the catalogue failed to load.
    // A later lightweight check must be able to retry that incomplete refresh.
    return complete;
  } catch (error) {
    notifySync('offline');
    console.warn('Published content hydration failed', error);
    return false;
  }
}

type RowResult = { data: any[] | null; error: unknown };
function applyPublicRows(data: Record<string, any>[], theoryResult: RowResult, personaResult: RowResult, categoryResult: RowResult, subcategoryResult: RowResult) {
    if (!subcategoryResult.error && subcategoryResult.data) applyTheorySubcategories(subcategoryResult.data.map(row=>({ id: row.id, categoryId: row.category_id, title: row.title, displayOrder: row.display_order })));
    const techniques: PaidTechniquePayload[] = data.map((row) => {
      // A public read may contain protected shells. Retain the current user's
      // already verified body until the secure refresh succeeds; sign-out and
      // entitlement loss purge these objects before any subsequent hydration.
      const existing = techniqueById.get(String(row.id));
      const resolved = !row.explanation && existing?.explanation ? existing : undefined;
      return {
      id: row.id as string,
      title: row.title as string,
      essence: resolved?.essence ?? (row.essence as string) ?? '',
      explanation: resolved?.explanation ?? (row.explanation as string) ?? '',
      memo: (row.memo as string) ?? '',
      importance: row.importance as 1 | 2 | 3,
      primaryTheoryIds: Array.isArray(row.primary_theory_ids) ? row.primary_theory_ids as string[] : [],
      relatedTheoryIds: Array.isArray(row.theory_ids) ? row.theory_ids as string[] : [],
      categoryKey: row.category as PaidTechniquePayload['categoryKey'],
      categoryName: row.category as string,
      subcategory: typeof row.persona_id === 'string' ? row.persona_id : '',
      articleTitle: typeof row.persona_id === 'string' ? row.persona_id : '',
      practicalActions: resolved?.practicalActions ?? {
        todayActions: Array.isArray(row.practices) ? row.practices as string[] : [],
        examples: Array.isArray(row.examples) ? row.examples as string[] : [],
        cautions: Array.isArray(row.cautions) ? row.cautions as string[] : [],
      },
      status: 'published',
      displayOrder: row.display_order as number,
      imagePath: typeof row.image_path === 'string' ? row.image_path : null,
      accessTier: row.access_tier === 'free' ? 'free' : 'complete',
      tags: Array.isArray(row.tags) ? row.tags as string[] : resolved?.tags,
    }; });
    // The table is the source of truth for techniques. Keep every theory that
    // has already been resolved by the authenticated complete-edition sync;
    // passing an empty list here would reset those 585 records back to their
    // intentionally blank public shells immediately after a successful sync.
    const remoteTheories = (theoryResult.data ?? []).filter(row=>!row.canonical_id || row.canonical_id===row.id).map((row) => {
      const existing = theories.find((item) => item.tagId === row.id);
      const resolved = existing && !isLockedTheoryShell(existing) ? existing : undefined;
      const readable = row.access_tier === 'free' || Boolean(row.summary?.trim()) || Boolean(resolved);
      return { knowledgeType: row.knowledge_type, quotationAuthor: row.quotation_author ?? (existing?.title === row.title ? existing?.quotationAuthor : undefined), quotation: row.quotation ?? resolved?.quotation, subcategoryId: row.subcategory_id, subcategoryTitle: row.subcategory_title, sortOrder: row.taxonomy_order, canonicalId: row.canonical_id, legacyIds: row.legacy_ids ?? [], provenance: row.provenance ?? resolved?.provenance, tagId: String(row.id), displayId: typeof row.display_id === 'number' ? row.display_id : Number(row.display_order ?? 0), title: String(row.title ?? resolved?.title ?? ''), summary: String(row.summary || resolved?.summary || ''), categoryId: String(row.category_id ?? ''), categoryTitle: String(row.category_title ?? ''), aliases: Array.isArray(row.aliases) ? row.aliases as string[] : [], relatedTheoryIds: Array.isArray(row.related_theory_ids) ? row.related_theory_ids as string[] : [], status: readable ? 'published' as const : 'locked' as const, displayOrder: Number(row.display_id ?? row.display_order ?? 0), imagePath: typeof row.image_path === 'string' ? row.image_path : null, accessTier: row.access_tier === 'free' ? 'free' as const : 'complete' as const };
    });
    const resolvedTheories = !theoryResult.error ? remoteTheories : theories.filter((theory) => !isLockedTheoryShell(theory));
    hydratePaidCatalog(techniques, resolvedTheories);
    if (!categoryResult.error && categoryResult.data) applyManagedCategories(categoryResult.data);
    reconcilePublishedStructure(techniques.map((item) => item.id), personaResult.error ? undefined : personaResult.data as { name: string; category: PaidTechniquePayload['categoryKey'] }[], theoryResult.error ? undefined : remoteTheories.map((item) => item.tagId));
    if (!personaResult.error && personaResult.data) hydratePersonaPresentations(personaResult.data as Array<{ name: string; category?: string; subtitle?: string; image_path?: string | null; display_order?: number }>, categoryOrder);
    if (!personaResult.error && !theoryResult.error) hydrateContentAccessScope({ personas: (personaResult.data ?? []) as Array<{ name: string; access_tier?: string }>, techniques: data as Array<{ id: string; access_tier?: string }>, theories: (theoryResult.data ?? []).filter(row=>!row.canonical_id || row.canonical_id===row.id) as Array<{ id: string; access_tier?: string }> });
}

function restorePublicCache() {
  if (!cachedRows) return;
  const unavailable = { error: true, data: null };
  applyPublicRows(cachedRows.techniques, { error: null, data: cachedRows.theories }, unavailable, unavailable, unavailable);
  hydrateContentAccessScope({ techniques: cachedRows.techniques as any, theories: cachedRows.theories.filter(row => !row.canonical_id || row.canonical_id === row.id) as any });
}
