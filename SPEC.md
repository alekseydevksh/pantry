# SPEC: "Pantry" — AI shopping & search app in React Native (Expo)

> Spec for an AI coding agent (Claude Code). Build the project in phases. Stop after each phase, run all checks, commit, and give me a short summary before you continue.

## 0. Why this project exists (context for the agent)

I am a senior React/TypeScript engineer. I shipped a React Native app to both stores around 2018. Since then I have worked on the web (Next.js, design systems). I am interviewing for a **Senior Mobile Engineer (React Native), Shopping AI & Search** role at a large meal-kit e-commerce company. The role covers:

- a high-scale RN app with AI-powered shopping: conversational search, personalized recommendations, in-app assistant;
- on-device LLM features, designed for latency, cost, non-deterministic output and graceful degradation;
- GraphQL (Apollo Federation), feature flags, analytics, A/B tests, owning a feature from RFC to rollout;
- reliability, performance, unit/integration/E2E tests;
- nice to have: native Swift/Kotlin, search/recommendation systems.

The project has three goals:
1. **Relearn modern RN by building.** Every phase should make me touch one area that changed since 2019 (see section 10).
2. **Public portfolio repo** that shows senior-level decisions: clean architecture, tests, CI, ADRs, a clear README.
3. **System design prep.** The architecture docs should work as notes for a 45–60 min mobile system design interview (Miro, no AI).

**Rules for the agent**
- Use the **current stable** versions. Before you install anything, check the real latest versions (`npx create-expo-app@latest`, `npm view <pkg> version`, official docs). At the time of writing the latest is Expo SDK 58 / React Native 0.88 / React 19.2. If a library named below is deprecated or no longer the community default, tell me and suggest the replacement. Do not use a library from memory without checking it.
- TypeScript `strict`. No `any` without a comment.
- Small commits with Conventional Commits messages.
- When you make a non-obvious decision, write a short ADR in `docs/adr/`.
- For each phase, add a short "What I should learn here" note to `docs/learning-log.md` (3–6 bullets: the concept, why it matters, a link to the official docs). This file is for me to read before the interview.
- Do not use any real company's name, logo or brand. The app is a fictional grocery and recipe store called **Pantry**.

## 1. Product scope

Pantry is a grocery and recipe shopping app with an AI assistant.

| Area | User can… |
|---|---|
| Browse | See a home feed of recipes and products, open details |
| Search | Type with typeahead, filter (diet, time, price, allergens), sort, see empty and error states |
| AI assistant | Ask in natural language ("vegetarian dinner for 4 under 30 min, no nuts"), get streamed answers with **real product/recipe cards** from the catalog, add items to the cart from the chat |
| Recommendations | See a "For you" shelf based on cart and history (simple heuristic, no ML) |
| Cart | Add and remove items, optimistic updates, works offline and syncs later |
| Settings | Language (EN/PL), theme, AI mode (auto / on-device only / cloud only / off), debug panel for feature flags |

Out of scope: payments, real auth (use a mock user), real backend in production.

