import type { CodegenConfig } from '@graphql-codegen/cli';

// Run with `pnpm codegen` from the repo root.
// Input: the schema and every `.graphql` operation in the app.
// Output: `src/generated/`, with one typed document per operation (for example `FeedPreviewDocument`).
// The generated files are committed, and CI fails when they are out of date.
const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: ['../../apps/mobile/src/**/*.graphql'],
  generates: {
    './src/generated/': {
      preset: 'client',
      presetConfig: {
        // Off for now: components read fragment data directly. Revisit with the Apollo setup (task 2.1).
        fragmentMasking: false,
      },
      config: {
        useTypeImports: true,
        // String unions instead of TS enums: no runtime code, and plain strings from JSON are assignable.
        enumsAsTypes: true,
        // `field?: T | null` only where the schema allows null; no `Maybe` wrapper on inputs we build.
        avoidOptionals: { field: true },
        strictScalars: true,
      },
    },
  },
};

export default config;
