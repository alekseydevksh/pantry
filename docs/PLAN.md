# Pantry — implementation plan

Source of truth for scope is [SPEC.md](../SPEC.md). This file breaks it into tasks.

## How to use this plan

- One task = one commit (Conventional Commits), about 1–2 hours of work.
- Do tasks in order. Tick the checkbox in the same commit that finishes the task.
- Before a task is finished, `pnpm typecheck && pnpm lint && pnpm test` must pass.
- **Accept** is the acceptance criterion. **Proof** is the test or check that shows it.
- Model tags: `[fable]` = architecture or hard logic, `[sonnet]` = well-specified implementation.
- The last task of every phase is a **phase gate**: write the learning-log entry, run all checks, then stop and give a short summary before starting the next phase.
- Priority: phases 0–4 and the docs (1.9, 4.12–4.14). Phases 5–7 come after.

## Decisions already made (2026-11-16)

| Topic | Decision |
|---|---|
| Versions | Expo SDK 58, React Native 0.88.1, React 19.3.0, TypeScript ~6.0 (not 7: Expo and typescript-eslint do not support it yet) |
| Installing native packages | Always `npx expo install <pkg>`, so we get the versions SDK 58 pins (for example Gesture Handler ~3.3, Sentry ~8.28) |
| `graphql` | Pinned to v16 in the whole workspace. `@apollo/gateway` does not accept v17, and two copies of `graphql` break at runtime |
| Styling | Unistyles 3 ([ADR 0002](adr/0002-styling-unistyles.md)) |
| Lists | FlashList v2 ([ADR 0003](adr/0003-list-library-flashlist.md)) |
| Data | Apollo Client 4 ([ADR 0004](adr/0004-apollo-client-vs-tanstack-query.md)); typed documents from the codegen client preset, not generated hooks |
| Cache persistence | Own MMKV persistor. `apollo3-cache-persist` is unmaintained and targets Apollo Client 3 |
| Lint | ESLint (flat config, Expo preset) + Prettier, not Biome |
| Cloud LLM | Server proxy with `LLM_MODE=mock` (default) or `anthropic`. Mock mode is built first. Key and model come from env variables |
| On-device AI | `@react-native-ai/apple` in Phase 6, tested on the iOS Simulator (host: macOS 26.6.2 with Apple Intelligence). No physical iPhone |
| Sentry, EAS | Config only. Sentry is a no-op without a DSN |
| Git | Local repo only. The owner creates the remote and pushes |
| Lint version (Phase 0) | ESLint 9.39, not 10: `eslint-plugin-react` inside the Expo preset crashes on ESLint 10. Move to 10 when `eslint-config-expo` supports it |
| Routes folder (Phase 0) | `apps/mobile/app/`, as in CLAUDE.md. The SDK 58 template uses `src/app/`; both work |
| App id (Phase 0) | `dev.pantry.app` for iOS and Android, scheme `pantry`. Placeholder; change in `app.config.ts` before any store build |
| Codegen output (Phase 0) | Client preset with enums as string unions. Fragment masking: Apollo's runtime masking since task 2.1 (Codegen's own is off) |
| Prices (Phase 0) | Integer cents everywhere, so the price filter is `maxPriceCents` (the plan called it `maxPrice`) |
| Unistyles setup (Phase 1) | Babel plugin with `root: 'src'` (the Metro-only setup is still experimental). The app entry is `apps/mobile/index.ts`, which registers the themes before Expo Router loads the routes. Adaptive themes are on (the app follows the system) until task 1.7 adds the user's choice |
| Unistyles in Jest (Phase 1) | The library's own mock plus `src/test/unistyles.ts`, which adds theme switching (`setTestTheme`). After a switch, a test re-renders to see new StyleSheet values; on a device, native code updates them without a re-render |
| Typed routes on a fresh clone (Phase 1) | `.expo/types/router.d.ts` and `expo-env.d.ts` are generated and git-ignored, and `tsc` fails without them (CI uses a fresh clone). The mobile `typecheck` script runs `expo customize tsconfig.json` first, which writes both files without changing `tsconfig.json`; this is the command the Expo docs give for CI |
| Safe areas with Unistyles (Phase 1) | Themed styles go on React Native's own components. Unistyles cannot restyle a third-party view (for example `SafeAreaView`) on a theme change unless it is wrapped with `withUnistyles`, so insets come from `rt.insets` in the StyleSheet |
| Apollo cache (Phase 2) | Own cursor pagination policy (drops duplicates by node id), and Apollo data masking on: components read their fragment's fields with `useFragment` ([ADR 0007](adr/0007-apollo-cache-pagination-masking-persistence.md)). Retries only for network errors and 5xx, and for mutations only with an `idempotencyKey` |
| MMKV (Phase 2) | `react-native-mmkv` 4 (Nitro), two instances: `pantry` (settings, later session and offline queue) and `pantry.apollo-cache` (only the persisted cache, so a purge never touches settings). Failed writes are reported, not thrown. Own Jest mock in `src/test/mmkv.ts` that keeps one store per id, so tests can simulate a restart |
| Cache persistence (Phase 2) | Own persistor ([ADR 0007](adr/0007-apollo-cache-pagination-masking-persistence.md)): synchronous restore before the first render, 1 s debounce with a 5 s max wait, flush on `inactive` and `background`, 5 MB cap with an all-or-nothing purge, version = format number + schema hash with a guard test |
| Offline start (Phase 2) | `expo-network` for the status; the feed uses `cache-and-network` then `cache-first` ([ADR 0009](adr/0009-offline-start-network-status-and-feed-policy.md)) |
| Test harness (Phase 2) | MSW 3 on Node's `fetch` inside jest-expo, typed handlers from the generated documents, unhandled requests fail the test ([ADR 0008](adr/0008-test-harness-msw-in-jest-expo.md)) |
| Search params (Phase 3) | One canonical `SearchInput` (defaults left out, lists in schema order, text case kept) built only by `canonicalSearchInput`; URL params read leniently, written in one form, `maxPriceCents` in cents; Zod added to the app at the server's version ([ADR 0010](adr/0010-search-url-params-and-canonical-search-input.md)) |

