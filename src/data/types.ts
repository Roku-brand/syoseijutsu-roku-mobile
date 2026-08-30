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
  importance?: 1 | 2 | 3;
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
  title: string;
  /** 理論を説明する唯一の本文。UIでは「概要」と表示する。 */
  summary: string;
  categoryId: string;
  categoryTitle: string;
  /** 出典を確認できる理論にだけ保持する補足メタデータ。 */
  provenance?: TheoryProvenance;
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
