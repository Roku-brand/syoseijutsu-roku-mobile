import policy from './editorial-policy.json';
export const EDITORIAL_PRODUCER = policy.producer;
export const EDITORIAL_INTRODUCTION = policy.introduction;
export const KNOWLEDGE_PHILOSOPHY = policy.philosophy;
export const LASTING_KNOWLEDGE_VALUE = policy.lastingValue;
export const EDITORIAL_POLICY_PARAGRAPHS = policy.paragraphs;
export function fictionalGuideNotice(name: string) {
  return `${name}は、処世術禄の世界観を表現する架空の編集キャラクターです。記事は${EDITORIAL_PRODUCER}が制作しています。`;
}
