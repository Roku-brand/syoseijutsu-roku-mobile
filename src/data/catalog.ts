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

const techniqueNumberById = new Map(
  techniqueCards.map((card, index) => [card.id, index + 1]),
);

const theoryPrefixByCategory: Record<string, string> = {
  psychology: '心',
  'behavioral-science': '動',
  'organization-management': '組',
  strategy: '戦',
  'classics-thought': '古',
  'maxims-experience': '格',
};

const theoryDisplayIdByTagId = (() => {
  const categoryCounts = new Map<string, number>();
  return new Map(
    theories.map((theory) => {
      const next = (categoryCounts.get(theory.categoryId) ?? 0) + 1;
      categoryCounts.set(theory.categoryId, next);
      const prefix = theoryPrefixByCategory[theory.categoryId] ?? '理';
      return [theory.tagId, `${prefix}－${next}`];
    }),
  );
})();

export function getTechniqueDisplayId(
  cardOrId: TechniqueCard | string,
) {
  const id = typeof cardOrId === 'string' ? cardOrId : cardOrId.id;
  const number = techniqueNumberById.get(id);
  return number ? `No.${number}` : 'No.—';
}

export function getTheoryDisplayId(
  theoryOrId: TheoryCard | string,
) {
  const id = typeof theoryOrId === 'string' ? theoryOrId : theoryOrId.tagId;
  return theoryDisplayIdByTagId.get(id) ?? '理－—';
}

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

/**
 * Returns theories that help deepen the current concept.
 *
 * The source data does not yet have curated `relatedIds`, so relations are
 * derived from the strongest signal available: theories that are cited by the
 * same technique card. Domain, discipline and category are then used only to
 * make the result useful even for theories not yet attached to a technique.
 */
export function getRelatedTheories(theory: TheoryCard, limit = 3) {
  const explicitIds = new Set(theory.relatedIds ?? []);
  const currentDomains = new Set(theory.domains ?? []);
  const coReferencedCounts = new Map<string, number>();

  techniqueCards
    .filter((card) => card.theoryTagIds?.includes(theory.tagId))
    .forEach((card) => {
      (card.theoryTagIds ?? []).forEach((id) => {
        if (id !== theory.tagId) {
          coReferencedCounts.set(id, (coReferencedCounts.get(id) ?? 0) + 1);
        }
      });
    });

  return theories
    .filter((candidate) => candidate.tagId !== theory.tagId)
    .map((candidate) => {
      const sharedDomains = (candidate.domains ?? []).filter((domain) =>
        currentDomains.has(domain),
      ).length;
      const score =
        (explicitIds.has(candidate.tagId) ? 100 : 0) +
        (coReferencedCounts.get(candidate.tagId) ?? 0) * 20 +
        sharedDomains * 4 +
        (candidate.discipline === theory.discipline ? 3 : 0) +
        (candidate.categoryId === theory.categoryId ? 1 : 0);

      return { candidate, score, sharedDomains };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) =>
      b.score - a.score ||
      b.sharedDomains - a.sharedDomains ||
      a.candidate.title.localeCompare(b.candidate.title, 'ja'),
    )
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
