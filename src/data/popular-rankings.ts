import { supabase } from '@/lib/supabase';
import defaults from './generated/popular-rankings.json';

export type RankingDivision = 'technique' | 'theory';
export type RankedContent = { division: RankingDivision; content_id: string; rank: number; title: string; category_id: string; category_title: string; access_tier: string };
export type RankingConfig = { division: RankingDivision; content_ids: string[]; updated_at: string };
export type RankingCandidate = { id: string; title: string; category: string };
export const DEFAULT_RANKINGS = defaults as RankedContent[];

export async function fetchPopularRankings(): Promise<RankedContent[]> {
  if (!supabase) return DEFAULT_RANKINGS;
  const { data, error } = await supabase.rpc('get_popular_rankings');
  if (error) throw error;
  return (data ?? []) as RankedContent[];
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
  return (Array.isArray(data) ? data[0] : data) as RankingConfig;
}
