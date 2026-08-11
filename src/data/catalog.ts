import techniquesSource from './generated/techniques.json';
import theoriesSource from './generated/theories.json';
import type { CatalogCategory, CategoryKey, TechniqueCard, TechniqueSource, TheoryCard } from './types';
import { getTechniqueTags } from './technique-tags';
import { getTheoryProvenance } from './theory-sources';

const publicCategories = techniquesSource.categories as CatalogCategory[];
const publicTheories = theoriesSource as TheoryCard[];

export const categories: CatalogCategory[] = structuredClone(publicCategories);
export const theories: TheoryCard[] = publicTheories.map((theory) => ({
  ...theory,
  provenance: getTheoryProvenance(theory),
}));
export const techniqueCards: TechniqueCard[] = [];
export const techniqueById = new Map<string, TechniqueCard>();
export const theoryById = new Map<string, TheoryCard>();

const techniqueNumberById = new Map<string, number>();
const theoryDisplayIdByTagId = new Map<string, string>();

function rebuildIndexes() {
  techniqueCards.splice(0, techniqueCards.length, ...categories.flatMap((category) =>
    category.subcategories.flatMap((subcategory) =>
      subcategory.items.map((item) => {
        const articleTitle = subcategory.articleTitle ?? subcategory.name;
        const context = {
          ...item,
          categoryName: category.name,
          subcategory: subcategory.name,
          articleTitle,
        };
        return {
          ...context,
          categoryKey: category.key,
          tags: getTechniqueTags(context),
        };
      }),
    ),
  ));

  techniqueById.clear();
  techniqueNumberById.clear();
  techniqueCards.forEach((card, index) => {
    techniqueById.set(card.id, card);
    techniqueNumberById.set(card.id, index + 1);
  });

  theoryById.clear();
  theories.forEach((theory) => theoryById.set(theory.tagId, theory));

  const prefixes: Record<string, string> = {
    psychology: 'P', 'behavioral-science': 'B', 'organization-management': 'O',
    strategy: 'S', 'classics-thought': 'C', 'maxims-experience': 'Q',
  };
  const counts = new Map<string, number>();
  theoryDisplayIdByTagId.clear();
  theories.forEach((theory) => {
    const next = (counts.get(theory.categoryId) ?? 0) + 1;
    counts.set(theory.categoryId, next);
    theoryDisplayIdByTagId.set(theory.tagId, `${prefixes[theory.categoryId] ?? '理'}－${next}`);
  });
}

rebuildIndexes();

export type PaidTechniquePayload = TechniqueSource & {
  categoryKey: CategoryKey;
  categoryName: string;
  subcategory: string;
  articleTitle?: string;
};

export function hydratePaidCatalog(techniques: PaidTechniquePayload[], paidTheories: TheoryCard[]) {
  resetCatalog();
  for (const item of techniques) {
    let category = categories.find((candidate) => candidate.key === item.categoryKey);
    if (!category) {
      category = { key: item.categoryKey, name: item.categoryName, subcategories: [] };
      categories.push(category);
    }
    let subcategory = category.subcategories.find((candidate) => candidate.name === item.subcategory);
    if (!subcategory) {
      subcategory = { name: item.subcategory, articleTitle: item.articleTitle, items: [] };
      category.subcategories.push(subcategory);
    }
    if (!subcategory.items.some((candidate) => candidate.id === item.id)) {
      const { categoryKey: _categoryKey, categoryName: _categoryName, subcategory: _subcategory, articleTitle: _articleTitle, ...source } = item;
      subcategory.items.push(source);
    }
  }
  for (const theory of paidTheories) {
    if (!theories.some((candidate) => candidate.tagId === theory.tagId)) {
      theories.push({ ...theory, provenance: getTheoryProvenance(theory) });
    }
  }
  rebuildIndexes();
}

export function resetCatalog() {
  categories.splice(0, categories.length, ...structuredClone(publicCategories));
  theories.splice(0, theories.length, ...publicTheories.map((theory) => ({
    ...theory,
    provenance: getTheoryProvenance(theory),
  })));
  rebuildIndexes();
}

export const categoryOrder: CategoryKey[] = ['interpersonal', 'work', 'life'];
export const categoryMeta: Record<CategoryKey, { label: string; mark: string; description: string }> = {
  interpersonal: { label: '対人術', mark: '対', description: '関係を築き、保ち、集団の中で立ち回る' },
  work: { label: '仕事術', mark: '仕', description: '評価・合意・実行を成果へつなげる' },
  life: { label: '人生術', mark: '生', description: '判断軸を持ち、不安とつまずきを越える' },
};

export function getTechniqueDisplayId(cardOrId: TechniqueCard | string) {
  const id = typeof cardOrId === 'string' ? cardOrId : cardOrId.id;
  const number = techniqueNumberById.get(id);
  return number ? `No.${number}` : 'No.—';
}

export function getTheoryDisplayId(theoryOrId: TheoryCard | string) {
  const id = typeof theoryOrId === 'string' ? theoryOrId : theoryOrId.tagId;
  return theoryDisplayIdByTagId.get(id) ?? '—';
}

export function getRelatedCards(card: TechniqueCard, limit = 6) {
  const theoryIds = new Set(card.theoryTagIds ?? []);
  return techniqueCards.filter((candidate) => candidate.id !== card.id).map((candidate) => {
    const sharedTheory = (candidate.theoryTagIds ?? []).filter((id) => theoryIds.has(id)).length;
    const score = sharedTheory * 5 + (candidate.subcategory === card.subcategory ? 3 : 0) + (candidate.categoryKey === card.categoryKey ? 1 : 0);
    return { candidate, score };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(({ candidate }) => candidate);
}

export function getRelatedTheories(theory: TheoryCard, limit = 3) {
  const explicitIds = new Set(theory.relatedIds ?? []);
  const currentDomains = new Set(theory.domains ?? []);
  const coReferencedCounts = new Map<string, number>();
  techniqueCards.filter((card) => card.theoryTagIds?.includes(theory.tagId)).forEach((card) => {
    (card.theoryTagIds ?? []).forEach((id) => {
      if (id !== theory.tagId) coReferencedCounts.set(id, (coReferencedCounts.get(id) ?? 0) + 1);
    });
  });
  return theories.filter((candidate) => candidate.tagId !== theory.tagId).map((candidate) => {
    const sharedDomains = (candidate.domains ?? []).filter((domain) => currentDomains.has(domain)).length;
    const score = (explicitIds.has(candidate.tagId) ? 100 : 0) + (coReferencedCounts.get(candidate.tagId) ?? 0) * 20 + sharedDomains * 4 + (candidate.discipline === theory.discipline ? 3 : 0) + (candidate.categoryId === theory.categoryId ? 1 : 0);
    return { candidate, score, sharedDomains };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || b.sharedDomains - a.sharedDomains || a.candidate.title.localeCompare(b.candidate.title, 'ja')).slice(0, limit).map(({ candidate }) => candidate);
}

export function getFeed(interests: CategoryKey[], savedIds: string[]) {
  const interestSet = new Set(interests);
  const savedTheoryIds = new Set(savedIds.flatMap((id) => techniqueById.get(id)?.theoryTagIds ?? []));
  return [...techniqueCards].sort((a, b) => {
    const score = (card: TechniqueCard) => (interestSet.has(card.categoryKey) ? 10 : 0) + (card.theoryTagIds ?? []).filter((id) => savedTheoryIds.has(id)).length * 2;
    return score(b) - score(a) || a.id.localeCompare(b.id);
  });
}
