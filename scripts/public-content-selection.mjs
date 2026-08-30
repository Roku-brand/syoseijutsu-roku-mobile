export const FREE_THEORY_CATEGORY_IDS = [
  'behavioral-science',
  'organization-management',
  'strategy',
  'classics-thought',
  'maxims-experience',
];

export function selectPublicContent({ techniques, theories, learning }) {
  const allTechniques = techniques.categories.flatMap((category) =>
    category.subcategories.flatMap((persona) => persona.items),
  );
  const freeTechniqueIds = new Set(allTechniques.slice(0, 45).map((item) => item.id));
  const freeTheoryIds = new Set([
    ...theories.filter((theory) => theory.categoryId === 'psychology').slice(0, 20),
    ...FREE_THEORY_CATEGORY_IDS.flatMap((categoryId) =>
      theories.filter((theory) => theory.categoryId === categoryId).slice(0, 5),
    ),
  ].map((theory) => theory.tagId));
  const freeLearningIds = new Set(learning.slice(0, 7).map((item) => item.id));

  return { allTechniques, freeTechniqueIds, freeTheoryIds, freeLearningIds };
}
