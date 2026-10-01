import tsParser from '@typescript-eslint/parser';

// Check JavaScript syntax/logic and TypeScript syntax. Type semantics are checked by tsc.
const rules = {
  'constructor-super': 'error',
  'for-direction': 'error',
  'getter-return': 'error',
  'no-async-promise-executor': 'error',
  'no-constant-condition': 'error',
  'no-dupe-args': 'error',
  'no-dupe-class-members': 'error',
  'no-dupe-else-if': 'error',
  'no-dupe-keys': 'error',
  'no-invalid-regexp': 'error',
  'no-promise-executor-return': 'error',
  'no-unreachable': 'error',
  'no-unsafe-finally': 'error',
  'no-unsafe-negation': 'error',
  'use-isnan': 'error',
  'valid-typeof': 'error',
};
export default [
  { ignores: ['**/node_modules/**', 'dist/**', 'dist-secure-content/**', 'release-evidence/**', 'scripts/retire-maxims-catalog.mjs', 'scripts/sync-theory-rights.mjs'] },
  { files: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs', 'tests/**/*.{ts,mjs}'], rules },
  { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tsParser } },
];
