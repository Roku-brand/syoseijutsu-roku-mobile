import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydratePaidTheories, overlayPaidCatalog, resetCatalog, type PaidTechniquePayload } from '@/data/catalog';
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
let completeHydration = false;
let hydrationPromise: Promise<void> | null = null;
let refreshPromise: Promise<boolean> | null = null;
let secureGeneration = 0;
const PAID_CONTENT_TIMEOUT_MS = 30_000;
const STORAGE_TIMEOUT_MS = 2_000;
const PAID_CONTENT_CACHE_KEY = '@shoseijutsu-roku/paid-content/v11';

type PaidContentSnapshot = {
  version: 9;
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
  overlayPaidCatalog(techniques, theories);
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
  return snapshot.version === 9
    && typeof snapshot.userId === 'string'
    && Array.isArray(snapshot.techniques)
    && Array.isArray(snapshot.theories)
    && Array.isArray(snapshot.learning);
}

function within<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then((value) => {
      clearTimeout(timeout);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

async function fetchRows<T>(type: PaidContentType): Promise<PaidContentRow<T>[]> {
  if (!supabase || !supabaseUrl || !supabasePublishableKey) throw new Error('Supabase is not configured.');
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) throw new Error('Authentication is required.');
  const response = await within(
    fetch(`${supabaseUrl}/functions/v1/paid-content?type=${encodeURIComponent(type)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: supabasePublishableKey },
    }),
    PAID_CONTENT_TIMEOUT_MS,
    '完全版データの取得がタイムアウトしました。',
  );
  if (!response.ok) throw new Error(`Paid content request failed: ${response.status}`);
  const body = await response.json();
  return Array.isArray(body?.items) ? body.items as PaidContentRow<T>[] : [];
}

export async function hydrateSecureContent(onContentApplied?: () => void) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id ?? null;
  if (!userId) {
    purgeSecureContent();
    return;
  }
  if (hasHydratedSecureContent(userId)) return;
  if (hydrationPromise) return hydrationPromise;

  const generation = secureGeneration;
  const request = (async () => {
    // Theory metadata is the first complete-edition surface to render. Keep
    // it independent from the much larger technique and learning payloads.
    const theoryRows = await fetchRows<TheoryCard>('theory');
    const theories = theoryRows.map((row) => row.payload);
    if (!theories.length) {
      throw new Error('完全版データが不足しているため、端末への保存を中止しました。');
    }
    if (generation !== secureGeneration) return;
    hydratePaidTheories(theories);
    hydratedUserId = userId;
    completeHydration = false;
    onContentApplied?.();
    await hydrateRemainingContent(userId, theories, onContentApplied, generation);
  })();
  hydrationPromise = request;
  try { await request; }
  finally { if (hydrationPromise === request) hydrationPromise = null; }
}

/** Refetches the signed-in user's catalogue without discarding readable offline data. */
export async function refreshSecureContent(onContentApplied?: () => void): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  const request = refetchSecureContent(onContentApplied);
  refreshPromise = request;
  try { return await request; }
  finally { if (refreshPromise === request) refreshPromise = null; }
}

async function refetchSecureContent(onContentApplied?: () => void): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId || hydratedUserId !== userId) return false;
  const generation = secureGeneration;
  if (hydrationPromise) await hydrationPromise.catch(() => undefined);
  if (generation !== secureGeneration || hydratedUserId !== userId) return false;
  try {
    const [techniqueRows, theoryRows, learningRows] = await Promise.all([
      fetchRows<PaidTechniquePayload>('technique'),
      fetchRows<TheoryCard>('theory'),
      fetchRows<LearningCase>('learning'),
    ]);
    if (generation !== secureGeneration || !theoryRows.length || !techniqueRows.length || !learningRows.length) return false;
    const techniques = techniqueRows.map((row) => row.payload);
    const theories = theoryRows.map((row) => row.payload);
    const learning = learningRows.map((row) => row.payload);
    applyPaidContent(techniques, theories, learning);
    hydratedUserId = userId;
    completeHydration = true;
    onContentApplied?.();
    const snapshot: PaidContentSnapshot = { version: 9, userId, savedAt: new Date().toISOString(), techniques, theories, learning };
    await settleWithin(AsyncStorage.setItem(PAID_CONTENT_CACHE_KEY, JSON.stringify(snapshot)));
    return true;
  } catch {
    return false;
  }
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
    completeHydration = true;
    return true;
  } catch {
    return false;
  }
}

export async function clearSecureContentCache() {
  await settleWithin(AsyncStorage.removeItem(PAID_CONTENT_CACHE_KEY));
}

async function hydrateRemainingContent(userId: string, theories: TheoryCard[], onContentApplied?: () => void, generation = secureGeneration) {
  const [techniquesResult, learningResult] = await Promise.allSettled([
    fetchRows<PaidTechniquePayload>('technique'),
    fetchRows<LearningCase>('learning'),
  ]);
  if (hydratedUserId !== userId || generation !== secureGeneration) return;
  if (techniquesResult.status !== 'fulfilled' || learningResult.status !== 'fulfilled') throw new Error('完全版データを取得できませんでした。');
  const techniques = techniquesResult.value.map((row) => row.payload);
  const learning = learningResult.value.map((row) => row.payload);
  if (!techniques.length || !learning.length) throw new Error('完全版データが不足しています。');
  applyPaidContent(techniques, theories, learning);
  completeHydration = true;
  onContentApplied?.();
  if (generation !== secureGeneration) return;
  const snapshot: PaidContentSnapshot = { version: 9, userId, savedAt: new Date().toISOString(), techniques, theories, learning };
  await settleWithin(AsyncStorage.setItem(PAID_CONTENT_CACHE_KEY, JSON.stringify(snapshot)));
}

/** Whether the in-memory catalogue belongs to the currently verified user. */
export function hasHydratedSecureContent(userId: string | null | undefined): boolean {
  return Boolean(userId) && hydratedUserId === userId && completeHydration;
}

export function purgeSecureContent() {
  secureGeneration += 1;
  hydratedUserId = null;
  completeHydration = false;
  hydrationPromise = null;
  refreshPromise = null;
  resetCatalog();
  resetLearningCases();
}
