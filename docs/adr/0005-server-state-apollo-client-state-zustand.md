# ADR 0005: Server state in the Apollo cache, client state in Zustand

- Status: Accepted
- Date: 2026-11-16

## Context

Apps get hard to reason about when the same data lives in two stores. A common mistake is to copy server responses into a client store and then keep both in sync by hand.

## Decision

Every piece of state has exactly one owner.

| State | Owner | Persisted in |
|---|---|---|
| Catalog, search results, recipes, the cart as the server sees it | Apollo cache | MMKV (cache persistor) |
| Optimistic cart changes while a mutation is in flight | Apollo optimistic layer | not persisted |
| Offline cart operations waiting to be sent | Zustand (`cart queue` store) | MMKV |
| Settings: language, theme, AI mode | Zustand | MMKV |
| Session: mock user id, flag overrides | Zustand | MMKV |
| Search query and filters | Route params (URL) | the URL itself |
| Assistant conversation | `useAssistant` reducer (component state) | not persisted |
| Form input, open/closed UI state | Component state | not persisted |

Rules:

1. **Never copy server data into Zustand.** Components read it with `useQuery` / `useFragment`.
2. **Zustand stores stay small** and hold only what the server does not know.
3. **The URL is state.** Anything that should be deep-linkable (search filters) lives in route params, not in a store.
4. The offline queue holds **operations** (`add product 42, qty 1, key abc`), not a copy of the cart. The cart shown on screen is the server cart from the Apollo cache with queued operations applied on top by a pure function.

## Why Zustand for the rest

Small API, no provider, works outside React (the Apollo links and the AI router read settings directly), and has a persist middleware that takes a custom storage, so MMKV plugs in.

## Alternatives

- **Apollo reactive variables / local-only fields for client state.** One library fewer, but settings and the queue would depend on the GraphQL cache lifecycle (a cache reset would have to spare them).
- **Redux Toolkit.** More structure than this app needs.
- **React context.** Fine for values that rarely change; causes wide re-renders otherwise, and is not readable outside React.

## Consequences

- "Where does this value live?" always has one answer from the table above.
- Clearing the Apollo cache (logout, schema version change) never loses settings or queued cart operations.
- The offline queue logic is pure and unit-tested apart from both stores ([PLAN 3.9](../PLAN.md)).
