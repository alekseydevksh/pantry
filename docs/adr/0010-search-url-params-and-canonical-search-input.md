# ADR 0010: Search URL params and the canonical `SearchInput`

- Status: Accepted
- Date: 2026-11-18
- Task: [PLAN 3.1](../PLAN.md)

## Context

Searches are deep-linkable (SPEC 6): the search screen's state lives in its route params ([ADR 0005](0005-server-state-apollo-client-state-zustand.md)), so `pantry://search?q=pasta&diet=vegan` must open a filtered search. The params come from links, from the filter chips (PLAN 3.4) and, in Phase 4, from model output. Any of them can be malformed.

Apollo keeps one cached result list per `input` argument of `search` ([ADR 0007](0007-apollo-cache-pagination-masking-persistence.md)). It sorts the keys of `input` before serializing it, but it does not treat `{ filters: null }`, `{ filters: {} }` and no `filters` as the same value, nor `['VEGAN', 'VEGETARIAN']` and `['VEGETARIAN', 'VEGAN']`. Two shapes of the same search would fetch twice and cache twice.

## Decision 1: one canonical `SearchInput`

All inputs are built by `canonicalSearchInput` in [searchParams.ts](../../apps/mobile/src/features/search/model/searchParams.ts). The URL parser returns its output, and the feature exports it for the assistant. It gives exactly one shape per meaning:

- **Defaults are left out, not spelled out.** No `filters` key when no filter is set, no `null` or empty list inside `filters`, no `sort` when it is `RELEVANCE` (the server's default). No key ever holds `undefined`. The empty search is `{ query: '' }`.
- **Lists are deduplicated and follow the schema's enum order.** Values that are not in the schema are dropped.
- **Counts** (`maxTimeMin` 1–1440, `maxPriceCents` 1–1 000 000) are whole numbers in range, or they are left out. These are the same rules as the URL parser, so `parseSearchParams(toSearchParams(x))` equals `canonicalSearchInput(x)` for any `x`. An input from model output with `maxTimeMin: 0` or `12.5` gets the same treatment as a URL with them.
- **The text** is NFC-normalized, trimmed, has runs of whitespace collapsed to one space, and is cut to 100 code points. NFC matters because iOS keyboards and pasted text can give `é` as one code point or two.

**Accepted trade-off: the case of the text is kept.** "Pasta" and "pasta" are two cache entries and two requests. The search field shows what the user typed, so the input must hold it. Lowercasing only the cache key would need a custom `keyArgs` function, and the result list would then answer "Pasta" with data fetched for "pasta". That is harmless with the mock server's case-insensitive search, but it is an assumption about the backend. A duplicate entry costs one request and a few KB of cache. Revisit if search analytics show many case-only repeats.

**Alternative: always spell out every field** (`filters` with every key `null`, `sort: 'RELEVANCE'`). It is also canonical, but the keys are longer, and every caller has to know the full shape. Leaving defaults out matches what the server assumes and keeps `{ query: 'pasta' }` readable in tests and in the cache.

## Decision 2: the URL format

| Param | Example | `SearchInput` field |
|---|---|---|
| `q` | `q=tomato%20soup` | `query` |
| `kind` | `kind=recipe` | `filters.kind` |
| `diet` | `diet=vegan,gluten-free` | `filters.diets` |
| `maxTime` | `maxTime=30` (minutes) | `filters.maxTimeMin` |
| `maxPriceCents` | `maxPriceCents=1500` | `filters.maxPriceCents` |
| `exclude` | `exclude=nuts,peanuts` | `filters.excludeAllergens` |
| `sort` | `sort=price-asc` | `sort` |

- **Written in one form:** lowercase values with `-` (`gluten-free`, `price-asc`), lists comma-separated in schema order, and defaults left out. `toSearchParams` returns every key, with `undefined` for a default, so `router.setParams` also clears a filter that was removed.
- **Read leniently:** any case, `_` or `-` (`GLUTEN_FREE`, `gluten_free`), comma lists or repeated keys (`diet=a&diet=b`, which Expo Router gives as an array), spaces around values, leading zeros. A single-value param given twice keeps the first value. Unknown keys (`utm_source`) are ignored.
- **A bad value falls back to its default on its own.** `diet=vegan,banana` keeps `vegan`, and `maxTime=abc` drops only the time filter. Out-of-range numbers are dropped, not clamped: a link that asks for `maxTime=99999` did not ask for 24 hours. Only digits count as a number, so `1e3`, `30.5`, `-5` and `0x1E` are dropped.
- **Contradictions are kept as asked.** `kind=product&maxTime=30` returns nothing (products have no cook time), and the empty state explains it (PLAN 3.5). Silently changing the user's filters would be harder to understand.
- **Prices are in cents**, as everywhere in the app (PLAN decisions, Phase 0). `maxPriceCents=1500` is less pretty than `maxPrice=15`, but it needs no conversion, and the name says the unit.
- **The URL holds only the user's own choices.** Allergens from the user's settings are merged in code when the query runs (PLAN 4.10, SPEC 5.7), not written into the URL. A shared link does not carry one person's allergies.

Validation uses Zod with one schema per param and `.catch()`, so the parse never fails as a whole. The enum value lists come from the generated unions through `allOf<T>()` in [searchValues.ts](../../apps/mobile/src/features/search/model/searchValues.ts), which does not compile when the schema gains a value the list is missing.

## Consequences

- The `search` query has a document now ([search.graphql](../../apps/mobile/src/features/search/api/search.graphql)), so codegen generates `SearchInput` and its enums. PLAN 3.3 adds the card fragments to it.
- Every caller of `search` passes an input from `canonicalSearchInput` or `parseSearchParams`. A test writes differently spelled URLs through the real cache and expects one entry ([searchCacheKey.test.ts](../../apps/mobile/src/features/search/__tests__/searchCacheKey.test.ts)).
- A query longer than 100 characters is cut. The search field (PLAN 3.2) uses the same limit, so the user never sees it.
- Zod is now a dependency of the app, at the same version as the server.
