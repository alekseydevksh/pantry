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

## Decision 4: our own cache persistor

The persistor is in [cachePersistor.ts](../../apps/mobile/src/lib/apollo/persistence/cachePersistor.ts) and is wired in [appClient.ts](../../apps/mobile/src/lib/apollo/appClient.ts). `apollo3-cache-persist` is unmaintained and targets Apollo Client 3. The persistor is about 150 lines of tested code and does exactly what we need.

- **Restore before the first render, with no gate.** MMKV reads and `cache.restore()` are synchronous, so the cache is restored while the app client module loads, before `ApolloProvider` renders. The first screen shows cached data at once, also offline, with no splash-screen wait and no "restoring" state.
- **Separate storage.** The cache goes in its own MMKV instance (`pantry.apollo-cache`, from task 2.2). A purge can never touch settings or the offline queue (ADR 0005).
- **Debounced save.** The persistor wraps the cache's write methods (`write`, `modify`, `evict`, `reset`). `writeQuery`, `writeFragment` and query results all go through `write`.
  - A save runs 1 s after the last write, and at most 5 s after the first unsaved one. With constant writes, such as scrolling through feed pages, a plain debounce would never save.
  - The save writes `cache.extract(false)`, so only confirmed data is saved, never optimistic changes of in-flight mutations. Queued offline operations live in Zustand.
- **Flush when the app leaves the foreground**, on both `inactive` and `background` ([flushOnAppStateChange.ts](../../apps/mobile/src/lib/apollo/persistence/flushOnAppStateChange.ts)). iOS goes through `inactive` when the user opens the app switcher, and a kill from there may never reach `background`. Android goes straight to `background`.
- **Size limit: 5 MB, all or nothing.** The persistor measures the UTF-8 byte length of the JSON, which is what MMKV stores. A cache over the limit is **purged from storage**, never saved in part: a part of a normalized cache would have dangling references. The in-memory cache is not touched, and the purge is reported once per session. Saving resumes when the cache fits again.
- **Version.** `CACHE_VERSION = "<format>:<schema hash>"` ([version.ts](../../apps/mobile/src/lib/apollo/persistence/version.ts)). A stored cache with another version, or with no version, is dropped rather than restored.
  - The schema hash is FNV-1a of `schema.graphql`. A guard test fails when the schema changes and the hash was not updated, so every schema change drops old caches after an app update. Nothing is generated at runtime.
  - The format number is bumped by hand for changes the schema does not show, such as `keyFields`, merge functions or new type policies.
  - An OTA update that only changes queries keeps the cache. Apollo treats a missing field as a cache miss and fetches it.
- **Damaged data never crashes the app.** Invalid JSON, a non-object, or a `cache.restore` that throws: the persistor starts with an empty cache, purges the stored copy and reports the error.

**Alternatives.**
- `apollo3-cache-persist`: unmaintained, and built for Apollo Client 3.
- An async restore behind a splash screen: needed with AsyncStorage, but not with MMKV.
- Trimming the cache to fit, for example dropping old search results first: this keeps more data offline but needs knowledge of which roots matter. It is the next step if the 5 MB purge shows up in production metrics.
- A shorter debounce: more writes of a multi-MB string. One second plus the foreground flush loses at most the last second of data on a crash.

**Costs.**
- Restoring a large cache runs `JSON.parse` on the JS thread at startup. For 5 MB we assume tens of ms on a mid-range phone; this is an assumption until PLAN 5.6 measures it. The 5 MB cap bounds the cost.
- Each save serializes the whole cache, not a diff. This is fine at this size, and the debounce keeps saves rare.

## Consequences

- Pagination, retry and persistence rules have unit tests ([tests](../../apps/mobile/src/lib/apollo/__tests__/)).
- Feature components from PLAN 2.5 on use fragments and `useFragment`. Screens pass entity references down, not field values.
- The search params model (PLAN 3.1) must build a canonical `SearchInput`.
- A schema change also needs a new `SCHEMA_HASH` in `version.ts`; the guard test says so and gives the value.
