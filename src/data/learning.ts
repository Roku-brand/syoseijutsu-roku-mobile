import learningSource from './generated/learning.json';

export type LearningChoice = { id: 'a' | 'b' | 'c'; label: string };
export type LearningCase = {
  id: string;
  stage: 1 | 2 | 3;
  number: number;
  eyebrow: string;
  title: string;
  situation: string;
  question: string;
  choices: LearningChoice[];
  goodChoiceId: LearningChoice['id'];
  goodMove: string;
  why: string;
  caution: string;
  relatedCardIds: string[];
};
export type LearningStage = { number: 1 | 2 | 3; title: string; intro: string };
export type LearningChoiceReview = { isPreferred: boolean; label: string; text: string };

/**
 * 学習ケースから開く処世術の正規リンク。
 *
 * 学習コンテンツには旧版の complete-* ID が残っている場合があるため、
 * ここでは最新版カタログの latest-* ID をケース単位で正規化する。
 * 順序は「そのケースの判断を理解するために先に読むカード」を優先する。
 */
export const optimizedLearningRelatedCardIds: Record<string, string[]> = {
  'case-01': ['latest-015', 'latest-052'],
  'case-02': ['latest-021', 'latest-025'],
  'case-03': ['latest-033', 'latest-032'],
  'case-04': ['latest-152', 'latest-151'],
  'case-05': ['latest-022', 'latest-006'],
  'case-06': ['latest-062', 'latest-074'],
  'case-07': ['latest-099', 'latest-100'],
  'case-08': ['latest-189', 'latest-204'],
  'case-09': ['latest-103', 'latest-196'],
  'case-10': ['latest-293', 'latest-046'],
  'case-11': ['latest-092', 'latest-304'],
  'case-12': ['latest-171', 'latest-333'],
  'case-13': ['latest-167', 'latest-310'],
  'case-14': ['latest-089', 'latest-087'],
  'case-15': ['latest-515', 'latest-390'],
  'case-16': ['latest-492', 'latest-486'],
  'case-17': ['latest-375', 'latest-493'],
  'case-18': ['latest-482', 'latest-470'],
  'case-19': ['latest-451', 'latest-452'],
  'case-20': ['latest-403', 'latest-210'],
  'case-21': ['latest-472', 'latest-473'],
};

function normalizeLearningCase(item: LearningCase): LearningCase {
  return item;
}

export const learningStages: LearningStage[] = [
  { number: 1, title: '空気、どうする？', intro: 'まずは、場に飲まれずに動けるか。' },
  { number: 2, title: 'それ、どう返す？', intro: '頼まれたとき、押されたときの一手。' },
  { number: 3, title: 'で、自分はどうする？', intro: '最後は、自分の人生を自分で選ぶ。' },
];

const publicLearningCases = (learningSource as LearningCase[]).map(normalizeLearningCase);
export const learningCases: LearningCase[] = [...publicLearningCases];

export function replaceLearningCases(items: LearningCase[]) {
  learningCases.splice(0, learningCases.length, ...items.map(normalizeLearningCase));
}
export function resetLearningCases() {
  replaceLearningCases(publicLearningCases);
}
export function getLearningCase(id: string) {
  return learningCases.find((item) => item.id === id);
}
export function getChoiceReview(item: LearningCase, choice: LearningChoice): LearningChoiceReview {
  const isPreferred = choice.id === item.goodChoiceId;
  return {
    isPreferred,
    label: isPreferred ? 'よりよい一手' : '選べるが、今回は惜しい手',
    text: isPreferred ? item.why : 'この手にも意図はある。ただ、今回の局面では状況を前に進める力が弱い。',
  };
}
