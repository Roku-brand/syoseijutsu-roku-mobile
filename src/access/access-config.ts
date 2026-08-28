import { categories, techniqueCards, theories } from '@/data/catalog';

const freePersonaNames = categories.flatMap((category) => category.subcategories.slice(0, 2).map((group) => group.name));
export const FREE_PERSONA_NAMES = freePersonaNames as readonly string[];
export const FREE_PERSONA_NAME_SET = new Set<string>(FREE_PERSONA_NAMES);

// Preview selection is derived from the canonical catalog so content IDs can
// change without leaving the free edition pointing at dead legacy IDs.
export const FREE_REEL_TECHNIQUE_IDS = techniqueCards.slice(0, 45).map((card) => card.id) as readonly string[];
export const FREE_DISCOVER_TECHNIQUE_IDS = FREE_REEL_TECHNIQUE_IDS;
const FREE_THEORY_CATEGORY_IDS = [
  'behavioral-science',
  'organization-management',
  'strategy',
  'classics-thought',
  'maxims-experience',
] as const;

export const FREE_THEORY_IDS = [
  ...theories
    .filter((theory) => theory.categoryId === 'psychology')
    .slice(0, 20)
    .map((theory) => theory.tagId),
  ...FREE_THEORY_CATEGORY_IDS.flatMap((categoryId) =>
    theories
      .filter((theory) => theory.categoryId === categoryId)
      .slice(0, 5)
      .map((theory) => theory.tagId),
  ),
] as readonly string[];

export const FREE_LEARNING_CASE_IDS = Array.from(
  { length: 7 },
  (_, index) => `case-${String(index + 1).padStart(2, '0')}`,
);

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
