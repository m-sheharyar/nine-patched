import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['build', 'coverage', 'playwright-report', 'test-results', 'node_modules', '.claude'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // `const { omitted: _omitted, ...rest } = obj` is how a field is dropped on purpose.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Three existing spots (two controlled inputs that mirror a prop into local text, one
      // "latest value" ref) trip these newer rules. Rewriting them changes input timing, so they
      // stay visible as warnings until that is done with its own tests.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
  {
    files: ['src/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'warn',
    },
  },
  {
    files: ['e2e/**/*.ts', '*.config.ts', '*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  eslintConfigPrettier,
);
