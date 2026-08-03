export const FREE_REEL_TECHNIQUE_IDS = [
  'complete-001', 'complete-002', 'complete-003', 'complete-004', 'complete-005',
  'complete-100', 'complete-101', 'complete-102', 'complete-103', 'complete-104',
  'complete-161', 'complete-162', 'complete-163', 'complete-164', 'complete-165',
  'complete-183', 'complete-184', 'complete-187', 'complete-188', 'complete-189',
] as const;

export const FREE_DISCOVER_TECHNIQUE_IDS = Array.from(
  { length: 14 },
  (_, index) => `complete-${String(index + 1).padStart(3, '0')}`,
);

export const FREE_THEORY_IDS = [
  'kb_001', 'kb_004', 'kb_005', 'kb_007', 'kb_008', 'kb_009', 'kb_010', 'kb_013',
  'kb_130', 'kb_131', 'kb_132', 'kb_133', 'kb_134', 'kb_136',
  'kb_221', 'kb_222', 'kb_223', 'kb_224', 'kb_225', 'kb_228',
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

export function canReadTheory(access: 'guest' | 'free' | 'paid', id: string) {
  return access === 'paid' || FREE_THEORY_ID_SET.has(id);
}

export function canPlayLearningCase(access: 'guest' | 'free' | 'paid', id: string) {
  return access === 'paid' || FREE_LEARNING_CASE_ID_SET.has(id);
}