## Android status

> **Android is deferred.** The machine has no JDK or Android SDK. Phases 0–4 are verified on the **iOS Simulator only**. The owner installs Android Studio before Phase 5, and task 5.1 brings Android up and fixes whatever broke. Until then, do not claim that anything works on Android, and avoid iOS-only APIs without a fallback.

---

## Phase 0 — Setup

- [x] **0.1 [sonnet] Workspace.** `git init`, pnpm workspace with `apps/mobile`, `server`, `packages/shared` (packages `@pantry/mobile`, `@pantry/server`, `@pantry/shared`), root scripts (`typecheck`, `lint`, `test`, `codegen`, `dev:server`, `ios`), `.gitignore`, `.nvmrc`, pnpm override pinning `graphql` to v16.
  - Accept: `pnpm install` works from a clean clone; `pnpm why graphql` shows one version.
  - Proof: `pnpm install --frozen-lockfile && pnpm why graphql -r`.
- [x] **0.2 [fable] GraphQL schema.** Write the complete `packages/shared/schema.graphql`. Fill the gaps in the spec: `SearchFilters` (diet, maxTimeMin, maxPrice, excludeAllergens), `SortOrder`, `SearchResult` (edges, pageInfo, totalCount), `RecContext`, connection types, a feed that returns products and recipes, `Cart`/`CartLine`, and cart mutations that take an `idempotencyKey` (`addToCart`, `removeFromCart`, `setCartQty`).
  - Accept: schema parses; every type used in SPEC sections 1, 4, 5 and 6 exists; a short comment explains each non-obvious field.
  - Proof: a unit test in `packages/shared` that builds the schema with `buildSchema`.
- [x] **0.3 [sonnet] Seed data.** A script that writes about 200 products and 60 recipes to JSON (fictional names, placeholder images, allergens, diets, prices, cook times). Deterministic (fixed seed). Commit the output.
  - Accept: running the script twice gives the same files; every recipe ingredient points to an existing product.
  - Proof: a test that validates the JSON with Zod and checks referential integrity.
