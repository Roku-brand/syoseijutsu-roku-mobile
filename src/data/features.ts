import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/lib/supabase';
import { featureCategoryId, type FeatureCategoryId } from './feature-categories';
import { featureReferences, type FeatureReference } from './feature-editorial';

export type FeatureArticle = {
  id: string;
  slug: string;
  title: string;
  lead: string;
  body: string;
  category_id: FeatureCategoryId | null;
  editorial_character_id: string | null;
  related_feature_ids: string[];
  source_references: FeatureReference[];
  image_path: string | null;
  image_alt: string;
  is_featured: boolean;
  show_in_list: boolean;
  display_order: number;
  related_technique_ids: string[];
  related_theory_ids: string[];
  status: 'draft' | 'published' | 'archived';
  updated_at: string;
};
export type FeaturePayload = Omit<FeatureArticle, 'id' | 'status' | 'updated_at'>;
export type FeatureDraft = { article_id: string; payload: FeaturePayload; base_updated_at: string; revision: number };
export const INITIAL_FEATURE_SLUGS = ['five-guidelines', 'mastering-tilt', 'meta-comments', 'passion-and-cynicism'];

type Snapshot = { articles: FeatureArticle[]; loading: boolean; error: string };
const serverSnapshot: Snapshot = { articles: [], loading: true, error: '' };
let snapshot = serverSnapshot;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
export async function refreshFeatures() {
  if (inflight) return inflight;
  inflight = Promise.resolve().then(async () => {
    try {
      if (!supabase) throw new Error('記事を読み込めませんでした。通信環境をご確認ください。');
      const { data, error } = await supabase.from('feature_articles').select('*').eq('status', 'published').order('display_order').order('id');
      if (error) throw error;
      snapshot = { articles: ((data ?? []) as FeatureArticle[]).map(normalizeFeature), loading: false, error: '' };
    } catch {
      snapshot = { ...snapshot, loading: false, error: '記事を読み込めませんでした。もう一度お試しください。' };
    } finally { inflight = null; notify(); }
  });
  return inflight;
}
export function useFeatures(enabled = true) {
  const result = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => snapshot, () => serverSnapshot);
  useEffect(() => { if (enabled) void refreshFeatures(); }, [enabled]);
  return result;
}
export async function fetchFeatureEditor() {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const [articles, drafts] = await Promise.all([
    supabase.from('feature_articles').select('*').order('display_order').order('id'),
    supabase.from('feature_article_drafts').select('article_id,payload,base_updated_at,revision'),
  ]);
  if (articles.error) throw articles.error;
  if (drafts.error) throw drafts.error;
  const rows = ((articles.data ?? []) as FeatureArticle[]).map(normalizeFeature);
  const changes = ((drafts.data ?? []) as FeatureDraft[]).map(draft => ({ ...draft, payload: {
    ...draft.payload,
    category_id: Object.prototype.hasOwnProperty.call(draft.payload, 'category_id') ? featureCategoryId(draft.payload.category_id) : rows.find(article => article.id === draft.article_id)?.category_id ?? null,
    editorial_character_id: Object.prototype.hasOwnProperty.call(draft.payload, 'editorial_character_id') ? draft.payload.editorial_character_id : rows.find(article => article.id === draft.article_id)?.editorial_character_id ?? null,
    related_feature_ids: Array.isArray(draft.payload.related_feature_ids) ? draft.payload.related_feature_ids : rows.find(article => article.id === draft.article_id)?.related_feature_ids ?? [],
    source_references: featureReferences(draft.payload.source_references ?? rows.find(article => article.id === draft.article_id)?.source_references),
  } }));
  return { articles: rows, drafts: changes };
}
function normalizeFeature(article: FeatureArticle): FeatureArticle { return { ...article, category_id: featureCategoryId(article.category_id), editorial_character_id: typeof article.editorial_character_id === 'string' ? article.editorial_character_id : null, related_feature_ids: Array.isArray(article.related_feature_ids) ? article.related_feature_ids : [], source_references: featureReferences(article.source_references) }; }
export function featurePayload(article: FeatureArticle): FeaturePayload {
  const { slug, title, lead, body, category_id, image_path, image_alt, is_featured, show_in_list, display_order, related_technique_ids, related_theory_ids } = article;
  return { slug, title, lead, body, category_id: featureCategoryId(category_id), editorial_character_id: article.editorial_character_id ?? null, related_feature_ids: article.related_feature_ids ?? [], source_references: featureReferences(article.source_references), image_path, image_alt, is_featured, show_in_list, display_order, related_technique_ids, related_theory_ids };
}
export function blankFeature(): FeaturePayload {
  return { slug: '', title: '', lead: '', body: '', category_id: null, editorial_character_id: null, related_feature_ids: [], source_references: [], image_path: 'bundled:feature-coast', image_alt: '', is_featured: false, show_in_list: true, display_order: 100, related_technique_ids: [], related_theory_ids: [] };
}
export async function saveFeatureDraft(id: string | null, payload: FeaturePayload, baseUpdatedAt: string | null, expectedRevision: number | null) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { data, error } = await supabase.rpc('save_feature_article_draft', { target_id: id, content: payload, expected_updated_at: baseUpdatedAt, expected_revision: expectedRevision });
  if (error) throw error;
  return data as { id: string; revision: number; base_updated_at: string };
}
export async function publishFeature(id: string, revision: number) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { error } = await supabase.rpc('publish_feature_article', { target_id: id, expected_revision: revision });
  if (error) throw error;
  await refreshFeatures();
}
export async function archiveFeature(article: FeatureArticle) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { error } = await supabase.rpc('archive_feature_article', { target_id: article.id, expected_updated_at: article.updated_at });
  if (error) throw error;
  await refreshFeatures();
}
export async function deleteFeature(article: FeatureArticle, expectedRevision: number | null) {
  if (!supabase) throw new Error('Supabaseが未設定です。');
  const { error } = await supabase.rpc('delete_feature_article', { target_id: article.id, expected_updated_at: article.updated_at, expected_revision: expectedRevision });
  if (error) throw error;
  await refreshFeatures();
}
export function featureCharacterCount(body: string) { return Array.from(body.replace(/^#{1,6}\s+/gm, '').replace(/\*\*/g, '').replace(/\s/g, '')).length; }
