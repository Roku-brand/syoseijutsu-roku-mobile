import retiredIds from './generated/retired-theory-ids.json';
import type { TheoryQuotation, TheoryRelation, TheoryRelationType } from './types';

const retired = new Set<string>(retiredIds);
export const isRetiredTheoryId = (id: string) => retired.has(id);
export const RETIRED_THEORY_TITLE = '公開を終了した知識';

export const KNOWLEDGE_TYPES = {
  unspecified: '未設定', theory: '理論', principle: '法則・原理', phenomenon: '現象・効果',
  model: 'モデル', method: '手法', heuristic: '経験則', thought: '思想', aphorism: '格言・ことわざ',
} as const;
export const RELATION_TYPES: Record<TheoryRelationType, string> = {
  contains: '包含・構成', explains: '現象と説明', applies: '原理と応用',
  contrasts: '対照', complements: '補完', related: '関連',
};
export function relationLabel(relation: TheoryRelation, currentId: string): string {
  const forward = relation.sourceId === currentId;
  switch (relation.type) {
    case 'contains': return forward ? '構成要素' : '上位の知識';
    case 'explains': return forward ? '説明する現象' : '説明する知識';
    case 'applies': return forward ? '応用・手法' : '背景となる原理';
    case 'contrasts': return '対照する知識';
    case 'complements': return '補完する知識';
    default: return 'あわせて読む';
  }
}
export function quotationErrors(q?: TheoryQuotation): string[] {
  if (!q) return ['格言には原文・原典・権利確認の記録が必要です。'];
  const errors: string[] = [];
  for (const [label, value] of [['原文', q.originalText], ['表示文', q.translationText], ['著作者', q.author], ['原典', q.work], ['原典内の位置', q.locator], ['権利判定の根拠', q.rightsBasis]] as const) {
    if (!value?.trim()) errors.push(`${label}を入力してください。`);
  }
  if (q.verification !== 'verified' || q.rightsStatus !== 'cleared') errors.push('原典と権利の確認が済むまで格言は公開できません。');
  if (!Number.isInteger(q.authorDeathYear) || q.authorDeathYear! > 1950) errors.push('今回の格言は1950年以前に亡くなった著作者が対象です。');
  if (!Number.isInteger(q.publicationYear) || q.publicationYear! > 1950) errors.push('初出・参照版の刊行年を確認してください。');
  if (!['original_japanese', 'independent_translation', 'classical_transcription'].includes(q.translationKind ?? '')) errors.push('原文または独自訳の区分を選択してください。');
  if (!q.sourceUrls?.length || q.sourceUrls.some(url => !/^https:\/\/\S+$/.test(url))) errors.push('原典を確認できるhttpsの資料URLが必要です。');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.checkedOn ?? '')) errors.push('確認日を入力してください。');
  return errors;
}