- [x] **0.4 [sonnet] Mock server.** GraphQL Yoga server with resolvers for the whole schema, in-memory cart, cursor pagination, simple text search with filters, random 100–800 ms delay and `ERROR_RATE` env variable (both can be turned off for tests). `recommendations` is a stub.
  - Accept: every query and mutation in the schema returns data; a repeated mutation with the same `idempotencyKey` is applied once.
  - Proof: server integration tests (search filters, pagination cursors, idempotency).
- [x] **0.5 [sonnet] Expo app.** `create-expo-app@latest` in `apps/mobile`, Expo Router, `expo-dev-client`, React Compiler enabled, `ios/` and `android/` ignored (CNG), bundle id and `pantry` URL scheme set.
  - Accept: the dev build starts on the iOS Simulator and shows a placeholder screen; `npx expo-doctor` is clean.
  - Proof: `pnpm ios` + `npx expo-doctor`. (Manual check; note it in the commit body.)
- [x] **0.6 [sonnet] Codegen.** GraphQL Codegen with the client preset; output in `packages/shared`; `pnpm codegen` and a CI check that the output is up to date.
  - Accept: one sample query in the app is fully typed without manual types.
  - Proof: `pnpm codegen && git diff --exit-code`, plus `pnpm typecheck`.
- [x] **0.7 [sonnet] Lint and format.** ESLint flat config with the Expo preset and the React Compiler rule, Prettier, TS `strict` everywhere, a rule that forbids `any` without a comment.
  - Accept: `pnpm lint` and `pnpm typecheck` pass on all three packages.
  - Proof: both commands; a deliberate `any` fails lint.
- [x] **0.8 [sonnet] Jest.** `jest-expo` + React Native Testing Library, shared test setup file, one render test for the placeholder screen.
  - Accept: `pnpm test` runs tests in all packages.
  - Proof: `pnpm test`.
- [x] **0.9 [sonnet] CI and README skeleton.** GitHub Actions workflow (install, typecheck, lint, test, codegen check, Expo Doctor). README with the section headings from SPEC section 8.
  - Accept: the workflow file is valid; all its steps pass when run locally in the same order.
  - Proof: run the steps locally. CI itself goes green after the owner pushes.
- [x] **0.10 [sonnet] Phase gate.** Learning log for Phase 0 (Expo vs bare, dev builds vs Expo Go, CNG, Hermes, New Architecture). Summary to the owner.

## Phase 1 — Shell and design system

- [x] **1.1 [fable] Tokens and themes.** `src/design-system/tokens.ts` (color, spacing, radius, typography), light and dark themes, Unistyles 3 configuration, Jest setup for Unistyles.
  - Accept: a component reads theme values; switching theme changes them.
  - Proof: unit test for token shape (both themes have the same keys); render test under each theme.
- [x] **1.2 [sonnet] Primitives: Text, Button.** Variants, disabled and loading states, accessibility role and label, 44 pt minimum touch target, respects dynamic type.
  - Accept: all variants render; a disabled button does not fire `onPress`.
  - Proof: RNTL tests with the user-event API.
- [x] **1.3 [sonnet] Primitives: Card, Chip, Skeleton, IconButton.** Chip has selected state and `accessibilityState`. Skeleton uses a Reanimated CSS-style animation.
  - Accept: six primitives exported from `src/design-system`.
  - Proof: RNTL tests for Chip selection and IconButton label.
- [x] **1.4 [sonnet] Navigation shell.** Root layout, four tabs (Home, Search, Cart, Settings), `recipe/[id]` and `product/[id]` stack screens, `assistant` as a modal.
  - Accept: every route opens; the modal closes back to the previous screen.
  - Proof: Expo Router testing-library test that navigates to each route.
- [x] **1.5 [sonnet] Deep links and typed routes.** Typed routes on; `pantry://recipe/:id` and `pantry://product/:id` open the right screen, also from a cold start.
  - Accept: the deep link opens the recipe screen with the id.
  - Proof: router test with an initial URL; manual `xcrun simctl openurl booted pantry://recipe/r1`.