## 2. Tech stack (verify versions before installing)

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Expo** (latest SDK), New Architecture (default) | Use Continuous Native Generation (`expo prebuild`); do not commit `ios/` and `android/` |
| Language | TypeScript strict | |
| Navigation | **Expo Router** (file-based, typed routes) | Tabs + stacks + a modal for the assistant; deep links (`pantry://recipe/:id`) |
| React | React 19.2 + **React Compiler** enabled | Write code without manual `useMemo`/`useCallback` unless profiling shows a need; record that in an ADR |
| Data / API | **GraphQL** + **Apollo Client** | Normalized cache, cursor pagination, typed operations with **GraphQL Codegen** |
| Mock backend | `server/` workspace: GraphQL server (GraphQL Yoga or Apollo Server) | Stretch: split into 2 subgraphs (`catalog`, `cart`) behind a federation gateway to show how Apollo Federation works |
| Client state | **Zustand** (UI/session state only) | Server state stays in the Apollo cache. Explain the split in an ADR |
| Storage | **react-native-mmkv** | Cart persistence, settings, Apollo cache persistence |
| Lists | **FlashList v2** (or Legend List; compare and pick in an ADR) | |
| Images | **expo-image** | Placeholders, caching |
| Animation | **Reanimated 4** + **Gesture Handler** | Swipe-to-remove in the cart, add-to-cart animation |
| Styling | Pick one: **Unistyles 3**, **NativeWind**, or plain `StyleSheet` with design tokens. Justify in an ADR | Tokens in `src/design-system/tokens.ts`; light/dark themes |
| Forms / validation | **Zod** | Also validates LLM output |
| i18n | **expo-localization** + i18next (or Lingui) | EN + PL |
| AI on-device | **@react-native-ai/apple** (Apple Foundation Models, iOS) and/or **react-native-executorch** (small Llama/Qwen-class model) | Check which is more stable now. Needs a development build, not Expo Go |
| AI cloud | Vercel **AI SDK** on the client; LLM calls go through a small proxy route in `server/` | Never ship an API key in the app |
| Feature flags / A/B | Own small `FlagProvider` interface + local JSON config. Stretch: a GrowthBook or Statsig adapter | Flags are typed; every exposure is logged as an analytics event |
| Analytics | Own typed `track(event)` layer with a console/dev sink | Event schema in `src/analytics/events.ts` |
| Observability | **Sentry** (`@sentry/react-native`) | Errors, performance traces, release health |
| Unit / integration tests | **Jest** (jest-expo) + **React Native Testing Library** + **MSW** for GraphQL mocks | |
| E2E | **Maestro** | 3 critical flows |
| Lint / format | ESLint (flat config, Expo preset) + Prettier, or Biome | |
| CI | GitHub Actions | typecheck, lint, test, Expo Doctor; stretch: EAS Build on tags |
| Builds / OTA | **EAS Build**, **EAS Update** (channels: `preview`, `production`) | Document the OTA and staged-rollout strategy, even if I do not run it |
| Native code | One small **Expo Module** (Swift + Kotlin) | See Phase 6 |
| Package manager | pnpm or bun workspaces | `apps/mobile`, `server`, `packages/shared` (GraphQL schema + generated types) |

## 3. Repository structure

```
pantry/
  apps/mobile/
    app/                      # Expo Router routes
      (tabs)/index.tsx        # Home feed
      (tabs)/search.tsx
      (tabs)/cart.tsx
      (tabs)/settings.tsx
      recipe/[id].tsx
      product/[id].tsx
      assistant.tsx           # modal
      _layout.tsx
    src/
      features/               # feature folders: search, assistant, cart, catalog, recommendations
        <feature>/
          components/
          hooks/
          api/                # .graphql operations + generated hooks
          model/              # pure logic, unit-tested
          __tests__/
      design-system/          # tokens, primitives (Text, Button, Card, Chip, Skeleton), themes
      ai/                     # AI provider layer (see section 5)
      analytics/
      flags/
      lib/                    # apollo client, storage, sentry, i18n
    modules/haptics-plus/     # local Expo Module (Phase 6)
    e2e/                      # Maestro flows
  server/                     # mock GraphQL API + LLM proxy
  packages/shared/            # schema.graphql, codegen output, Zod schemas
  docs/
    ARCHITECTURE.md
    SYSTEM-DESIGN.md
    learning-log.md
    adr/
  CLAUDE.md                   # instructions for AI agents working in this repo
```

## 4. GraphQL schema (starting point)

```graphql
type Query {
  feed(first: Int!, after: String): ProductConnection!
  search(input: SearchInput!, first: Int!, after: String): SearchResult!
  suggestions(prefix: String!): [String!]!
  recipe(id: ID!): Recipe
  product(id: ID!): Product
  recommendations(context: RecContext!): [Product!]!
  cart: Cart!
}
type Mutation {
  addToCart(productId: ID!, qty: Int!): Cart!
  removeFromCart(productId: ID!): Cart!
}
input SearchInput { query: String!, filters: SearchFilters, sort: SortOrder }
```

- Seed data: about 200 products and 60 recipes, in JSON, generated once with a script. Fictional names, placeholder images.
- The server adds a random 100–800 ms delay and a configurable error rate, so loading, retry and error states are real.

## 5. AI assistant: architecture (the most important part)

Design it so it can be explained on a whiteboard.

