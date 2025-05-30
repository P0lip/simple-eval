import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        project: './tsconfig.eslint.json',
      },
    },
    rules: {
      'func-names': 'off',
      'no-param-reassign': 'warn',
      'no-restricted-syntax': ['error', 'ArrayPattern'],
      'sort-keys': 'error',
      'no-void': 'off',
      'no-undefined': 'error',

      // Include recommended and strict rules from plugins
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs.strict.rules,
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
    },
  },
];
