export const GENERATIONAL_CONCERNS = 'generational-concerns';
export const FEATURE_SERIES = [
  { id: 'editorial', label: 'ふかぼり処世術記事' },
  { id: GENERATIONAL_CONCERNS, label: '各世代の悩み' },
] as const;

export const LIFE_STAGES = [
  { id: 'student', label: '学生時代' },
  { id: 'young-adult', label: '青年期' },
  { id: 'early-career', label: '社会人初期' },
  { id: 'crossroads', label: '人生の分岐点' },
  { id: 'family-formation', label: '家庭形成期' },
  { id: 'midlife-and-later', label: '中年期以降' },
] as const;

export type FeatureSeriesId = typeof FEATURE_SERIES[number]['id'];
export type LifeStageId = typeof LIFE_STAGES[number]['id'];

export function lifeStageLabel(value: LifeStageId | null) {
  return LIFE_STAGES.find(stage => stage.id === value)?.label;
}
