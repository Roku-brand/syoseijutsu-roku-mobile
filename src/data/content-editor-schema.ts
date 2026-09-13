import type { TheoryCard } from './types';
export const theoryCategories = [
 ['psychology', '心理学'], ['behavioral-science', '行動科学'], ['organization-management', '組織・経営論'],
 ['strategy', '戦略論'], ['classics-thought', '古典・思想'], ['maxims-experience', '格言・経験則・作品'],
] as const;
export function validateTheoryForPublish(theory: Omit<TheoryCard, 'status'>): string[] {
 const errors: string[] = [];
 if (!theory.title.trim()) errors.push('タイトルを入力してください。');
 if (!theory.summary.trim()) errors.push('概要を入力してください。');
 if (!theoryCategories.some(([id]) => id === theory.categoryId)) errors.push('カテゴリを選択してください。');
 if (theory.relatedTheoryIds?.includes(theory.tagId)) errors.push('自分自身を関連理論に指定できません。');
 if (theory.provenance?.sources?.some((source) => !source.title.trim() || !/^https:\/\/\S+$/.test(source.url))) errors.push('参照先には名称とhttpsのURLを入力してください。');
 return errors;
}
