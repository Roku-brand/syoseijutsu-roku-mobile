import publicRelations from '@/data/generated/theory-relations.public.json';
import { isRetiredTheoryId } from '@/data/theory-knowledge';
import type { TheoryRelation } from '@/data/types';
import { supabase } from './supabase';

export function bundledTheoryRelations(id: string): TheoryRelation[] {
  return (publicRelations as TheoryRelation[]).filter(r => (r.sourceId === id || r.targetId === id) && !isRetiredTheoryId(r.sourceId) && !isRetiredTheoryId(r.targetId));
}
/** One detail at a time. Protected relationships are never written to the public/offline cache. */
export async function fetchTheoryRelations(id: string): Promise<TheoryRelation[]> {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return [];
  if (!supabase || isRetiredTheoryId(id)) return bundledTheoryRelations(id);
  const { data, error } = await supabase.from('theory_relations').select('source_id,target_id,relation_type,review_status,rationale,priority')
    .or(`source_id.eq.${id},target_id.eq.${id}`).order('priority').order('source_id').order('target_id').limit(100);
  if (error) throw error;
  return (data ?? []).map(r => ({ sourceId: r.source_id, targetId: r.target_id, type: r.relation_type, reviewStatus: r.review_status, rationale: r.rationale, priority: r.priority }));
}
