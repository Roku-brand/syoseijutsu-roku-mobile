import { supabase } from '@/lib/supabase';
import defaults from './generated/popular-rankings.json';

export type RankingDivision = 'technique' | 'theory';
export type RankedContent = { division: RankingDivision; content_id: string; rank: number; title: string; category_id: string; category_title: string; access_tier: string };
export type RankingConfig = { division: RankingDivision; content_ids: string[]; updated_at: string };
export type RankingCandidate = { id: string; title: string; category: string };
export const DEFAULT_RANKINGS = defaults as RankedContent[];

async function fetchRankingCandidates() {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const rows: (RankingCandidate & { division: RankingDivision })[] = [];
  const pageSize = 500;
  // PostgREST caps a response at 1,000 rows. Fetch every page in a stable
  // order so published entries near the end aren't mistaken for missing ones.
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.rpc('get_ranking_candidates')
      .order('division').order('id').range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

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
    fetchRankingCandidates(),
  ]);
  if (config.error) throw config.error;
  return { configs: config.data as RankingConfig[], candidates };
}

export async function publishRanking(config: RankingConfig): Promise<RankingConfig> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.rpc('publish_popular_ranking', {
    target_division: config.division, ordered_ids: config.content_ids, expected_updated_at: config.updated_at,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as RankingConfig;
}
