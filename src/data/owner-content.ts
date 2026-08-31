import { techniqueCards } from '@/data/catalog';
import type { CategoryKey, TechniquePracticalActions } from '@/data/types';
import { supabase } from '@/lib/supabase';

export type TechniqueContent = {
  id: string;
  persona_id: string;
  category: CategoryKey;
  title: string;
  essence: string;
  explanation: string;
  memo: string;
  importance: 1 | 2 | 3;
  practices: string[];
  examples: string[];
  cautions: string[];
  theory_ids: string[];
  status: 'published' | 'draft';
  display_order: number;
  updated_at: string;
};

export type TechniqueDraft = {
  technique_id: string;
  snapshot: TechniqueSnapshot;
  base_updated_at: string | null;
  updated_at: string;
};

export type TechniqueSnapshot = Pick<TechniqueContent, 'persona_id' | 'category' | 'title' | 'essence' | 'explanation' | 'memo' | 'importance' | 'practices' | 'examples' | 'cautions' | 'theory_ids'>;

export type TechniqueRevision = {
  revision_id: string;
  technique_id: string;
  snapshot: TechniqueSnapshot & Record<string, unknown>;
  version: number;
  created_at: string;
};

export type TechniqueChangeLog = {
  log_id: string;
  technique_id: string;
  event_type: 'draft_saved' | 'published';
  snapshot: TechniqueSnapshot & Record<string, unknown>;
  created_at: string;
};

export function snapshotFromTechnique(technique: TechniqueContent): TechniqueSnapshot {
  return {
    persona_id: technique.persona_id,
    category: technique.category,
    title: technique.title,
    essence: technique.essence ?? '',
    explanation: technique.explanation ?? '',
    memo: technique.memo ?? '',
    importance: normalizeImportance(technique.importance),
    practices: normalizeList(technique.practices),
    examples: normalizeList(technique.examples),
    cautions: normalizeList(technique.cautions),
    theory_ids: normalizeList(technique.theory_ids),
  };
}

export function normalizeSnapshot(value: Partial<TechniqueSnapshot>): TechniqueSnapshot {
  const raw = value as Partial<TechniqueSnapshot> & { relatedTheoryIds?: unknown };
  return {
    persona_id: value.persona_id ?? '',
    category: value.category ?? 'interpersonal',
    title: value.title ?? '',
    essence: value.essence ?? '',
    explanation: value.explanation ?? '',
    memo: value.memo ?? '',
    importance: normalizeImportance(value.importance),
    practices: normalizeList(value.practices),
    examples: normalizeList(value.examples),
    cautions: normalizeList(value.cautions),
    // Older drafts/revisions used the catalogue-facing name. Accept both so
    // every historical entry keeps its related-theory links when displayed.
    theory_ids: normalizeList(raw.theory_ids ?? raw.relatedTheoryIds),
  };
}

function normalizeImportance(value: unknown): 1 | 2 | 3 {
  return value === 3 ? 3 : value === 2 ? 2 : 1;
}

function normalizeList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function toTechniqueContent(row: Record<string, unknown>): TechniqueContent {
  const snapshot = normalizeSnapshot(row as Partial<TechniqueSnapshot>);
  return {
    ...snapshot,
    id: String(row.id ?? ''),
    status: row.status === 'draft' ? 'draft' : 'published',
    display_order: typeof row.display_order === 'number' ? row.display_order : 0,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date(0).toISOString(),
  };
}

export async function fetchOwnerTechniques(): Promise<TechniqueContent[]> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.from('techniques').select('*').order('display_order').order('id');
  if (error) throw error;
  return (data ?? []).map((row) => toTechniqueContent(row as Record<string, unknown>));
}

/**
 * Bootstrap the owner-managed table from the bundled catalogue once.
 * This uses the signed-in owner session, so no service-role key is exposed
 * in the web app. RLS remains the authority for this operation.
 */
