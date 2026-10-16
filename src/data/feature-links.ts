import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';
import type { FeatureArticle } from './features';

export type FeatureLink = Pick<FeatureArticle, 'id' | 'slug' | 'title' | 'display_order' | 'related_technique_ids' | 'related_theory_ids' | 'related_feature_ids'>;
const EMPTY: FeatureLink[] = [];
let snapshot = EMPTY;
let loadedAt = 0;
let attemptedAt = 0;
let pending: Promise<void> | null = null;
let revision = 0;
const listeners = new Set<() => void>();
const MAX_AGE = 60_000;
export const FEATURE_LINK_COLUMNS = 'id,slug,title,display_order,related_technique_ids,related_theory_ids,related_feature_ids,status,show_in_list';

// Share only navigation metadata. Browsing a knowledge card must not fetch
// every article body or retain unpublished CMS rows in this store.
export function setFeatureLinks(articles: Array<FeatureLink & Pick<FeatureArticle, 'status' | 'show_in_list'>>) {
  revision++;
  snapshot = articles.filter(a => a.status === 'published' && a.show_in_list).map(a => ({
    id: a.id, slug: a.slug, title: a.title, display_order: a.display_order,
    related_technique_ids: Array.isArray(a.related_technique_ids) ? a.related_technique_ids : [],
    related_theory_ids: Array.isArray(a.related_theory_ids) ? a.related_theory_ids : [],
    related_feature_ids: Array.isArray(a.related_feature_ids) ? a.related_feature_ids : [],
  })).sort((a,b) => a.display_order-b.display_order || a.id.localeCompare(b.id));
  loadedAt = Date.now();
  listeners.forEach(listener => listener());
}

export async function refreshFeatureLinks() {
  if (pending) return pending;
  if (!supabase || Date.now()-attemptedAt < MAX_AGE) return;
  attemptedAt = Date.now();
  const requestRevision = revision;
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const { data, error } = await supabase!.from('feature_articles').select(FEATURE_LINK_COLUMNS)
        .eq('status', 'published').eq('show_in_list', true).order('display_order').order('id').abortSignal(controller.signal);
      if (!error && revision === requestRevision) setFeatureLinks((data ?? []) as Array<FeatureLink & Pick<FeatureArticle, 'status' | 'show_in_list'>>);
    } catch { /* Navigation remains available without a network connection. */ }
    finally { clearTimeout(timeout); }
  })();
  pending = request;
  try { await request; } finally { if (pending === request) pending = null; }
}

export function relatedFeatureLinks(rows: FeatureLink[], kind: 'technique' | 'theory', id: string) {
  return rows.filter(row => (kind === 'technique' ? row.related_technique_ids : row.related_theory_ids).includes(id));
}
export function useFeatureLinks(contentId?: string) {
  const rows = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => snapshot, () => EMPTY);
  useEffect(() => { if (Date.now()-loadedAt >= MAX_AGE) void refreshFeatureLinks(); }, [contentId]);
  return rows;
}
