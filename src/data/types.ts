/** Category IDs are managed in Supabase, so owners may add categories. */
export type CategoryKey = string;

export type TechniqueSource = {
  id: string;
  title: string;
  theories?: string[];
  relatedTheoryIds?: string[];
  /** 「主要理論」として先に示す代表的な理論。relatedTheoryIds の部分集合。 */
  primaryTheoryIds?: string[];
  theoryTagIds?: string[];
  subtitle?: string;
  importance?: 1 | 2 | 3;
  explanation?: string;
  essence?: string;
  tags?: string[];
  status?: string;
  displayOrder?: number;
  imagePath?: string | null;
  accessTier?: 'free' | 'complete';
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
  /** Stable, public sequence number. The route/relation key remains tagId. */
  displayId?: number | null;
  /** Requested number while an item is still a draft. */
  draftDisplayId?: number | null;
  title: string;
  /** 理論を説明する唯一の本文。UIでは「概要」と表示する。 */
  summary: string;
  categoryId: string;
  categoryTitle: string;
  /** 英語名・邦訳違い・略称など、同じ理論へ到達する検索語。 */
  aliases?: string[];
  /** 編集者が意味的な近さを確認した、次に読む価値の高い理論。 */
  relatedTheoryIds?: string[];
  /** 無料版ではタイトルだけを公開する完全版理論を識別する。 */
  status?: 'published' | 'locked';
  displayOrder?: number | null;
  imagePath?: string | null;
  accessTier?: 'free' | 'complete';
  /** 出典を確認できる理論にだけ保持する補足メタデータ。 */
  provenance?: TheoryProvenance;
};

export type TheoryProvenance = {
  status: '確認済み' | '書誌確認済み' | '一部確認' | '出典不明';
  attribution?: string;
  /** 参照文献の発表・刊行時期。理論の初出年とは限らない。 */
  period?: string;
  works?: string[];
  sources?: { title: string; url: string }[];
  note?: string;
};

export type CatalogCategory = {
  key: CategoryKey;
  name: string;
  subcategories: {
    name: string;
    articleTitle?: string;
    displayOrder?: number;
    items: TechniqueSource[];
  }[];
};
