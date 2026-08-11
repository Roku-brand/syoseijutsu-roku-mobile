const techniqueRange = (from: number, to: number) =>
  Array.from(
    { length: to - from + 1 },
    (_, index) => `complete-${String(from + index).padStart(3, '0')}`,
  );

export const FREE_PERSONA_NAMES = [
  '印象がいい人',
  '会話がうまい人',
  '軽く扱われない人',
  '不安に強い人',
] as const;

export const FREE_PERSONA_NAME_SET = new Set<string>(FREE_PERSONA_NAMES);

export const FREE_REEL_TECHNIQUE_IDS = [
  ...techniqueRange(1, 27),
  ...techniqueRange(75, 87),
  ...techniqueRange(200, 204),
] as const;

export const FREE_DISCOVER_TECHNIQUE_IDS = FREE_REEL_TECHNIQUE_IDS;

export const FREE_THEORY_IDS = [
  'kb_003', 'kb_004', 'kb_029', 'kb_045', 'kb_221', 'kb_265',
  'kb_104', 'kb_134', 'kb_138', 'kb_273',
  'kb_064', 'kb_082', 'kb_192',
  'kb_142', 'kb_284',
  'kb_299', 'kb_333', 'kb_342',
  'kb_329', 'kb_338',
] as const;

export const FREE_LEARNING_CASE_IDS = Array.from(
  { length: 7 },
  (_, index) => `case-${String(index + 1).padStart(2, '0')}`,
);

export const FREE_TECHNIQUE_IDS = new Set<string>([
  ...FREE_REEL_TECHNIQUE_IDS,
  ...FREE_DISCOVER_TECHNIQUE_IDS,
]);
export const FREE_THEORY_ID_SET = new Set<string>(FREE_THEORY_IDS);
export const FREE_LEARNING_CASE_ID_SET = new Set<string>(FREE_LEARNING_CASE_IDS);

export function canReadTechnique(access: 'guest' | 'free' | 'paid', id: string) {
  return access === 'paid' || FREE_TECHNIQUE_IDS.has(id);
}

export function isFreePersona(name: string) {
  return FREE_PERSONA_NAME_SET.has(name);
}

export function canReadTheory(access: 'guest' | 'free' | 'paid', id: string) {
  return access === 'paid' || FREE_THEORY_ID_SET.has(id);
}

export function canPlayLearningCase(access: 'guest' | 'free' | 'paid', id: string) {
  return access === 'paid' || FREE_LEARNING_CASE_ID_SET.has(id);
}
