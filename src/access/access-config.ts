import { categories, techniqueCards, theories } from '@/data/catalog';
import contentScope from '@/data/content-scope.json';

export const COMPLETE_TECHNIQUE_COUNT = contentScope.complete.techniques;
export const COMPLETE_THEORY_COUNT = contentScope.complete.theories;
export const FREE_TECHNIQUE_COUNT = contentScope.free.techniques;
export const FREE_THEORY_COUNT = contentScope.free.theories;
export const EXCLUDED_TECHNIQUE_ID_SET = new Set<string>(contentScope.excludedTechniqueIds);

const freePersonaNames = categories.flatMap((category) => category.subcategories.slice(0, 2).map((group) => group.name));
export const FREE_PERSONA_NAMES = freePersonaNames as readonly string[];
export const FREE_PERSONA_NAME_SET = new Set<string>(FREE_PERSONA_NAMES);

// Preview selection is derived from the readable public catalogue so all
// three domains stay available even though locked shells retain their IDs.
export const FREE_REEL_TECHNIQUE_IDS = techniqueCards
  .filter((card) => card.status !== 'locked' && card.title !== '完全版の処世術')
  .map((card) => card.id) as readonly string[];
export const FREE_DISCOVER_TECHNIQUE_IDS = FREE_REEL_TECHNIQUE_IDS;
export const FREE_THEORY_IDS = theories
  .filter((theory) => theory.status !== 'locked' && Boolean(theory.summary?.trim()))
  .map((theory) => theory.tagId) as readonly string[];

export const FREE_LEARNING_CASE_IDS = Array.from(
  { length: 7 },
  (_, index) => `case-${String(index + 1).padStart(2, '0')}`,
);
export const COMPLETE_LEARNING_CASE_COUNT = 21;

export const FREE_TECHNIQUE_IDS = new Set<string>(FREE_REEL_TECHNIQUE_IDS);
export const FREE_THEORY_ID_SET = new Set<string>(FREE_THEORY_IDS);
export const FREE_LEARNING_CASE_ID_SET = new Set<string>(FREE_LEARNING_CASE_IDS);

export function canReadTechnique(access: 'guest' | 'free' | 'paid', id: string) {
  return access === 'paid' || FREE_TECHNIQUE_IDS.has(id);
}

export function isFreePersona(name: string) {
  return FREE_PERSONA_NAME_SET.has(name);
}

export function canReadTheory(access: 'guest' | 'free' | 'paid', id: string) {
  return access === 'paid' || FREE_THEORY_ID_SET.has(id);
}

export function canPlayLearningCase(access: 'guest' | 'free' | 'paid', id: string) {
  return access === 'paid' || FREE_LEARNING_CASE_ID_SET.has(id);
}