- [x] **1.6 [sonnet] i18n.** `expo-localization` + i18next, EN and PL resources, typed keys, plural rules for PL.
  - Accept: all visible strings come from resources; changing language updates the UI without a restart.
  - Proof: test that EN and PL have identical key sets; render test in PL.
- [x] **1.7 [sonnet] Settings store and screen.** Zustand store for language, theme (system/light/dark) and AI mode (auto / on-device only / cloud only / off), behind a storage interface with an in-memory adapter (MMKV arrives in 2.2).
  - Accept: changing theme and language on the Settings screen applies at once.
  - Proof: store unit tests; RNTL test of the Settings screen.
- [x] **1.8 [sonnet] Edge-to-edge and safe areas.** Safe-area handling on all screens, status bar style per theme.
  - Accept: no content under the notch or home indicator on the iOS Simulator.
  - Proof: manual check on two simulator sizes; screenshots in the commit body are not needed, a note is.
- [x] **1.9 [fable] `docs/SYSTEM-DESIGN.md`, first draft.** Follow the structure in SPEC section 8.3. Mark the "how this repo maps to the design" section as pending.
  - Accept: about two pages; every heading from the spec is present; all numbers are labeled as assumptions.
  - Proof: review against the SPEC 8.3 list.
- [x] **1.10 [sonnet] Phase gate.** Learning log for Phase 1 (Expo Router vs React Navigation, typed routes, Unistyles and the Nitro layer, edge-to-edge). Summary.

## Phase 2 — Data layer

- [x] **2.1 [fable] Apollo Client.** Client in `src/lib/apollo`, HTTP link, retry link for network errors, error link that reports to the (future) observability layer, type policies for cursor pagination (`feed`, `search`) keyed by their arguments.
  - Accept: `fetchMore` appends pages without duplicates; a refetch replaces them.
  - Proof: unit tests of the type policies' merge and read functions.
- [x] **2.2 [sonnet] MMKV storage.** `src/lib/storage` wrapper over `react-native-mmkv` (+ `react-native-nitro-modules`), Jest mock, and the MMKV adapter for the settings store from 1.7.
  - Accept: settings survive an app restart.
  - Proof: adapter unit tests against the mock; manual restart check.
- [x] **2.3 [fable] Apollo cache persistor.** Own persistor: restore before first render, debounced write of `cache.extract()` to MMKV, size limit with purge, schema version key that drops an old cache.
  - Accept: restore, debounce, size limit and version mismatch all behave as designed.
  - Proof: unit tests with fake timers and the storage mock.
- [x] **2.4 [sonnet] MSW test harness.** MSW server for Jest with typed GraphQL handlers built from the generated documents, a `renderWithProviders` helper (Apollo, theme, i18n, router).
  - Accept: one screen test gets its data from MSW.
  - Proof: that test.
- [x] **2.5 [sonnet] Home feed.** FlashList v2 with product and recipe cards, cursor pagination, pull-to-refresh, skeletons, `expo-image` with placeholders.
  - Accept: scrolls through all 200+ items; loads the next page near the end.
  - Proof: RNTL + MSW test (first page, next page, refresh).
- [x] **2.6 [sonnet] Recipe screen.** Details, ingredient list linked to products, loading and not-found states.
  - Accept: opening from the feed shows cached fields at once and loads the rest.
  - Proof: RNTL + MSW test, including not-found.
- [x] **2.7 [sonnet] Product screen.** Details, allergens, price, add-to-cart button (wired in Phase 3).
  - Accept: same as 2.6 for products.
  - Proof: RNTL + MSW test.
- [x] **2.8 [sonnet] Error boundaries.** One reusable feature error boundary with a retry button; wrap each tab and each details screen; query errors show an inline error with retry.
  - Accept: a thrown render error and a failed query both show a retry that works. No red screen.
  - Proof: RNTL tests for both cases.
- [x] **2.9 [sonnet] Offline start.** Network status hook, offline banner, `cache-and-network` policy for the feed so the persisted cache shows first.
  - Accept: with the server stopped and the network off, the app opens with the cached feed and the banner.
  - Proof: integration test (pre-filled storage + MSW network error); manual airplane-mode check.
