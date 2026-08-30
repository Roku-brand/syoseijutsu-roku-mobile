import learningSource from './generated/learning.public.json';

export type LearningChoice = { id: 'a' | 'b' | 'c'; label: string; review: string };
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

export const learningStages: LearningStage[] = [
  { number: 1, title: '人と、どう関わる？', intro: '安心、信頼、境界線を場面で選ぶ。' },
  { number: 2, title: '仕事を、どう動かす？', intro: '依頼、会議、交渉、リーダーシップを扱う。' },
  { number: 3, title: '自分を、どう立て直す？', intro: '不安、選択、失敗から次の一手を選ぶ。' },
];

const publicLearningCases = learningSource as LearningCase[];
export const learningCases: LearningCase[] = [...publicLearningCases];

export function replaceLearningCases(items: LearningCase[]) {
  learningCases.splice(0, learningCases.length, ...items);
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
    label: isPreferred ? 'よりよい一手' : 'この手で起きること',
    text: choice.review,
  };
}
