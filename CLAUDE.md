# CLAUDE.md

Instructions for AI agents working in this repo. Read [SPEC.md](SPEC.md) for scope and [docs/PLAN.md](docs/PLAN.md) for the task list.

## What this is

Pantry: a fictional grocery and recipe app with an AI assistant. Expo (React Native) app + mock GraphQL server, in a pnpm monorepo. Never use a real company's name, logo or brand.

## Workflow

1. Take the next unchecked task in [docs/PLAN.md](docs/PLAN.md). One task = one commit.
2. **Always run `pnpm typecheck && pnpm lint && pnpm test` before finishing a task.** Do not finish with a failing check.
3. **Tick the task's checkbox in `docs/PLAN.md`** in the same commit.
4. Commit with a Conventional Commits message (`feat(search): ...`, `test(cart): ...`, `docs: ...`).
5. At a phase gate: add the phase entry to `docs/learning-log.md`, then stop and give the owner a short summary. Do not start the next phase without a go-ahead.
6. A non-obvious decision gets a short ADR in `docs/adr/` (next free number; Context, Decision, Alternatives, Consequences).

## Commands

Run from the repo root. (Scripts are created in Phase 0. If you change one, update this list.)

| Command | What it does |
|---|---|
| `pnpm install` | Install all workspaces |
| `pnpm typecheck` | `tsc --noEmit` in every package (in `apps/mobile` it first generates the git-ignored typed-route types) |
| `pnpm lint` | ESLint + Prettier check |
| `pnpm format` | Format all files with Prettier |
| `pnpm test` | Jest in every package |
| `pnpm codegen` | Regenerate GraphQL types into `packages/shared` |
| `pnpm codegen:check` | Regenerate and fail if the committed output was stale (CI) |
| `pnpm dev:server` | Start the mock GraphQL server and LLM proxy |
| `pnpm ios` | Build and run the dev build on the iOS Simulator |
| `pnpm --filter @pantry/mobile test -- <pattern>` | Run one test file |
| `npx expo-doctor` (in `apps/mobile`) | Check the Expo project |

## Dependencies

- Check the real latest version before adding a library (`npm view <pkg> version`, official docs). Do not rely on memory.
- In `apps/mobile`, install anything with native code using **`npx expo install <pkg>`**, so the version matches the Expo SDK.
- TypeScript stays on the version the Expo template uses (~6.0), not `latest`.
- **One `graphql` version (v16) in the workspace.** Do not add a second one.
- If a library is deprecated or no longer the common choice, stop and tell the owner.

## Platforms

- Dev builds only. Expo Go does not work (MMKV, Unistyles).
- `ios/` and `android/` are generated (`expo prebuild`) and not committed. Change native config through `app.config.ts` and config plugins.
- **Android is not set up on this machine until Phase 5.** Verify on the iOS Simulator, and do not claim Android works. Do not use iOS-only APIs without a fallback.

## Folder rules

```
apps/mobile/app/              routes only: thin files that render a feature screen
apps/mobile/src/features/<f>/ components/, hooks/, api/ (.graphql), model/ (pure logic), __tests__/
apps/mobile/src/design-system/ tokens, themes, primitives
apps/mobile/src/ai/           provider interface, router, providers
apps/mobile/src/analytics/    typed events and sinks
apps/mobile/src/flags/        flag provider and definitions
apps/mobile/src/lib/          apollo, storage, session, i18n, sentry, error-boundary
server/                       mock GraphQL API + LLM proxy
packages/shared/              schema.graphql, codegen output, Zod schemas
docs/                         PLAN, ADRs, architecture, learning log
```

- A feature may import from `design-system`, `lib`, `analytics`, `flags`, `ai` and `packages/shared`. A feature imports another feature only through that feature's `index.ts`.
- `model/` is pure TypeScript: no React, no Apollo, no native modules. This is where most unit tests go.
- `design-system` imports nothing from features.

## Conventions

- TypeScript `strict`. No `any` without a comment that explains why.
- **React Compiler is on.** Do not write `useMemo`, `useCallback` or `React.memo` unless profiling shows a need; then add a comment with the reason.
- **State ownership** ([ADR 0005](docs/adr/0005-server-state-apollo-client-state-zustand.md)): server data lives only in the Apollo cache; Zustand holds settings, session and the offline queue; deep-linkable state lives in route params.
- GraphQL: write operations in `.graphql` files under `features/<f>/api/`, run `pnpm codegen`, use the typed documents with Apollo hooks. Never write response types by hand.
- Apollo data masking is on ([ADR 0007](docs/adr/0007-apollo-cache-pagination-masking-persistence.md)): a component that needs entity fields declares its own fragment (unique name) and reads it with `useFragment`; the parent selects the `id` and spreads the fragment. Do not use `@unmask` in new code.
- Styling: Unistyles with theme tokens. No raw colors or spacing numbers in components.
- All user-visible strings go through i18n, in both EN and PL.
- Every interactive element has an accessibility role and label, and a touch target of at least 44 pt.
- Analytics: add the event to `src/analytics/events.ts` first, then call `track()`.
- Feature flags ([ADR 0012](docs/adr/0012-feature-flags-assignment-and-exposure.md)): define the flag in `src/flags/definitions.ts` and its rollout in `flags.json`; read it with `useFlag` so exposure is logged. Use `useFlag(key, { expose: 'manual' })` and call `expose()` where the variant first changes what the user sees, when that is later than mount.
- AI ([ADR 0006](docs/adr/0006-ai-provider-abstraction.md)): the model returns an intent, the app runs the real search. Validate all model output with Zod. Allergen filters are applied in code. No API keys in the app.
- Each feature screen is wrapped in `FeatureErrorBoundary` (`@/lib/error-boundary`), which shows a retry and reports to `lib/observability`. A failed query is not thrown: show an inline `ErrorState` with a retry. No red screens.

## Tests

- Jest + React Native Testing Library (user-event API) + MSW for GraphQL ([ADR 0008](docs/adr/0008-test-harness-msw-in-jest-expo.md)). Use `renderWithProviders` (a component) or `renderApp(url)` (the real routes) from `src/test/render.tsx`. Declare the API with `server.use(api.query(SomeDocument, ({ variables }) => data))` from `src/test/msw/`; a request without a handler fails the test.
- Test behavior, not snapshots. Focus coverage on `model/` and `src/ai/`.
- Use fake timers for debounce, timeouts and retries.
- The server runs with no delay and no errors in tests; the LLM proxy runs in mock mode.

## How to add a feature

1. Add or change types in `packages/shared/schema.graphql`; update the server resolver; run `pnpm codegen`. Then set the new `SCHEMA_HASH` in `apps/mobile/src/lib/apollo/persistence/version.ts` (the cache version guard test fails and prints the value), so old persisted caches are dropped.
2. Create `src/features/<name>/` with `model/` first, and unit-test it.
3. Add `.graphql` operations in `api/`, then hooks, then components.
4. Add the route file in `app/` that renders the feature screen.
5. Add strings (EN and PL), analytics events and a flag if the feature is rolled out gradually.
6. Add an RNTL + MSW test for the main flow.
7. Run the checks, tick the PLAN checkbox, commit.
