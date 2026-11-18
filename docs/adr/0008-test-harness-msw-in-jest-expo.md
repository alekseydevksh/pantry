# ADR 0008: Test harness: MSW 3 in jest-expo

- Status: Accepted
- Date: 2026-11-18
- Task: [PLAN 2.4](../PLAN.md)

## Context

Screen tests need the API, and CLAUDE.md asks for MSW. Until 2.4 the tests replaced `fetch` by hand (`jest.spyOn(globalThis, 'fetch')`), so each test knew the exact wire format and skipped the real request path. MSW 3 (the current version) differs from what most guides describe, and it does not work in jest-expo without setup.

## Decision

- **MSW intercepts the network; the app's real Apollo link chain runs** (error link, retry link, HTTP link). A test says what the API returns with typed handlers built from the generated documents (`api.query(ProductDocument, ({ variables }) => ({ product }))` in [api.ts](../../apps/mobile/src/test/msw/api.ts)). The resolver's variables and return value are typed by the document, so a wrong test fixture does not compile.
- **A request without a handler fails the test** (`onUnhandledFrame: 'error'`; MSW 3 renamed `onUnhandledRequest`). Without it a test could reach a real server. This already happened once while writing the harness: a developer's `pnpm dev:server` on port 4000 answered a test request.
- **Node's `fetch` is restored for MSW.** jest-expo replaces the global `fetch` with Expo's native-backed one. MSW 3 intercepts at the socket level and passes the request to the `fetch` that was there before it, which must be Node's. A [custom environment](../../apps/mobile/jest/environment.js) saves Node's `fetch` before jest-expo replaces it, and [server.ts](../../apps/mobile/src/test/msw/server.ts) puts it back. `Request`, `Response` and `Headers` are Node's already.
- **MSW and its dependencies are transformed by Babel.** MSW 3 is ES-module only (some dependencies ship `.mjs`) and Jest runs CommonJS. [jest.config.js](../../apps/mobile/jest.config.js) adds them to the preset's `transformIgnorePatterns` and adds an `.mjs` transform.
- **`renderWithProviders`** ([render.tsx](../../apps/mobile/src/test/render.tsx)) gives each render a new Apollo client and cache. `renderApp(url)` renders the real route files with the app's own client, whose cache it clears first.

## Alternatives

- **Keep hand-made `fetch` mocks.** No dependency, but every test repeats the wire format, and the typed documents are not used.
- **Mock Apollo (`MockedProvider`).** Skips the link chain, so retries, the error link and timeouts go untested. Tests would pass while the app breaks.
- **`--experimental-vm-modules`.** Lets Jest load ES modules, but changes how every module and mock is loaded, and the Expo preset does not support it.

## Consequences

- When MSW or jest-expo change how `fetch` is installed, this setup is the first thing to check. Symptom: `Unsupported BodyInit type` from `expo/build/winter/fetch`.
- Adding a dependency that is ES-module only needs the same `transformIgnorePatterns` entry.
- `renderApp` stops the app client's persistor, so its save timer does not keep Jest workers alive. Tests of persistence build their own persistor.
