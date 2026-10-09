import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydratePaidTheories, overlayPaidCatalog, resetCatalog, type PaidTechniquePayload } from '@/data/catalog';
import { learningCases, replaceLearningCases, resetLearningCases, type LearningCase } from '@/data/learning';
import type { TheoryCard } from '@/data/types';
import { supabase, supabasePublishableKey, supabaseUrl } from './supabase';
import { isFreshTimestamp } from './resource-cache';

type PaidContentType = 'technique' | 'theory' | 'learning';
type PaidContentRow<T> = {
  content_type: PaidContentType;
  content_id: string;
  payload: T;
  sort_order: number;
  updated_at: string;
};

let hydratedUserId: string | null = null;
let hydratedAt = 0;
let completeHydration = false;
let hydrationPromise: Promise<void> | null = null;
let secureGeneration = 0;
const PAID_CONTENT_TIMEOUT_MS = 30_000;
const STORAGE_TIMEOUT_MS = 2_000;
const PAID_CONTENT_CACHE_KEY = '@shoseijutsu-roku/paid-content/v13';
const PAID_CONTENT_CACHE_MS = 60 * 60 * 1000;

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
    && typeof snapshot.savedAt === 'string'
    && Array.isArray(snapshot.techniques)
    && snapshot.techniques.length > 0
    && Array.isArray(snapshot.theories)
    && snapshot.theories.length > 0
    && Array.isArray(snapshot.learning)
    && snapshot.learning.length > 0;
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PAID_CONTENT_TIMEOUT_MS);
  try {
    return await within((async () => {
      const response = await fetch(`${supabaseUrl}/functions/v1/paid-content?type=${encodeURIComponent(type)}`, {
        method: 'GET', signal: controller.signal,
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: supabasePublishableKey },
      });
      if (!response.ok) throw new Error(`Paid content request failed: ${response.status}`);
      const body = await response.json();
      return Array.isArray(body?.items) ? body.items as PaidContentRow<T>[] : [];
    })(), PAID_CONTENT_TIMEOUT_MS, '完全版データの取得がタイムアウトしました。');
  } finally { clearTimeout(timeout); }
}

export async function hydrateSecureContent(onContentApplied?: () => void) {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id ?? null;
  if (!userId) {
    purgeSecureContent();
    return;
  }
  if (hasHydratedSecureContent(userId, true)) return;
  if (hydrationPromise) return hydrationPromise;

  const generation = secureGeneration;
  const request = (async () => {
    // The caller has already verified entitlement with the server. This is
    // a data cache only; it never grants access based on the device clock.
    if (await restoreCachedSecureContent(userId, true)) return;
    if (generation !== secureGeneration) return;
    // Theory metadata is the first complete-edition surface to render. Keep
    // it independent from the much larger technique and learning payloads.
    const theoryRows = await fetchRows<TheoryCard>('theory');
    if (generation !== secureGeneration) return;
    const theories = theoryRows.map((row) => row.payload);
    if (!theories.length) {
      throw new Error('完全版データが不足しているため、端末への保存を中止しました。');
    }
    hydratePaidTheories(theories);
    hydratedUserId = userId;
    hydratedAt = 0;
    completeHydration = false;
    onContentApplied?.();
    await hydrateRemainingContent(userId, theories, onContentApplied, generation);
  })();
  hydrationPromise = request;
  try { await request; }
  finally { if (hydrationPromise === request) hydrationPromise = null; }
}

/** Refetches the signed-in user's secure catalogue after an owner-side publish or reorder. */
export async function refreshSecureContent(onContentApplied?: () => void): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId || hydratedUserId !== userId) return false;
  const generation = ++secureGeneration;
  if (hydrationPromise) await hydrationPromise.catch(() => undefined);
  hydrationPromise = null;
  hydratedUserId = null;
  await settleWithin(AsyncStorage.removeItem(PAID_CONTENT_CACHE_KEY));
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
    hydratedAt = Date.now();
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
export async function restoreCachedSecureContent(expectedUserId: string, freshOnly = false): Promise<boolean> {
  const generation = secureGeneration;
  const stored = await settleWithin(AsyncStorage.getItem(PAID_CONTENT_CACHE_KEY));
  if (!stored) return false;
  try {
    const snapshot: unknown = JSON.parse(stored);
    if (!isSnapshot(snapshot) || snapshot.userId !== expectedUserId) return false;
    if (generation !== secureGeneration) return false;
    if (freshOnly && !isFreshTimestamp(Date.parse(snapshot.savedAt), PAID_CONTENT_CACHE_MS)) return false;
    applyPaidContent(snapshot.techniques, snapshot.theories, snapshot.learning);
    hydratedUserId = snapshot.userId;
    hydratedAt = Date.parse(snapshot.savedAt);
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
  hydratedAt = Date.now();
    completeHydration = true;
  onContentApplied?.();
  if (generation !== secureGeneration) return;
  const snapshot: PaidContentSnapshot = { version: 9, userId, savedAt: new Date().toISOString(), techniques, theories, learning };
  await settleWithin(AsyncStorage.setItem(PAID_CONTENT_CACHE_KEY, JSON.stringify(snapshot)));
}

/** Whether the in-memory catalogue belongs to the currently verified user. */
export function hasHydratedSecureContent(userId: string | null | undefined, freshOnly = false): boolean {
  return Boolean(userId) && hydratedUserId === userId && completeHydration && (!freshOnly || isFreshTimestamp(hydratedAt, PAID_CONTENT_CACHE_MS));
}

export function purgeSecureContent() {
  secureGeneration += 1;
  hydratedUserId = null;
  hydratedAt = 0;
    completeHydration = false;
  hydrationPromise = null;
  resetCatalog();
  resetLearningCases();
}
