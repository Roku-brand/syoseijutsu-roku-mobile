import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '@/access/access-config';
import { techniqueCards, theories } from '@/data/catalog';
import { isLockedTheoryShell } from '@/data/theory-display';
import type { TechniqueCard, TheoryCard } from '@/data/types';
import type { TrendingContent } from './content-events';

export type ContentActivity = Record<string, { lastViewedAt: string; viewedDays: string[] }>;
export type HomeImpressions = Record<string, string[]>;

type SelectionInput = {
  isPaid: boolean;
  activity: ContentActivity;
  impressions: HomeImpressions;
  trending: TrendingContent[];
  now?: Date;
  limit?: number;
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function daysSince(value: string | undefined, now: Date) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = Date.parse(value);
  return Number.isFinite(time) ? (now.getTime() - time) / 86_400_000 : Number.POSITIVE_INFINITY;
}

function stableFraction(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4_294_967_295;
}

function impressionAge(id: string, impressions: HomeImpressions, now: Date) {
  return Math.min(...(impressions[id] ?? []).map((value) => daysSince(value, now)), Number.POSITIVE_INFINITY);
}

function stableDailyOrder<T>(items: T[], id: (item: T) => string, now: Date) {
  return [...items].sort((left, right) =>
    stableFraction(`${dayKey(now)}:${id(right)}`) - stableFraction(`${dayKey(now)}:${id(left)}`),
  );
}

function todaysSelection<T>(items: T[], id: (item: T) => string, input: SelectionInput) {
  const now = input.now ?? new Date();
  const today = dayKey(now);
  const shown = items.filter((item) => input.impressions[id(item)]?.includes(today));
  return shown.length >= (input.limit ?? 4)
    ? stableDailyOrder(shown, id, now).slice(0, input.limit ?? 4)
    : null;
}

function scoreCandidate(id: string, free: boolean, input: SelectionInput, trendingIds: Set<string>) {
  const now = input.now ?? new Date();
  const activityAge = daysSince(input.activity[id]?.lastViewedAt, now);
  const shownAge = impressionAge(id, input.impressions, now);
  let score = 1;
  if (shownAge > 14) score += 2;
  if (activityAge > 30) score += 2;
  if (trendingIds.has(id)) score += 1;
  if (free) score += 1;
  if (shownAge <= 7) score -= 3;
  score += stableFraction(`${dayKey(now)}:${id}`);
  return score;
}

function diversify<T>(items: T[], score: (item: T) => number, category: (item: T) => string, group: (item: T) => string, limit: number) {
  const remaining = [...items];
  const selected: T[] = [];
  const categoryCounts = new Map<string, number>();
  while (remaining.length && selected.length < limit) {
    const previous = selected[selected.length - 1];
    remaining.sort((left, right) => {
      const adjusted = (item: T) => score(item)
        - (previous && group(previous) === group(item) ? 2 : 0)
        - ((categoryCounts.get(category(item)) ?? 0) >= 2 ? 1 : 0);
      return adjusted(right) - adjusted(left);
    });
    const next = remaining.shift();
    if (!next) break;
    selected.push(next);
    categoryCounts.set(category(next), (categoryCounts.get(category(next)) ?? 0) + 1);
  }
  return selected;
}

export function selectHomeTechniques(input: SelectionInput): TechniqueCard[] {
  const trendingIds = new Set(input.trending.filter((item) => item.contentType === 'technique').map((item) => item.contentId));
  const candidates = techniqueCards.filter((card) => input.isPaid || FREE_TECHNIQUE_IDS.has(card.id));
  const restored = todaysSelection(candidates, (card) => card.id, input);
  if (restored) return restored;
  return stableDailyOrder(diversify(
    candidates,
    (card) => scoreCandidate(card.id, FREE_TECHNIQUE_IDS.has(card.id), input, trendingIds),
    (card) => card.categoryKey,
    (card) => card.subcategory,
    input.limit ?? 4,
  ), (card) => card.id, input.now ?? new Date());
}

export function selectHomeTheories(input: SelectionInput): TheoryCard[] {
  const trendingIds = new Set(input.trending.filter((item) => item.contentType === 'theory').map((item) => item.contentId));
  const candidates = theories
    .filter((theory) => !isLockedTheoryShell(theory))
    .filter((theory) => input.isPaid || FREE_THEORY_ID_SET.has(theory.tagId));
  const restored = todaysSelection(candidates, (theory) => theory.tagId, input);
  if (restored) return restored;
  return stableDailyOrder(diversify(
    candidates,
    (theory) => scoreCandidate(theory.tagId, FREE_THEORY_ID_SET.has(theory.tagId), input, trendingIds),
    (theory) => theory.categoryId,
    (theory) => theory.categoryId,
    input.limit ?? 4,
  ), (theory) => theory.tagId, input.now ?? new Date());
}