- [x] **2.10 [sonnet] Phase gate.** Learning log for Phase 2 (normalized cache, type policies, FlashList v2 recycling, MMKV and JSI, Suspense for data). Summary.

## Phase 3 — Search and cart

- [x] **3.1 [fable] Search params model.** Pure functions in `features/search/model`: URL params ↔ `SearchInput`, Zod-validated, with defaults and unknown-value handling.
  - Accept: round trip is lossless; bad params fall back to defaults.
  - Proof: unit tests, including a table of malformed inputs.
- [x] **3.2 [sonnet] Typeahead.** Search field, `suggestions` query with a 250 ms debounce, stale requests cancelled, last good suggestions kept while loading.
  - Accept: typing fast sends one request; an old response never replaces a newer one.
  - Proof: RNTL + MSW test with fake timers and out-of-order responses.
- [x] **3.3 [sonnet] Results list.** FlashList, cursor pagination, pull-to-refresh, skeletons, previous results kept while a new query loads.
  - Accept: submit shows results; scrolling loads more.
  - Proof: RNTL + MSW test.
- [x] **3.4 [sonnet] Filters and sort.** Filter chips (diet, time, price, allergens) and sort, synced to route params via 3.1.
  - Accept: `pantry://search?q=pasta&diet=vegan` opens with the filter applied; changing a chip updates the URL.
  - Proof: router test with an initial URL; RNTL test for chip → params.
- [x] **3.5 [sonnet] Search states.** Empty state with suggested queries, error state with retry, offline banner.
  - Accept: each state shows for the right server response.
  - Proof: RNTL + MSW tests for zero results and server error.
- [x] **3.6 [fable] Analytics layer.** Typed event schema in `src/analytics/events.ts`, `track()`, pluggable sinks (console sink in dev, memory sink in tests). Wire `search_submitted`, `search_result_clicked` (position, query), `search_zero_results`.
  - Accept: an event with a wrong payload does not compile; the three search events fire once each.
  - Proof: type test; RNTL tests asserting on the memory sink.
- [x] **3.7 [fable] Feature flags.** `FlagProvider` interface, local JSON provider, typed flag definitions, deterministic per-user assignment (hash of user id + flag key), exposure logged once per session per flag, local overrides.
  - Accept: the same user always gets the same variant; the split over many ids is close to the configured weights.
  - Proof: unit tests for assignment, exposure dedupe and overrides.
- [x] **3.8 [sonnet] `search_layout` A/B and debug panel.** List vs grid layout from the flag; debug panel in Settings that shows flags, variants and lets you override them.
  - Accept: override in the panel switches the layout; exposure is logged when results render.
  - Proof: RNTL tests for both variants and the exposure event.
- [x] **3.9 [fable] Cart model and offline queue.** Pure logic in `features/cart/model`: cart reducer, operation queue with idempotency keys, coalescing (add then remove cancels out), replay with retry and backoff, handling of a permanently rejected operation. Queue persisted through the storage interface.
  - Accept: replay after a failure in the middle never applies an operation twice; the queue survives a restart.
  - Proof: unit tests, including a failure-injection table.
- [ ] **3.10 [sonnet] Cart UI and optimistic mutations.** Cart screen, add/remove/set quantity with Apollo optimistic responses, rollback on error with a toast, queue used when offline, sync on reconnect.
  - Accept: the cart updates at once; an error rolls back; offline changes sync when the network returns.
  - Proof: RNTL + MSW tests for success, rollback and offline → online.
- [ ] **3.11 [sonnet] Cart interactions.** Swipe-to-remove with Gesture Handler and Reanimated, add-to-cart animation, reduced-motion respected, an accessible non-gesture remove action.
  - Accept: swipe removes the line; a screen reader user can remove without swiping.
  - Proof: RNTL test for the accessible action; manual check of the gesture.
