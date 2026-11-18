# Pantry

A fictional grocery and recipe app with an AI shopping assistant, built with Expo (React Native) and a mock GraphQL server.

> **Status: Phase 1 of 7 done (shell and design system).** Tabs, detail screens, the assistant modal, deep links, light and dark themes, EN and PL, and the Settings screen work; the screens themselves are still placeholders. Sections marked _TODO_ are filled in as the phases in [docs/PLAN.md](docs/PLAN.md) are finished.

## What it is

Pantry lets a user browse and search groceries and recipes, ask an assistant in natural language ("vegetarian dinner for 4 under 30 minutes, no nuts"), and add the results to a cart that works offline.

It is a portfolio project. The goal is to show how a modern React Native app is put together: New Architecture, Expo Router, a normalized GraphQL cache, an AI layer that falls back gracefully, feature flags, analytics and tests. The full scope is in [SPEC.md](SPEC.md).

## Demo

_TODO (task 5.9): GIF of search, the assistant and the cart._

## Stack

_TODO (task 5.9): full table._ Decided so far:

| Concern | Choice |
|---|---|
| App | Expo SDK 58, React Native 0.88 (New Architecture), React 19 with React Compiler |
| Navigation | Expo Router (typed routes, `pantry://` deep links) |
| Styling | Unistyles 3 with design tokens, light and dark themes |
| i18n | i18next + expo-localization (EN, PL) |
| Client state | Zustand |
| API | GraphQL: GraphQL Yoga mock server, typed operations from GraphQL Codegen |
| Language | TypeScript (strict) |
| Tests | Jest, React Native Testing Library |
| Monorepo | pnpm workspaces |

## How to run

You need Node 24, pnpm 12, Xcode with an iOS Simulator, and CocoaPods. Android is not set up yet (see [docs/PLAN.md](docs/PLAN.md#android-status)).

```sh
pnpm install

# Terminal 1: the mock GraphQL API on http://localhost:4000/graphql
pnpm dev:server

# Terminal 2: build the development build and open it on the iOS Simulator.
# The first run takes several minutes: it generates ios/ and compiles the native code.
pnpm ios
```

The app does not run in Expo Go. It needs a development build, because later phases add native modules that Expo Go does not include.

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
pnpm typecheck   # tsc in every package
pnpm lint        # ESLint and Prettier
pnpm test        # Jest in every package
pnpm codegen     # regenerate GraphQL types after a schema or operation change
```

## Repository layout

```
apps/mobile/       Expo app: routes in app/, code in src/
server/            mock GraphQL API (and, later, the LLM proxy) with seed data
packages/shared/   schema.graphql and the generated GraphQL types
docs/              plan, ADRs, learning log
```

## Architecture

_TODO (task 4.12): Mermaid diagram and a link to `docs/ARCHITECTURE.md`._

## Decisions

Architecture decision records are in [docs/adr/](docs/adr/).

## What I would do next at scale

_TODO (task 5.9)._
