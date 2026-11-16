// One ESLint config for the whole workspace. Run with `pnpm lint` from the repo root.
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import expo from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.expo/**',
      'apps/mobile/ios/**',
      'apps/mobile/android/**',
      'apps/mobile/expo-env.d.ts',
      // Generated: GraphQL types and the seed catalog.
      'packages/shared/src/generated/**',
      'server/data/**',
    ],
  },

  // The Expo preset: TypeScript, import, React and React Hooks rules.
  // `react-hooks` v7 includes the React Compiler rules, which report code the compiler has to skip.
  ...expo,
  // The preset detects the React version from the nearest package.json, and the root has no React.
  { settings: { react: { version: '19.3' } } },

  // Every `eslint-disable` comment must say why: `// eslint-disable-next-line <rule> -- reason`.
  comments.recommended,
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@eslint-community/eslint-comments/require-description': 'error',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // CLAUDE.md: no `any` without a comment that explains why. Together with the rule above,
      // the only way to write `any` is a disable comment with a reason.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // TypeScript already reports imports it cannot resolve, and it knows the `@/` path alias.
      'import/no-unresolved': 'off',
    },
  },

  // Node code: the server, the shared package's tooling, and config files everywhere.
  {
    files: ['server/**', 'packages/shared/**', '**/*.config.{js,mjs,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
  // The preset's React and Expo rules do not apply to server code:
  // Yoga plugins are named `useX` but are not hooks, and `process.env` is real there, not inlined.
  {
    files: ['server/**', 'packages/shared/**'],
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'expo/no-dynamic-env-var': 'off',
      'expo/no-env-var-destructuring': 'off',
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/jest.setup.{js,ts}'],
    languageOptions: { globals: { ...globals.jest } },
  },

  // Last: turns off formatting rules, because Prettier owns formatting.
  prettier,
];
