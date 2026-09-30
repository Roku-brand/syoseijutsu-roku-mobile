import { categories, techniqueCards, theories } from '@/data/catalog';
import contentScope from '@/data/content-scope.json';

export const COMPLETE_TECHNIQUE_COUNT = contentScope.complete.techniques;
export const COMPLETE_THEORY_COUNT = contentScope.complete.theories;
export let FREE_TECHNIQUE_COUNT = contentScope.free.techniques;
export let FREE_THEORY_COUNT = contentScope.free.theories;
export const EXCLUDED_TECHNIQUE_ID_SET = new Set<string>(contentScope.excludedTechniqueIds);

const orderedPersonaNames = categories.flatMap((category) => category.subcategories.map((group) => group.name));
const configuredFreePersonas = new Set<string>(contentScope.free.personas);
const freePersonaNames = orderedPersonaNames.filter((name) => configuredFreePersonas.has(name));
export const FREE_PERSONA_NAMES = freePersonaNames as string[];
export const FREE_PERSONA_NAME_SET = new Set<string>(FREE_PERSONA_NAMES);

// Preview selection is derived from the readable public catalogue so all
// three domains stay available even though locked shells retain their IDs.
export const FREE_REEL_TECHNIQUE_IDS = techniqueCards
  .filter((card) => card.status !== 'locked' && card.title !== '完全版の処世術')
  .map((card) => card.id) as string[];
export const FREE_DISCOVER_TECHNIQUE_IDS = FREE_REEL_TECHNIQUE_IDS;
export const FREE_THEORY_IDS = theories
  .filter((theory) => theory.status !== 'locked' && Boolean(theory.summary?.trim()))
  .map((theory) => theory.tagId) as string[];

export const FREE_LEARNING_CASE_IDS = Array.from(
  { length: 7 },
  (_, index) => `case-${String(index + 1).padStart(2, '0')}`,
);
export const COMPLETE_LEARNING_CASE_COUNT = 21;

export const FREE_TECHNIQUE_IDS = new Set<string>(FREE_REEL_TECHNIQUE_IDS);
export const FREE_THEORY_ID_SET = new Set<string>(FREE_THEORY_IDS);
export const FREE_LEARNING_CASE_ID_SET = new Set<string>(FREE_LEARNING_CASE_IDS);

/** The bundled values are the offline fallback. A successful canonical DB
 * read replaces these sets so edition changes made in the CMS take effect. */
export function hydrateContentAccessScope(rows: { personas: Array<{ name: string; access_tier?: string }>; techniques: Array<{ id: string; access_tier?: string }>; theories: Array<{ id: string; access_tier?: string }> }) {
  // Older API rows may omit access_tier while a migration is rolling out.
  // Retain the shipped free boundary for those rows until the field exists.
  const personaNames = rows.personas.filter((row) => row.access_tier === 'free' || (row.access_tier == null && FREE_PERSONA_NAME_SET.has(row.name))).map((row) => row.name);
  const techniqueIds = rows.techniques.filter((row) => row.access_tier === 'free' || (row.access_tier == null && FREE_TECHNIQUE_IDS.has(row.id))).map((row) => row.id);
  const theoryIds = rows.theories.filter((row) => row.access_tier === 'free' || (row.access_tier == null && FREE_THEORY_ID_SET.has(row.id))).map((row) => row.id);
  FREE_PERSONA_NAMES.splice(0, FREE_PERSONA_NAMES.length, ...personaNames);
  FREE_TECHNIQUE_COUNT = techniqueIds.length;
  FREE_THEORY_COUNT = theoryIds.length;
  FREE_REEL_TECHNIQUE_IDS.splice(0, FREE_REEL_TECHNIQUE_IDS.length, ...techniqueIds);
  FREE_THEORY_IDS.splice(0, FREE_THEORY_IDS.length, ...theoryIds);
  FREE_PERSONA_NAME_SET.clear(); personaNames.forEach((id) => FREE_PERSONA_NAME_SET.add(id));
  FREE_TECHNIQUE_IDS.clear(); techniqueIds.forEach((id) => FREE_TECHNIQUE_IDS.add(id));
  FREE_THEORY_ID_SET.clear(); theoryIds.forEach((id) => FREE_THEORY_ID_SET.add(id));
}

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
