# Pantry

A fictional grocery and recipe app with an AI shopping assistant, built with Expo (React Native) and a mock GraphQL server.

Pantry lets a user browse and search groceries and recipes, add products to a cart that keeps working offline, and (in progress) ask an assistant in natural language: "vegetarian dinner for 4 under 30 minutes, no nuts".

It is a portfolio project. The goal is to show how a modern React Native app is put together: New Architecture, Expo Router, a normalized GraphQL cache, an offline-first cart, feature flags, analytics and a real test setup. The full scope is in [SPEC.md](SPEC.md).

## Features

**Working now** (verified on the iOS Simulator):

- **Home feed.** Products and recipes in one list: cursor pagination, pull-to-refresh, skeletons, and a persisted cache, so the app opens with data even without a network.
- **Recipe and product screens.** Details, ingredients linked to products, diet and allergen info, and separate loading, not-found and error states.
- **Search.** Typeahead with a debounce, filters (diet, cook time, price, allergens), sort, and paginated results. The whole search lives in the URL, so a search can be deep-linked and shared.
- **Cart.** Optimistic add, remove and quantity changes. Changes made offline go into a queue with idempotency keys and are replayed when the connection returns. Swipe to remove, and a reduced-motion-aware add-to-cart animation.
- **Settings.** Language (EN, PL), theme (system, light, dark), and a debug panel that shows feature flags and their variants.
- **Platform basics.** Deep links (`pantry://recipe/:id`, `pantry://product/:id`), light and dark themes, safe areas and edge-to-edge, an error boundary around every screen, an offline banner.
- **Experimentation.** A typed analytics layer with pluggable sinks, and feature flags with deterministic per-user assignment (used for an A/B test of the search layout, list or grid).

**Still to come:**

- **AI assistant.** The route and the modal exist, the screen is a placeholder. The plan: the model only returns a structured intent, the app runs the real search and shows real products, and allergen filters are always applied in code. A router picks cloud, on-device or a rule-based keyword fallback, so the assistant degrades instead of failing. The server will get an LLM proxy with a mock mode, so no API key is needed to run the project.
- **On-device AI and a native module** (Swift and Kotlin) for a capability check and haptics.
- **Quality and release.** Android, end-to-end tests with Maestro, Sentry, performance measurements, and EAS build and update configuration.

The detailed task list is in [docs/PLAN.md](docs/PLAN.md).

## Stack

| Concern | Choice |
|---|---|
| App | Expo SDK 58, React Native 0.88 (New Architecture, Hermes), React 19 with React Compiler |
| Navigation | Expo Router (typed routes, `pantry://` deep links) |
| Styling | Unistyles 3 with design tokens, light and dark themes |
| Lists and images | FlashList v2, expo-image |
| Animation and gestures | Reanimated 4, Gesture Handler 3 |
| Server state | Apollo Client 4: normalized cache, cursor pagination, data masking, cache persisted in MMKV |
| Client state | Zustand (settings, session, offline queue), persisted in MMKV |
| API | GraphQL: GraphQL Yoga mock server, typed operations from GraphQL Codegen |
| Validation | Zod |
| i18n | i18next + expo-localization (EN, PL) |
| Language | TypeScript (strict) |
| Tests | Jest, React Native Testing Library, MSW for GraphQL |
| Tooling | pnpm workspaces, ESLint, Prettier, GitHub Actions |

## How to run

You need Node 24, pnpm 12, Xcode with an iOS Simulator, and CocoaPods. Android is not set up yet.

```sh
pnpm install

# Terminal 1: the mock GraphQL API on http://localhost:4000/graphql
pnpm dev:server

# Terminal 2: build the development build and open it on the iOS Simulator.
# The first run takes several minutes: it generates ios/ and compiles the native code.
pnpm ios
```

The app does not run in Expo Go, because it uses native modules (MMKV, Unistyles) that Expo Go does not include. It needs a development build.

After the first build, `pnpm --filter @pantry/mobile start` is enough: it starts Metro and the installed app connects to it. Build again with `pnpm ios` only when a native dependency or `app.config.ts` changes.

### Mock server options

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `4000` | Port of the API |
| `DELAY_MIN_MS`, `DELAY_MAX_MS` | `100`, `800` | Random delay before every operation. Set both to `0` to turn it off |
| `ERROR_RATE` | `0` | Share of operations (0 to 1) that fail with HTTP 503 |

Example: `ERROR_RATE=0.2 pnpm dev:server` makes one request in five fail, so retry and error states can be seen.

### Checks

```sh
pnpm typecheck       # tsc in every package
pnpm lint            # ESLint and Prettier
pnpm test            # Jest in every package
pnpm codegen         # regenerate GraphQL types after a schema or operation change
pnpm codegen:check   # the same, and fail if the committed output was stale (CI)
```

## Repository layout

```
apps/mobile/
  app/             routes only: thin files that render a feature screen
  src/features/    catalog, search, cart, settings, assistant (each: components, hooks, api, model, tests)
  src/design-system/  tokens, themes, primitives
  src/analytics/   typed events and sinks
  src/flags/       feature flag definitions, rollout config, provider
  src/lib/         apollo, storage, session, i18n, network, error boundary
server/            mock GraphQL API with seed data (about 200 products, 60 recipes)
packages/shared/   schema.graphql and the generated GraphQL types
docs/              plan, system design, ADRs, learning log
```

Business logic lives in pure TypeScript under each feature's `model/` folder (no React, no Apollo), which is where most unit tests are. Server data lives only in the Apollo cache, Zustand holds settings and the offline queue, and anything deep-linkable lives in route params.

## Documentation

- [SPEC.md](SPEC.md): scope and goals.
- [docs/PLAN.md](docs/PLAN.md): the task list and the status of each phase.
- [docs/adr/](docs/adr/): architecture decision records (monorepo, styling, lists, Apollo vs TanStack Query, state ownership, cache persistence, test harness, offline cart queue, feature flags and more).
- [docs/SYSTEM-DESIGN.md](docs/SYSTEM-DESIGN.md): a system design write-up for the assistant and search at scale.
- [docs/learning-log.md](docs/learning-log.md): what each phase taught and why things were built the way they were.
- [CLAUDE.md](CLAUDE.md): conventions for AI agents working in this repo.
