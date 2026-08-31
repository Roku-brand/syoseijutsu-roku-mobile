import techniquesSource from './generated/techniques.public.json';
import theoriesSource from './generated/theories.public.json';
import practicalActionsSource from './generated/practical-actions.public.json';
import type { CatalogCategory, CategoryKey, TechniqueCard, TechniqueSource, TheoryCard, TechniquePracticalActions } from './types';
import { getTechniqueTags } from './technique-tags';
import { getTheoryProvenance } from './theory-sources';
import { isLockedTheoryShell } from './theory-display';

const publicCategories = techniquesSource.categories as CatalogCategory[];
const publicTheories = theoriesSource as TheoryCard[];
const practicalActionsById = new Map(
  (practicalActionsSource as Array<TechniquePracticalActions & { id: string; title: string }>).map((item) => [item.id, item]),
);

export const categories: CatalogCategory[] = structuredClone(publicCategories);
export const theories: TheoryCard[] = publicTheories.map((theory) => ({
  ...theory,
  provenance: getTheoryProvenance(theory),
}));
export const techniqueCards: TechniqueCard[] = [];
export const techniqueById = new Map<string, TechniqueCard>();
export const theoryById = new Map<string, TheoryCard>();
const techniqueCardsByTheoryId = new Map<string, TechniqueCard[]>();

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
          practicalActions: context.practicalActions ?? practicalActionsById.get(context.id),
          theoryTagIds: context.relatedTheoryIds ?? context.theoryTagIds ?? [],
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

  techniqueCardsByTheoryId.clear();
  techniqueCards.forEach((card) => {
    (card.theoryTagIds ?? []).forEach((theoryId) => {
      const cards = techniqueCardsByTheoryId.get(theoryId) ?? [];
      cards.push(card);
      techniqueCardsByTheoryId.set(theoryId, cards);
    });
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
    placeManagedTechnique(item);
  }
  hydratePaidTheories(paidTheories);
}

/** Resolves the private theory shells without resetting the currently loaded
 * technique catalogue. This lets the complete edition become readable even
 * when a larger secondary content sync is still in flight. */
export function hydratePaidTheories(paidTheories: TheoryCard[]) {
  for (const theory of paidTheories) {
    const next = { ...theory, provenance: getTheoryProvenance(theory) };
    const existingIndex = theories.findIndex((candidate) => candidate.tagId === theory.tagId);
    if (existingIndex === -1) theories.push(next);
    else theories[existingIndex] = next;
  }
  rebuildIndexes();
}

/** Applies the row just returned by the owner publish RPC without waiting for
 * a second network round-trip. */
export function upsertManagedTechnique(item: PaidTechniquePayload) {
  placeManagedTechnique(item);
  rebuildIndexes();
}

