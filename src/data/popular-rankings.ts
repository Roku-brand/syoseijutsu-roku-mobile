import { supabase } from '@/lib/supabase';
import defaults from './generated/popular-rankings.json';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createResourceCache } from '../lib/resource-cache';

export type RankingDivision = 'technique' | 'theory';
export type RankedContent = { division: RankingDivision; content_id: string; rank: number; title: string; category_id: string; category_title: string; access_tier: string };
export type RankingConfig = { division: RankingDivision; content_ids: string[]; updated_at: string };
export type RankingCandidate = { id: string; title: string; category: string };
export const DEFAULT_RANKINGS = defaults as RankedContent[];

const rankingCache = createResourceCache<RankedContent[]>({
  key: '@shoseijutsu-roku/popular-rankings/v1', maxAgeMs: 30 * 60 * 1000, storage: AsyncStorage,
  validate: (value): value is RankedContent[] => Array.isArray(value) && value.every((item) => typeof item?.content_id === 'string' && ['technique', 'theory'].includes(item.division)),
  fetch: async () => {
    if (!supabase) return DEFAULT_RANKINGS;
    const { data, error } = await supabase.rpc('get_popular_rankings');
    if (error) throw error;
    return (data ?? []) as RankedContent[];
  },
});

export async function fetchPopularRankings(): Promise<RankedContent[]> {
  return rankingCache.get();
}

export async function fetchRankingEditor() {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const [config, candidates] = await Promise.all([
    supabase.from('popular_rankings').select('division,content_ids,updated_at').order('division'),
    supabase.rpc('get_ranking_candidates'),
  ]);
  if (config.error) throw config.error;
  if (candidates.error) throw candidates.error;
  return { configs: config.data as RankingConfig[], candidates: candidates.data as (RankingCandidate & { division: RankingDivision })[] };
}

export async function publishRanking(config: RankingConfig): Promise<RankingConfig> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.rpc('publish_popular_ranking', {
    target_division: config.division, ordered_ids: config.content_ids, expected_updated_at: config.updated_at,
  });
  if (error) throw error;
  rankingCache.invalidate();
  // Replace the persisted response too, so a reload after publishing cannot
  // restore the previous order. The publish remains successful if this fails.
  await rankingCache.get(true).catch(() => undefined);
  return (Array.isArray(data) ? data[0] : data) as RankingConfig;
}