```
AssistantScreen
  └─ useAssistant()            # state machine: idle → thinking → streaming → done | error | degraded
       └─ AIRouter             # chooses a provider per request
            ├─ OnDeviceProvider   (Apple Foundation Models / ExecuTorch)
            ├─ CloudProvider      (AI SDK → server proxy → LLM)
            └─ KeywordFallback    (no LLM: parse the query with rules → normal GraphQL search)
```

Requirements:
1. **One interface** `AIProvider { isAvailable(): Promise<boolean>; stream(req, signal): AsyncIterable<Chunk> }`.
2. **Routing policy** (settings + feature flag): device capability, battery saver, network, the user's AI mode, and a per-request timeout. If the provider does not respond in time → the next provider. Log which provider served the request.
3. **Tool calling / structured output**: the LLM does not invent products. It returns a structured intent (`{ query, filters, servings, maxTime }`) validated with **Zod**, and the app runs the real `search` query. Invalid output → one retry with a repair prompt → then `KeywordFallback`.
4. **Streaming UI**: tokens stream in. Product cards appear when the intent is ready. The user can cancel (`AbortController`).
5. **Graceful degradation is visible**: a small chip shows "On-device", "Cloud" or "Basic search". The app never shows an empty error screen when a fallback exists.
6. **Cost and latency guardrails**: debounce, limit history to the last N messages, cache the intent for the same query, max tokens. Track `ai_request` events with provider, latency, tokens (if known), and outcome.
7. **Safety**: the system prompt limits scope to food and shopping. Off-topic requests get a polite refusal. Allergen filters are always applied by code, never only by the model.
8. Unit tests for the router and the Zod parsing, with fake providers (fast, slow, broken, invalid JSON).

## 6. Search requirements

- Typeahead from `suggestions` with a debounce (~250 ms), cancel stale requests, keep the last good results while loading.
- Filters as chips, synced to the URL params of the route (deep-linkable searches).
- Cursor pagination with FlashList, pull-to-refresh, skeletons.
- Empty state with suggestions, error state with retry, offline banner.
- Analytics: `search_submitted`, `search_result_clicked` (position, query), `search_zero_results`.
- A/B test example: flag `search_layout` = `list` | `grid`. Assign per user, log exposure, show in the debug panel.

## 7. Phases (do them in order; MVP = phases 0–4)

| Phase | Goal | Done when |
|---|---|---|
| **0. Setup** | Monorepo, Expo app, server, codegen, lint, Jest, CI, `CLAUDE.md`, README skeleton | `pnpm typecheck && pnpm lint && pnpm test` pass in CI; the app runs in a dev build on iOS Simulator and Android Emulator |
| **1. Shell & design system** | Expo Router tabs/stacks/modal, deep links, tokens, themes, 6 primitives, i18n EN/PL | Dark mode and PL work; deep link opens a recipe |
| **2. Data layer** | Apollo Client, cache policies, pagination, MMKV persistence, home feed, details screens | Feed scrolls smoothly with 200 items; app opens with cached data in airplane mode |
| **3. Search & cart** | Section 6 + cart with optimistic mutations and offline queue, Reanimated interactions | Integration tests for search and cart with MSW |
| **4. AI assistant** | Section 5 with cloud provider + keyword fallback | Router tests pass; degradation chip works when the server is down |
| **5. Quality & release** | Maestro flows (search → add to cart; assistant → add to cart; offline cart sync), Sentry, performance pass, EAS config | E2E pass locally; `docs/performance.md` with before/after numbers from a release build |
| **6. Native & on-device** | On-device provider; local Expo Module in Swift + Kotlin (for example: device AI capability check + custom haptic patterns) | Works on a real iPhone (on-device models do not run on the simulator); module has a typed JS API |
| **7. Stretch** | Federation (2 subgraphs + gateway), GrowthBook/Statsig adapter, EAS Update channels, recommendations shelf, accessibility audit | Each item has an ADR |

## 8. Docs the agent must write