function placeManagedTechnique(item: PaidTechniquePayload) {
  // Managed content is authoritative for an existing technique. Remove the
  // bundled copy first so edits replace it instead of being ignored. This
  // also moves the card cleanly when its category or persona changes.
  for (const existingCategory of categories) {
    for (const existingSubcategory of existingCategory.subcategories) {
      existingSubcategory.items = existingSubcategory.items.filter((candidate) => candidate.id !== item.id);
    }
  }
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
  const { categoryKey: _categoryKey, categoryName: _categoryName, subcategory: _subcategory, articleTitle: _articleTitle, ...source } = item;
  subcategory.items.push(source);
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

const personaThemeOverrides: Partial<Record<CategoryKey, Record<string, string>>> = {
  interpersonal: {
    '人間関係が長続きする人': '関係の管理',
    '関係を修復できる人': '関係の管理',
    '集団に馴染める人': '集団での立ち回り',
    '集団で立場を築ける人': '集団での立ち回り',
    '人を動かせる人': '集団での立ち回り',
    'リーダーシップがある人': '集団での立ち回り',
    '集団をまとめられる人': '集団での立ち回り',
  },
  work: {
    '交渉がうまい人': '交渉・合意の戦術',
    '駆け引きがうまい人': '交渉・合意の戦術',
    '対立を収められる人': '交渉・合意の戦術',
    '組織でうまく立ち回れる人': '評価の獲得',
  },
  life: {
    '思い込みに流されない人': '内面の管理',
    '後悔しない人': '人生の指針',
    '立ち直れる人': '人生のつまずき',
    '運をつかめる人': '人生の指針',
    '可能性を広げられる人': '人生の指針',
  },
};

// The discover screen presents themes before individual personas. Keep each
// label at the same conceptual layer so a reader can scan by intent, not by
// mixed labels such as a persona name beside an abstract topic.
const personaThemeTitles: Record<CategoryKey, Record<string, string>> = {
  interpersonal: {
    '印象がいい人': '関係を育てる',
    '会話がうまい人': '関係を育てる',
    '聞き上手な人': '関係を育てる',
    '信頼される人': '関係を育てる',
    '人たらしの人': '関係を育てる',
    '人たらしの人①': '関係を育てる',
    '人たらしの人②': '関係を育てる',
    '面白い人': '関係を育てる',
    '人を見極められる人': '距離を整える',
    '人に振り回されない人': '距離を整える',
    '軽く扱われない人': '距離を整える',
    '人間関係が安定する人': '距離を整える',
    '集団に馴染める人': '集団で力を発揮する',
    '人を動かせる人': '集団で力を発揮する',
    'リーダーシップがある人': '集団で力を発揮する',
    'カリスマ性のある人': '集団で力を発揮する',
  },
  work: {
    '仕事ができる人': '仕事を進める',
    'タスク処理がうまい人': '仕事を進める',
    '頭がいい人': '仕事を進める',
    '正しく評価される人': '評価を高める',
    '組織でうまく立ち回れる人': '評価を高める',
    '交渉がうまい人': '合意を導く',
    '交渉がうまい人①': '合意を導く',
    '交渉がうまい人②': '合意を導く',
  },
  life: {
    '充実した人生を過ごせる人': '日々を整える',
    '人生を楽しめる人': '日々を整える',
    '自分らしく生きられる人': '自分の軸を持つ',
    '後悔しない人': '自分の軸を持つ',
    '可能性を広げられる人': '自分の軸を持つ',
    '不安に強い人': '立ち直る力を育てる',
    '立ち直れる人': '立ち直る力を育てる',
  },
};

export function getPersonaThemeTitle(persona: CatalogCategory['subcategories'][number], categoryKey?: CategoryKey) {
  const standardizedTheme = categoryKey ? personaThemeTitles[categoryKey][persona.name] : undefined;
  if (standardizedTheme) return standardizedTheme;
  const override = categoryKey ? personaThemeOverrides[categoryKey]?.[persona.name] : undefined;
  return override ?? (persona.articleTitle && persona.articleTitle !== persona.name ? persona.articleTitle : persona.name);
}

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

export function getRelatedTheories(theory: TheoryCard) {
  const coReferencedCounts = new Map<string, number>();
  techniqueCards.filter((card) => card.theoryTagIds?.includes(theory.tagId)).forEach((card) => {
    (card.theoryTagIds ?? []).forEach((id) => {
      if (id !== theory.tagId) coReferencedCounts.set(id, (coReferencedCounts.get(id) ?? 0) + 1);
    });
  });
  return theories.filter((candidate) => candidate.tagId !== theory.tagId && !isLockedTheoryShell(candidate)).map((candidate) => {
    return { candidate, score: coReferencedCounts.get(candidate.tagId) ?? 0 };
  }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title, 'ja')).map(({ candidate }) => candidate);
}

// Theory detail pages use this exact reverse index rather than re-running a
// loose similarity search. It is therefore the strict inverse of the links
// displayed on every technique card.
export function getTechniquesForTheory(theoryOrId: TheoryCard | string) {
  const theoryId = typeof theoryOrId === 'string' ? theoryOrId : theoryOrId.tagId;
  return [...(techniqueCardsByTheoryId.get(theoryId) ?? [])]
    .sort((a, b) => {
      const primaryDifference = (a.theoryTagIds ?? []).indexOf(theoryId) - (b.theoryTagIds ?? []).indexOf(theoryId);
      return primaryDifference || a.id.localeCompare(b.id);
    });
}

export function getFeed(interests: CategoryKey[], savedIds: string[]) {
  const interestSet = new Set(interests);
  const savedTheoryIds = new Set(savedIds.flatMap((id) => techniqueById.get(id)?.theoryTagIds ?? []));
  return [...techniqueCards].sort((a, b) => {
    const score = (card: TechniqueCard) => (interestSet.has(card.categoryKey) ? 10 : 0) + (card.theoryTagIds ?? []).filter((id) => savedTheoryIds.has(id)).length * 2;
    return score(b) - score(a) || a.id.localeCompare(b.id);
  });
}
