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
export function buildReadingRecommendations({ accessState, historyIds, interests, savedIds, savedTheoryIds, seed }: {
  accessState: string; historyIds: string[]; interests: CategoryKey[];
  savedIds: string[]; savedTheoryIds: string[]; seed: string;
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
  const techniqueCandidates = techniqueCards.filter(card => accessState === 'paid' || FREE_TECHNIQUE_IDS.has(card.id));
  const theoryCandidates = theories.filter(card => !isLockedTheoryShell(card) && (accessState === 'paid' || FREE_THEORY_ID_SET.has(card.tagId)));
  const closeTechniques = [...techniqueCandidates].sort((a, b) =>
    ((categoryScores.get(b.categoryKey) ?? 0) - penalty(b.id)) - ((categoryScores.get(a.categoryKey) ?? 0) - penalty(a.id)) || byRotation(a.id, b.id));
  const closeTheories = [...theoryCandidates].sort((a, b) =>
    ((theoryScores.get(b.tagId) ?? 0) + (fieldScores.get(b.categoryId) ?? 0) / 4 - penalty(b.tagId))
    - ((theoryScores.get(a.tagId) ?? 0) + (fieldScores.get(a.categoryId) ?? 0) / 4 - penalty(a.tagId)) || byRotation(a.tagId, b.tagId));
  const items: ReadingContent[] = [];
  const selected = new Set<string>();
  const add = (item?: ReadingContent) => {
    if (!item || items.length >= 7) return;
    const id = readingContentId(item);
    if (!selected.has(id)) { selected.add(id); items.push(item); }
  };
  for (const key of ['interpersonal', 'work', 'life']) {
    const card = closeTechniques.find(candidate => candidate.categoryKey === key);
    if (card) add({ type: 'technique', card });
  }
  const familiar = closeTheories[0];
  if (familiar) add({ type: 'theory', card: familiar });

  // Order by the least explored field, then rotate within it. Reserve two
  // different fields so a large category cannot occupy every discovery slot.
  const discoveryTheories = [...theoryCandidates].sort((a, b) =>
    Number(recent.has(a.tagId) || saved.has(a.tagId)) - Number(recent.has(b.tagId) || saved.has(b.tagId))
    || (fieldScores.get(a.categoryId) ?? 0) - (fieldScores.get(b.categoryId) ?? 0) || byRotation(a.tagId, b.tagId));
  const discoveredFields = new Set(familiar ? [familiar.categoryId] : []);
  for (let slot = 0; slot < 2; slot++) {
    const card = discoveryTheories.find(candidate => !selected.has(candidate.tagId) && !discoveredFields.has(candidate.categoryId))
      ?? discoveryTheories.find(candidate => !selected.has(candidate.tagId));
    if (card) {
      add({ type: 'theory', card });
      discoveredFields.add(card.categoryId);
    }
  }
  const discoveryTechnique = [...techniqueCandidates].sort((a, b) => penalty(a.id) - penalty(b.id) || byRotation(a.id, b.id))
    .find(card => !selected.has(card.id));
  if (discoveryTechnique) add({ type: 'technique', card: discoveryTechnique });
  for (const card of closeTheories) add({ type: 'theory', card });
  for (const card of closeTechniques) add({ type: 'technique', card });
  return items;
}
