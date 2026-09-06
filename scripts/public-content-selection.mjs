import {
  COMPLETE_TECHNIQUE_COUNT,
  FREE_TECHNIQUE_COUNT,
  isProductTechnique,
  resolveFreeTheoryIds,
} from './public-content-portfolio.mjs';

export const FREE_TECHNIQUES_PER_DOMAIN = 15;

const PERSONA_DISPLAY_PRIORITY = {
  interpersonal: ['印象がいい人', '人たらしの人'],
};

const numericTechniqueId = (id) => Number.parseInt(String(id).match(/(\d+)$/)?.[1] ?? '', 10);

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

export function selectDomainPreviewItems(category) {
  const previewPersonas = orderPersonasForDisplay(category).slice(0, 2);
  if (!previewPersonas.length) return [];
  const reserveForNextPersona = previewPersonas.length > 1 ? 1 : 0;
  const selected = previewPersonas[0].items.slice(0, FREE_TECHNIQUES_PER_DOMAIN - reserveForNextPersona);
  const selectedIds = new Set(selected.map((item) => item.id));
  if (reserveForNextPersona && previewPersonas[1].items[0]) {
    selected.push(previewPersonas[1].items[0]);
    selectedIds.add(previewPersonas[1].items[0].id);
  }
  for (const item of previewPersonas.flatMap((persona) => persona.items)) {
    if (selected.length >= FREE_TECHNIQUES_PER_DOMAIN) break;
    if (!selectedIds.has(item.id)) {
      selected.push(item);
      selectedIds.add(item.id);
    }
  }
  return selected;
}

export function selectPublicContent({ techniques, theories, learning }) {
  const allTechniques = techniques.categories.flatMap((category) =>
    category.subcategories.flatMap((persona) => persona.items.filter(isProductTechnique)),
  );
  if (allTechniques.length !== COMPLETE_TECHNIQUE_COUNT) {
    throw new Error(`Complete technique catalogue must contain ${COMPLETE_TECHNIQUE_COUNT} active items; received ${allTechniques.length}.`);
  }
  // Preserve the original 45-card cross-section exactly. The five additions
  // are then selected only from those already-open persona packages, ordered
  // by their canonical display order/ID. This prevents an SEO-led selection
  // from opening a new persona or creating a disconnected free card.
  const freeTechniqueIds = new Set(techniques.categories.flatMap((category) =>
    selectDomainPreviewItems(category).map((item) => item.id),
  ));
  const freePersonaNames = new Set(techniques.categories.flatMap((category) =>
    orderPersonasForDisplay(category).slice(0, 2).map((persona) => persona.name),
  ));
  const additionalCandidates = techniques.categories
    .flatMap((category) => category.subcategories)
    .filter((persona) => freePersonaNames.has(persona.name))
    .flatMap((persona) => persona.items)
    .filter((item) => isProductTechnique(item) && !freeTechniqueIds.has(item.id))
    .sort((left, right) => numericTechniqueId(left.id) - numericTechniqueId(right.id)
      || (left.displayOrder ?? Number.MAX_SAFE_INTEGER) - (right.displayOrder ?? Number.MAX_SAFE_INTEGER)
      || left.id.localeCompare(right.id, 'en'));
  for (const item of additionalCandidates) {
    if (freeTechniqueIds.size >= FREE_TECHNIQUE_COUNT) break;
    freeTechniqueIds.add(item.id);
  }
  if (freeTechniqueIds.size !== FREE_TECHNIQUE_COUNT) {
    throw new Error(`Free technique portfolio must contain ${FREE_TECHNIQUE_COUNT} items; received ${freeTechniqueIds.size}.`);
  }
  const freeTheoryIds = resolveFreeTheoryIds(theories);
  const freeLearningIds = new Set(learning.slice(0, 7).map((item) => item.id));

  return { allTechniques, freeTechniqueIds, freeTheoryIds, freeLearningIds };
}