- [ ] **3.12 [sonnet] Integration tests.** End-to-end-in-Jest flows with MSW: search → filter → open result → add to cart; offline add → reconnect → server cart matches.
  - Accept: both flows pass reliably (run 10 times).
  - Proof: the tests.
- [ ] **3.13 [sonnet] Phase gate.** Learning log for Phase 3 (Reanimated 4 worklets, Gesture Handler 3, optimistic UI and `useOptimistic`, RNTL user-event and MSW). Summary.

## Phase 4 — AI assistant

- [ ] **4.1 [fable] Streaming spike.** Prove that a streamed response from the server reaches the app token by token on the iOS Simulator (AI SDK transport or plain streaming `fetch`), and that `AbortController` stops it. Write the result as an ADR with the next free number (transport: SSE vs WebSocket vs `@defer`).
  - Accept: a throwaway screen shows tokens arriving one by one and stops on cancel.
  - Proof: manual check + the ADR. Delete the throwaway screen in this commit.
- [ ] **4.2 [fable] Contracts.** `src/ai/types.ts`: `AIProvider`, `AIRequest`, `Chunk` (text delta, intent, refusal, usage, done). `packages/shared`: Zod schema for the intent (`query`, `filters`, `servings`, `maxTime`) and a parser that returns a typed result or a typed error.
  - Accept: valid, partial and invalid intents are classified correctly.
  - Proof: unit tests for the parser with a table of LLM-like outputs (extra prose, wrong types, missing fields).
- [ ] **4.3 [fable] AIRouter.** Chooses the provider order from AI mode, flag, device capability, battery saver and network; per-provider first-chunk timeout; falls through to the next provider on unavailable, timeout, error or invalid output; reports which provider served the request.
  - Accept: every routing rule in SPEC 5.2 is covered; a fallback never shows two answers mixed together.
  - Proof: unit tests with fake providers (fast, slow, broken, invalid JSON, unavailable) and fake timers.
- [ ] **4.4 [fable] KeywordFallback.** Rule-based parser (EN and PL): diet words, "under N min", "for N", "no nuts"-style allergen exclusions, price words → the same intent type. Implements `AIProvider`.
  - Accept: the spec's example query gives the right intent in EN and PL.
  - Proof: unit tests with a table of queries in both languages.
- [ ] **4.5 [sonnet] Server LLM proxy with mock mode.** `POST /ai/chat` streaming route. `LLM_MODE=mock` (default) returns scripted streams, with scenarios for normal, slow, invalid JSON, off-topic and error. `LLM_MODE=anthropic` calls the real model with `ANTHROPIC_API_KEY` and `LLM_MODEL`; system prompt limits scope to food and shopping; max tokens set. `.env.example` added.
  - Accept: mock mode needs no key; the key never appears in the app bundle.
  - Proof: server tests for each mock scenario; `grep` of the app bundle config for the key name.
- [ ] **4.6 [fable] CloudProvider.** Client provider that calls the proxy, maps the stream to `Chunk`s, validates the intent with Zod, and does one retry with a repair prompt on invalid output.
  - Accept: invalid → repair → valid works; invalid twice surfaces a typed error for the router.
  - Proof: unit tests with MSW streaming handlers.
- [ ] **4.7 [fable] `useAssistant`.** State machine (idle → thinking → streaming → done | error | degraded) as a pure reducer plus a hook; cancel; runs the real `search` query when the intent arrives.
  - Accept: no impossible transitions; cancel from any active state returns to idle.
  - Proof: reducer unit tests for every transition; hook test with fake providers.
- [ ] **4.8 [sonnet] Chat UI.** Assistant modal: message list, input, streamed text, cancel button, keyboard handling.
  - Accept: text appears as it streams; cancel stops it.
  - Proof: RNTL test with a fake provider.
- [ ] **4.9 [sonnet] Product cards in chat.** Cards from the real `search` results appear when the intent is ready; add to cart from a card (reuses the Phase 3 cart).
  - Accept: cards only ever show catalog items; add-to-cart from chat updates the cart tab.
  - Proof: RNTL + MSW test.