export async function seedOwnerTechniquesIfEmpty(): Promise<number> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: existing, error: existingError } = await supabase.from('techniques').select('id').limit(1);
  if (existingError) throw existingError;
  if (existing?.length) return 0;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('ログインが必要です。');

  const rows = techniqueCards.map((item, index) => ({
    id: item.id,
    persona_id: item.subcategory,
    category: item.categoryKey,
    title: item.title ?? '',
    essence: item.essence ?? item.subtitle ?? '',
    explanation: item.explanation ?? '',
    memo: '',
    importance: item.importance === 3 ? 3 : item.importance === 2 ? 2 : 1,
    practices: item.practicalActions?.todayActions ?? [],
    examples: item.practicalActions?.examples ?? [],
    cautions: item.practicalActions?.cautions ?? [],
    theory_ids: item.relatedTheoryIds ?? item.theoryTagIds ?? [],
    status: 'published' as const,
    display_order: item.displayOrder ?? index + 1,
    updated_by: userId,
  }));

  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await supabase.from('techniques').upsert(rows.slice(index, index + 100), { onConflict: 'id' });
    if (error) throw error;
  }
  return rows.length;
}

export async function fetchOwnerDrafts(): Promise<TechniqueDraft[]> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.from('technique_drafts').select('technique_id,snapshot,base_updated_at,updated_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    technique_id: row.technique_id as string,
    snapshot: normalizeSnapshot((row.snapshot ?? {}) as Partial<TechniqueSnapshot>),
    base_updated_at: row.base_updated_at as string | null,
    updated_at: row.updated_at as string,
  }));
}

export async function saveTechniqueDraft(techniqueId: string, snapshot: TechniqueSnapshot, baseUpdatedAt: string | null) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error('ログインが必要です。');
  const { error } = await supabase.from('technique_drafts').upsert({
    technique_id: techniqueId,
    snapshot: normalizeSnapshot(snapshot),
    base_updated_at: baseUpdatedAt,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'technique_id' });
  if (error) throw error;
}

export async function publishTechnique(techniqueId: string, expectedUpdatedAt: string | null) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.rpc('publish_technique', {
    target_technique_id: techniqueId,
    expected_updated_at: expectedUpdatedAt,
  });
  if (error) throw error;
  return toTechniqueContent(asTechniqueRow(data));
}

/** Publishes the current editor state in one database transaction. */
export async function saveAndPublishTechnique(techniqueId: string, snapshot: TechniqueSnapshot, expectedUpdatedAt: string | null) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.rpc('save_and_publish_technique', {
    target_technique_id: techniqueId,
    target_snapshot: normalizeSnapshot(snapshot),
    expected_updated_at: expectedUpdatedAt,
  });
  if (error) throw error;
  return toTechniqueContent(asTechniqueRow(data));
}

function asTechniqueRow(data: unknown): Record<string, unknown> {
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === 'object' ? row as Record<string, unknown> : {};
}

export async function fetchTechniqueRevisions(techniqueId: string): Promise<TechniqueRevision[]> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.from('technique_revisions').select('revision_id,technique_id,snapshot,version,created_at').eq('technique_id', techniqueId).order('version', { ascending: false }).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    revision_id: row.revision_id as string,
    technique_id: row.technique_id as string,
    snapshot: { ...normalizeSnapshot((row.snapshot ?? {}) as Partial<TechniqueSnapshot>) },
    version: row.version as number,
    created_at: row.created_at as string,
  }));
}

export async function fetchTechniqueChangeLogs(techniqueId: string): Promise<TechniqueChangeLog[]> {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.from('technique_change_log').select('log_id,technique_id,event_type,snapshot,created_at').eq('technique_id', techniqueId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    log_id: row.log_id as string,
    technique_id: row.technique_id as string,
    event_type: row.event_type === 'published' ? 'published' : 'draft_saved',
    snapshot: normalizeSnapshot((row.snapshot ?? {}) as Partial<TechniqueSnapshot>) as TechniqueSnapshot & Record<string, unknown>,
    created_at: row.created_at as string,
  }));
}

export async function restoreTechniqueRevision(revisionId: string) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { error } = await supabase.rpc('restore_technique_revision', { target_revision_id: revisionId });
  if (error) throw error;
}

export function toTechniquePayload(technique: TechniqueContent) {
  const actions: TechniquePracticalActions = {
    todayActions: technique.practices,
    examples: technique.examples,
    cautions: technique.cautions,
  };
  return {
    id: technique.id,
    title: technique.title,
    essence: technique.essence,
    explanation: technique.explanation,
    memo: technique.memo,
    importance: technique.importance,
    relatedTheoryIds: technique.theory_ids,
    categoryKey: technique.category,
    categoryName: technique.category,
    subcategory: technique.persona_id,
    articleTitle: technique.persona_id,
    practicalActions: actions,
    status: technique.status,
    displayOrder: technique.display_order,
  };
}
