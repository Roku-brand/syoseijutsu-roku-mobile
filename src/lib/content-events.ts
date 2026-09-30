import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { createEventDeduplicator } from './event-deduplication';

export type ContentType = 'technique' | 'theory';
export type TrendingContent = { contentType: ContentType; contentId: string; score: number };

const ACTOR_KEY = '@shoseijutsu-roku/analytics-actor/v1';
const TRENDING_CACHE_KEY = '@shoseijutsu-roku/trending/v2';
const TRENDING_CACHE_MS = 30 * 60 * 1000;
let actorPromise: Promise<string> | null = null;
const trendingRequests = new Map<number, Promise<TrendingContent[] | null>>();

function createActorId() {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `anon-${random}`;
}

async function getActorId() {
  if (actorPromise) return actorPromise;
  actorPromise = (async () => {
    const stored = await AsyncStorage.getItem(ACTOR_KEY);
    if (stored && stored.length >= 12) return stored;
    const next = createActorId();
    await AsyncStorage.setItem(ACTOR_KEY, next);
    return next;
  })();
  return actorPromise;
}

const sendEvent = createEventDeduplicator(async (key) => {
  if (!supabase) return;
  const [actor, contentType, contentId, eventType] = JSON.parse(key) as string[];
  const { error } = await supabase.rpc('record_content_event', {
    p_anonymous_session_id: actor, p_content_type: contentType, p_content_id: contentId, p_event_type: eventType,
  });
  if (error) throw error;
});

export async function recordContentEvent(contentType: ContentType, contentId: string, eventType: 'view' | 'save') {
  if (!supabase || !contentId) return;
  try {
    const actor = await getActorId();
    await sendEvent(JSON.stringify([actor, contentType, contentId, eventType]), eventType);
  } catch { /* Analytics must never interrupt reading or saving. Failed events can retry. */ }
}

export async function loadTrendingContent(limit = 12): Promise<TrendingContent[] | null> {
  const size = Number.isFinite(limit) ? Math.max(1, Math.min(40, Math.floor(limit))) : 12;
  const pending = trendingRequests.get(size);
  if (pending) return pending;
  const request = fetchTrendingContent(size);
  trendingRequests.set(size, request);
  try { return await request; }
  finally { if (trendingRequests.get(size) === request) trendingRequests.delete(size); }
}

async function fetchTrendingContent(limit: number): Promise<TrendingContent[] | null> {
  const cacheKey = `${TRENDING_CACHE_KEY}/${limit}`;
  let cachedItems: TrendingContent[] | null = null;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as { fetchedAt?: number; items?: TrendingContent[] };
      if (Array.isArray(parsed.items)) cachedItems = parsed.items;
      if (parsed.fetchedAt && Date.now() - parsed.fetchedAt < TRENDING_CACHE_MS && Array.isArray(parsed.items)) {
        return parsed.items;
      }
    }
  } catch {
    // A failed local cache must never block the home screen.
  }

  if (!supabase) return cachedItems;

  const { data, error } = await supabase.rpc('get_trending_content', { p_limit: limit });
  if (error || !Array.isArray(data)) return cachedItems;
  const items = data
    .map((item): TrendingContent | null => {
      const contentType = item.content_type === 'technique' || item.content_type === 'theory' ? item.content_type : null;
      return contentType && typeof item.content_id === 'string'
        ? { contentType, contentId: item.content_id, score: Number(item.score) || 0 }
        : null;
    })
    .filter((item): item is TrendingContent => item !== null);
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ fetchedAt: Date.now(), items }));
  } catch {
    // The fresh response is still usable when persistence is unavailable.
  }
  return items;
}
