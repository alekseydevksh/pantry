// Tells Apollo's types that operation results are masked the way GraphQL Codegen generates them
// (ADR 0007): `useQuery` data hides fields of fragment spreads, and `useFragment` unmasks them.
import '@apollo/client';
import type { GraphQLCodegenDataMasking } from '@apollo/client/masking';

declare module '@apollo/client' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- module augmentation: the interface only adds Apollo's codegen masking types
  interface TypeOverrides extends GraphQLCodegenDataMasking.TypeOverrides {}
}
