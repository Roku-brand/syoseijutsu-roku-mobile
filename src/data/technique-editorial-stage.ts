export const techniqueEditorialStages = [
  ['title_only', 'タイトルのみ'],
  ['title_essence', 'タイトル・本質'],
  ['title_essence_explanation', 'タイトル・本質・解説'],
  ['publishable', '公開可能'],
] as const;

export type TechniqueEditorialStage = typeof techniqueEditorialStages[number][0];

export function legacyTechniqueEditorialStage(value: {
  status?: unknown;
  essence?: string;
  explanation?: string;
}): TechniqueEditorialStage {
  if (!value.essence?.trim()) return 'title_only';
  if (!value.explanation?.trim()) return 'title_essence';
  return value.status === 'published' ? 'publishable' : 'title_essence_explanation';
}
