import type { CategoryKey } from './types';

/**
 * 完全版216件を、人物像ごとに集計した表紙表示用の公開メタデータ。
 * 本文は含めず、無料版の同梱データが一部だけでも総件数を正しく表示する。
 */
const PERSONA_TECHNIQUE_COUNTS: Record<CategoryKey, Record<string, number>> = {
  interpersonal: {
    '印象がいい人': 14,
    '会話がうまい人': 13,
    '信頼される人': 8,
    '関係を長く続けられる人': 7,
    '人に振り回されない人': 14,
    '人を見抜ける人': 7,
    '集団に馴染める人': 11,
    '軽く扱われない人': 13,
    '集団を動かせる人': 12,
  },
  work: {
    '仕事ができる人': 6,
    '正しく評価される人': 8,
    '組織で影響力を持つ人': 4,
    '交渉がうまい人': 16,
    '合意をまとめられる人': 11,
    'すぐ始められる人': 3,
    '続けられる人': 6,
    '成果を出せる人': 7,
  },
  life: {
    '人生を豊かにできる人': 7,
    '人生設計がうまい人': 10,
    '後悔しない人': 5,
    '感情に振り回されない人': 8,
    '思い込みに流されない人': 9,
    '不安に強い人': 5,
    '挫折から立ち直れる人': 8,
    '運をつかめる人': 4,
  },
};

export function getTechniqueCount(category: CategoryKey, persona: string, fallback: number) {
  return PERSONA_TECHNIQUE_COUNTS[category][persona] ?? fallback;
}

export function getTechniqueCountTotal() {
  return Object.values(PERSONA_TECHNIQUE_COUNTS).reduce(
    (categoryTotal, personas) => categoryTotal + Object.values(personas).reduce((total, count) => total + count, 0),
    0,
  );
}