- [ ] **4.10 [fable] Guardrails.** Allergen exclusions from the user's query and settings are forced into the search filters in code; intent cache for identical queries; history limited to the last N messages; submit debounce; `ai_request` event (provider, latency, tokens if known, outcome).
  - Accept: an intent that drops the user's allergen still results in a filtered search; a repeated query does not call a provider.
  - Proof: unit tests for the allergen merge and the cache; event assertion on the memory sink.
- [ ] **4.11 [sonnet] Degradation chip and accessibility.** Chip shows "On-device", "Cloud" or "Basic search". Streamed answers are announced to screen readers in sentence-sized chunks. Off-topic refusal has its own message. No empty error screen while a fallback exists.
  - Accept: with the server down, the assistant answers through KeywordFallback and the chip says "Basic search".
  - Proof: RNTL + MSW test with the proxy failing; unit test for the announcement chunker.
- [ ] **4.12 [fable] `docs/ARCHITECTURE.md`.** Layers, folder rules, data flow, state ownership, error handling, AI layer, with Mermaid diagrams.
  - Accept: every claim links to a real file.
  - Proof: link check.
- [ ] **4.13 [fable] `docs/SYSTEM-DESIGN.md`, revision.** Update with what was learned and fill in "how this repo maps to the design".
  - Accept: the built-vs-paper table is complete and honest.
  - Proof: review against the code.
- [ ] **4.14 [fable] `docs/interview-notes.md`.** 15 likely questions with short answers and file links (SPEC section 11).
  - Accept: every answer links to code that exists.
  - Proof: link check.
- [ ] **4.15 [sonnet] Phase gate (MVP done).** Learning log for Phase 4 (streaming on mobile, structured output and validation, graceful degradation, cost controls). README "how to run" updated. Summary.

## Phase 5 — Quality and release

- [ ] **5.1 [sonnet] Android bring-up.** Requires Android Studio and a JDK (owner installs). Run the dev build on an emulator, fix what broke in phases 0–4, check edge-to-edge and the back gesture.
  - Accept: all tabs, search, cart and the assistant work on the Android Emulator.
  - Proof: manual pass through the three critical flows; update "Android status" above.
- [ ] **5.2 [sonnet] Maestro: search → add to cart.** Install Maestro, add `testID`s where needed, write the flow against the mock server (no delay, no errors).
  - Accept: passes three times in a row on iOS.
  - Proof: `maestro test`.
- [ ] **5.3 [sonnet] Maestro: assistant → add to cart.** Uses `LLM_MODE=mock`.
  - Accept and proof: as 5.2.
- [ ] **5.4 [sonnet] Maestro: offline cart sync.** Add to cart with the server unreachable, restore it, check the server cart.
  - Accept and proof: as 5.2.
- [ ] **5.5 [sonnet] Sentry.** `@sentry/react-native` with the config plugin, error boundaries and the Apollo error link report to it, navigation tracing, no-op when no DSN is set.
  - Accept: the app runs with and without a DSN; no DSN in the repo.
  - Proof: unit test of the no-op path.
- [ ] **5.6 [fable] Performance baseline.** Release build. Measure cold start, feed scroll, search typing and row re-renders (React DevTools Profiler, Perf Monitor), and bundle size with Expo Atlas. Write the "before" numbers in `docs/performance.md`, **with the exact device or simulator and OS labeled for every number**.
  - Accept: every number has a method and a device label; simulator numbers are marked as not representative of real devices.
  - Proof: the document.
- [ ] **5.7 [fable] Performance fixes.** Fix the top findings, record "after" numbers, and write the React Compiler ADR (where manual memoization was still needed, if anywhere).
  - Accept: each fix has a before/after number.
  - Proof: the document.
- [ ] **5.8 [fable] EAS config and release strategy.** `eas.json` (development, preview, production), `expo-updates` with channels and a runtime version policy, `docs/release.md` covering OTA limits, staged rollout and forced update. Config only; nothing is built or published.
  - Accept: `eas.json` validates; the doc answers "what breaks with OTA?".
  - Proof: `npx eas-cli config --platform ios --profile production` or an equivalent offline validation.
