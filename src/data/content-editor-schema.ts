import type { TheoryCard } from './types';
import { THEORY_CATEGORIES } from './theory-categories';
export function validateTheoryForPublish(theory: Omit<TheoryCard, 'status'>): string[] {
 const errors: string[] = [];
 if (!theory.title.trim()) errors.push('タイトルを入力してください。');
 if (!theory.summary.trim()) errors.push('概要を入力してください。');
 if (!THEORY_CATEGORIES.some(({ id }) => id === theory.categoryId)) errors.push('カテゴリを選択してください。');
 if (theory.relatedTheoryIds?.includes(theory.tagId)) errors.push('自分自身を関連理論に指定できません。');
 if (theory.provenance?.sources?.some((source) => !source.title.trim() || !/^https:\/\/\S+$/.test(source.url))) errors.push('参照先には名称とhttpsのURLを入力してください。');
 return errors;
}

