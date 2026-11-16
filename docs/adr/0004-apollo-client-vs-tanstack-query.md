# ADR 0004: Apollo Client, not TanStack Query

- Status: Accepted
- Date: 2026-11-16

## Context

The API is GraphQL. The app shows the same entities in many places: a product appears in the feed, in search results, on its details screen, in assistant cards and in the cart. The cart needs optimistic updates. Lists use cursor pagination. The data must survive a restart and show offline.

The two realistic choices are Apollo Client 4 and TanStack Query with a small GraphQL fetcher (`graphql-request`).

## Decision

Use **Apollo Client 4** with typed documents from GraphQL Codegen.

## Comparison

| | Apollo Client | TanStack Query + fetcher |
|---|---|---|
| Cache model | Normalized: one record per entity (`Product:42`), shared by every query | Per query key: each query keeps its own copy of the response |
| Same entity on many screens | Updated everywhere automatically after a mutation | You invalidate or patch each affected query key by hand |
| Optimistic updates | `optimisticResponse` writes to the normalized cache and rolls back on error | `onMutate` / `onError`, patching each query by hand |
| Cursor pagination | Type policies (`merge` / `read`) per field | `useInfiniteQuery`, simpler to start with |
| GraphQL features | Fragments, `@defer`, subscriptions, persisted queries, federation-aware tooling | Not GraphQL-aware; it only sees a promise |
| Persistence | Not built in; we write a small persistor ([PLAN 2.3](../PLAN.md)) | Official persister plugin |
| Bundle size and complexity | Larger; the cache has a learning curve and sharp edges (missing ids, merge functions) | Smaller; easier mental model |
| Best fit | GraphQL APIs with shared entities | REST, or GraphQL with mostly independent screens |

## Why Apollo here

1. **Shared entities.** Adding to the cart from an assistant card must update the cart tab, the badge and the product screen. With a normalized cache this needs no extra code.
2. **The target stack.** The role this project prepares for uses Apollo Federation and Apollo Client. Type policies, cache normalization and optimistic responses are what will be asked about.
3. **GraphQL-specific features** (fragments colocated with components, `@defer` as a streaming option in the system design doc) need a GraphQL-aware client.

## What we give up

- TanStack Query is simpler, and its persistence and retry are ready-made. For a REST backend or a small app it would be the better choice.
- Apollo's cache needs care: every type needs a stable id, and paginated fields need merge functions. These are covered by unit tests ([PLAN 2.1](../PLAN.md)).
- urql with Graphcache is a third option with a normalized cache and a smaller bundle. Not picked because Apollo matches the target stack.

## Consequences

- Server state lives only in the Apollo cache. See [ADR 0005](0005-server-state-apollo-client-state-zustand.md).
- One `graphql` version in the workspace (v16).
- If a REST endpoint is added later (for example, the LLM proxy), it is called directly and not forced through Apollo.
