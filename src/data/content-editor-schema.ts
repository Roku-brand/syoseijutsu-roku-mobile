import type { TheoryCard } from './types';
export function validateTheoryForPublish(theory: Omit<TheoryCard, 'status'>): string[] {
 const errors: string[] = [];
 if (!theory.title.trim()) errors.push('タイトルを入力してください。');
 if (!theory.summary.trim()) errors.push('概要を入力してください。');
 if (!theory.categoryId.trim() || !theory.categoryTitle.trim()) errors.push('カテゴリを選択してください。');
 if (!theory.subcategoryId?.trim()) errors.push('内部分類を選択してください。');
 if (theory.sortOrder != null && (!Number.isInteger(theory.sortOrder) || theory.sortOrder < 1)) errors.push('並び順は1以上の整数にしてください。');
 if (theory.relatedTheoryIds?.includes(theory.tagId)) errors.push('自分自身を関連理論に指定できません。');
 if (theory.provenance?.sources?.some((source) => !source.title.trim() || !/^https:\/\/\S+$/.test(source.url))) errors.push('参照先には名称とhttpsのURLを入力してください。');
 if (theory.provenance?.status === 'オリジナル' || (theory.categoryId === 'practical-wisdom' && /^「[^「」]+」$/.test(theory.title))) {
  if (!/^「[^「」]+」$/.test(theory.title)) errors.push('実践知のタイトルは「」で囲んでください。');
  const p = theory.provenance;
  if (p?.status !== 'オリジナル' || p.attribution !== '処世術禄' || p.works?.length !== 1 || p.works[0] !== '処世術禄オリジナル' || p.note !== '処世術禄によるオリジナルの実践知です。' || !!p.sources?.length || !!p.period) errors.push('実践知の出典は処世術禄オリジナルにしてください。');
 }
 return errors;
}
