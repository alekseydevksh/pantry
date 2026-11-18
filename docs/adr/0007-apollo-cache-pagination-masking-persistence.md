# ADR 0007: Apollo cache: pagination, data masking and persistence

- Status: Accepted
- Date: 2026-11-18
- Tasks: [PLAN 2.1](../PLAN.md) (pagination, masking, links), [PLAN 2.3](../PLAN.md) (persistence)

## Context

[ADR 0004](0004-apollo-client-vs-tanstack-query.md) chose Apollo Client 4 with a normalized cache. This ADR records how the cache is set up: how paginated lists are merged, how components read data (data masking), how failed requests are retried, and how the cache survives a restart.

## Decision 1: our own cursor pagination policy

`feed` and `search` use one field policy, `cursorPagination(keyArgs)` in [pagination.ts](../../apps/mobile/src/lib/apollo/pagination.ts):

- **One list per set of non-page arguments.** `feed` has one list (`keyArgs: false`). `search` has one list per `input` (`keyArgs: ['input']`), so "pasta" and "pasta, vegan" are cached separately. `first` and `after` only choose a page.
- **A request without `after` replaces the list** (first load, refetch, pull-to-refresh).
- **A request with `after` appends.** It keeps the edges up to and including the `after` cursor, then adds the new page. Fetching the same page twice gives the same list.
- **Duplicates are dropped by node identity** (`Product:p1`). Two rows with the same id would break FlashList keys.
- `pageInfo` and `totalCount` come from the latest page.

**Alternative: Apollo's `relayStylePagination()`.** It handles most of this, but it does not drop duplicates when the `after` cursor is unknown or pages overlap (for example, an item was inserted on the server between two pages). Our helper is about 40 lines and is tested on its own.

**Consequence.** Apollo serializes `input` with sorted keys, so key order does not matter. However, `{ filters: null }` and an input with no `filters` are two different lists. The search params model (PLAN 3.1) builds one canonical input.

## Decision 2: data masking is on

`new ApolloClient({ dataMasking: true })`, with the GraphQL Codegen setup that Apollo documents:

- `presetConfig.fragmentMasking: false`. Codegen's own masking conflicts with Apollo's at runtime.
- `inlineFragmentTypes: 'mask'` and `customDirectives: { apolloUnmask: true }`.
- The `TypeOverrides` augmentation in [apollo.d.ts](../../apps/mobile/src/lib/apollo/apollo.d.ts).

### Masking vs reading nested data

Take a feed screen whose query spreads a `ProductCardFields` fragment that the `ProductCard` component owns.

**Reading nested data (masking off).** The query result contains every field of every fragment it spreads. The screen can read `item.priceCents` even though only `ProductCard` asked for it. This causes two problems:
- **Hidden coupling.** If somebody removes `priceCents` from the card's fragment, the screen that quietly used it breaks. Nothing in the screen's own query shows the dependency.
- **Wide re-renders.** The screen subscribes to all the data below it. A change in any card's fields (for example, a price update after a cart mutation) gives the screen a new result object, and the change ripples down the list.

**Masking (on).** The query result contains only the fields the query selects itself. A fragment spread appears as an opaque reference. The component that owns the fragment reads its fields with `useFragment({ fragment, from: item })`. This gives two things:
- **Each component's data needs are local and explicit.** Removing a field from a fragment can only affect the component that owns it, and TypeScript enforces this: reading `item.priceCents` from the masked type does not compile.
- **Re-renders are scoped.** `useFragment` subscribes to that one entity's fields in the cache. When `Product:p1` changes, only its card re-renders, not the screen or the other rows. This supports the SPEC 9 goal of "no unnecessary re-renders of list rows".

### Why now

- There are no fragments in the app yet, so turning masking on costs nothing today. Turning it on after the feed, recipe and product screens exist (PLAN 2.5–2.7) would mean rewriting them. Apollo recommends enabling it at the start of a new app.
- Colocated fragments with `useFragment` are the pattern that large Apollo codebases use, and the role this project prepares for uses Apollo.

### What we give up

- One more concept. A screen cannot "just read" a field that a child fragment selected. It must select the field itself or let the child render it.
- More hooks. Each row component calls `useFragment`.
- `@unmask` exists as an escape hatch, but it should not be used in new code.

### Rules for this repo

- A component that needs entity fields declares a fragment in its feature's `api/` folder and reads it with `useFragment`.
- Fragment names are unique across the app (`ProductCardFields`, `RecipeHeaderFields`).
- Every parent selection that spreads a fragment also selects the entity's `id`, so `useFragment` can find the entity in the cache.
- `cache.readQuery` and `cache.readFragment` are never masked. Cache code (type policies, the persistor, mutation `update` functions) sees full data.

## Decision 3: links, retries and timeouts

The link chain is `ErrorLink → RetryLink → HttpLink`, in [links.ts](../../apps/mobile/src/lib/apollo/links.ts).

- **Retry** ([retry.ts](../../apps/mobile/src/lib/apollo/retry.ts)):
  - Network errors and HTTP 5xx are retried, up to 3 attempts in total, with jittered backoff from 300 ms, capped at 3 s.
  - HTTP 4xx, unparseable responses and GraphQL errors are never retried. The same request gives the same answer.
  - Cancelled requests are never retried.
  - **Mutations are retried only when they carry an `idempotencyKey`.** The server applies a keyed mutation once even if only the response was lost. A future mutation without a key cannot be applied twice by accident.
- **Timeout** ([fetchWithTimeout.ts](../../apps/mobile/src/lib/apollo/fetchWithTimeout.ts)): React Native's `fetch` has no timeout, so a request to a server that never answers would hang forever and never be retried. After 15 s it fails with `RequestTimeoutError`, which is retried. A cancel keeps its `AbortError`, which is not retried.
- **Error reporting.** The error link is outside the retry link. It reports an error once, after the retries run out, to [observability](../../apps/mobile/src/lib/observability/index.ts) (`reportError`). Sentry plugs in there (PLAN 5.5). Cancelled requests are not reported.
- **`possibleTypes`** is generated from the schema by the `fragment-matcher` codegen plugin. Without it, the cache cannot tell whether `... on Product` matches an item of the `CatalogItem` union.

## Decision 4: persistence

Added in PLAN 2.3.

## Consequences

- Pagination and retry rules are pure functions with unit tests ([tests](../../apps/mobile/src/lib/apollo/__tests__/)).
- Feature components from PLAN 2.5 on use fragments and `useFragment`. Screens pass entity references down, not field values.
- The search params model (PLAN 3.1) must build a canonical `SearchInput`.
