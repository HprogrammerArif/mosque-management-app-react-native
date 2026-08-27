import tseslint from 'typescript-eslint';
import expoConfig from 'eslint-config-expo/flat.js';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.expo/**', 'ios/**', 'android/**'] },
  ...expoConfig,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // ADR-0010: no styling library. StyleSheet with a typed theme only.
    // RTL: logical properties only, never physical left/right.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [
          { name: 'nativewind', message: 'No styling library (ADR-0010). Use StyleSheet + the typed theme.' },
          { name: 'tailwindcss', message: 'No styling library (ADR-0010). Use StyleSheet + the typed theme.' },
          { name: 'tamagui', message: 'No styling library (ADR-0010). Use StyleSheet + the typed theme.' },
          { name: 'class-variance-authority', message: 'No styling library (ADR-0010). Use StyleSheet + the typed theme.' },
        ],
      }],
      'no-restricted-syntax': ['error', {
        selector: "Property[key.name=/^(paddingLeft|paddingRight|marginLeft|marginRight|left|right)$/]",
        message: 'Use logical properties (paddingStart/paddingEnd/etc.) — RTL (NFR-I18N-3).',
      }],
    },
  },
  {
    // src/api/contract.gen.ts is generated — never hand-edited (ADR-0011).
    files: ['src/api/contract.gen.ts'],
    rules: { '@typescript-eslint/consistent-type-imports': 'off' },
  },
);
