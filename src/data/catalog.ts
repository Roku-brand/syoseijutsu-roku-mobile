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
  'relationships',
  'work',
  'mental',
  'life',
  'challenge',
];

export const categoryMeta: Record<
  CategoryKey,
  { label: string; mark: string; description: string }
> = {
  relationships: {
    label: '人間関係',
    mark: '和',
    description: '信頼・会話・距離感を整える',
  },
  work: {
    label: '仕事',
    mark: '業',
    description: '評価・交渉・組織での動きを磨く',
  },
  mental: {
    label: 'メンタル',
    mark: '心',
    description: '感情・不安・疲労を扱う',
  },
  life: {
    label: '人生',
    mark: '生',
    description: '選択・時間・お金を設計する',
  },
  challenge: {
    label: '挑戦',
    mark: '挑',
    description: '始める・続ける・撤退する',
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
