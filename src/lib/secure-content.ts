import AsyncStorage from '@react-native-async-storage/async-storage';
import { hydratePaidCatalog, resetCatalog, theories as catalogTheories, type PaidTechniquePayload } from '@/data/catalog';
import { learningCases, replaceLearningCases, resetLearningCases, type LearningCase } from '@/data/learning';
import { isLockedTheoryShell } from '@/data/theory-display';
import type { TheoryCard } from '@/data/types';
import { supabase } from './supabase';

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
const PAID_CONTENT_CACHE_KEY = '@shoseijutsu-roku/paid-content/v9';

type PaidContentSnapshot = {
  version: 7;
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
  return snapshot.version === 7
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

async function fetchPaidContentBundle(): Promise<PaidContentRow<unknown>[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await within(
    supabase.functions.invoke('paid-content', { method: 'GET' }),
    PAID_CONTENT_TIMEOUT_MS,
    '完全版データの取得がタイムアウトしました。',
  );
  if (error) throw new Error(error.message || '完全版データを取得できませんでした。');
  return Array.isArray(data?.items) ? data.items as PaidContentRow<unknown>[] : [];
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
    const rows = await fetchPaidContentBundle();
    const techniques = rows
      .filter((row) => row.content_type === 'technique')
      .map((row) => row.payload as PaidTechniquePayload);
    const theories = rows
      .filter((row) => row.content_type === 'theory')
      .map((row) => row.payload as TheoryCard);
    const paidLearning = rows
      .filter((row) => row.content_type === 'learning')
      .map((row) => row.payload as LearningCase);
    const expectedPaidTheoryCount = catalogTheories.filter(isLockedTheoryShell).length;
    if (techniques.length === 0 || theories.length !== expectedPaidTheoryCount || paidLearning.length === 0) {
      throw new Error('完全版データが不足しているため、端末への保存を中止しました。');
    }
    applyPaidContent(techniques, theories, paidLearning);
    hydratedUserId = userId;
    const snapshot: PaidContentSnapshot = {
      version: 7,
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
