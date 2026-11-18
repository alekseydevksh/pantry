// The MSW server for Jest (PLAN 2.4). It intercepts `fetch`, so the real Apollo links, retries and
// parsing run in tests; only the network is replaced.
//
// `setup.ts` starts it before the tests and resets the handlers after each test. It starts with no
// handlers: a test says what the API returns (`api.query(...)`, see ./api.ts), and a request nobody
// handles fails the test instead of silently reaching a real server.
import { setupServer } from 'msw/node';

// jest-expo's global `fetch` is Expo's native one, which MSW cannot use. `jest/environment.js` kept
// Node's `fetch` as `nodeFetch`; use it for the whole test file. Jest runs every test file in its
// own global scope, so nothing leaks between files.
declare global {
  var nodeFetch: typeof fetch;
}
Object.defineProperty(globalThis, 'fetch', {
  value: globalThis.nodeFetch,
  configurable: true,
  writable: true,
});

export const server = setupServer();