1. **README.md**: what it is, a GIF, stack table, how to run, architecture diagram (Mermaid), link to ADRs, "what I would do next at scale".
2. **docs/ARCHITECTURE.md**: layers, folder rules, data flow (GraphQL → cache → UI), state ownership, error handling, AI layer.
3. **docs/SYSTEM-DESIGN.md**: written as interview notes for the prompt **"Design the AI shopping assistant / search for a mobile app with millions of users in many markets."** Use this structure, about 2 pages:
   - Clarifying questions and requirements (functional, non-functional: latency budget, offline, markets, a11y).
   - Back-of-envelope numbers (DAU, requests/sec, payload sizes) with clear "assumption" labels.
   - High-level diagram: app → BFF/GraphQL gateway (federated subgraphs: catalog, search, cart, recommendations, assistant) → LLM gateway → search index.
   - Client architecture: modules, navigation, state, caching, offline, image strategy.
   - API design: queries, pagination, streaming (SSE vs WebSocket vs GraphQL `@defer`), versioning for old app versions in stores.
   - AI specifics: on-device vs cloud trade-offs (privacy, cost, latency, model size, device coverage), non-deterministic output, evaluation, prompt versioning, kill switch.
   - Rollout: feature flags per market, A/B tests, staged store rollout, OTA updates and their limits (no native changes), forced-update strategy.
   - Observability: crash-free rate, startup time, TTI, search latency p95, AI fallback rate, dashboards and alerts.
   - Risks and trade-offs table.
   - "How this repo maps to the design" (what I built vs. what is only on paper).
4. **docs/learning-log.md**: per phase (see rules in section 0).
5. **CLAUDE.md**: commands, folder rules, coding conventions, "always run typecheck + tests before you finish", how to add a feature.

## 9. Quality bar

- No red screens; error boundaries per feature with a retry.
- Accessibility: labels and roles on all interactive elements, dynamic type does not break layouts, touch targets ≥ 44 pt, screen reader announces streamed AI answers in chunks, not per token.
- Performance targets (release build, mid-range Android): list scroll without dropped frames visible in the Perf Monitor, no unnecessary re-renders of list rows (check with React DevTools Profiler), cold start measured and written down.
- Test coverage focus on `model/` and `ai/` (pure logic), not on snapshots.

## 10. "What changed since ~2019" checklist (each item should appear somewhere in the code or the learning log)

- [ ] **New Architecture**: Fabric renderer, TurboModules, JSI, bridgeless mode; the old bridge is gone. Why it matters (sync calls, concurrent React features).
- [ ] **Hermes** as the default engine; what bytecode precompilation gives for startup.
- [ ] **Expo as the recommended way to start** a new RN app; Expo Go vs development builds; Continuous Native Generation and config plugins instead of editing native folders by hand.
- [ ] **Expo Router**: file-based routing, typed routes, deep links, layouts (vs. classic React Navigation setup).
- [ ] **EAS Build / Submit / Update**: cloud builds, OTA updates, channels, runtime versions, what OTA can and cannot change.
- [ ] **React 19**: `use`, Actions, `useOptimistic`, `useTransition`; Suspense for data; **React Compiler**.
- [ ] **Lists**: FlatList limits → FlashList v2 / Legend List (recycling, no size estimates).
- [ ] **Animations**: Reanimated 4 (worklets on the UI thread, CSS-style animations), Gesture Handler.
- [ ] **Storage**: AsyncStorage → MMKV (synchronous, JSI).
- [ ] **Native modules today**: Expo Modules API (Swift/Kotlin), also know that Nitro Modules exist.
- [ ] **Tooling**: React Native DevTools (Flipper is gone), Expo Doctor, Expo Atlas for bundle analysis.
- [ ] **Android edge-to-edge** by default; safe areas.
- [ ] **Testing**: RNTL user-event API, MSW, Maestro instead of Detox for most teams (know both).
- [ ] **On-device AI**: Apple Foundation Models, ExecuTorch, model download and size strategy, dev builds only.
- [ ] **AI-assisted development**: `CLAUDE.md`, agent skills, MCP servers useful for RN work (check what Expo offers today).

## 11. Interview cheat-sheet output (final step)

When all MVP phases are done, write `docs/interview-notes.md`: 15 likely technical questions about this repo ("Why Apollo cache and Zustand?", "How does the AI fallback work?", "What breaks with OTA?", "How would you A/B test the assistant?", "How do you measure performance?") with short answers based on the real code, with file links.
