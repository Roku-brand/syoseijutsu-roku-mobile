export const FREE_THEORY_CATEGORY_IDS = [
  'behavioral-science',
  'organization-management',
  'strategy',
  'classics-thought',
  'maxims-experience',
];

export const FREE_TECHNIQUES_PER_DOMAIN = 15;

const PERSONA_DISPLAY_PRIORITY = {
  interpersonal: ['印象がいい人', '人たらしの人'],
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

function selectDomainPreviewItems(category) {
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
    category.subcategories.flatMap((persona) => persona.items),
  );
  // The public edition is a cross-section of the whole knowledge system.
  // Selecting from the flattened catalogue made all 45 cards interpersonal
  // because that domain happens to be listed first.
  const freeTechniqueIds = new Set(techniques.categories.flatMap((category) =>
    selectDomainPreviewItems(category).map((item) => item.id),
  ));
  const freeTheoryIds = new Set([
    ...theories.filter((theory) => theory.categoryId === 'psychology').slice(0, 20),
    ...FREE_THEORY_CATEGORY_IDS.flatMap((categoryId) =>
      theories.filter((theory) => theory.categoryId === categoryId).slice(0, 5),
    ),
  ].map((theory) => theory.tagId));
  const freeLearningIds = new Set(learning.slice(0, 7).map((item) => item.id));

  return { allTechniques, freeTechniqueIds, freeTheoryIds, freeLearningIds };
}
