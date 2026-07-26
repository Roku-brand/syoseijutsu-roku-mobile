import techniquesSource from './generated/techniques.json';
import theoriesSource from './generated/theories.json';
import type {
  CatalogCategory,
  CategoryKey,
  TechniqueCard,
  TheoryCard,
} from './types';

export const categories = techniquesSource.categories as CatalogCategory[];
export const theories = theoriesSource as TheoryCard[];

export const categoryOrder: CategoryKey[] = [
  'interpersonal',
  'work',
  'life',
];

export const categoryMeta: Record<
  CategoryKey,
  { label: string; mark: string; description: string }
> = {
  interpersonal: {
    label: '対人術',
    mark: '対',
    description: '関係を築き、保ち、集団の中で立ち回る',
  },
  work: {
    label: '仕事術',
    mark: '仕',
    description: '評価・合意・実行を成果へつなげる',
  },
  life: {
    label: '人生術',
    mark: '生',
    description: '判断軸を持ち、不安とつまずきを越える',
  },
};

export const techniqueCards: TechniqueCard[] = categories.flatMap((category) =>
  category.subcategories.flatMap((subcategory) =>
    subcategory.items.map((item) => ({
      ...item,
      categoryKey: category.key,
      categoryName: category.name,
      subcategory: subcategory.name,
      articleTitle: subcategory.articleTitle ?? subcategory.name,
    })),
  ),
);

export const techniqueById = new Map(
  techniqueCards.map((card) => [card.id, card]),
);
export const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));

export function getRelatedCards(card: TechniqueCard, limit = 6) {
  const theoryIds = new Set(card.theoryTagIds ?? []);
  return techniqueCards
    .filter((candidate) => candidate.id !== card.id)
    .map((candidate) => {
      const sharedTheory = (candidate.theoryTagIds ?? []).filter((id) =>
        theoryIds.has(id),
      ).length;
      const score =
        sharedTheory * 5 +
        (candidate.subcategory === card.subcategory ? 3 : 0) +
        (candidate.categoryKey === card.categoryKey ? 1 : 0);
      return { candidate, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

export function getFeed(interests: CategoryKey[], savedIds: string[]) {
  const interestSet = new Set(interests);
  const savedTheoryIds = new Set(
    savedIds.flatMap((id) => techniqueById.get(id)?.theoryTagIds ?? []),
  );

  return [...techniqueCards].sort((a, b) => {
    const score = (card: TechniqueCard) =>
      (interestSet.has(card.categoryKey) ? 10 : 0) +
      (card.theoryTagIds ?? []).filter((id) => savedTheoryIds.has(id)).length * 2;
    const difference = score(b) - score(a);
    return difference || a.id.localeCompare(b.id);
  });
}
