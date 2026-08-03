import learningSource from './generated/learning.json';

export type LearningChoice = {
  id: 'a' | 'b' | 'c';
  label: string;
};

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

export type LearningStage = {
  number: 1 | 2 | 3;
  title: string;
  intro: string;
};

export const learningStages: LearningStage[] = [
  { number: 1, title: '空気、どうする？', intro: 'まずは、場に飲まれずに動けるか。' },
  { number: 2, title: 'それ、どう返す？', intro: '頼まれたとき、押されたときの一手。' },
  { number: 3, title: 'で、自分はどうする？', intro: '最後は、自分の人生を自分で選ぶ。' },
];

const publicLearningCases = learningSource as LearningCase[];
export const learningCases: LearningCase[] = [...publicLearningCases];

export function replaceLearningCases(items: LearningCase[]) {
  learningCases.splice(0, learningCases.length, ...items);
}

export function resetLearningCases() {
  replaceLearningCases(publicLearningCases);
}
