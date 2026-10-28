import { matchesDiscoveryFilter, type DiscoveryFilter } from './discovery-filter';
import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '@/access/access-config';
import { techniqueById, techniqueCards, theories, theoryById } from './catalog';
import { isLockedTheoryShell } from './theory-display';
import type { CategoryKey, TechniqueCard, TheoryCard } from './types';

export type ReadingContent = { type: 'technique'; card: TechniqueCard } | { type: 'theory'; card: TheoryCard };
export const readingContentId = (item: ReadingContent) => item.type === 'technique' ? item.card.id : item.card.tagId;

function rotation(id: string, seed: string) {
  let value = 2166136261;
  for (const character of `${seed}:${id}`) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return value >>> 0;
}

/** Local reading history supplies relevance; explicit discovery slots keep the
 * shelf open to unfamiliar subjects. No additional activity is sent anywhere.
 * The seed changes by day or an explicit refresh, never during an ordinary render.
 */
export function buildReadingRecommendations({ accessState, historyIds, interests, savedIds, savedTheoryIds, seed, seenIds = [], excludeIds = [], count = 5, filter = 'all' }: {
  accessState: string; historyIds: string[]; interests: CategoryKey[];
  savedIds: string[]; savedTheoryIds: string[]; seed: string; seenIds?: string[]; excludeIds?: string[]; count?: number; filter?: DiscoveryFilter;
}): ReadingContent[] {
  const categoryScores = new Map(interests.map(key => [key, 12]));
  const theoryScores = new Map<string, number>();
  const fieldScores = new Map<string, number>();
  const recent = new Set(historyIds.slice(0, 20));
  const saved = new Set([...savedIds, ...savedTheoryIds]);
  const bump = (scores: Map<string, number>, id: string, weight: number) => scores.set(id, (scores.get(id) ?? 0) + weight);
  const readSignals = [...historyIds.slice(0, 30), ...savedIds, ...savedTheoryIds];
  readSignals.forEach((id, index) => {
    const weight = Math.max(2, 12 - Math.floor(index / 4));
    const technique = techniqueById.get(id);
    if (technique) {
      bump(categoryScores, technique.categoryKey, weight);
      for (const relatedId of technique.theoryTagIds ?? []) {
        bump(theoryScores, relatedId, weight);
        const related = theoryById.get(relatedId);
        if (related) bump(fieldScores, related.categoryId, weight);
      }
    }
    const theory = theoryById.get(id);
    if (theory) {
      bump(fieldScores, theory.categoryId, weight);
      bump(theoryScores, theory.tagId, weight);
      for (const relatedId of theory.relatedTheoryIds ?? []) bump(theoryScores, relatedId, weight);
    }
  });
  const penalty = (id: string) => (recent.has(id) ? 40 : 0) + (saved.has(id) ? 8 : 0);
  const byRotation = (a: string, b: string) => rotation(a, seed) - rotation(b, seed) || a.localeCompare(b);
  const techniqueCandidates = techniqueCards.filter(card => card.status !== 'locked' && card.title !== '完全版の処世術' && (accessState === 'paid' || FREE_TECHNIQUE_IDS.has(card.id)));
  const theoryCandidates = theories.filter(card => !isLockedTheoryShell(card) && (accessState === 'paid' || FREE_THEORY_ID_SET.has(card.tagId)));
  const closeTechniques = [...techniqueCandidates].sort((a, b) =>
    ((categoryScores.get(b.categoryKey) ?? 0) - penalty(b.id)) - ((categoryScores.get(a.categoryKey) ?? 0) - penalty(a.id)) || byRotation(a.id, b.id));
  const closeTheories = [...theoryCandidates].sort((a, b) =>
    ((theoryScores.get(b.tagId) ?? 0) + (fieldScores.get(b.categoryId) ?? 0) / 4 - penalty(b.tagId))
    - ((theoryScores.get(a.tagId) ?? 0) + (fieldScores.get(a.categoryId) ?? 0) / 4 - penalty(a.tagId)) || byRotation(a.tagId, b.tagId));
  const excluded = new Set(excludeIds);
  const eligible: ReadingContent[] = ([
    ...closeTechniques.map(card => ({ type: 'technique' as const, card })),
    ...closeTheories.map(card => ({ type: 'theory' as const, card })),
  ] as ReadingContent[]).filter(item => matchesDiscoveryFilter(item, filter));
  const fresh = eligible.filter(item => !excluded.has(`${item.type}:${readingContentId(item)}`));
  // Small catalogs may recycle, but never cross the selected category or duplicate IDs.
  const pool = fresh.length >= count ? fresh : [...fresh, ...eligible.filter(item => excluded.has(`${item.type}:${readingContentId(item)}`))];
  const key = (item: ReadingContent) => `${item.type}:${readingContentId(item)}`;
  const field = (item: ReadingContent) => item.type === 'technique' ? item.card.categoryKey : item.card.categoryId;
  const score = (item: ReadingContent) => item.type === 'technique' ? categoryScores.get(item.card.categoryKey) ?? 0
    : (theoryScores.get(item.card.tagId) ?? 0) + (fieldScores.get(item.card.categoryId) ?? 0) / 4;
  const seen = new Set(seenIds);
  const items: ReadingContent[] = [];
  const picked = new Set<string>();
  const hasSignals = readSignals.length > 0 || new Set(interests).size < 3;
  // Per four cards: two familiar, one adjacent, one unfamiliar. Exact content IDs
  // remain distinct, even when a title belongs to several personas.
  for (let slot = 0; slot < Math.min(count, pool.length); slot++) {
    const mode = hasSignals ? slot % 4 : 3;
    const wantedType = slot % 3 === 1 ? 'theory' : 'technique';
    const previous = items[items.length - 1];
    const candidates = pool.filter(item => !picked.has(key(item)));
    candidates.sort((a, b) => {
      const avoid = (item: ReadingContent) => (excluded.has(key(item)) ? 2000 : 0) + (seen.has(key(item)) ? 1000 : 0)
        + (previous?.card.title === item.card.title ? 500 : 0)
        + (item.type !== wantedType ? 20 : 0)
        + (previous && field(previous) === field(item) ? 10 : 0);
      const affinity = (item: ReadingContent) => mode < 2 ? -score(item)
        : mode === 2 ? -(item.type === 'theory' ? theoryScores.get(item.card.tagId) ?? 0 : score(item) / 2) : score(item);
      return avoid(a) - avoid(b) || penalty(readingContentId(a)) - penalty(readingContentId(b))
        || affinity(a) - affinity(b) || byRotation(key(a), key(b));
    });
    const item = candidates[0];
    if (!item) break;
    picked.add(key(item));
    items.push(item);
  }
  return items;
}
