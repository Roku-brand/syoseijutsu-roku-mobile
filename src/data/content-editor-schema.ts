import { isRetiredTheoryId, quotationErrors } from './theory-knowledge';
import type { TheoryCard } from './types';
export function validateTheoryForPublish(theory: Omit<TheoryCard, 'status'>): string[] {
 const errors: string[] = [];
 if (!theory.title.trim()) errors.push('タイトルを入力してください。');
 if (!theory.summary.trim() && !theory.quotation?.translationText.trim()) errors.push('概要を入力してください。');
 if (!theory.categoryId.trim() || !theory.categoryTitle.trim()) errors.push('カテゴリを選択してください。');
 if (!theory.subcategoryId?.trim()) errors.push('内部分類を選択してください。');
 if (theory.sortOrder != null && (!Number.isInteger(theory.sortOrder) || theory.sortOrder < 1)) errors.push('並び順は1以上の整数にしてください。');
 if (theory.relatedTheoryIds?.includes(theory.tagId)) errors.push('自分自身を関連理論に指定できません。');
 if (theory.provenance?.sources?.some((source) => !source.title.trim() || !/^https:\/\/\S+$/.test(source.url))) errors.push('参照先には名称とhttpsのURLを入力してください。');
 if (isRetiredTheoryId(theory.tagId) || theory.provenance?.status === 'オリジナル') errors.push('独自作成の名言は再公開できません。');
 if (theory.categoryId === 'practical-wisdom' && /^「[^「」]+」$/.test(theory.title)) errors.push('実践知には標語ではなく説明可能な原理・手法を収録してください。');
 if (theory.quotation?.translationText && theory.title !== '「'+theory.quotation.translationText+'」') errors.push('格言の見出しには表示用日本語をそのまま設定してください。');
 if (theory.knowledgeType === 'aphorism' || theory.quotation) errors.push(...quotationErrors(theory.quotation));
 return errors;
}