- [ ] **5.9 [sonnet] README final and phase gate.** GIF, stack table, Mermaid diagram, "what I would do next at scale". Learning log for Phase 5 (Maestro vs Detox, EAS, React Native DevTools, Atlas). Summary.

## Phase 6 — Native and on-device

- [ ] **6.1 [fable] On-device spike.** Check that `@react-native-ai/apple` generates text on the iOS Simulator with the host's Apple Intelligence (macOS 26.6.2). Record what works and what does not (structured output, streaming, speed).
  - Accept: a written go / no-go. If it does not work on the Simulator, stop and ask the owner before continuing the phase.
  - Proof: ADR for the on-device provider choice.
- [ ] **6.2 [sonnet] Expo Module scaffold.** `modules/haptics-plus` created with `create-expo-module --local`, autolinked, builds on iOS.
  - Accept: a hello-world native function is callable from JS.
  - Proof: dev build + a JS test against the mock.
- [ ] **6.3 [fable] Swift implementation.** Device AI capability check (model availability and the reason when unavailable) and custom haptic patterns (Core Haptics).
  - Accept: the capability check returns a typed status on the Simulator; patterns run without errors.
  - Proof: manual check on the Simulator. Haptics cannot be felt there; say so in the docs.
- [ ] **6.4 [fable] Kotlin implementation.** Capability check (returns "unsupported" with a reason) and haptic patterns with the platform vibration API.
  - Accept: builds and runs on the Android Emulator.
  - Proof: Android dev build.
- [ ] **6.5 [sonnet] Typed JS API.** TypeScript API for the module, Jest mock, use the haptic patterns for add-to-cart.
  - Accept: wrong arguments do not compile.
  - Proof: unit tests.
- [ ] **6.6 [fable] OnDeviceProvider.** Implements `AIProvider` with the Apple model; same intent schema and repair retry as the cloud provider.
  - Accept: the assistant answers with the server stopped and the chip says "On-device".
  - Proof: unit tests with a mocked model; manual check on the Simulator.
- [ ] **6.7 [fable] Router wiring and phase gate.** Capability check and battery saver feed the router. Learning log for Phase 6 (Expo Modules API, Nitro Modules, Apple Foundation Models, ExecuTorch and model download strategy). State clearly in the docs that this was verified on the Simulator, not on a physical iPhone.

## Phase 7 — Stretch (each item has an ADR)

- [ ] **7.1 [fable] Federation subgraphs.** Split the server into `catalog` and `cart` subgraphs with entity references.
  - Proof: subgraph tests; composition succeeds.
- [ ] **7.2 [sonnet] Gateway.** Gateway in front of the subgraphs (choose `@apollo/gateway` or Hive Gateway in the ADR). The app is unchanged.
  - Proof: the existing app and server tests pass against the gateway.
- [ ] **7.3 [sonnet] GrowthBook adapter.** A second `FlagProvider` implementation.
  - Proof: the Phase 3 flag tests run against both providers.
- [ ] **7.4 [sonnet] EAS Update channels.** `preview` and `production` channel workflow documented and scripted.
  - Proof: config validation; doc.
- [ ] **7.5 [sonnet] Recommendations shelf.** Heuristic resolver (cart and history) and the "For you" shelf on Home.
  - Proof: resolver unit tests; RNTL test.
- [ ] **7.6 [fable] Accessibility audit.** VoiceOver and TalkBack pass, dynamic type, contrast, touch targets; fix findings; write `docs/accessibility.md`.
  - Proof: the audit checklist with results.

---

## SPEC section 10 checklist → where it is covered

| Item | Phase |
|---|---|
| New Architecture, Hermes, Expo, dev builds, CNG | 0 |
| Expo Router, edge-to-edge | 1 |
| Lists, storage, Suspense for data | 2 |
| Animations, React 19 hooks, testing (RNTL, MSW) | 3 |
| React Compiler | 0 (enabled), 5 (ADR) |
| EAS, tooling (DevTools, Doctor, Atlas), Maestro | 5 |
| Native modules, on-device AI | 6 |
| AI-assisted development (`CLAUDE.md`, Expo MCP) | 0 learning log |
