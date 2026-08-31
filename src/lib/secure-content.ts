import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydratePaidCatalog, hydratePaidTheories, resetCatalog, theories as catalogTheories, type PaidTechniquePayload } from '@/data/catalog';
import { learningCases, replaceLearningCases, resetLearningCases, type LearningCase } from '@/data/learning';
import { isLockedTheoryShell } from '@/data/theory-display';
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
const PAID_CONTENT_TIMEOUT_MS = 30_000;
const STORAGE_TIMEOUT_MS = 2_000;
const PAID_CONTENT_CACHE_KEY = '@shoseijutsu-roku/paid-content/v10';

type PaidContentSnapshot = {
  version: 8;
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
  return snapshot.version === 8
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

export async function hydrateSecureContent() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id ?? null;
  if (!userId) {
    purgeSecureContent();
    return;
  }
  if (hydratedUserId === userId) return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    // Theory metadata is the first complete-edition surface to render. Keep
    // it independent from the much larger technique and learning payloads.
    const theoryRows = await fetchRows<TheoryCard>('theory');
    const theories = theoryRows.map((row) => row.payload);
    const expectedPaidTheoryCount = catalogTheories.filter(isLockedTheoryShell).length;
    if (theories.length !== expectedPaidTheoryCount) {
      throw new Error('完全版データが不足しているため、端末への保存を中止しました。');
    }
    hydratePaidTheories(theories);
    hydratedUserId = userId;
    void hydrateRemainingContent(userId, theories);
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

async function hydrateRemainingContent(userId: string, theories: TheoryCard[]) {
  const [techniquesResult, learningResult] = await Promise.allSettled([
    fetchRows<PaidTechniquePayload>('technique'),
    fetchRows<LearningCase>('learning'),
  ]);
  if (hydratedUserId !== userId || techniquesResult.status !== 'fulfilled' || learningResult.status !== 'fulfilled') return;
  const techniques = techniquesResult.value.map((row) => row.payload);
  const learning = learningResult.value.map((row) => row.payload);
  if (!techniques.length || !learning.length) return;
  applyPaidContent(techniques, theories, learning);
  const snapshot: PaidContentSnapshot = { version: 8, userId, savedAt: new Date().toISOString(), techniques, theories, learning };
  await settleWithin(AsyncStorage.setItem(PAID_CONTENT_CACHE_KEY, JSON.stringify(snapshot)));
}

/** Whether the in-memory catalogue belongs to the currently verified user. */
export function hasHydratedSecureContent(userId: string | null | undefined): boolean {
  return Boolean(userId) && hydratedUserId === userId;
}

export function purgeSecureContent() {
  hydratedUserId = null;
  hydrationPromise = null;
  resetCatalog();
  resetLearningCases();
}
