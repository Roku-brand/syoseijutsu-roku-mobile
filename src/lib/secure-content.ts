import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydratePaidCatalog, resetCatalog, type PaidTechniquePayload } from '@/data/catalog';
import { learningCases, replaceLearningCases, resetLearningCases, type LearningCase } from '@/data/learning';
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
const STORAGE_TIMEOUT_MS = 2_000;
const PAID_CONTENT_CACHE_KEY = '@shoseijutsu-roku/paid-content/v6';

type PaidContentSnapshot = {
  version: 6;
  userId: string;
  savedAt: string;
  techniques: PaidTechniquePayload[];
  theories: TheoryCard[];
  learning: LearningCase[];
};

function settleWithin<T>(promise: Promise<T>, timeoutMs = STORAGE_TIMEOUT_MS): Promise<T | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), timeoutMs);
    promise.then((value) => {
      clearTimeout(timeout);
      resolve(value);
    }).catch(() => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

function applyPaidContent(techniques: PaidTechniquePayload[], theories: TheoryCard[], paidLearning: LearningCase[]) {
  hydratePaidCatalog(techniques, theories);
  resetLearningCases();
  const merged = [...learningCases];
  for (const item of paidLearning) {
    if (!merged.some((candidate) => candidate.id === item.id)) merged.push(item);
  }
  merged.sort((a, b) => a.number - b.number);
  replaceLearningCases(merged);
}

function isSnapshot(value: unknown): value is PaidContentSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<PaidContentSnapshot>;
  return snapshot.version === 6
    && typeof snapshot.userId === 'string'
    && Array.isArray(snapshot.techniques)
    && Array.isArray(snapshot.theories)
    && Array.isArray(snapshot.learning);
}

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
    const techniques = techniqueRows.map((row) => row.payload);
    const theories = theoryRows.map((row) => row.payload);
    const paidLearning = learningRows.map((row) => row.payload);
    if (techniques.length === 0 || theories.length === 0 || paidLearning.length === 0) {
      throw new Error('完全版データが不足しているため、端末への保存を中止しました。');
    }
    applyPaidContent(techniques, theories, paidLearning);
    hydratedUserId = userId;
    const snapshot: PaidContentSnapshot = {
      version: 6,
      userId,
      savedAt: new Date().toISOString(),
      techniques,
      theories,
      learning: paidLearning,
    };
    await settleWithin(AsyncStorage.setItem(PAID_CONTENT_CACHE_KEY, JSON.stringify(snapshot)));
  })().finally(() => {
    hydrationPromise = null;
  });

  return hydrationPromise;
}

/** Restores the last server-verified paid catalogue without requiring a network request. */
export async function restoreCachedSecureContent(expectedUserId: string): Promise<boolean> {
  const stored = await settleWithin(AsyncStorage.getItem(PAID_CONTENT_CACHE_KEY));
  if (!stored) return false;
  try {
    const snapshot: unknown = JSON.parse(stored);
    if (!isSnapshot(snapshot) || snapshot.userId !== expectedUserId) return false;
    applyPaidContent(snapshot.techniques, snapshot.theories, snapshot.learning);
    hydratedUserId = snapshot.userId;
    return true;
  } catch {
    return false;
  }
}

export async function clearSecureContentCache() {
  await settleWithin(AsyncStorage.removeItem(PAID_CONTENT_CACHE_KEY));
}

export function purgeSecureContent() {
  hydratedUserId = null;
  hydrationPromise = null;
  resetCatalog();
  resetLearningCases();
}
