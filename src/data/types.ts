export type CategoryKey =
  | 'interpersonal'
  | 'work'
  | 'life';

export type TechniqueSource = {
  id: string;
  title: string;
  theories?: string[];
  relatedTheoryIds?: string[];
  theoryTagIds?: string[];
  subtitle?: string;
  explanation?: string;
  essence?: string;
  tags?: string[];
  status?: string;
  displayOrder?: number;
  practicalActions?: TechniquePracticalActions;
};

export type TechniquePracticalActions = {
  todayActions: string[];
  examples: string[];
  cautions: string[];
};

export type TechniqueCard = TechniqueSource & {
  categoryKey: CategoryKey;
  categoryName: string;
  subcategory: string;
  articleTitle: string;
};

export type TheoryCard = {
  tagId: string;
  originalNumber?: number;
  title: string;
  summary?: string | null;
  definition?: string;
  keyPoints?: string[];
  pitfalls?: string[];
  strategies?: string[];
  applicationConditions?: string[];
  sourceType: string;
  discipline: string;
  conceptType: string;
  sourceName?: string | null;
  sourceDetail?: string | null;
  provenance?: TheoryProvenance;
  domains?: string[];
  principles?: string[];
  relatedIds?: string[];
  reliability?: string;
  status?: string;
  notes?: string | null;
  categoryId: string;
  categoryTitle: string;
};

export type TheoryProvenance = {
  status: '確認済み' | '一部確認' | '出典不明';
  attribution?: string;
  works?: string[];
  note?: string;
};

export type CatalogCategory = {
  key: CategoryKey;
  name: string;
  subcategories: {
    name: string;
    articleTitle?: string;
    items: TechniqueSource[];
  }[];
};
