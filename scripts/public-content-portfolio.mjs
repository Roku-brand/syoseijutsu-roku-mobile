import scope from '../src/data/content-scope.json' with { type: 'json' };

const THEORY_PREFIXES = {
  psychology: 'P',
  'behavioral-science': 'B',
  'organization-management': 'O',
  strategy: 'S',
  'classics-thought': 'C',
  'maxims-experience': 'Q',
};

export const COMPLETE_TECHNIQUE_COUNT = scope.complete.techniques;
export const COMPLETE_THEORY_COUNT = scope.complete.theories;
export const FREE_TECHNIQUE_COUNT = scope.free.techniques;
export const FREE_THEORY_COUNT = scope.free.theories;
export const EXCLUDED_TECHNIQUE_IDS = new Set(scope.excludedTechniqueIds);
export const FREE_THEORY_DISPLAY_IDS = scope.freeTheoryDisplayIds;

export function isProductTechnique(item) {
  return Boolean(item?.id) && !EXCLUDED_TECHNIQUE_IDS.has(item.id);
}

export function mapTheoryDisplayIds(theories) {
  const counts = new Map();
  return new Map(theories.map((theory) => {
    const next = (counts.get(theory.categoryId) ?? 0) + 1;
    counts.set(theory.categoryId, next);
    const prefix = THEORY_PREFIXES[theory.categoryId];
    if (!prefix) throw new Error(`Unknown theory category: ${theory.categoryId}`);
    return [`${prefix}-${next}`, theory];
  }));
}

export function resolveFreeTheoryIds(theories) {
  if (theories.length !== COMPLETE_THEORY_COUNT) {
    throw new Error(`Complete theory catalogue must contain ${COMPLETE_THEORY_COUNT} items; received ${theories.length}.`);
  }
  if (FREE_THEORY_DISPLAY_IDS.length !== FREE_THEORY_COUNT || new Set(FREE_THEORY_DISPLAY_IDS).size !== FREE_THEORY_COUNT) {
    throw new Error(`Free theory portfolio must contain ${FREE_THEORY_COUNT} unique display IDs.`);
  }
  const byDisplayId = mapTheoryDisplayIds(theories);
  const missing = FREE_THEORY_DISPLAY_IDS.filter((id) => !byDisplayId.has(id));
  if (missing.length) throw new Error(`Unknown free theory display IDs: ${missing.join(', ')}`);
  return new Set(FREE_THEORY_DISPLAY_IDS.map((id) => byDisplayId.get(id).tagId));
}
