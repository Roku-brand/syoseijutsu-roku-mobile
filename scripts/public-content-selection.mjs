import {
  COMPLETE_TECHNIQUE_COUNT,
  FREE_PERSONA_NAMES,
  FREE_TECHNIQUE_COUNT,
  isProductTechnique,
  resolveFreeTheoryIds,
} from './public-content-portfolio.mjs';

const PERSONA_DISPLAY_PRIORITY = {
  interpersonal: ['印象がいい人', '人たらしの人'],
  work: ['仕事ができる人', 'タスク処理がうまい人'],
  life: ['充実した人生を過ごせる人', '自分らしく生きられる人'],
};

export function orderPersonasForDisplay(category) {
  const priority = PERSONA_DISPLAY_PRIORITY[category.key] ?? [];
  if (!priority.length) return category.subcategories;
  const priorityIndex = new Map(priority.map((name, index) => [name, index]));
  return category.subcategories
    .map((persona, sourceIndex) => ({ persona, sourceIndex }))
    .sort((left, right) => {
      const leftPriority = priorityIndex.get(left.persona.name) ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = priorityIndex.get(right.persona.name) ?? Number.MAX_SAFE_INTEGER;
      return leftPriority - rightPriority || left.sourceIndex - right.sourceIndex;
    })
    .map(({ persona }) => persona);
}

export function selectPublicContent({ techniques, theories, learning }) {
  const allTechniques = techniques.categories.flatMap((category) =>
    category.subcategories.flatMap((persona) => persona.items.filter(isProductTechnique)),
  );
  if (allTechniques.length !== COMPLETE_TECHNIQUE_COUNT) {
    throw new Error(`Complete technique catalogue must contain ${COMPLETE_TECHNIQUE_COUNT} active items; received ${allTechniques.length}.`);
  }
  const freePersonaNames = new Set(FREE_PERSONA_NAMES);
  const catalogPersonas = techniques.categories.flatMap((category) => category.subcategories);
  const missingPersonas = FREE_PERSONA_NAMES.filter((name) => !catalogPersonas.some((persona) => persona.name === name));
  if (missingPersonas.length) {
    throw new Error(`Unknown free personas: ${missingPersonas.join(', ')}`);
  }
  const freeTechniqueIds = new Set(catalogPersonas
    .filter((persona) => freePersonaNames.has(persona.name))
    .flatMap((persona) => persona.items)
    .filter(isProductTechnique)
    .map((item) => item.id));
  if (freeTechniqueIds.size !== FREE_TECHNIQUE_COUNT) {
    throw new Error(`The configured free personas must contain ${FREE_TECHNIQUE_COUNT} techniques; received ${freeTechniqueIds.size}.`);
  }
  const freeTheoryIds = resolveFreeTheoryIds(theories);
  const freeLearningIds = new Set(learning.slice(0, 7).map((item) => item.id));

  return { allTechniques, freeTechniqueIds, freeTheoryIds, freeLearningIds };
}
