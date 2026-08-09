import { hydratePaidCatalog, resetCatalog, type PaidTechniquePayload } from '@/data/catalog';
import { replaceLearningCases, resetLearningCases, type LearningCase } from '@/data/learning';
import type { TheoryCard } from '@/data/types';
import { supabase, supabasePublishableKey, supabaseUrl } from './supabase';

type PaidContentType = 'technique' | 'theory' | 'learning';
type PaidContentRow<T> = {
  content_type: PaidContentType;
  content_id: string;
  payload: T;
  sort_order: number;
  updated_at: string;
};

let hydratedUserId: string | null = null;
let hydrationPromise: Promise<void> | null = null;
const PAID_CONTENT_TIMEOUT_MS = 20_000;

async function fetchRows<T>(type: PaidContentType): Promise<PaidContentRow<T>[]> {
  if (!supabase || !supabaseUrl || !supabasePublishableKey) {
    throw new Error('Supabase is not configured.');
  }
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error('Authentication is required.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAID_CONTENT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/paid-content?type=${encodeURIComponent(type)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabasePublishableKey,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('完全版データの取得がタイムアウトしました。');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) throw new Error(`Paid content request failed: ${response.status}`);
  const body = await response.json();
  return Array.isArray(body?.items) ? body.items : [];
}

export async function hydrateSecureContent() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id ?? null;
  if (!userId) {
    purgeSecureContent();
    return;
  }
  if (hydratedUserId === userId) return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    const [techniqueRows, theoryRows, learningRows] = await Promise.all([
      fetchRows<PaidTechniquePayload>('technique'),
      fetchRows<TheoryCard>('theory'),
      fetchRows<LearningCase>('learning'),
    ]);
    hydratePaidCatalog(
      techniqueRows.map((row) => row.payload),
      theoryRows.map((row) => row.payload),
    );
    const paidLearning = learningRows.map((row) => row.payload);
    if (paidLearning.length > 0) {
      const currentFree = (await import('@/data/learning')).learningCases;
      const merged = [...currentFree];
      for (const item of paidLearning) {
        if (!merged.some((candidate) => candidate.id === item.id)) merged.push(item);
      }
      merged.sort((a, b) => a.number - b.number);
      replaceLearningCases(merged);
    }
    hydratedUserId = userId;
  })().finally(() => {
    hydrationPromise = null;
  });

  return hydrationPromise;
}

export function purgeSecureContent() {
  hydratedUserId = null;
  hydrationPromise = null;
  resetCatalog();
  resetLearningCases();
}
