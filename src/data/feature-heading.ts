export const guidelineTitle = '押さえておくべき5つの処世術';

export function mobileFeatureHeading(text: string) {
  return text
    .replace(/(押さえておくべき5つの処世術(?:指針)?)[\s/／]*(?=[ー―—−]分散戦略)/g, '$1\n')
    .replace(/(可変性の自覚・)[\s/／]*(?=偶然の設計)/g, '$1\n');
}

