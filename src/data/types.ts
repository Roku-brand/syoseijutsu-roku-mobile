export type CategoryKey =
  | 'relationships'
  | 'work'
  | 'mental'
  | 'life'
  | 'challenge';

export type TechniqueSource = {
  id: string;
  title: string;
  theories?: string[];
  theoryTagIds?: string[];
  subtitle?: string;
};

export type TechniqueCard = TechniqueSource & {
  categoryKey: CategoryKey;
  categoryName: string;
  subcategory: string;
  articleTitle: string;
};

export type TheoryCard = {
  tagId: string;
  title: string;
  summary: string;
  definition?: string;
  keyPoints?: string[];
  pitfalls?: string[];
  strategies?: string[];
  applicationConditions?: string[];
  categoryId: string;
  categoryTitle: string;
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
