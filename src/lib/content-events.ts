import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { isUsageSharingEnabled } from './usage-consent';

export type ContentType = 'technique' | 'theory';
export type TrendingContent = { contentType: ContentType; contentId: string; score: number };

const ACTOR_KEY = '@shoseijutsu-roku/analytics-actor/v1';
const TRENDING_CACHE_KEY = '@shoseijutsu-roku/trending/v1';
const TRENDING_CACHE_MS = 30 * 60 * 1000;


function createActorId() {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  return `anon-${random}`;
}

async function getActorId() {
 const stored = await AsyncStorage.getItem(ACTOR_KEY);
 if (stored && stored.length >= 12) return stored;
 const next = createActorId();
 await AsyncStorage.setItem(ACTOR_KEY, next);
 return next;
}

export async function recordContentEvent(contentType: ContentType, contentId: string, eventType: 'view' | 'save') {
  if (!supabase || !contentId || !(await isUsageSharingEnabled())) return;
  const actor = await getActorId();
  if (!(await isUsageSharingEnabled())) { await AsyncStorage.removeItem(ACTOR_KEY); return; }
  await supabase.rpc('record_content_event', {
    p_anonymous_session_id: actor,
    p_content_type: contentType,
    p_content_id: contentId,
    p_event_type: eventType,
  });
}

export async function loadTrendingContent(limit = 12): Promise<TrendingContent[] | null> {
  let cachedItems: TrendingContent[] | null = null;
  try {
    const cached = await AsyncStorage.getItem(TRENDING_CACHE_KEY);
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
    await AsyncStorage.setItem(TRENDING_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), items }));
  } catch {
    // The fresh response is still usable when persistence is unavailable.
  }
  return items;
}
