import type { CodegenConfig } from '@graphql-codegen/cli';

// Run with `pnpm codegen` from the repo root.
// Input: the schema and every `.graphql` operation in the app.
// Output: `src/generated/`, with one typed document per operation (for example `FeedPreviewDocument`),
// and `possibleTypes.ts` for the Apollo cache.
// The generated files are committed, and CI fails when they are out of date.
const config: CodegenConfig = {
  schema: './schema.graphql',
  documents: ['../../apps/mobile/src/**/*.graphql'],
  generates: {
    './src/generated/': {
      preset: 'client',
      presetConfig: {
        // Codegen's own fragment masking is off because Apollo Client does the masking at runtime
        // (`dataMasking: true`, ADR 0007). The two cannot be used together.
        fragmentMasking: false,
      },
      config: {
        useTypeImports: true,
        // String unions instead of TS enums: no runtime code, and plain strings from JSON are assignable.
        enumsAsTypes: true,
        // `field?: T | null` only where the schema allows null; no `Maybe` wrapper on inputs we build.
        avoidOptionals: { field: true },
        strictScalars: true,
        // Apollo data masking (ADR 0007): a fragment spread appears in the result type as a
        // reference, not as its fields, so a component can read only the fields it selected itself.
        // `@unmask` on a spread opts out (an escape hatch, not for new code).
        inlineFragmentTypes: 'mask',
        customDirectives: { apolloUnmask: true },
      },
    },
    // Which concrete types belong to each union and interface (`CatalogItem`, `Node`). Without it,
    // the cache cannot tell whether a `... on Product` fragment matches an item and has to guess.
    './src/generated/possibleTypes.ts': {
      plugins: ['fragment-matcher'],
      config: { module: 'es2015', useExplicitTyping: true },
    },
  },
};

export default config;
